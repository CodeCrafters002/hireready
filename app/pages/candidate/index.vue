<script setup lang="ts">
definePageMeta({ layout: 'candidate' })

const { currentUser } = useAuth()
const store = useDataStore()

const applications = computed(() => currentUser.value ? store.getApplicationsByCandidate(currentUser.value.id) : [])
const profile = computed(() => currentUser.value ? store.getProfileByUserId(currentUser.value.id) : null)
const notifications = computed(() => currentUser.value ? store.getNotificationsByUser(currentUser.value.id).filter(n => !n.read) : [])

const stats = computed(() => {
  const apps = applications.value
  return {
    total: apps.length,
    paymentPending: apps.filter(a => a.status === 'payment_pending').length,
    mcqPending: apps.filter(a => a.status === 'mcq_pending').length,
    interviewPending: apps.filter(a => ['interview_pending', 'interview_scheduled'].includes(a.status)).length,
    submitted: apps.filter(a => a.status === 'submitted_to_client').length,
    selected: apps.filter(a => a.status === 'selected').length,
    rejected: apps.filter(a => ['assessment_failed', 'interview_failed', 'rejected'].includes(a.status)).length
  }
})

const profileCompletion = computed(() => {
  if (!profile.value) return 0
  const fields = [
    profile.value.fullName, profile.value.email, profile.value.mobile,
    profile.value.city, profile.value.skills.length > 0 ? 'yes' : '',
    profile.value.education, profile.value.experience, profile.value.resumeFilename
  ]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
})

const cards = computed(() => [
  { label: 'Total Applications', value: stats.value.total, icon: 'i-lucide-briefcase', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300' },
  { label: 'MCQ Pending', value: stats.value.mcqPending, icon: 'i-lucide-file-check', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900 dark:text-amber-300' },
  { label: 'Interview Pending', value: stats.value.interviewPending, icon: 'i-lucide-video', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-300' },
  { label: 'Submitted to Client', value: stats.value.submitted, icon: 'i-lucide-send', color: 'text-primary bg-primary-100 dark:bg-primary-900' },
  { label: 'Selected', value: stats.value.selected, icon: 'i-lucide-trophy', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-300' },
  { label: 'Unread Notifications', value: notifications.value.length, icon: 'i-lucide-bell', color: 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300' }
])

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

const upcomingInterviewApp = computed(() => {
  return applications.value.find(a => !!a.interviewDetails && a.interviewDetails.status !== 'cancelled')
})

function formatInterviewDateTime(isoString: string): string {
  if (!isoString) return ''
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
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Welcome back, {{ currentUser?.name?.split(' ')[0] }} 👋</h2>
      <p class="mt-1 text-gray-500">Here's an overview of your applications and progress.</p>
    </div>

    <!-- Upcoming Interview Alert Banner -->
    <div
      v-if="upcomingInterviewApp"
      class="mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 p-5 text-white shadow-md"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3.5">
          <div class="grid size-12 place-items-center rounded-xl bg-white/20 backdrop-blur-xs text-white shrink-0">
            <UIcon name="i-lucide-calendar-check" class="size-6" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold backdrop-blur-xs">
                Upcoming Live Interview
              </span>
              <span class="text-xs text-indigo-100">
                {{ upcomingInterviewApp.interviewDetails?.durationMinutes }} mins
              </span>
            </div>
            <h3 class="text-lg font-bold mt-1">
              {{ upcomingInterviewApp.interviewDetails?.roundName }} · {{ store.getJobById(upcomingInterviewApp.jobId)?.company }}
            </h3>
            <p class="text-xs text-indigo-100 mt-0.5 flex items-center gap-1.5">
              <UIcon name="i-lucide-clock" class="size-3.5" />
              {{ formatInterviewDateTime(upcomingInterviewApp.interviewDetails?.scheduledAt || '') }}
              <span>•</span>
              Role: {{ store.getJobById(upcomingInterviewApp.jobId)?.title }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <a
            v-if="upcomingInterviewApp.interviewDetails?.meetingLink"
            :href="upcomingInterviewApp.interviewDetails?.meetingLink"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 transition-colors"
          >
            <UIcon name="i-lucide-video" class="size-4" />
            Join Video Meeting
          </a>
          <UButton
            to="/candidate/interviews"
            size="sm"
            variant="ghost"
            class="text-white hover:bg-white/10"
            label="Details &amp; Calendar"
            icon="i-lucide-arrow-right"
          />
        </div>
      </div>
    </div>

    <!-- Profile completion alert -->
    <UAlert
      v-if="profileCompletion < 100"
      class="mb-6"
      color="warning"
      variant="soft"
      title="Complete your profile"
      :description="`Your profile is ${profileCompletion}% complete. A complete profile improves your chances.`"
      icon="i-lucide-user-check"
    >
      <template #actions>
        <UButton to="/candidate/profile" size="sm" label="Update profile" variant="solid" color="warning" />
      </template>
    </UAlert>

    <!-- FastTrack Pro upgrade banner (if not upgraded) -->
    <div
      v-if="!profile?.isFastTrackPro"
      class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/5 p-4 dark:border-indigo-900/60"
    >
      <div class="flex items-center gap-3">
        <div class="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs shrink-0">
          <UIcon name="i-lucide-zap" class="size-5" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-sm text-gray-950 dark:text-white">Get FastTrack Pro ⚡</h3>
            <span class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">₹399 Lifetime</span>
          </div>
          <p class="text-xs text-gray-500">
            Get top #1 ranking on recruiter dashboards, a Verified Talent badge, and 2-hour early duty shift access.
          </p>
        </div>
      </div>
      <UButton
        to="/pricing?role=candidate"
        size="xs"
        color="primary"
        label="Upgrade Now"
        icon="i-lucide-arrow-right"
        class="shrink-0"
      />
    </div>

    <!-- Stats grid -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard v-for="card in cards" :key="card.label">
        <div class="flex items-center gap-4">
          <div class="grid size-12 shrink-0 place-items-center rounded-xl" :class="card.color">
            <UIcon :name="card.icon" class="size-6" />
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-950 dark:text-white">{{ card.value }}</p>
            <p class="text-sm text-gray-500">{{ card.label }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Recent applications -->
    <div class="mt-8">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-950 dark:text-white">Recent Applications</h3>
        <UButton to="/candidate/applications" size="sm" variant="ghost" color="neutral" label="View all" trailing-icon="i-lucide-arrow-right" />
      </div>
      <div v-if="applications.length" class="mt-4 space-y-3">
        <UCard v-for="app in applications.slice(0, 3)" :key="app.id">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-semibold text-gray-950 dark:text-white">{{ store.getJobById(app.jobId)?.title || app.jobId }}</p>
              <p class="mt-1 text-sm text-gray-500">{{ store.getJobById(app.jobId)?.company }} · Applied {{ new Date(app.createdAt).toLocaleDateString() }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UBadge :color="(statusColor[app.status] as any) || 'neutral'" variant="subtle" :label="statusLabel[app.status] || app.status" />
              <UButton :to="`/application/${app.id}`" size="xs" variant="ghost" color="neutral" icon="i-lucide-arrow-right" />
            </div>
          </div>
        </UCard>
      </div>
      <UCard v-else class="mt-4">
        <div class="py-8 text-center">
          <UIcon name="i-lucide-briefcase" class="mx-auto size-12 text-gray-300" />
          <p class="mt-3 font-medium text-gray-500">No applications yet</p>
          <UButton to="/jobs" class="mt-4" label="Browse jobs" size="sm" />
        </div>
      </UCard>
    </div>
  </div>
</template>
