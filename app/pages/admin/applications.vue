<script setup lang="ts">
import type { ApplicationStatus } from '~/types/portal'

definePageMeta({ layout: 'admin' })

const store = useDataStore()
const applications = ref(store.getApplications())

const statusOptions: { label: string; value: ApplicationStatus }[] = [
  { label: 'Payment Pending', value: 'payment_pending' },
  { label: 'MCQ Pending', value: 'mcq_pending' },
  { label: 'MCQ Passed', value: 'assessment_passed' },
  { label: 'MCQ Failed', value: 'assessment_failed' },
  { label: 'Interview Pending', value: 'interview_pending' },
  { label: 'Interview Scheduled', value: 'interview_scheduled' },
  { label: 'Interview Passed', value: 'interview_passed' },
  { label: 'Interview Failed', value: 'interview_failed' },
  { label: 'Submitted to Client', value: 'submitted_to_client' },
  { label: 'Selected', value: 'selected' },
  { label: 'Rejected', value: 'rejected' }
]

const statusColor: Record<string, string> = {
  payment_pending: 'warning', mcq_pending: 'warning',
  assessment_passed: 'success', assessment_failed: 'error',
  interview_pending: 'warning', interview_scheduled: 'info',
  interview_passed: 'success', interview_failed: 'error',
  submitted_to_client: 'primary', selected: 'success', rejected: 'error'
}

function updateAppStatus(id: string, newStatus: ApplicationStatus) {
  store.updateApplication(id, { status: newStatus })
  // Add notification for the candidate
  const app = store.getApplicationById(id)
  if (app) {
    const job = store.getJobById(app.jobId)
    const label = statusOptions.find(s => s.value === newStatus)?.label || newStatus
    store.addNotification({
      userId: app.candidateId,
      type: newStatus.includes('payment') ? 'payment' : newStatus.includes('assessment') || newStatus.includes('mcq') ? 'assessment' : newStatus.includes('interview') ? 'interview' : 'selection',
      title: `Application status updated`,
      message: `Your application for ${job?.title || 'a role'} is now: ${label}`
    })
  }
  applications.value = store.getApplications()
}

const filterStatus = ref<string>('')
const filteredApps = computed(() => {
  if (!filterStatus.value) return applications.value
  return applications.value.filter(a => a.status === filterStatus.value)
})
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Manage Applications</h2>
        <p class="mt-1 text-gray-500">{{ applications.length }} total applications</p>
      </div>
      <USelectMenu
        v-model="filterStatus"
        :items="[{ label: 'All statuses', value: '' }, ...statusOptions]"
        value-key="value"
        class="w-52"
        placeholder="Filter by status"
      />
    </div>

    <div class="space-y-3">
      <UCard v-for="app in filteredApps" :key="app.id">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex-1">
            <div class="flex items-start gap-2">
              <p class="font-semibold text-gray-950 dark:text-white">{{ app.candidateName }}</p>
              <UBadge :color="(statusColor[app.status] as any) || 'neutral'" variant="subtle" :label="statusOptions.find(s => s.value === app.status)?.label || app.status" size="xs" />
            </div>
            <p class="mt-1 text-sm text-gray-500">
              {{ store.getJobById(app.jobId)?.title || app.jobId }} · {{ app.email }} · Applied {{ new Date(app.createdAt).toLocaleDateString() }}
            </p>
            <div class="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-400">
              <span v-if="app.assessmentScore !== undefined">MCQ: {{ app.assessmentScore }}%</span>
              <span v-if="app.interviewSlot">Interview: {{ app.interviewSlot }}</span>
              <span>Payment: ₹{{ app.paymentAmount.toLocaleString('en-IN') }}</span>
            </div>
          </div>
          <USelectMenu
            :model-value="app.status"
            :items="statusOptions"
            value-key="value"
            class="w-48 shrink-0"
            placeholder="Change status"
            @update:model-value="(val: any) => updateAppStatus(app.id, val)"
          />
        </div>
      </UCard>
    </div>

    <UCard v-if="!filteredApps.length" class="mt-4">
      <div class="py-8 text-center text-gray-500">No applications match the filter.</div>
    </UCard>
  </div>
</template>
