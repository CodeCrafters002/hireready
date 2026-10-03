<script setup lang="ts">
import { getJobsList, jobs as staticJobs } from '~/data/jobs'

const route = useRoute()
const { currentUser } = useAuth()
const allJobs = computed(() => {
  if (import.meta.server) return staticJobs
  return getJobsList()
})
const foundJob = allJobs.value.find(item => item.id === route.params.id)
const { createApplication } = useApplications()
const form = reactive({ candidateName: '', email: '', phone: '' })
const errorMessage = ref('')
if (!foundJob && import.meta.server) throw createError({ statusCode: 404, statusMessage: 'Job not found' })
const job = foundJob

// Pre-fill from profile if logged in
onMounted(() => {
  if (currentUser.value) {
    const store = useDataStore()
    const profile = store.getProfileByUserId(currentUser.value.id)
    if (profile) {
      form.candidateName = profile.fullName
      form.email = profile.email
      form.phone = profile.mobile
    }
  }
})

function continueToPayment() {
  errorMessage.value = ''
  if (!form.candidateName || !form.email || !form.phone) { errorMessage.value = 'Please complete your name, email, and phone number.'; return }
  if (!job) return
  const application = createApplication({ jobId: job.id, ...form })
  navigateTo(`/application/${application.id}`)
}
</script>

<template>
  <UContainer class="max-w-2xl py-12">
    <template v-if="job">
      <NuxtLink :to="`/jobs/${job.id}`" class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><UIcon name="i-lucide-arrow-left" /> Back to job</NuxtLink>
      <h1 class="mt-5 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">Start your application</h1>
      <p class="mt-2 text-gray-600 dark:text-gray-300">You are applying for <strong>{{ job.title }}</strong> at {{ job.company }}.</p>
      <UCard class="mt-8">
        <form class="space-y-5" @submit.prevent="continueToPayment">
          <UFormField label="Full name" required><UInput v-model="form.candidateName" class="w-full" placeholder="Your full name" /></UFormField>
          <UFormField label="Email" required><UInput v-model="form.email" class="w-full" type="email" placeholder="you@example.com" /></UFormField>
          <UFormField label="Phone number" required><UInput v-model="form.phone" class="w-full" type="tel" placeholder="10-digit mobile number" /></UFormField>
          <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" icon="i-lucide-circle-alert" />
          <UAlert color="warning" variant="soft" title="Payment comes next" description="After saving your details, you will see the ₹1,000 application and assessment payment screen." icon="i-lucide-indian-rupee" />
          <UButton type="submit" block size="lg" label="Continue to payment" trailing-icon="i-lucide-arrow-right" />
        </form>
      </UCard>
    </template>
    <UEmpty v-else title="Job not found" icon="i-lucide-file-question">
      <template #links><UButton to="/jobs" label="Browse jobs" /></template>
    </UEmpty>
  </UContainer>
</template>
