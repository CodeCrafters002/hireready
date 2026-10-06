<script setup lang="ts">
import type { Application, GigApplication, Job } from '~/types/portal'

definePageMeta({ layout: 'employer' })

const store = useDataStore()
const { currentUser } = useAuth()

onMounted(async () => {
  await store.syncWithDatabase()
})

const syncing = ref(false)
async function refreshData() {
  syncing.value = true
  try {
    await store.syncWithDatabase()
  } finally {
    syncing.value = false
  }
}

// ── Reactive Data ─────────────────────────────────────────────────────────────
const allApplications = computed(() => store.getApplications())
const allGigApplications = computed(() => store.getGigApplications())
const jobs = computed(() => store.getJobs())
const gigs = computed(() => store.getGigs())
const profiles = computed(() => store.getProfiles())

// ── Filter State ──────────────────────────────────────────────────────────────
const activeTab = ref<'jobs' | 'gigs'>('jobs')
const statusFilter = ref<string>('all')
const selectedJobId = ref<string>('all')
const searchQuery = ref<string>('')

// Filtered Job Applications (shows ALL applications without prematurely hiding them)
const filteredJobApplications = computed(() => {
  let list = allApplications.value

  // Status Filter
  if (statusFilter.value === 'pending') {
    list = list.filter(a => a.status === 'submitted_to_client' || a.status === 'payment_pending' || a.status === 'applied' || a.status === 'interview_passed')
  } else if (statusFilter.value === 'selected') {
    list = list.filter(a => a.status === 'selected')
  } else if (statusFilter.value === 'rejected') {
    list = list.filter(a => a.status === 'rejected')
  }

  // Job Filter
  if (selectedJobId.value !== 'all') {
    list = list.filter(a => a.jobId === selectedJobId.value)
  }

  // Search Filter
  const q = searchQuery.value.toLowerCase().trim()
  if (q) {
    list = list.filter(a => {
      const job = jobs.value.find(j => j.id === a.jobId)
      const prof = getCandidateProfile(a.candidateId, a.email)
      const skills = (prof?.skills || []).join(' ').toLowerCase()
      return (
        a.candidateName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.phone && a.phone.includes(q)) ||
        (job?.title && job.title.toLowerCase().includes(q)) ||
        skills.includes(q)
      )
    })
  }

  return list
})

// Filtered Gig Applications
const filteredGigApplications = computed(() => {
  let list = allGigApplications.value
  const q = searchQuery.value.toLowerCase().trim()
  if (q) {
    list = list.filter(a => {
      const gig = gigs.value.find(g => g.id === a.gigId)
      return (
        a.candidateName.toLowerCase().includes(q) ||
        a.candidateEmail.toLowerCase().includes(q) ||
        (gig?.title && gig.title.toLowerCase().includes(q)) ||
        (a.upiId && a.upiId.toLowerCase().includes(q))
      )
    })
  }
  return list
})

// Stats calculation
const stats = computed(() => {
  const jobApps = allApplications.value
  const gigApps = allGigApplications.value

  const pendingJob = jobApps.filter(a => ['submitted_to_client', 'payment_pending', 'applied', 'interview_passed'].includes(a.status)).length
  const selectedJob = jobApps.filter(a => a.status === 'selected').length
  const totalGigs = gigApps.length

  return {
    totalJobApps: jobApps.length,
    pendingJob,
    selectedJob,
    totalGigs
  }
})

// ── Helpers ──────────────────────────────────────────────────────────────────
function getJob(jobId: string): Job | undefined {
  return jobs.value.find(j => j.id === jobId)
}

function getJobTitle(jobId: string): string {
  return getJob(jobId)?.title || jobId
}

function getCandidateProfile(candidateId: string, email?: string) {
  return profiles.value.find(p => p.userId === candidateId || (email && p.email?.toLowerCase() === email.toLowerCase()))
}

function getGig(gigId: string) {
  return gigs.value.find(g => g.id === gigId)
}

