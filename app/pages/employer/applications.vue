<script setup lang="ts">
import type { Application, ApplicationStatus, Job } from '~/types/portal'
import KanbanBoard from '~/components/kanban/KanbanBoard.vue'
import ChatInterviewModal from '~/components/chat/ChatInterviewModal.vue'
import ChatOfferLetterModal from '~/components/chat/ChatOfferLetterModal.vue'

definePageMeta({ layout: 'employer' })

const store = useDataStore()
const { currentUser } = useAuth()

onMounted(async () => {
  await store.syncWithDatabase()
})

const viewMode = ref<'kanban' | 'table'>('kanban')
const selectedJobId = ref<string>('all')
const searchQuery = ref<string>('')

const applications = computed(() => store.getApplications())
const jobs = computed(() => store.getJobs())

const filteredApplications = computed(() => {
  let list = applications.value

  if (selectedJobId.value !== 'all') {
    list = list.filter(a => a.jobId === selectedJobId.value)
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

// Metrics
const stats = computed(() => {
  const all = filteredApplications.value
  const shortlisted = all.filter(a => a.status === 'submitted_to_client' || a.status === 'interview_pending').length
  const interviews = all.filter(a => a.status === 'interview_scheduled').length
  const offers = all.filter(a => a.status === 'selected').length

  return {
    total: all.length,
    shortlisted,
    interviews,
    offers
  }
})

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
    companyName: job?.company || (currentUser.value as any)?.company || 'Hiring Lead',
    candidateId: app.candidateId,
    candidateName: app.candidateName,
    candidateEmail: app.email,
    employerId: currentUser.value?.id || 'emp-demo',
    employerName: currentUser.value?.name || 'Recruiter Lead',
    employerCompany: (currentUser.value as any)?.company || 'Hiring Team',
    initialMessage: `Hi ${app.candidateName}! We are reviewing your application for the ${job?.title || 'position'}. When are you available for a quick discussion?`,
    requestStatus: 'accepted'
  })

  navigateTo(`/employer/messages?conversationId=${conv.id}`)
}

function handleScheduleInterview(app: Application) {
  const job = store.getJobById(app.jobId)
  const conv = store.getOrCreateConversation({
    jobId: app.jobId,
    jobTitle: job?.title,
    companyName: job?.company || (currentUser.value as any)?.company || 'Hiring Partner',
    candidateId: app.candidateId,
    candidateName: app.candidateName,
    candidateEmail: app.email,
    employerId: currentUser.value?.id || 'emp-demo',
    employerName: currentUser.value?.name || 'Recruiter Lead',
    requestStatus: 'accepted'
  })

  selectedConvForInterview.value = conv
  isInterviewModalOpen.value = true
}

function handleGenerateOffer(app: Application) {
  selectedAppForOffer.value = app
  isOfferModalOpen.value = true
}

const statusOptions: { label: string; value: ApplicationStatus }[] = [
  { label: 'Payment Pending', value: 'payment_pending' },
  { label: 'MCQ Pending', value: 'mcq_pending' },
  { label: 'MCQ Passed', value: 'assessment_passed' },
  { label: 'Shortlisted for Client', value: 'submitted_to_client' },
  { label: 'Interview Scheduled', value: 'interview_scheduled' },
  { label: 'Selected / Offer Extended', value: 'selected' },
  { label: 'Rejected', value: 'rejected' }
]

