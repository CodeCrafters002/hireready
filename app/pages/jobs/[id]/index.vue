<script setup lang="ts">
import { getJobsList, jobs as staticJobs } from '~/data/jobs'

const route = useRoute()
const allJobs = computed(() => {
  if (import.meta.server) return staticJobs
  return getJobsList()
})
const job = computed(() => allJobs.value.find(item => item.id === route.params.id))
if (!job.value && import.meta.server) throw createError({ statusCode: 404, statusMessage: 'Job not found' })
</script>

<template>
  <UContainer v-if="job" class="py-12">
    <NuxtLink to="/jobs" class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><UIcon name="i-lucide-arrow-left" /> Back to jobs</NuxtLink>
    <div class="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
      <article>
        <UBadge :label="job.type" color="primary" variant="subtle" />
        <h1 class="mt-4 text-4xl font-bold tracking-tight text-gray-950 dark:text-white">{{ job.title }}</h1>
        <p class="mt-2 text-lg text-gray-600 dark:text-gray-300">{{ job.company }} · {{ job.location }} · {{ job.salary }}</p>
        <section class="mt-10"><h2 class="text-xl font-semibold text-gray-950 dark:text-white">About this role</h2><p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ job.description }}</p></section>
        <section class="mt-8"><h2 class="text-xl font-semibold text-gray-950 dark:text-white">What you need</h2><ul class="mt-4 space-y-3 text-gray-600 dark:text-gray-300"><li v-for="requirement in job.requirements" :key="requirement" class="flex gap-3"><UIcon name="i-lucide-check-circle-2" class="mt-1 shrink-0 text-primary" />{{ requirement }}</li></ul></section>
      </article>
      <aside><UCard class="sticky top-6"><h2 class="text-lg font-semibold text-gray-950 dark:text-white">Application process</h2><ol class="mt-5 space-y-4 text-sm text-gray-600 dark:text-gray-300"><li><strong class="text-gray-950 dark:text-white">1. Pay ₹1,000</strong><br>Secure application and assessment fee.</li><li><strong class="text-gray-950 dark:text-white">2. Clear MCQ</strong><br>Timed role-based assessment.</li><li><strong class="text-gray-950 dark:text-white">3. Mock interview</strong><br>Practice with a reviewer.</li><li><strong class="text-gray-950 dark:text-white">4. Employer review</strong><br>Your verified profile is shared.</li></ol><UButton :to="`/jobs/${job.id}/apply`" class="mt-6" block size="lg" label="Start application" /><p class="mt-3 text-center text-xs text-gray-500">Review the fee and refund policy before payment.</p></UCard></aside>
    </div>
  </UContainer>
  <UContainer v-else class="py-12">
    <UEmpty title="Job not found" description="This job may have been removed or unpublished." icon="i-lucide-file-question">
      <template #links><UButton to="/jobs" label="Browse jobs" /></template>
    </UEmpty>
  </UContainer>
</template>
