<script setup lang="ts">
import type { Application, InterviewPlatform } from '~/types/portal'

definePageMeta({ layout: 'candidate' })

const { currentUser } = useAuth()
const store = useDataStore()

onMounted(async () => {
  await store.syncWithDatabase()
})

const applications = computed(() => {
  if (!currentUser.value) return []
  return store.getApplicationsByCandidate(currentUser.value.id)
})

// Company scheduled interviews (real employer interviews)
const companyInterviews = computed(() => {
  return applications.value.filter(a => !!a.interviewDetails && a.interviewDetails.status !== 'cancelled')
})

// Mock / Practice interviews (assessment path)
const mockInterviews = computed(() => {
  return applications.value.filter(a =>
    ['interview_pending', 'interview_scheduled', 'interview_passed', 'interview_failed'].includes(a.status) &&
    !a.interviewDetails
  )
})

const feedbackMap = computed(() => {
  const map: Record<string, any> = {}
  for (const app of applications.value) {
    const fb = store.getFeedbackByApplication(app.id)
    if (fb) map[app.id] = fb
  }
  return map
})

// ── Helpers ──────────────────────────────────────────────────────────────────
function getJob(jobId: string) {
  return store.getJobById(jobId)
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
    case 'phone': return 'Phone Call'
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return isoString
  }
}

