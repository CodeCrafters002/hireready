<script setup lang="ts">
import type { Application, GigApplication, Job, InterviewDetails, InterviewPlatform } from '~/types/portal'

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
const activeTab = ref<'jobs' | 'gigs' | 'matches'>('jobs')
const statusFilter = ref<string>('all')
const selectedJobId = ref<string>('all')
const searchQuery = ref<string>('')

// ── Smart Talent Match Engine ────────────────────────────────────────────────
const { getMatchingCandidatesForJob, extractJobSkills } = useJobMatching()
const matchingJobId = ref<string>('')

watch(jobs, (jList) => {
  if (!matchingJobId.value && jList && jList.length > 0) {
    matchingJobId.value = jList[0]?.id || ''
  }
}, { immediate: true })

const currentMatchingJob = computed(() => {
  return jobs.value.find(j => j.id === matchingJobId.value) || jobs.value[0]
})

const matchedCandidates = computed(() => {
  if (!currentMatchingJob.value) return []
  return getMatchingCandidatesForJob(currentMatchingJob.value, profiles.value)
})

const invitedCandidates = ref<Record<string, boolean>>({})

function inviteCandidate(candidateProfile: any) {
  if (!currentMatchingJob.value) return
  invitedCandidates.value[candidateProfile.userId] = true

  store.addNotification({
    userId: candidateProfile.userId,
    type: 'interview',
    title: `🎉 Employer Match Invitation: ${currentMatchingJob.value.title}`,
    message: `${currentMatchingJob.value.company} reviewed your profile skills and invited you to apply & interview for the ${currentMatchingJob.value.title} opening!`
  })
}