function handleDecision(appId: string, decision: 'selected' | 'rejected' | 'submitted_to_client') {
  const updated = store.updateApplication(appId, { status: decision })
  if (updated) {
    const job = getJob(updated.jobId)
    // Send in-app notification to candidate
    store.addNotification({
      userId: updated.candidateId,
      type: decision === 'selected' ? 'selection' : 'general',
      title: decision === 'selected' ? '🎉 Offer Extended!' : decision === 'rejected' ? 'Application Update' : 'Application Shortlisted',
      message: decision === 'selected'
        ? `Congratulations! You have been selected by ${job?.company || 'the hiring partner'} for the ${getJobTitle(updated.jobId)} position.`
        : decision === 'rejected'
        ? `Update regarding your application for ${getJobTitle(updated.jobId)}: The employer has closed this position.`
        : `Your application for ${getJobTitle(updated.jobId)} is now under active client review.`
    })
  }
}

async function handleGigStatus(appId: string, status: any) {
  await store.updateGigApplicationStatus(appId, { status })
}

// ── Resume Preview & Download ─────────────────────────────────────────────────
const pdfPreviewUrl = ref<string | null>(null)
const pdfPreviewTitle = ref<string>('')

function previewResume(url?: string, filename?: string) {
  if (!url) return
  pdfPreviewUrl.value = url
  pdfPreviewTitle.value = filename || 'Candidate Resume'
}

