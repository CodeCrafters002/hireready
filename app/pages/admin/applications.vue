<script setup lang="ts">
import type { Application, ApplicationStatus, Job } from '~/types/portal'
import KanbanBoard from '~/components/kanban/KanbanBoard.vue'
import ChatInterviewModal from '~/components/chat/ChatInterviewModal.vue'
import ChatOfferLetterModal from '~/components/chat/ChatOfferLetterModal.vue'

definePageMeta({ layout: 'admin' })

const store = useDataStore()
const { currentUser } = useAuth()

onMounted(async () => {
  await store.syncWithDatabase()
})

const viewMode = ref<'kanban' | 'list'>('kanban')
const filterStatus = ref<string>('')
const filterJobId = ref<string>('all')
const searchQuery = ref<string>('')

const applications = computed(() => store.getApplications())
const jobs = computed(() => store.getJobs())

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

const filteredApps = computed(() => {
  let list = applications.value

  if (filterStatus.value) {
    list = list.filter(a => a.status === filterStatus.value)
  }

  if (filterJobId.value !== 'all') {
    list = list.filter(a => a.jobId === filterJobId.value)
  }

  const q = searchQuery.value.toLowerCase().trim()
  if (q) {
    list = list.filter(a =>
      a.candidateName.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.phone && a.phone.includes(q)) ||
      (store.getJobById(a.jobId)?.title.toLowerCase().includes(q))
    )
  }

  return list
})

function updateAppStatus(id: string, newStatus: ApplicationStatus) {
  store.updateApplication(id, { status: newStatus })
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
}

// ── Modals State ─────────────────────────────────────────────────────────────
const isInterviewModalOpen = ref(false)
const selectedConvForInterview = ref<any>(null)

const isOfferModalOpen = ref(false)
const selectedAppForOffer = ref<Application | null>(null)

function handleOpenChat(app: Application) {
  const job = store.getJobById(app.jobId)
  const conv = store.getOrCreateConversation({
    jobId: app.jobId,
    jobTitle: job?.title,
    companyName: job?.company || 'HireReady Platform Team',
    candidateId: app.candidateId,
    candidateName: app.candidateName,
    candidateEmail: app.email,
    employerId: 'admin-lead',
    employerName: currentUser.value?.name || 'Administrator',
    employerCompany: 'HireReady Platform Team',
    initialMessage: `Hello ${app.candidateName}, this is HireReady Platform Team regarding your application for ${job?.title || 'the position'}.`,
    initialSenderRole: 'admin',
    requestStatus: 'accepted'
  })

  navigateTo(`/admin/messages?conversationId=${conv.id}`)
}

function handleScheduleInterview(app: Application) {
  const job = store.getJobById(app.jobId)
  const conv = store.getOrCreateConversation({
    jobId: app.jobId,
    jobTitle: job?.title,
    companyName: job?.company || 'HireReady Partner',
    candidateId: app.candidateId,
    candidateName: app.candidateName,
    candidateEmail: app.email,
    employerId: 'admin-lead',
    employerName: currentUser.value?.name || 'Administrator',
    initialSenderRole: 'admin',
    requestStatus: 'accepted'
  })

  selectedConvForInterview.value = conv
  isInterviewModalOpen.value = true
}

function handleGenerateOffer(app: Application) {
  selectedAppForOffer.value = app
  isOfferModalOpen.value = true
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold text-gray-950 dark:text-white">Manage Applications</h1>
          <UBadge color="primary" variant="subtle" size="xs" label="Kanban &amp; Pipeline" />
        </div>
        <p class="mt-1 text-sm text-gray-500">{{ applications.length }} total candidate applications</p>
      </div>

      <!-- Controls & Toggle -->
      <div class="flex items-center gap-2.5">
        <div class="flex rounded-xl border border-gray-200 p-0.5 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs">
          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
            :class="viewMode === 'kanban' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'"
            @click="viewMode = 'kanban'"
          >
            <UIcon name="i-lucide-kanban" class="size-3.5" />
            <span>Kanban</span>
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
            :class="viewMode === 'list' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'"
            @click="viewMode = 'list'"
          >
            <UIcon name="i-lucide-list" class="size-3.5" />
            <span>List</span>
          </button>
        </div>

        <UButton
          to="/admin/messages"
          color="primary"
          icon="i-lucide-message-square"
          size="sm"
          label="Admin Messages"
        />
      </div>
    </div>

    <!-- Filters Toolbar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
      <div class="relative flex-1 max-w-sm">
        <UIcon name="i-lucide-search" class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by candidate name, email, or role..."
          class="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-indigo-500 focus:outline-hidden"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="filterJobId"
          class="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-indigo-500 focus:outline-hidden cursor-pointer"
        >
          <option value="all">All Jobs</option>
          <option v-for="j in jobs" :key="j.id" :value="j.id">{{ j.title }}</option>
        </select>

        <select
          v-model="filterStatus"
          class="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-indigo-500 focus:outline-hidden cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
    </div>

    <!-- View Mode 1: Kanban Pipeline -->
    <div v-if="viewMode === 'kanban'">
      <KanbanBoard
        :applications="filteredApps"
        role="admin"
        @open-chat="handleOpenChat"
        @schedule-interview="handleScheduleInterview"
        @generate-offer="handleGenerateOffer"
      />
    </div>

    <!-- View Mode 2: List View -->
    <div v-else class="space-y-3">
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
              <span v-if="app.offerLetterDetails" class="text-emerald-600 font-bold">Offer Extended</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
              title="Chat with candidate"
              @click="handleOpenChat(app)"
            >
              <UIcon name="i-lucide-message-square" class="size-4" />
            </button>

            <button
              type="button"
              class="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-amber-50 hover:text-amber-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
              title="Schedule interview"
              @click="handleScheduleInterview(app)"
            >
              <UIcon name="i-lucide-calendar-plus" class="size-4" />
            </button>

            <button
              type="button"
              class="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
              title="Generate Offer Letter"
              @click="handleGenerateOffer(app)"
            >
              <UIcon name="i-lucide-file-badge" class="size-4" />
            </button>

            <USelectMenu
              :model-value="app.status"
              :items="statusOptions"
              value-key="value"
              class="w-48 shrink-0"
              placeholder="Change status"
              @update:model-value="(val: any) => updateAppStatus(app.id, val)"
            />
          </div>
        </div>
      </UCard>

      <UCard v-if="!filteredApps.length" class="mt-4">
        <div class="py-8 text-center text-gray-500">No applications match the filter.</div>
      </UCard>
    </div>

    <!-- Modals -->
    <ChatInterviewModal
      v-model="isInterviewModalOpen"
      :conversation="selectedConvForInterview"
    />

    <ChatOfferLetterModal
      v-model="isOfferModalOpen"
      :application="selectedAppForOffer"
      :candidate-name="selectedAppForOffer?.candidateName"
      :candidate-email="selectedAppForOffer?.email"
      :job-title="selectedAppForOffer?.jobId ? store.getJobById(selectedAppForOffer.jobId)?.title : ''"
    />
  </div>
</template>
