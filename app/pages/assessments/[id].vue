<script setup lang="ts">
const route = useRoute()
const store = useDataStore()
const { currentUser } = useAuth()
const { findApplication, updateStatus } = useApplications()
const application = findApplication(String(route.params.id))

const selectedAnswers = ref<number[]>([])
const submitted = ref(false)

// Load job-specific questions (or global fallback) — correctIndex is NOT exposed to template
const questions = computed(() => {
  const jobId = application.value?.jobId
  if (!jobId) return store.getEnabledQuestions().slice(0, 5)
  return store.getQuestionsForAssessment(jobId, 5)
})

const jobTitle = computed(() => {
  const jobId = application.value?.jobId
  if (!jobId) return 'General Assessment'
  return store.getJobById(jobId)?.title ?? 'General Assessment'
})

const answeredAll = computed(() =>
  selectedAnswers.value.length === questions.value.length
  && selectedAnswers.value.every(a => a !== undefined)
)

const score = ref(0)

function submitAssessment() {
  if (!application.value || !answeredAll.value) return
  submitted.value = true

  // Score on submit — read correctIndex only at submission time
  const correct = selectedAnswers.value.filter(
    (answer, index) => answer === questions.value[index]?.correctIndex
  ).length
  score.value = Math.round((correct / questions.value.length) * 100)

  const passed = score.value >= 60
  const newStatus = passed ? 'interview_pending' : 'assessment_failed'
  updateStatus(application.value.id, newStatus as any, { assessmentScore: score.value })

  // Record attempt
  if (currentUser.value) {
    store.createAttempt({
      applicationId: application.value.id,
      candidateId: currentUser.value.id,
      questionIds: questions.value.map(q => q.id),
      answers: [...selectedAnswers.value],
      score: score.value,
      passed,
      submittedAt: new Date().toISOString()
    })

    // Notification
    store.addNotification({
      userId: currentUser.value.id,
      type: 'assessment',
      title: passed ? 'MCQ Passed!' : 'MCQ Result',
      message: `You scored ${score.value}% on the ${jobTitle.value} assessment. ${passed ? 'You can now book a mock interview.' : 'The required score is 60%.'}`
    })
  }
}
</script>

<template>
  <UContainer class="max-w-3xl py-12">
    <UEmpty v-if="!application" title="Assessment unavailable" description="Start an application and complete payment first." icon="i-lucide-lock-keyhole">
      <template #links><UButton to="/jobs" label="Browse jobs" /></template>
    </UEmpty>
    <UAlert v-else-if="application.status !== 'mcq_pending' && !submitted" color="warning" variant="soft" title="Assessment locked" description="Complete the payment step before opening this assessment." icon="i-lucide-lock-keyhole" />
    <template v-else>
      <p class="text-sm font-semibold text-primary">MCQ ASSESSMENT</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">{{ jobTitle }}</h1>
      <p class="mt-2 text-gray-600 dark:text-gray-300">Answer all {{ questions.length }} questions. You need 60% to unlock interview scheduling.</p>

      <div v-if="!submitted" class="mt-8 space-y-5">
        <UCard v-for="(item, index) in questions" :key="item.id">
          <p class="font-medium text-gray-950 dark:text-white">{{ index + 1 }}. {{ item.question }}</p>
          <URadioGroup
            v-model="selectedAnswers[index]"
            class="mt-4"
            :items="item.options.map((option, optionIndex) => ({ label: option, value: optionIndex }))"
          />
        </UCard>
        <UAlert v-if="!answeredAll" color="warning" variant="soft" title="Complete every question" description="The submit button unlocks when all answers are selected." icon="i-lucide-circle-alert" />
        <UButton :disabled="!answeredAll" size="lg" label="Submit assessment" @click="submitAssessment" />
      </div>

      <UCard v-else class="mt-8">
        <template #header>
          <h2 class="text-xl font-semibold text-gray-950 dark:text-white">Assessment submitted</h2>
        </template>
        <p class="text-4xl font-bold text-primary">{{ score }}%</p>
        <p class="mt-3 text-gray-600 dark:text-gray-300">
          {{ score >= 60 ? 'You passed. Schedule your mock interview next.' : 'You did not reach the 60% pass score.' }}
        </p>
        <UButton :to="`/application/${application?.id}`" class="mt-5" :label="score >= 60 ? 'Book mock interview' : 'View application'" />
      </UCard>
    </template>
  </UContainer>
</template>