function updateAppStatus(appId: string, status: ApplicationStatus) {
  store.updateApplication(appId, { status })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl sm:text-2xl font-black text-gray-950 dark:text-white">Hiring Pipeline &amp; ATS</h1>
          <UBadge color="primary" variant="subtle" size="xs" label="Interactive Kanban" />
          <UBadge color="success" variant="subtle" size="xs" label="1-Click Offers 📄" />
        </div>
        <p class="mt-1 text-xs sm:text-sm text-gray-500">
          Manage candidate stages, drag &amp; drop cards, schedule video interviews, and extend branded offer letters.
        </p>
      </div>

      <!-- View Switcher & Action -->
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
            :class="viewMode === 'table' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'"
            @click="viewMode = 'table'"
          >
            <UIcon name="i-lucide-list" class="size-3.5" />
            <span>Table</span>
          </button>
        </div>

        <UButton
          to="/employer/messages"
          color="primary"
          icon="i-lucide-message-square"
          size="sm"
          label="Open Messages"
        />
      </div>
    </div>

    <!-- Stats Counter Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
        <p class="text-xs text-gray-500 font-medium">Total Applicants</p>
        <p class="mt-1 text-2xl font-black text-gray-950 dark:text-white">{{ stats.total }}</p>
      </div>
      <div class="rounded-xl border border-purple-200/60 bg-purple-50/40 p-4 shadow-2xs dark:border-purple-900/30 dark:bg-purple-950/20">
        <p class="text-xs text-purple-700 dark:text-purple-300 font-medium">Shortlisted in Review</p>
        <p class="mt-1 text-2xl font-black text-purple-900 dark:text-purple-200">{{ stats.shortlisted }}</p>
      </div>
      <div class="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 shadow-2xs dark:border-amber-900/30 dark:bg-amber-950/20">
        <p class="text-xs text-amber-700 dark:text-amber-300 font-medium">Interviews Scheduled</p>
        <p class="mt-1 text-2xl font-black text-amber-900 dark:text-amber-200">{{ stats.interviews }}</p>
      </div>
      <div class="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-4 shadow-2xs dark:border-emerald-900/30 dark:bg-emerald-950/20">
        <p class="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Offers Extended</p>
        <p class="mt-1 text-2xl font-black text-emerald-900 dark:text-emerald-200">{{ stats.offers }}</p>
      </div>
    </div>

    <!-- Filter Toolbar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
      <div class="relative flex-1 max-w-md">
        <UIcon name="i-lucide-search" class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by candidate name, email, or role..."
          class="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-indigo-500 focus:outline-hidden"
        />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold text-gray-500 whitespace-nowrap">Filter Job:</span>
        <select
          v-model="selectedJobId"
          class="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-indigo-500 focus:outline-hidden cursor-pointer"
        >
          <option value="all">All Jobs ({{ jobs.length }})</option>
          <option v-for="j in jobs" :key="j.id" :value="j.id">{{ j.title }}</option>
        </select>
      </div>
    </div>

    <!-- View Mode 1: Interactive Kanban Pipeline -->
    <div v-if="viewMode === 'kanban'">
      <KanbanBoard
        :applications="filteredApplications"
        role="employer"
        @open-chat="handleOpenChat"
        @schedule-interview="handleScheduleInterview"
        @generate-offer="handleGenerateOffer"
      />
    </div>

    <!-- View Mode 2: Structured Table List -->
    <div v-else class="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xs dark:border-gray-800 dark:bg-gray-900">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-gray-50 dark:bg-gray-800/60 text-gray-500 uppercase tracking-wider text-[10px] border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th class="py-3 px-4 font-bold">Candidate</th>
              <th class="py-3 px-4 font-bold">Job Role</th>
              <th class="py-3 px-4 font-bold">MCQ Score</th>
              <th class="py-3 px-4 font-bold">Status</th>
              <th class="py-3 px-4 font-bold">Interview / Offer</th>
              <th class="py-3 px-4 text-right font-bold">Quick Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="app in filteredApplications" :key="app.id" class="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition">
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-2.5">
                  <div class="size-8 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 grid place-items-center font-bold text-xs shrink-0">
                    {{ app.candidateName.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-bold text-gray-950 dark:text-white">{{ app.candidateName }}</p>
                    <p class="text-[11px] text-gray-500">{{ app.email }}</p>
                  </div>
                </div>
              </td>
              <td class="py-3.5 px-4 font-semibold text-gray-700 dark:text-gray-300">
                {{ store.getJobById(app.jobId)?.title || app.jobId }}
              </td>
              <td class="py-3.5 px-4">
                <UBadge
                  v-if="app.assessmentScore !== undefined"
                  :color="app.assessmentScore >= 70 ? 'success' : 'warning'"
                  variant="subtle"
                  size="xs"
                  :label="`${app.assessmentScore}%`"
                />
                <span v-else class="text-gray-400 text-[11px]">Pending</span>
              </td>
              <td class="py-3.5 px-4">
                <select
                  :value="app.status"
                  class="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
                  @change="updateAppStatus(app.id, ($event.target as HTMLSelectElement).value as any)"
                >
                  <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </td>
              <td class="py-3.5 px-4 text-xs">
                <span v-if="app.interviewSlot" class="text-cyan-700 dark:text-cyan-400 font-medium">📅 {{ app.interviewSlot }}</span>
                <span v-else-if="app.offerLetterDetails" class="text-emerald-700 dark:text-emerald-400 font-bold">🏆 Offer Sent</span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 cursor-pointer"
                    title="Chat"
                    @click="handleOpenChat(app)"
                  >
                    <UIcon name="i-lucide-message-square" class="size-4" />
                  </button>
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950 cursor-pointer"
                    title="Interview"
                    @click="handleScheduleInterview(app)"
                  >
                    <UIcon name="i-lucide-calendar-plus" class="size-4" />
                  </button>
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950 cursor-pointer"
                    title="Offer Letter"
                    @click="handleGenerateOffer(app)"
                  >
                    <UIcon name="i-lucide-file-badge" class="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