function getGoogleCalendarUrl(app: Application): string {
  if (!app.interviewDetails) return '#'
  const job = getJob(app.jobId)
  const title = encodeURIComponent(`${app.interviewDetails.roundName}: ${job?.title || 'Job'} at ${job?.company || 'Company'}`)
  const details = encodeURIComponent(
    `HireReady Interview with ${app.interviewDetails.interviewerName}\n` +
    `Meeting Link: ${app.interviewDetails.meetingLink}\n` +
    `Agenda: ${app.interviewDetails.notes || 'No specific notes'}`
  )
  const location = encodeURIComponent(app.interviewDetails.meetingLink)

  try {
    const start = new Date(app.interviewDetails.scheduledAt)
    const duration = app.interviewDetails.durationMinutes || 45
    const end = new Date(start.getTime() + duration * 60000)
    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "")
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`
  } catch {
    return '#'
  }
}

// ── Candidate Interview Actions ───────────────────────────────────────────────
function acceptInterview(app: Application) {
  if (!app.interviewDetails) return
  const updatedDetails = {
    ...app.interviewDetails,
    status: 'candidate_accepted' as const
  }
  store.updateApplication(app.id, { interviewDetails: updatedDetails })

  const job = getJob(app.jobId)
  store.addNotification({
    userId: currentUser.value?.id || '',
    type: 'interview',
    title: 'Interview Accepted',
    message: `You confirmed attendance for the ${app.interviewDetails.roundName} with ${job?.company || 'the hiring team'}.`
  })
}

// ── Reschedule Modal State ───────────────────────────────────────────────────
const showRescheduleModal = ref(false)
const selectedAppForReschedule = ref<Application | null>(null)
const rescheduleForm = reactive({
  preferredTime: '',
  note: ''
})

function openRescheduleModal(app: Application) {
  selectedAppForReschedule.value = app
  rescheduleForm.preferredTime = ''
  rescheduleForm.note = ''
  showRescheduleModal.value = true
}

function submitReschedule() {
  if (!selectedAppForReschedule.value || !selectedAppForReschedule.value.interviewDetails) return
  const app = selectedAppForReschedule.value
  const noteText = rescheduleForm.preferredTime
    ? `Preferred time: ${rescheduleForm.preferredTime}. Reason: ${rescheduleForm.note || 'Candidate requested alternate slot.'}`
    : rescheduleForm.note || 'Candidate requested alternate slot.'

  const updatedDetails = {
    ...app.interviewDetails,
    status: 'reschedule_requested' as const,
    candidateNote: noteText
  }
  store.updateApplication(app.id, { interviewDetails: updatedDetails })

  store.addNotification({
    userId: currentUser.value?.id || '',
    type: 'interview',
    title: 'Reschedule Request Sent',
    message: `Your request for an alternate slot has been submitted to the employer.`
  })

  showRescheduleModal.value = false
}
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Interviews &amp; Live Meetings</h2>
        <p class="mt-1 text-sm text-gray-500">
          Manage your scheduled company rounds, join live video rooms, and prepare with mock assessments.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UBadge
          color="primary"
          variant="subtle"
          size="sm"
          :label="`${companyInterviews.length} Scheduled Company Rounds`"
        />
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════
         SECTION 1: COMPANY RECRUITER INTERVIEWS
         ════════════════════════════════════════════════════════════════════════ -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold text-gray-950 dark:text-white flex items-center gap-2">
          <UIcon name="i-lucide-building-2" class="size-5 text-indigo-600 dark:text-indigo-400" />
          Employer Video Interviews
        </h3>
        <span class="text-xs text-gray-400">Direct Recruiter Invitations</span>
      </div>

      <div v-if="companyInterviews.length > 0" class="grid gap-4">
        <UCard
          v-for="app in companyInterviews"
          :key="app.id"
          class="border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/20 shadow-xs dark:border-indigo-950 dark:bg-gray-900"
        >
          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <!-- Left Info -->
            <div class="space-y-3 flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <div class="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-xs">
                  <UIcon :name="getPlatformIcon(app.interviewDetails?.platform || '')" class="size-5" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="text-base font-bold text-gray-950 dark:text-white">
                      {{ app.interviewDetails?.roundName }}
                    </h4>
                    <UBadge
                      :color="app.interviewDetails?.status === 'candidate_accepted' ? 'success' : app.interviewDetails?.status === 'reschedule_requested' ? 'warning' : 'primary'"
                      variant="subtle"
                      size="xs"
                      :label="app.interviewDetails?.status === 'candidate_accepted' ? '✓ Accepted by You' : app.interviewDetails?.status === 'reschedule_requested' ? '⚠ Reschedule Requested' : 'Awaiting Confirmation'"
                    />
                  </div>
                  <p class="text-xs text-gray-500">
                    <strong class="text-gray-900 dark:text-gray-200">{{ getJob(app.jobId)?.company }}</strong> · Position: {{ getJob(app.jobId)?.title }}
                  </p>
                </div>
              </div>

              <!-- Time, Duration, Interviewer Meta Grid -->
              <div class="grid gap-2 sm:grid-cols-3 text-xs pt-1">
                <div class="rounded-xl border border-indigo-100 bg-white/80 p-3 dark:border-indigo-900/60 dark:bg-gray-800/60">
                  <span class="text-gray-400 block text-[11px]">Scheduled Date &amp; Time</span>
                  <p class="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 mt-0.5">
                    <UIcon name="i-lucide-clock" class="size-3.5" />
                    {{ formatInterviewDateTime(app.interviewDetails?.scheduledAt || '') }}
                  </p>
                </div>

                <div class="rounded-xl border border-indigo-100 bg-white/80 p-3 dark:border-indigo-900/60 dark:bg-gray-800/60">
                  <span class="text-gray-400 block text-[11px]">Platform &amp; Duration</span>
                  <p class="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                    <UIcon name="i-lucide-laptop" class="size-3.5 text-gray-500" />
                    {{ getPlatformLabel(app.interviewDetails?.platform || '') }} ({{ app.interviewDetails?.durationMinutes }}m)
                  </p>
                </div>

                <div class="rounded-xl border border-indigo-100 bg-white/80 p-3 dark:border-indigo-900/60 dark:bg-gray-800/60">
                  <span class="text-gray-400 block text-[11px]">Interviewer</span>
                  <p class="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                    <UIcon name="i-lucide-user" class="size-3.5 text-gray-500" />
                    {{ app.interviewDetails?.interviewerName || 'Hiring Lead' }}
                  </p>
                </div>
              </div>

              <!-- Agenda / Candidate Notes -->
              <div v-if="app.interviewDetails?.notes" class="rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border border-gray-100 dark:border-gray-800">
                <span class="font-bold text-gray-900 dark:text-white">Agenda &amp; Instructions:</span>
                <p class="mt-0.5">{{ app.interviewDetails.notes }}</p>
              </div>

              <!-- Reschedule Notice if requested -->
              <div
                v-if="app.interviewDetails?.status === 'reschedule_requested'"
                class="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200"
              >
                <span class="font-bold">Your Reschedule Note:</span> {{ app.interviewDetails.candidateNote }}
              </div>
            </div>

            <!-- Right Action CTAs -->
            <div class="flex flex-col gap-2 shrink-0 pt-2 lg:pt-0 min-w-[200px]">
              <!-- Primary Join Call Button -->
              <a
                v-if="app.interviewDetails?.meetingLink"
                :href="app.interviewDetails.meetingLink"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:from-indigo-700 hover:to-purple-700 transition-all text-center"
              >
                <UIcon name="i-lucide-video" class="size-4" />
                Join Video Meeting
              </a>

              <!-- Add to Google Calendar -->
              <a
                v-if="app.interviewDetails?.meetingLink"
                :href="getGoogleCalendarUrl(app)"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 text-center"
              >
                <UIcon name="i-lucide-calendar-plus" class="size-3.5 text-indigo-600 dark:text-indigo-400" />
                Add to Google Calendar
              </a>

              <!-- Candidate Acceptance / Reschedule options -->
              <div v-if="app.interviewDetails?.status === 'scheduled'" class="flex items-center gap-1.5 pt-1">
                <UButton
                  size="xs"
                  color="success"
                  variant="solid"
                  icon="i-lucide-check"
                  label="Accept"
                  class="flex-1 justify-center"
                  @click="acceptInterview(app)"
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-calendar-clock"
                  label="Reschedule"
                  class="flex-1 justify-center"
                  @click="openRescheduleModal(app)"
                />
              </div>

              <div v-else-if="app.interviewDetails?.status === 'candidate_accepted'" class="text-center">
                <span class="text-[11px] font-semibold text-emerald-600 flex items-center justify-center gap-1">
                  <UIcon name="i-lucide-check-circle" class="size-3.5" /> Confirmed
                </span>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <div v-else class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-gray-800 dark:bg-gray-900/50">
        <UIcon name="i-lucide-calendar-x" class="mx-auto size-12 text-gray-300" />
        <h4 class="mt-3 text-sm font-bold text-gray-900 dark:text-white">No Employer Rounds Scheduled Yet</h4>
        <p class="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
          When companies shortlist your profile and invite you to an interview, live meeting links and calendar invites will appear right here.
        </p>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════
         SECTION 2: MOCK ASSESSMENTS & PRACTICE INTERVIEWS
         ════════════════════════════════════════════════════════════════════════ -->
    <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold text-gray-950 dark:text-white flex items-center gap-2">
          <UIcon name="i-lucide-graduation-cap" class="size-5 text-emerald-600 dark:text-emerald-400" />
          HireReady Mock Preparation &amp; Feedback
        </h3>
        <span class="text-xs text-gray-400">Skill Validation</span>
      </div>

      <div v-if="mockInterviews.length > 0" class="space-y-4">
        <UCard v-for="app in mockInterviews" :key="app.id">
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="font-semibold text-gray-950 dark:text-white">{{ getJob(app.jobId)?.title || app.jobId }}</p>
                <p class="text-sm text-gray-500">{{ getJob(app.jobId)?.company }}</p>
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

            <!-- Reviewer Feedback -->
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

      <div v-else-if="companyInterviews.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <UIcon name="i-lucide-video" class="mx-auto size-14 text-gray-300" />
        <h4 class="mt-3 text-base font-bold text-gray-900 dark:text-white">No Interviews Scheduled</h4>
        <p class="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
          Pass MCQ skill assessments or apply for verified roles to unlock mock interview sessions and recruiter interview slots.
        </p>
        <UButton to="/jobs" class="mt-4" label="Browse Verified Openings" size="xs" />
      </div>
    </div>

    <!-- ── Reschedule Request Modal ─────────────────────────────────────────── -->
    <div
      v-if="showRescheduleModal && selectedAppForReschedule"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <h3 class="font-bold text-gray-950 dark:text-white">Request Alternate Interview Slot</h3>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-white" @click="showRescheduleModal = false">
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
        </div>

        <form class="space-y-4 pt-4" @submit.prevent="submitReschedule">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Your Preferred Days &amp; Timings *
            </label>
            <input
              v-model="rescheduleForm.preferredTime"
              type="text"
              required
              placeholder="e.g. Wednesday after 3:00 PM or Friday 11:00 AM"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Reason / Message for Employer
            </label>
            <textarea
              v-model="rescheduleForm.note"
              rows="3"
              placeholder="Explain briefly why you need to reschedule (e.g. prior exam, current work shift)..."
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <UButton label="Cancel" color="neutral" variant="ghost" size="xs" type="button" @click="showRescheduleModal = false" />
            <UButton label="Submit Request" color="primary" size="xs" type="submit" />
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
