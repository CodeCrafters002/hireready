<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const store = useDataStore()
const attempts = computed(() => store.getAttempts())
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-950 dark:text-white">MCQ Results</h2>
      <p class="mt-1 text-gray-500">{{ attempts.length }} assessment{{ attempts.length === 1 ? '' : 's' }} submitted</p>
    </div>

    <div v-if="attempts.length" class="space-y-3">
      <UCard v-for="att in attempts" :key="att.id">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-semibold text-gray-950 dark:text-white">
              {{ store.getUserById(att.candidateId)?.name || 'Unknown Candidate' }}
            </p>
            <p class="mt-1 text-sm text-gray-500">
              {{ store.getJobById(store.getApplicationById(att.applicationId)?.jobId || '')?.title || 'Unknown Job' }} ·
              {{ att.questionIds.length }} questions ·
              Submitted {{ new Date(att.submittedAt).toLocaleDateString() }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-2xl font-bold" :class="att.passed ? 'text-emerald-600' : 'text-red-600'">{{ att.score }}%</span>
            <UBadge :color="att.passed ? 'success' : 'error'" variant="subtle" :label="att.passed ? 'Passed' : 'Failed'" />
          </div>
        </div>
      </UCard>
    </div>

    <UCard v-else>
      <div class="py-12 text-center">
        <UIcon name="i-lucide-bar-chart-3" class="mx-auto size-16 text-gray-300" />
        <p class="mt-4 text-lg font-medium text-gray-500">No assessments submitted yet</p>
        <p class="mt-1 text-sm text-gray-400">Results will appear here after candidates take their MCQs.</p>
      </div>
    </UCard>
  </div>
</template>