// Filtered Job Applications (shows ALL applications without prematurely hiding them)
const filteredJobApplications = computed(() => {
  let list = allApplications.value

  // Status Filter
  if (statusFilter.value === 'pending') {
    list = list.filter(a => a.status === 'submitted_to_client' || a.status === 'payment_pending' || a.status === 'applied' || a.status === 'interview_passed')
  } else if (statusFilter.value === 'interview') {
    list = list.filter(a => a.status === 'interview_scheduled' || !!a.interviewDetails)
  } else if (statusFilter.value === 'fasttrack') {
    list = list.filter(a => !!getCandidateProfile(a.candidateId, a.email)?.isFastTrackPro)
  } else if (statusFilter.value === 'shortlisted') {
    list = list.filter(a => a.status === 'submitted_to_client')
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
  const scheduledInterviews = jobApps.filter(a => a.status === 'interview_scheduled' || !!a.interviewDetails).length
  const selectedJob = jobApps.filter(a => a.status === 'selected').length
  const fastTrackCount = jobApps.filter(a => !!getCandidateProfile(a.candidateId, a.email)?.isFastTrackPro).length
  const totalGigs = gigApps.length

  return {
    totalJobApps: jobApps.length,
    pendingJob,
    scheduledInterviews,
    fastTrackCount,
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

// ── Interview Scheduling State & Logic ─────────────────────────────────────────
const isInterviewModalOpen = ref(false)
const selectedAppForInterview = ref<Application | null>(null)
const interviewSubmitting = ref(false)
const interviewForm = reactive({
  roundName: 'Technical Round 1',
  platform: 'google_meet' as InterviewPlatform,
  meetingLink: '',
  interviewDate: '',
  interviewTime: '11:00',
  durationMinutes: 45,
  interviewerName: '',
  notes: ''
})

function generateGoogleMeetLink(): string {
  const code = () => Math.random().toString(36).substring(2, 6)
  return `https://meet.google.com/hry-${code()}-${code().slice(0, 3)}`
}

function openInterviewModal(app: Application) {
  selectedAppForInterview.value = app

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().split('T')[0]

  if (app.interviewDetails) {
    const d = app.interviewDetails
    interviewForm.roundName = d.roundName || 'Technical Round 1'
    interviewForm.platform = d.platform || 'google_meet'
    interviewForm.meetingLink = d.meetingLink || ''
    if (d.scheduledAt && d.scheduledAt.includes('T')) {
      const parts = d.scheduledAt.split('T')
      interviewForm.interviewDate = parts[0]
      interviewForm.interviewTime = parts[1]?.slice(0, 5) || '11:00'
    } else {
      interviewForm.interviewDate = defaultDate
      interviewForm.interviewTime = '11:00'
    }
    interviewForm.durationMinutes = d.durationMinutes || 45
    interviewForm.interviewerName = d.interviewerName || currentUser.value?.name || 'Hiring Lead'
    interviewForm.notes = d.notes || ''
  } else {
    interviewForm.roundName = 'Technical Round 1'
    interviewForm.platform = 'google_meet'
    interviewForm.meetingLink = generateGoogleMeetLink()
    interviewForm.interviewDate = defaultDate
    interviewForm.interviewTime = '11:00'
    interviewForm.durationMinutes = 45
    interviewForm.interviewerName = currentUser.value?.name || 'Hiring Lead'
    interviewForm.notes = 'Please join with camera enabled, stable internet connection, and resume ready.'
  }
  isInterviewModalOpen.value = true
}

function selectPlatform(platform: InterviewPlatform) {
  interviewForm.platform = platform
  if (platform === 'google_meet') {
    if (!interviewForm.meetingLink || !interviewForm.meetingLink.includes('meet.google.com')) {
      interviewForm.meetingLink = generateGoogleMeetLink()
    }
  } else if (platform === 'hireready_call') {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://hireready-drab-nine.vercel.app'
    interviewForm.meetingLink = `${base}/meet/${selectedAppForInterview.value?.id || 'live'}`
  } else if (platform === 'zoom') {
    if (!interviewForm.meetingLink || !interviewForm.meetingLink.includes('zoom.us')) {
      interviewForm.meetingLink = `https://zoom.us/j/${Math.floor(1000000000 + Math.random() * 9000000000)}?pwd=${Math.random().toString(36).slice(2, 8)}`
    }
  } else if (platform === 'phone') {
    interviewForm.meetingLink = `tel:${selectedAppForInterview.value?.phone || ''}`
  }
}

function getPlatformIcon(platform: InterviewPlatform | string): string {
  switch (platform) {
    case 'google_meet': return 'i-lucide-video'
    case 'zoom': return 'i-lucide-monitor-play'
    case 'hireready_call': return 'i-lucide-sparkles'
    case 'phone': return 'i-lucide-phone-call'
    default: return 'i-lucide-video'
  }
}

function getPlatformLabel(platform: InterviewPlatform | string): string {
  switch (platform) {
    case 'google_meet': return 'Google Meet'
    case 'zoom': return 'Zoom'
    case 'hireready_call': return 'HireReady In-App Call'
    case 'phone': return 'Direct Phone Call'
    default: return 'Video Call'
  }
}

function formatInterviewDateTime(isoString: string): string {
  if (!isoString) return 'Time not specified'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return d.toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return isoString
  }
}

async function submitInterviewSchedule() {
  if (!selectedAppForInterview.value) return
  if (!interviewForm.roundName || !interviewForm.interviewDate || !interviewForm.interviewTime) {
    alert('Please enter round name, date, and time.')
    return
  }

  interviewSubmitting.value = true
  try {
    const app = selectedAppForInterview.value
    const job = getJob(app.jobId)
    const scheduledDateTime = `${interviewForm.interviewDate}T${interviewForm.interviewTime}`

    const interviewDetails: InterviewDetails = {
      roundName: interviewForm.roundName.trim(),
      platform: interviewForm.platform,
      meetingLink: interviewForm.meetingLink.trim(),
      scheduledAt: scheduledDateTime,
      durationMinutes: Number(interviewForm.durationMinutes) || 45,
      interviewerName: interviewForm.interviewerName.trim() || 'Hiring Lead',
      notes: interviewForm.notes.trim(),
      status: 'scheduled'
    }

    const slotLabel = `${interviewDetails.roundName} · ${formatInterviewDateTime(scheduledDateTime)}`

    store.updateApplication(app.id, {
      status: 'interview_scheduled',
      interviewDetails,
      interviewSlot: slotLabel
    })

    // In-app Notification for Candidate
    store.addNotification({
      userId: app.candidateId,
      type: 'interview',
      title: `📅 Interview Scheduled: ${interviewDetails.roundName}`,
      message: `${job?.company || 'Hiring Partner'} has invited you to an interview for ${getJobTitle(app.jobId)} on ${formatInterviewDateTime(scheduledDateTime)} via ${getPlatformLabel(interviewDetails.platform)}.`
    })

    isInterviewModalOpen.value = false
  } finally {
    interviewSubmitting.value = false
  }
}

function cancelInterview(appId: string) {
  if (!confirm('Are you sure you want to cancel this interview?')) return
  const app = store.getApplicationById(appId)
  if (!app) return

  store.updateApplication(appId, {
    status: 'submitted_to_client',
    interviewDetails: undefined,
    interviewSlot: undefined
  })

  store.addNotification({
    userId: app.candidateId,
    type: 'interview',
    title: 'Interview Cancelled',
    message: `Your interview for ${getJobTitle(app.jobId)} has been cancelled by the employer.`
  })
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
  requirements: '',
  isFeatured: false
})

function openPostJobModal() {
  postJobError.value = ''
  postJobSuccess.value = ''
  jobForm.company = (currentUser.value as any)?.company || currentUser.value?.name || ''
  jobForm.isFeatured = false
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
      published: true,
      isFeatured: jobForm.isFeatured,
      isUrgent: jobForm.isFeatured,
      featuredBadge: jobForm.isFeatured ? 'Featured Urgent' : ''
    } as any)

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
        <NuxtLink
          to="/pricing?role=employer"
          class="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          title="Buy Recruiter Resume Unlock Credits"
        >
          <UIcon name="i-lucide-coins" class="size-4 text-amber-600" />
          <span>{{ (currentUser as any)?.creditsRemaining ?? 15 }} Credits</span>
          <span class="text-[10px] text-amber-600 dark:text-amber-400 font-semibold underline ml-1">Get More &rarr;</span>
        </NuxtLink>
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
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <UCard class="hover:shadow-md transition-shadow cursor-pointer" @click="statusFilter = 'all'">
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

      <UCard class="hover:shadow-md transition-shadow cursor-pointer" @click="statusFilter = 'interview'">
        <div class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <UIcon name="i-lucide-calendar-check" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-indigo-600 dark:text-indigo-400">Interviews</p>
            <p class="text-2xl font-black text-indigo-600 dark:text-indigo-400">{{ stats.scheduledInterviews }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="hover:shadow-md transition-shadow cursor-pointer" @click="statusFilter = 'pending'">
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

      <UCard class="hover:shadow-md transition-shadow cursor-pointer" @click="statusFilter = 'selected'">
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

      <UCard class="hover:shadow-md transition-shadow cursor-pointer" @click="activeTab = 'gigs'">
        <div class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            <UIcon name="i-lucide-calendar" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-purple-600 dark:text-purple-400">1-Day Shift Gigs</p>
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

      <button
        type="button"
        class="inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-bold transition-colors"
        :class="activeTab === 'matches' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'"
        @click="activeTab = 'matches'"
      >
        <UIcon name="i-lucide-sparkles" class="size-4 text-emerald-500" />
        <span>AI Matched Talent Pool ({{ profiles.length }})</span>
        <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Automated
        </span>
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
              { id: 'interview', label: '📅 Interviews' },
              { id: 'fasttrack', label: '⚡ FastTrack Pro' },
              { id: 'pending', label: 'Awaiting Decision' },
              { id: 'shortlisted', label: 'Shortlisted' },
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
                    <span
                      v-if="getCandidateProfile(app.candidateId, app.email)?.isFastTrackPro"
                      class="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs shrink-0"
                    >
                      <UIcon name="i-lucide-zap" class="size-3" />
                      FastTrack Pro
                    </span>
                    <UBadge
                      :color="app.status === 'selected' ? 'success' : app.status === 'rejected' ? 'error' : (app.status === 'interview_scheduled' || !!app.interviewDetails) ? 'primary' : 'warning'"
                      variant="subtle"
                      size="xs"
                      :label="app.status === 'selected' ? 'Offer Extended' : app.status === 'rejected' ? 'Not Selected' : (app.status === 'interview_scheduled' || !!app.interviewDetails) ? 'Interview Scheduled' : 'Ready for Review'"
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
                  <span class="text-gray-400">Interview Status</span>
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

                <!-- Scheduled Interview Highlight Box (if interview is set) -->
                <div
                  v-if="app.interviewDetails"
                  class="mt-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-white p-3.5 shadow-2xs dark:border-indigo-900/60 dark:bg-gray-800/80"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2.5">
                      <div class="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
                        <UIcon :name="getPlatformIcon(app.interviewDetails.platform)" class="size-4" />
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-sm text-gray-900 dark:text-white">{{ app.interviewDetails.roundName }}</span>
                          <UBadge
                            :color="app.interviewDetails.status === 'candidate_accepted' ? 'success' : app.interviewDetails.status === 'reschedule_requested' ? 'warning' : 'primary'"
                            variant="subtle"
                            size="xs"
                            :label="app.interviewDetails.status === 'candidate_accepted' ? '✓ Accepted by Candidate' : app.interviewDetails.status === 'reschedule_requested' ? '⚠ Reschedule Requested' : 'Invitation Sent'"
                          />
                        </div>
                        <p class="text-[11px] text-gray-500">
                          Interviewer: <span class="font-semibold text-gray-700 dark:text-gray-300">{{ app.interviewDetails.interviewerName }}</span> · {{ app.interviewDetails.durationMinutes }} mins
                        </p>
                      </div>
                    </div>

                    <!-- Meeting Actions -->
                    <div class="flex items-center gap-1.5">
                      <a
                        v-if="app.interviewDetails.meetingLink"
                        :href="app.interviewDetails.meetingLink"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                      >
                        <UIcon name="i-lucide-video" class="size-3.5" />
                        Join Call
                      </a>
                      <UButton
                        size="xs"
                        variant="outline"
                        color="neutral"
                        icon="i-lucide-calendar"
                        label="Reschedule"
                        @click="openInterviewModal(app)"
                      />
                      <UButton
                        size="xs"
                        variant="ghost"
                        color="error"
                        icon="i-lucide-x"
                        title="Cancel Interview"
                        @click="cancelInterview(app.id)"
                      />
                    </div>
                  </div>

                  <!-- Candidate Reschedule Request Note -->
                  <div
                    v-if="app.interviewDetails.status === 'reschedule_requested' && app.interviewDetails.candidateNote"
                    class="mt-2.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200"
                  >
                    <span class="font-bold">Candidate's Reschedule Request:</span> {{ app.interviewDetails.candidateNote }}
                  </div>

                  <!-- Details Footer -->
                  <div class="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-300 pt-2 border-t border-indigo-100 dark:border-indigo-950">
                    <span class="flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-400">
                      <UIcon name="i-lucide-clock" class="size-3.5" />
                      {{ formatInterviewDateTime(app.interviewDetails.scheduledAt) }}
                    </span>
                    <span class="flex items-center gap-1 text-gray-500">
                      <UIcon name="i-lucide-laptop" class="size-3.5" />
                      {{ getPlatformLabel(app.interviewDetails.platform) }}
                    </span>
                    <span v-if="app.interviewDetails.notes" class="text-gray-500 truncate max-w-sm">
                      <strong class="text-gray-700 dark:text-gray-300">Agenda:</strong> {{ app.interviewDetails.notes }}
                    </span>
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
                v-if="!app.interviewDetails"
                size="sm"
                color="primary"
                variant="solid"
                icon="i-lucide-calendar-plus"
                label="Schedule Interview"
                @click="openInterviewModal(app)"
              />
              <UButton
                v-if="app.interviewDetails"
                size="sm"
                color="primary"
                variant="soft"
                icon="i-lucide-video"
                label="Interview Details"
                @click="openInterviewModal(app)"
              />
              <UButton
                v-if="app.status !== 'submitted_to_client' && app.status !== 'selected' && !app.interviewDetails"
                size="sm"
                color="primary"
                variant="ghost"
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
         TAB 3: AI MATCHED TALENT POOL
         ════════════════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeTab === 'matches'" class="space-y-4">
      <!-- Selector & Intro Banner -->
      <div class="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-white p-5 shadow-xs dark:border-indigo-950 dark:bg-gray-900">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <div class="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <UIcon name="i-lucide-sparkles" class="size-5" />
              </div>
              <h2 class="text-lg font-bold text-gray-950 dark:text-white">Automated Candidate Recommendation Engine</h2>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-300 max-w-2xl">
              Candidates who registered their profiles on HireReady are instantly matched against your job requirements based on normalized technical skills, location, and experience.
            </p>
          </div>

          <!-- Active Job Picker -->
          <div class="flex items-center gap-2 shrink-0 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
            <span class="text-xs font-bold text-gray-700 dark:text-gray-300">Target Role:</span>
            <select
              v-model="matchingJobId"
              class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option v-for="j in jobs" :key="j.id" :value="j.id">
                {{ j.title }} ({{ j.location }})
              </option>
            </select>
          </div>
        </div>

        <div v-if="currentMatchingJob" class="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <span class="font-bold text-gray-900 dark:text-white">Active Requirement Keywords:</span>
          <span
            v-for="s in extractJobSkills(currentMatchingJob).slice(0, 8)"
            :key="s"
            class="rounded-md bg-white dark:bg-gray-800 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
          >
            {{ s }}
          </span>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="matchedCandidates.length === 0" class="rounded-2xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-800">
        <UIcon name="i-lucide-users" class="mx-auto size-12 text-gray-400" />
        <h3 class="mt-3 text-base font-bold text-gray-950 dark:text-white">No candidate profiles registered yet</h3>
        <p class="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
          As soon as candidates submit their details, they will be scored against {{ currentMatchingJob?.title || 'your jobs' }} in real time.
        </p>
      </div>

      <!-- Matched Candidates Grid -->
      <div v-else class="grid gap-4 md:grid-cols-2">
        <UCard
          v-for="mc in matchedCandidates"
          :key="mc.profile.userId"
          class="border transition-all hover:shadow-md flex flex-col justify-between"
          :class="mc.score >= 80 ? 'border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-b from-emerald-50/20 to-transparent' : 'border-gray-200 dark:border-gray-800'"
        >
          <div class="space-y-3">
            <!-- Header: Name & Match Badge -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="grid size-11 place-items-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-sm shrink-0 shadow-xs">
                  {{ mc.profile.fullName ? mc.profile.fullName.charAt(0).toUpperCase() : 'C' }}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-bold text-base text-gray-950 dark:text-white">{{ mc.profile.fullName || 'Candidate' }}</h3>
                    <span v-if="mc.profile.isFastTrackPro" class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      ⚡ Pro
                    </span>
                  </div>
                  <p class="text-xs text-gray-500">{{ mc.profile.city || 'Remote' }} · {{ mc.profile.experience || 'Fresher / Experienced' }}</p>
                </div>
              </div>

              <UBadge
                :color="mc.badgeColor"
                variant="subtle"
                size="sm"
                :label="mc.label"
                class="font-bold shrink-0"
              />
            </div>

            <!-- Matched Skills -->
            <div class="space-y-1.5 pt-1">
              <div class="flex items-center justify-between text-[11px] font-bold">
                <span class="text-gray-400 uppercase tracking-wider">Matched Skills ({{ mc.matchedSkills.length }})</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ mc.score }}% Fit</span>
              </div>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="skill in mc.matchedSkills"
                  :key="skill"
                  class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                >
                  <UIcon name="i-lucide-check" class="size-3 text-emerald-600" />
                  {{ skill }}
                </span>
                <span
                  v-for="skill in mc.missingSkills.slice(0, 2)"
                  :key="skill"
                  class="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                >
                  +{{ skill }}
                </span>
              </div>
            </div>

            <!-- Bio / Notes -->
            <p v-if="mc.profile.bio" class="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 italic bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg">
              "{{ mc.profile.bio }}"
            </p>
          </div>

          <!-- Bottom Actions -->
          <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
            <span class="text-[11px] text-gray-500 font-medium">
              {{ mc.profile.email }}
            </span>
            <div class="flex items-center gap-2">
              <UButton
                v-if="invitedCandidates[mc.profile.userId]"
                size="xs"
                color="success"
                variant="soft"
                icon="i-lucide-check"
                label="Invited"
                disabled
              />
              <UButton
                v-else
                size="xs"
                color="primary"
                variant="solid"
                icon="i-lucide-send"
                label="Invite to Apply"
                @click="inviteCandidate(mc.profile)"
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

          <!-- Featured Urgent Boost Card -->
          <div class="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-900/60 dark:from-amber-950/40 dark:to-orange-950/30">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-start gap-3">
                <div class="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <UIcon name="i-lucide-flame" class="size-5" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-xs font-bold text-gray-950 dark:text-white">Upgrade to Featured Urgent Opening</p>
                    <span class="rounded-md bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">₹999 / Free on Pro</span>
                  </div>
                  <p class="mt-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                    Pins your job #1 on the board with an urgent flame badge and broadcasts to top 200 candidates.
                  </p>
                </div>
              </div>

              <label class="relative inline-flex cursor-pointer items-center shrink-0">
                <input v-model="jobForm.isFeatured" type="checkbox" class="sr-only peer">
                <div class="peer h-6 w-11 rounded-full bg-gray-300 peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-gray-700"></div>
              </label>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <UButton label="Cancel" color="neutral" variant="ghost" type="button" @click="showPostJobModal = false" />
            <UButton
              type="submit"
              :label="jobForm.isFeatured ? 'Publish & Boost Job (₹999)' : 'Publish Standard Job'"
              :icon="jobForm.isFeatured ? 'i-lucide-flame' : 'i-lucide-send'"
              :color="jobForm.isFeatured ? 'warning' : 'primary'"
              :loading="postJobSubmitting"
            />
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

    <!-- ── Schedule Interview Modal ─────────────────────────────────────────── -->
    <div
      v-if="isInterviewModalOpen && selectedAppForInterview"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div class="flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div class="flex items-center gap-3">
            <div class="grid size-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
              <UIcon name="i-lucide-calendar-plus" class="size-5" />
            </div>
            <div>
              <h3 class="font-bold text-gray-950 dark:text-white">Schedule Interview</h3>
              <p class="text-xs text-gray-500">
                Candidate: <span class="font-semibold text-gray-700 dark:text-gray-300">{{ selectedAppForInterview.candidateName }}</span> · {{ getJobTitle(selectedAppForInterview.jobId) }}
              </p>
            </div>
          </div>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-white" @click="isInterviewModalOpen = false">
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
        </div>

        <!-- Modal Body Form -->
        <form class="flex-1 overflow-y-auto p-6 space-y-4" @submit.prevent="submitInterviewSchedule">
          <!-- Round Name & Presets -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Interview Round Name *</label>
            <div class="flex flex-wrap gap-1.5 mb-2">
              <button
                v-for="preset in ['Initial Screening', 'Technical Round 1', 'Coding Challenge', 'System Design', 'Culture & Founder Round', '1-Day Duty Briefing']"
                :key="preset"
                type="button"
                class="rounded-lg px-2.5 py-1 text-[11px] font-medium border transition-colors"
                :class="interviewForm.roundName === preset ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-500 dark:text-indigo-300 font-bold' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'"
                @click="interviewForm.roundName = preset"
              >
                {{ preset }}
              </button>
            </div>
            <input
              v-model="interviewForm.roundName"
              type="text"
              required
              placeholder="e.g. Technical Round 1 or HR Screening"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <!-- Platform Selector -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Meeting Platform *</label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                class="flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all"
                :class="interviewForm.platform === 'google_meet' ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-2xs dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'"
                @click="selectPlatform('google_meet')"
              >
                <UIcon name="i-lucide-video" class="size-5 mb-1 text-emerald-600" />
                <span class="text-xs">Google Meet</span>
              </button>
              <button
                type="button"
                class="flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all"
                :class="interviewForm.platform === 'zoom' ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-2xs dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'"
                @click="selectPlatform('zoom')"
              >
                <UIcon name="i-lucide-monitor-play" class="size-5 mb-1 text-blue-600" />
                <span class="text-xs">Zoom</span>
              </button>
              <button
                type="button"
                class="flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all"
                :class="interviewForm.platform === 'hireready_call' ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-2xs dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'"
                @click="selectPlatform('hireready_call')"
              >
                <UIcon name="i-lucide-sparkles" class="size-5 mb-1 text-purple-600" />
                <span class="text-xs">HireReady Call</span>
              </button>
              <button
                type="button"
                class="flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all"
                :class="interviewForm.platform === 'phone' ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-2xs dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'"
                @click="selectPlatform('phone')"
              >
                <UIcon name="i-lucide-phone-call" class="size-5 mb-1 text-amber-600" />
                <span class="text-xs">Phone Call</span>
              </button>
            </div>
          </div>

          <!-- Meeting Link Input -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Meeting Link / URL *
              </label>
              <button
                v-if="interviewForm.platform === 'google_meet'"
                type="button"
                class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                @click="interviewForm.meetingLink = generateGoogleMeetLink()"
              >
                <UIcon name="i-lucide-refresh-cw" class="size-3" /> Generate New Meet Link
              </button>
            </div>
            <div class="relative">
              <input
                v-model="interviewForm.meetingLink"
                type="text"
                required
                placeholder="https://meet.google.com/..."
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <!-- Date & Time Row -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input
                v-model="interviewForm.interviewDate"
                type="date"
                required
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Time *</label>
              <input
                v-model="interviewForm.interviewTime"
                type="time"
                required
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Duration *</label>
              <select
                v-model="interviewForm.durationMinutes"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option :value="15">15 minutes</option>
                <option :value="30">30 minutes</option>
                <option :value="45">45 minutes</option>
                <option :value="60">60 minutes</option>
                <option :value="90">90 minutes</option>
              </select>
            </div>
          </div>

          <!-- Interviewer Name -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Interviewer Name / Title</label>
            <input
              v-model="interviewForm.interviewerName"
              type="text"
              placeholder="e.g. Lead Engineer / HR Director"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <!-- Agenda / Notes for Candidate -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Preparation Notes &amp; Agenda</label>
            <textarea
              v-model="interviewForm.notes"
              rows="2"
              placeholder="Instructions, topics to prepare, or portfolio requirements..."
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <!-- Footer Buttons -->
          <div class="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <UButton label="Cancel" color="neutral" variant="ghost" type="button" @click="isInterviewModalOpen = false" />
            <UButton
              type="submit"
              label="Send Interview Invitation"
              icon="i-lucide-calendar-check"
              color="primary"
              :loading="interviewSubmitting"
            />
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
