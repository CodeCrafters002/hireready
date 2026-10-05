<script setup lang="ts">
const route = useRoute()
const store = useDataStore()
const { currentUser } = useAuth()
const { findApplication, updateStatus } = useApplications()
const application = findApplication(String(route.params.id))
const job = computed(() => application.value ? store.getJobById(application.value.jobId) : undefined)

function completeDemoPayment() {
  if (!application.value) return
  // Create payment record
  store.createPayment({
    applicationId: application.value.id,
    candidateId: application.value.candidateId || currentUser.value?.id || 'anonymous',
    amount: 1000,
    status: 'paid',
    method: 'Online Payment',
    paidAt: new Date().toISOString()
  })
  updateStatus(application.value.id, 'mcq_pending')

  // Notification
  if (currentUser.value) {
    store.addNotification({
      userId: currentUser.value.id,
      type: 'payment',
      title: 'Payment confirmed',
      message: `Your ₹1,000 application fee payment for ${job.value?.title || 'your application'} was successful.`
    })
  }
}

function bookInterview(slot: string) {
  if (!application.value) return
  updateStatus(application.value.id, 'interview_scheduled', { interviewSlot: slot })

  if (currentUser.value) {
    store.addNotification({
      userId: currentUser.value.id,
      type: 'interview',
      title: 'Interview scheduled',
      message: `Your mock interview for ${job.value?.title || 'your application'} is booked for ${slot}.`
    })
  }
}

const interviewSlots = computed(() => {
  const available = store.getAvailableSlots()
  if (available.length > 0) return available.map(s => `${s.date}, ${s.time}`)
  return ['Tuesday, 4:00 PM', 'Wednesday, 11:00 AM', 'Thursday, 2:30 PM']
})
</script>

<template>
  <UContainer class="max-w-3xl py-12">
    <UEmpty v-if="!application" title="Application not found" description="Start an application from an open job first." icon="i-lucide-file-question"><template #links><UButton to="/jobs" label="Browse jobs" /></template></UEmpty>
    <template v-else>
      <p class="text-sm font-semibold text-primary">APPLICATION PROGRESS</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">{{ job?.title }}</h1>
      <p class="mt-2 text-gray-600 dark:text-gray-300">{{ job?.company }} · {{ application.candidateName }}</p>

      <div class="mt-8 grid gap-3 sm:grid-cols-4">
        <div v-for="(step, index) in ['Payment', 'MCQ', 'Interview', 'Employer review']" :key="step" class="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
          <p class="text-xs text-gray-500">Step {{ index + 1 }}</p>
          <p class="mt-1 text-sm font-semibold text-gray-950 dark:text-white">{{ step }}</p>
        </div>
      </div>

      <UCard v-if="application.status === 'payment_pending'" class="mt-8">
        <template #header><h2 class="font-semibold text-gray-950 dark:text-white">Complete payment</h2></template>
        <p class="text-gray-600 dark:text-gray-300">Your application will be unlocked after the ₹{{ application.paymentAmount.toLocaleString('en-IN') }} fee is confirmed.</p>
        <UButton class="mt-5" size="lg" label="Proceed to Pay ₹1,000" icon="i-lucide-credit-card" @click="completeDemoPayment" />
      </UCard>

      <UCard v-else-if="application.status === 'mcq_pending'" class="mt-8">
        <template #header><h2 class="font-semibold text-gray-950 dark:text-white">Payment confirmed</h2></template>
        <p class="text-gray-600 dark:text-gray-300">Your MCQ assessment is ready. It has 5 questions and requires a 60% score to proceed.</p>
        <UButton :to="`/assessments/${application.id}`" class="mt-5" label="Start MCQ assessment" trailing-icon="i-lucide-arrow-right" />
      </UCard>

      <UCard v-else-if="application.status === 'assessment_failed'" class="mt-8">
        <template #header><h2 class="font-semibold text-gray-950 dark:text-white">Assessment result</h2></template>
        <p class="text-gray-600 dark:text-gray-300">Your score was {{ application.assessmentScore }}%. The required score is 60%. A real system should define retake rules in the job policy.</p>
      </UCard>

      <UCard v-else-if="application.status === 'interview_pending'" class="mt-8">
        <template #header><h2 class="font-semibold text-gray-950 dark:text-white">MCQ passed — book your mock interview</h2></template>
        <p class="text-gray-600 dark:text-gray-300">Choose a time. In production, these slots will come from the interviewer calendar.</p>
        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <UButton v-for="slot in interviewSlots" :key="slot" color="neutral" variant="outline" :label="slot" @click="bookInterview(slot)" />
        </div>
      </UCard>

      <UCard v-else-if="application.status === 'interview_scheduled'" class="mt-8">
        <template #header><h2 class="font-semibold text-gray-950 dark:text-white">Mock interview booked</h2></template>
        <p class="text-gray-600 dark:text-gray-300">Your slot is <strong>{{ application.interviewSlot }}</strong>. An interviewer will assess the session before your profile is sent to the employer.</p>
      </UCard>

      <UCard v-else-if="application.status === 'interview_passed'" class="mt-8">
        <template #header><h2 class="font-semibold text-gray-950 dark:text-white">Interview passed!</h2></template>
        <p class="text-gray-600 dark:text-gray-300">Congratulations! Your mock interview was successful. An admin will submit your profile to the hiring client.</p>
      </UCard>

      <UCard v-else-if="application.status === 'interview_failed'" class="mt-8">
        <template #header><h2 class="font-semibold text-gray-950 dark:text-white">Interview result</h2></template>
        <p class="text-gray-600 dark:text-gray-300">Unfortunately, you did not pass the mock interview. {{ application.interviewFeedback }}</p>
      </UCard>

      <UCard v-else-if="application.status === 'submitted_to_client'" class="mt-8">
        <template #header><h2 class="font-semibold text-gray-950 dark:text-white">Profile submitted to client</h2></template>
        <p class="text-gray-600 dark:text-gray-300">Your verified profile has been sent to the hiring company. You'll be notified about the decision.</p>
      </UCard>

      <UCard v-else-if="application.status === 'selected'" class="mt-8">
        <template #header><h2 class="font-semibold text-emerald-600">🎉 Congratulations!</h2></template>
        <p class="text-gray-600 dark:text-gray-300">You have been selected! The employer will contact you with next steps.</p>
      </UCard>

      <UCard v-else-if="application.status === 'rejected'" class="mt-8">
        <template #header><h2 class="font-semibold text-gray-950 dark:text-white">Application result</h2></template>
        <p class="text-gray-600 dark:text-gray-300">Unfortunately, the employer has not proceeded with your application. Keep applying to other roles!</p>
        <UButton to="/jobs" class="mt-4" label="Browse more jobs" variant="soft" />
      </UCard>
    </template>
  </UContainer>
</template>