function downloadCandidateResume(url?: string, filename?: string) {
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'candidate_resume.pdf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ── Post Job Modal ────────────────────────────────────────────────────────────
const showPostJobModal = ref(false)
const postJobSubmitting = ref(false)
const postJobError = ref('')
const postJobSuccess = ref('')
const jobForm = reactive({
  title: '',
  company: (currentUser.value as any)?.company || currentUser.value?.name || '',
  location: (currentUser.value as any)?.city || 'Bengaluru / Hybrid',
  type: 'Full-time',
  salary: '₹6–10 LPA',
  summary: '',
  description: '',
  requirements: ''
})

function openPostJobModal() {
  postJobError.value = ''
  postJobSuccess.value = ''
  jobForm.company = (currentUser.value as any)?.company || currentUser.value?.name || ''
  showPostJobModal.value = true
}

async function handlePostJob() {
  if (!jobForm.title || !jobForm.company || !jobForm.description) {
    postJobError.value = 'Please provide Job Title, Company Name, and Description.'
    return
  }

  postJobSubmitting.value = true
  postJobError.value = ''

  try {
    const requirements = jobForm.requirements.split('\n').map(r => r.trim()).filter(Boolean)
    const newJob = store.createJob({
      title: jobForm.title.trim(),
      company: jobForm.company.trim(),
      location: jobForm.location.trim(),
      type: jobForm.type,
      salary: jobForm.salary.trim(),
      summary: jobForm.summary.trim() || jobForm.description.trim().slice(0, 120),
      description: jobForm.description.trim(),
      requirements,
      published: true
    })

    showPostJobModal.value = false
    postJobSuccess.value = `Job "${newJob.title}" has been posted successfully!`
    setTimeout(() => { postJobSuccess.value = '' }, 5000)
  } catch (err: any) {
    postJobError.value = err.message || 'Failed to post job.'
  } finally {
    postJobSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">

    <!-- ── Header ───────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-black text-gray-950 dark:text-white">Hiring Partner Workspace</h1>
          <UBadge color="success" variant="subtle" label="Verified Partner" size="xs" />
        </div>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review candidates who applied for your open positions and 1-day duty shifts in real time.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="syncing"
          @click="refreshData"
        />
        <UButton
          to="/employer/gigs"
          label="Manage 1-Day Shifts"
          icon="i-lucide-calendar-clock"
          color="neutral"
          variant="soft"
        />
        <UButton
          label="+ Post Job"
          icon="i-lucide-plus"
          color="primary"
          @click="openPostJobModal"
        />
      </div>
    </div>

    <!-- Success banner if job posted -->
    <div v-if="postJobSuccess" class="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
      <UIcon name="i-lucide-check-circle" class="size-5 shrink-0 text-emerald-600" />
      <span>{{ postJobSuccess }}</span>
    </div>

    <!-- ── Stats Overview ───────────────────────────────────────────────────── -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <UCard class="hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <UIcon name="i-lucide-users" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500">Total Applicants</p>
            <p class="text-2xl font-black text-gray-950 dark:text-white">{{ stats.totalJobApps }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <UIcon name="i-lucide-clock" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-amber-600 dark:text-amber-400">Awaiting Decision</p>
            <p class="text-2xl font-black text-amber-600 dark:text-amber-400">{{ stats.pendingJob }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <UIcon name="i-lucide-check-circle" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-emerald-600 dark:text-emerald-400">Offers Extended</p>
            <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400">{{ stats.selectedJob }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            <UIcon name="i-lucide-calendar" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-purple-600 dark:text-purple-400">1-Day Shift Applicants</p>
            <p class="text-2xl font-black text-purple-600 dark:text-purple-400">{{ stats.totalGigs }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- ── Main Channel Tabs ────────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-center gap-3 border-b border-gray-200 pb-2 dark:border-gray-800">
      <button
        type="button"
        class="inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-bold transition-colors"
        :class="activeTab === 'jobs' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'"
        @click="activeTab = 'jobs'"
      >
        <UIcon name="i-lucide-briefcase" class="size-4" />
        <span>Full-Time Job Applicants ({{ allApplications.length }})</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-bold transition-colors"
        :class="activeTab === 'gigs' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'"
        @click="activeTab = 'gigs'"
      >
        <UIcon name="i-lucide-calendar-clock" class="size-4" />
        <span>1-Day Duty &amp; Shift Candidates ({{ allGigApplications.length }})</span>
      </button>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════
         TAB 1: FULL-TIME JOB APPLICANTS
         ════════════════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'jobs'" class="space-y-4">

      <!-- Filter toolbar -->
      <div class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
        <!-- Status chips -->
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="s in [
              { id: 'all', label: 'All Applicants' },
              { id: 'pending', label: 'Awaiting Decision' },
              { id: 'selected', label: 'Selected / Offers' },
              { id: 'rejected', label: 'Archived / Passed' }
            ]"
            :key="s.id"
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            :class="statusFilter === s.id ? 'bg-primary text-white shadow-2xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'"
            @click="statusFilter = s.id"
          >
            {{ s.label }}
          </button>
        </div>

        <!-- Job dropdown and search -->
        <div class="flex flex-wrap items-center gap-2">
          <select
            v-model="selectedJobId"
            class="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 shadow-2xs focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="all">All Jobs</option>
            <option v-for="j in jobs" :key="j.id" :value="j.id">
              {{ j.title }} ({{ j.company }})
            </option>
          </select>

          <div class="relative min-w-[200px]">
            <UIcon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search candidate or skill..."
              class="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-2.5 text-xs text-gray-900 shadow-2xs placeholder-gray-400 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredJobApplications.length === 0" class="rounded-2xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-800">
        <UIcon name="i-lucide-user-check" class="mx-auto size-12 text-gray-400" />
        <h3 class="mt-3 text-base font-bold text-gray-950 dark:text-white">No applicants matching this filter</h3>
        <p class="mt-1 text-xs text-gray-500 max-w-md mx-auto">
          When candidates apply for your positions, their full details, resumes, and contact info will appear here immediately.
        </p>
        <UButton class="mt-4" label="Clear Filters" variant="outline" color="neutral" size="xs" @click="statusFilter = 'all'; selectedJobId = 'all'; searchQuery = ''" />
      </div>

      <!-- Applications List -->
      <div v-else class="grid gap-4">
        <UCard
          v-for="app in filteredJobApplications"
          :key="app.id"
          class="border border-gray-200 transition-all hover:shadow-md dark:border-gray-800"
        >
          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

            <!-- Candidate Details -->
            <div class="space-y-3 flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-3">
                <div class="grid size-11 place-items-center rounded-full bg-emerald-100 text-base font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                  {{ app.candidateName.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-bold text-gray-950 dark:text-white truncate">{{ app.candidateName }}</h3>
                    <UBadge
                      :color="app.status === 'selected' ? 'success' : app.status === 'rejected' ? 'error' : 'warning'"
                      variant="subtle"
                      size="xs"
                      :label="app.status === 'selected' ? 'Offer Extended' : app.status === 'rejected' ? 'Not Selected' : 'Ready for Review'"
                    />
                  </div>
                  <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <a :href="`mailto:${app.email}`" class="hover:text-primary underline">{{ app.email }}</a>
                    <span>•</span>
                    <a v-if="app.phone" :href="`tel:${app.phone}`" class="hover:text-primary font-medium">{{ app.phone }}</a>
                    <span>•</span>
                    <span>Applied: {{ app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN') : 'Recent' }}</span>
                  </div>
                </div>
              </div>

              <!-- Job & Verification Info -->
              <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                <div class="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                  <span class="text-gray-400">Position Applied For</span>
                  <p class="font-bold text-gray-900 dark:text-white truncate">{{ getJobTitle(app.jobId) }}</p>
                  <p class="text-[11px] text-gray-500">{{ getJob(app.jobId)?.company }}</p>
                </div>

                <div class="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                  <span class="text-gray-400">Assessment Status</span>
                  <p class="font-semibold" :class="app.assessmentScore ? 'text-emerald-600' : 'text-gray-700 dark:text-gray-300'">
                    {{ app.assessmentScore ? `${app.assessmentScore}% Score` : 'Direct Application' }}
                  </p>
                  <p class="text-[11px] text-gray-400">Direct Delivery</p>
                </div>

                <div class="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                  <span class="text-gray-400">Mock Interview</span>
                  <p class="font-semibold text-gray-900 dark:text-white truncate">
                    {{ app.interviewSlot || 'Ready for Client Scheduling' }}
                  </p>
                </div>
              </div>

              <!-- Candidate Profile & Resume -->
              <div v-if="getCandidateProfile(app.candidateId, app.email)" class="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 pt-1">
                <div v-if="getCandidateProfile(app.candidateId, app.email)?.skills?.length" class="flex flex-wrap items-center gap-1.5">
                  <span class="font-semibold text-gray-400">Skills:</span>
                  <UBadge
                    v-for="s in getCandidateProfile(app.candidateId, app.email)?.skills"
                    :key="s"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                    :label="s"
                  />
                </div>
                <div class="flex flex-wrap gap-4 text-gray-500">
                  <p v-if="getCandidateProfile(app.candidateId, app.email)?.education">
                    <strong class="text-gray-700 dark:text-gray-300">Education:</strong> {{ getCandidateProfile(app.candidateId, app.email)?.education }}
                  </p>
                  <p v-if="getCandidateProfile(app.candidateId, app.email)?.experience">
                    <strong class="text-gray-700 dark:text-gray-300">Experience:</strong> {{ getCandidateProfile(app.candidateId, app.email)?.experience }}
                  </p>
                  <p v-if="getCandidateProfile(app.candidateId, app.email)?.city">
                    <strong class="text-gray-700 dark:text-gray-300">City:</strong> {{ getCandidateProfile(app.candidateId, app.email)?.city }}
                  </p>
                </div>

                <!-- Attached Resume -->
                <div v-if="getCandidateProfile(app.candidateId, app.email)?.resumeFilename" class="mt-2 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/80 p-2.5 dark:border-gray-800 dark:bg-gray-800/40">
                  <div class="flex items-center gap-2 min-w-0">
                    <UIcon name="i-lucide-file-text" class="size-4 shrink-0 text-red-500" />
                    <span class="truncate font-semibold text-gray-900 dark:text-white">{{ getCandidateProfile(app.candidateId, app.email)?.resumeFilename }}</span>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0 ml-2">
                    <UButton
                      v-if="getCandidateProfile(app.candidateId, app.email)?.resumeDataUrl"
                      size="xs"
                      color="primary"
                      variant="soft"
                      icon="i-lucide-eye"
                      label="View Resume"
                      @click="previewResume(getCandidateProfile(app.candidateId, app.email)?.resumeDataUrl, getCandidateProfile(app.candidateId, app.email)?.resumeFilename)"
                    />
                    <UButton
                      v-if="getCandidateProfile(app.candidateId, app.email)?.resumeDataUrl"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-download"
                      title="Download"
                      @click="downloadCandidateResume(getCandidateProfile(app.candidateId, app.email)?.resumeDataUrl, getCandidateProfile(app.candidateId, app.email)?.resumeFilename)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Employer Decision Controls -->
            <div class="flex flex-row lg:flex-col gap-2 border-t border-gray-100 pt-3 lg:border-t-0 lg:pt-0 shrink-0">
              <UButton
                v-if="app.status !== 'selected'"
                size="sm"
                color="success"
                icon="i-lucide-check-circle"
                label="Make Offer / Select"
                @click="handleDecision(app.id, 'selected')"
              />
              <UButton
                v-if="app.status !== 'submitted_to_client' && app.status !== 'selected'"
                size="sm"
                color="primary"
                variant="soft"
                icon="i-lucide-bookmark"
                label="Shortlist Profile"
                @click="handleDecision(app.id, 'submitted_to_client')"
              />
              <UButton
                v-if="app.status !== 'rejected'"
                size="sm"
                color="error"
                variant="outline"
                icon="i-lucide-x-circle"
                label="Pass / Reject"
                @click="handleDecision(app.id, 'rejected')"
              />
              <span v-if="app.status === 'selected'" class="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <UIcon name="i-lucide-check" class="size-4" /> Offer Confirmed
              </span>
            </div>

          </div>
        </UCard>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════
         TAB 2: 1-DAY SHIFTS & DUTIES APPLICANTS
         ════════════════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeTab === 'gigs'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-gray-900 dark:text-white">Registered Shift Duty Candidates</h2>
          <p class="text-xs text-gray-500">Candidates signed up for exam invigilation, event coordination, and technical support.</p>
        </div>
        <UButton to="/employer/gigs" label="Open Duty Manager" icon="i-lucide-external-link" size="xs" color="neutral" variant="outline" />
      </div>

      <div v-if="filteredGigApplications.length === 0" class="rounded-2xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-800">
        <UIcon name="i-lucide-calendar-x" class="mx-auto size-12 text-gray-400" />
        <h3 class="mt-3 text-base font-bold text-gray-950 dark:text-white">No 1-day duty applications yet</h3>
        <p class="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
          When candidates register for your 1-day shifts, their details and UPI payout info will appear here.
        </p>
      </div>

      <div v-else class="grid gap-3">
        <UCard v-for="gApp in filteredGigApplications" :key="gApp.id" class="border border-gray-200 dark:border-gray-800">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-sm text-gray-950 dark:text-white">{{ gApp.candidateName }}</h4>
                <UBadge
                  :color="gApp.status === 'accepted' ? 'primary' : gApp.status === 'checked_in' ? 'warning' : gApp.status === 'completed' || gApp.status === 'paid' ? 'success' : 'neutral'"
                  size="xs"
                  variant="subtle"
                  :label="gApp.status.replace(/_/g, ' ')"
                />
              </div>
              <p class="text-xs text-gray-500">
                {{ gApp.candidateEmail }} • {{ gApp.candidateMobile }} • {{ gApp.college || 'College/Univ' }}
              </p>
              <div class="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                <UIcon name="i-lucide-briefcase" class="size-3.5" />
                <span>Duty: <strong>{{ getGig(gApp.gigId)?.title || '1-Day Shift' }}</strong></span>
                <span>•</span>
                <span>UPI: {{ gApp.upiId }}</span>
                <span>•</span>
                <span>Payout: ₹{{ gApp.payoutAmount }}</span>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-2 shrink-0">
              <UButton
                v-if="gApp.status === 'applied'"
                size="xs"
                color="primary"
                label="Accept Shift"
                @click="handleGigStatus(gApp.id, 'accepted')"
              />
              <UButton
                v-if="gApp.status === 'accepted'"
                size="xs"
                color="warning"
                label="Mark Check-in"
                @click="handleGigStatus(gApp.id, 'checked_in')"
              />
              <UButton
                v-if="gApp.status === 'checked_in'"
                size="xs"
                color="success"
                label="Complete &amp; Release Pay"
                @click="handleGigStatus(gApp.id, 'completed')"
              />
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════
         POST JOB MODAL
         ════════════════════════════════════════════════════════════════════════ -->
    <div v-if="showPostJobModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h3 class="text-lg font-bold text-gray-950 dark:text-white">Post New Job Opening</h3>
            <p class="text-xs text-gray-500">List an open role on the HireReady candidate job board</p>
          </div>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-white" @click="showPostJobModal = false">
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
        </div>

        <!-- Body -->
        <form class="flex-1 overflow-y-auto p-6 space-y-4" @submit.prevent="handlePostJob">
          <div v-if="postJobError" class="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {{ postJobError }}
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Job Title *" required>
              <UInput v-model="jobForm.title" placeholder="e.g. Senior Frontend Engineer" class="w-full" />
            </UFormField>

            <UFormField label="Hiring Organization / Company *" required>
              <UInput v-model="jobForm.company" placeholder="e.g. TCS / BrightStack" class="w-full" />
            </UFormField>

            <UFormField label="Location">
              <UInput v-model="jobForm.location" placeholder="e.g. Bengaluru / Hybrid" class="w-full" />
            </UFormField>

            <UFormField label="Salary / CTC Range">
              <UInput v-model="jobForm.salary" placeholder="e.g. ₹6–10 LPA" class="w-full" />
            </UFormField>

            <UFormField label="Job Type">
              <select
                v-model="jobForm.type"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </UFormField>

            <UFormField label="Short Summary">
              <UInput v-model="jobForm.summary" placeholder="One-line summary for candidate cards" class="w-full" />
            </UFormField>
          </div>

          <UFormField label="Job Description *" required>
            <UTextarea v-model="jobForm.description" placeholder="Describe the role, day-to-day responsibilities, and team..." :rows="3" class="w-full" />
          </UFormField>

          <UFormField label="Key Requirements (one per line)">
            <UTextarea v-model="jobForm.requirements" placeholder="2+ years experience in Vue or React&#10;Strong communication skills&#10;Bachelor's degree in CS or equivalent" :rows="3" class="w-full" />
          </UFormField>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <UButton label="Cancel" color="neutral" variant="ghost" type="button" @click="showPostJobModal = false" />
            <UButton type="submit" label="Publish Job Listing" icon="i-lucide-send" color="primary" :loading="postJobSubmitting" />
          </div>
        </form>
      </div>
    </div>

    <!-- ── Resume PDF Preview Modal ─────────────────────────────────────────── -->
    <div
      v-if="pdfPreviewUrl"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div class="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-file-text" class="size-5 text-red-500" />
            <h3 class="font-bold text-gray-950 dark:text-white">{{ pdfPreviewTitle }}</h3>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              size="xs"
              color="primary"
              variant="outline"
              icon="i-lucide-download"
              label="Download"
              @click="downloadCandidateResume(pdfPreviewUrl, pdfPreviewTitle)"
            />
            <button class="text-gray-400 hover:text-gray-600 dark:hover:text-white" @click="pdfPreviewUrl = null">
              <UIcon name="i-lucide-x" class="size-5" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-hidden p-2">
          <iframe
            :src="pdfPreviewUrl"
            class="size-full rounded-xl border border-gray-200 dark:border-gray-800"
            title="Candidate Resume Preview"
          />
        </div>
      </div>
    </div>

  </div>
</template>
