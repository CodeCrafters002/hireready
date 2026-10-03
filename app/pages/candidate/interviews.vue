<script setup lang="ts">
definePageMeta({ layout: 'candidate' })

const { currentUser } = useAuth()
const store = useDataStore()

const applications = computed(() => {
  if (!currentUser.value) return []
  return store.getApplicationsByCandidate(currentUser.value.id)
    .filter(a => ['interview_pending', 'interview_scheduled', 'interview_passed', 'interview_failed', 'submitted_to_client', 'selected'].includes(a.status))
})

const feedbackMap = computed(() => {
  const map: Record<string, any> = {}
  for (const app of applications.value) {
    const fb = store.getFeedbackByApplication(app.id)
    if (fb) map[app.id] = fb
  }
  return map
})
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Mock Interviews</h2>
      <p class="mt-1 text-gray-500">View your interview bookings, status, and reviewer feedback.</p>
    </div>

    <div v-if="applications.length" class="space-y-4">
      <UCard v-for="app in applications" :key="app.id">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-semibold text-gray-950 dark:text-white">{{ store.getJobById(app.jobId)?.title || app.jobId }}</p>
              <p class="text-sm text-gray-500">{{ store.getJobById(app.jobId)?.company }}</p>
            </div>
            <UBadge
              :color="app.status === 'interview_passed' || app.status === 'submitted_to_client' || app.status === 'selected' ? 'success' : app.status === 'interview_failed' ? 'error' : 'warning'"
              variant="subtle"
              :label="app.status === 'interview_pending' ? 'Pending Booking' : app.status === 'interview_scheduled' ? 'Scheduled' : app.status === 'interview_passed' ? 'Passed' : app.status === 'interview_failed' ? 'Failed' : 'Completed'"
            />
          </div>

          <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
            <span v-if="app.interviewSlot" class="flex items-center gap-1.5">
              <UIcon name="i-lucide-calendar" class="size-4" />
              {{ app.interviewSlot }}
            </span>
          </div>

          <!-- Feedback -->
          <div v-if="feedbackMap[app.id]" class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <p class="text-sm font-semibold text-gray-950 dark:text-white">Reviewer Feedback</p>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ feedbackMap[app.id].comments }}</p>
            <div class="mt-2 flex items-center gap-3 text-sm text-gray-500">
              <span>Rating: {{ feedbackMap[app.id].rating }}/5</span>
              <span>Reviewer: {{ feedbackMap[app.id].reviewerName }}</span>
            </div>
          </div>

          <div v-if="app.interviewFeedback && !feedbackMap[app.id]" class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <p class="text-sm font-semibold text-gray-950 dark:text-white">Quick Feedback</p>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ app.interviewFeedback }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <UCard v-else>
      <div class="py-12 text-center">
        <UIcon name="i-lucide-video" class="mx-auto size-16 text-gray-300" />
        <p class="mt-4 text-lg font-medium text-gray-500">No interviews yet</p>
        <p class="mt-1 text-sm text-gray-400">Interviews become available after passing the MCQ assessment.</p>
      </div>
    </UCard>
  </div>
</template>
