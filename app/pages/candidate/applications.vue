<script setup lang="ts">
definePageMeta({ layout: 'candidate' })

const { currentUser } = useAuth()
const store = useDataStore()

const applications = computed(() => currentUser.value ? store.getApplicationsByCandidate(currentUser.value.id) : [])

const statusLabel: Record<string, string> = {
  payment_pending: 'Payment Pending',
  mcq_pending: 'MCQ Pending',
  assessment_passed: 'MCQ Passed',
  assessment_failed: 'MCQ Failed',
  interview_pending: 'Interview Pending',
  interview_scheduled: 'Interview Scheduled',
  interview_passed: 'Interview Passed',
  interview_failed: 'Interview Failed',
  submitted_to_client: 'Submitted to Client',
  selected: 'Selected',
  rejected: 'Rejected'
}

const statusColor: Record<string, string> = {
  payment_pending: 'warning',
  mcq_pending: 'warning',
  assessment_passed: 'success',
  assessment_failed: 'error',
  interview_pending: 'warning',
  interview_scheduled: 'info',
  interview_passed: 'success',
  interview_failed: 'error',
  submitted_to_client: 'primary',
  selected: 'success',
  rejected: 'error'
}

const timelineSteps = ['Payment', 'MCQ Assessment', 'Mock Interview', 'Client Review', 'Final Decision']

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    payment_pending: 0,
    mcq_pending: 1,
    assessment_passed: 1,
    assessment_failed: 1,
    interview_pending: 2,
    interview_scheduled: 2,
    interview_passed: 2,
    interview_failed: 2,
    submitted_to_client: 3,
    selected: 4,
    rejected: 4
  }
  return map[status] ?? 0
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-950 dark:text-white">My Applications</h2>
      <p class="mt-1 text-gray-500">Track each application through the qualification pipeline.</p>
    </div>

    <div v-if="applications.length" class="space-y-4">
      <UCard v-for="app in applications" :key="app.id">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <!-- Job info -->
          <div class="flex-1">
            <div class="flex items-start gap-3">
              <div>
                <p class="text-lg font-semibold text-gray-950 dark:text-white">{{ store.getJobById(app.jobId)?.title || app.jobId }}</p>
                <p class="mt-1 text-sm text-gray-500">{{ store.getJobById(app.jobId)?.company }} · Applied {{ new Date(app.createdAt).toLocaleDateString() }}</p>
              </div>
              <UBadge :color="(statusColor[app.status] as any) || 'neutral'" variant="subtle" :label="statusLabel[app.status] || app.status" class="shrink-0" />
            </div>

            <!-- Status timeline -->
            <div class="mt-4 flex items-center gap-1">
              <template v-for="(step, index) in timelineSteps" :key="step">
                <div
                  class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="index <= getStepIndex(app.status) ? 'bg-primary-100 text-primary dark:bg-primary-900' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'"
                >
                  <UIcon
                    :name="index < getStepIndex(app.status) ? 'i-lucide-check-circle' : index === getStepIndex(app.status) ? 'i-lucide-circle-dot' : 'i-lucide-circle'"
                    class="size-3.5"
                  />
                  <span class="hidden sm:inline">{{ step }}</span>
                </div>
                <div v-if="index < timelineSteps.length - 1" class="h-0.5 w-3 bg-gray-200 dark:bg-gray-700" />
              </template>
            </div>

            <!-- Details -->
            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <span v-if="app.assessmentScore !== undefined">MCQ Score: {{ app.assessmentScore }}%</span>
              <span v-if="app.interviewSlot">Interview: {{ app.interviewSlot }}</span>
              <span>Payment: ₹{{ app.paymentAmount.toLocaleString('en-IN') }}</span>
            </div>
          </div>

          <UButton :to="`/application/${app.id}`" size="sm" label="View Details" trailing-icon="i-lucide-arrow-right" />
        </div>
      </UCard>
    </div>

    <UCard v-else>
      <div class="py-12 text-center">
        <UIcon name="i-lucide-briefcase" class="mx-auto size-16 text-gray-300" />
        <p class="mt-4 text-lg font-medium text-gray-500">No applications yet</p>
        <p class="mt-1 text-sm text-gray-400">Browse open jobs and start your first application.</p>
        <UButton to="/jobs" class="mt-5" label="Browse jobs" />
      </div>
    </UCard>
  </div>
</template>
