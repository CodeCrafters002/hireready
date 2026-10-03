<script setup lang="ts">
definePageMeta({ layout: 'candidate' })

const { currentUser } = useAuth()
const store = useDataStore()

const attempts = computed(() => currentUser.value ? store.getAttemptsByCandidate(currentUser.value.id) : [])
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Assessment History</h2>
      <p class="mt-1 text-gray-500">Review your past MCQ assessment results.</p>
    </div>

    <div v-if="attempts.length" class="space-y-4">
      <UCard v-for="attempt in attempts" :key="attempt.id">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-semibold text-gray-950 dark:text-white">
              {{ store.getJobById(store.getApplicationById(attempt.applicationId)?.jobId || '')?.title || 'Assessment' }}
            </p>
            <p class="mt-1 text-sm text-gray-500">
              Submitted {{ new Date(attempt.submittedAt).toLocaleDateString() }} · {{ attempt.questionIds.length }} questions
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-2xl font-bold" :class="attempt.passed ? 'text-emerald-600' : 'text-red-600'">{{ attempt.score }}%</span>
            <UBadge :color="attempt.passed ? 'success' : 'error'" variant="subtle" :label="attempt.passed ? 'Passed' : 'Failed'" />
          </div>
        </div>
      </UCard>
    </div>

    <UCard v-else>
      <div class="py-12 text-center">
        <UIcon name="i-lucide-file-check" class="mx-auto size-16 text-gray-300" />
        <p class="mt-4 text-lg font-medium text-gray-500">No assessments taken yet</p>
        <p class="mt-1 text-sm text-gray-400">Assessments become available after completing payment for a job application.</p>
      </div>
    </UCard>
  </div>
</template>
