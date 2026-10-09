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

// ── Smart Job Match Engine ──────────────────────────────────────────────────
const { getRecommendedJobsForCandidate } = useJobMatching()
const allJobs = computed(() => store.getJobs())

const recommendedJobs = computed(() => {
  return getRecommendedJobsForCandidate(profile.value, allJobs.value).slice(0, 3)
})

function hasApplied(jobId: string): boolean {
  return applications.value.some(a => a.jobId === jobId)
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

    <!-- ── Smart Matched Recommendations ─────────────────────────────────── -->
    <div class="mt-8 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-lg font-bold text-gray-950 dark:text-white flex items-center gap-2">
              <UIcon name="i-lucide-sparkles" class="size-5 text-indigo-600 dark:text-indigo-400" />
              Top Recommended Jobs (AI Match)
            </h3>
            <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Personalized
            </span>
          </div>
          <p class="text-xs text-gray-500 mt-0.5">
            Ranked by skill relevance, preferred role, and location compatibility.
          </p>
        </div>

        <UButton
          to="/jobs"
          size="xs"
          variant="ghost"
          color="primary"
          label="Browse All Jobs"
          trailing-icon="i-lucide-arrow-right"
        />
      </div>

      <div v-if="recommendedJobs.length > 0" class="grid gap-4 md:grid-cols-3">
        <UCard
          v-for="rec in recommendedJobs"
          :key="rec.job.id"
          class="relative flex flex-col justify-between border transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700"
          :class="rec.score >= 80 ? 'border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/20 to-transparent' : 'border-gray-200 dark:border-gray-800'"
        >
          <div class="space-y-3">
            <!-- Score Badge & Tag -->
            <div class="flex items-center justify-between gap-2">
              <UBadge
                :color="rec.badgeColor"
                variant="subtle"
                size="sm"
                :label="rec.label"
                class="font-bold"
              />
              <span v-if="rec.job.isFeatured" class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                <UIcon name="i-lucide-flame" class="size-3" /> Urgent
              </span>
            </div>

            <!-- Job Title & Company -->
            <div>
              <NuxtLink :to="`/jobs/${rec.job.id}`" class="font-bold text-base text-gray-950 dark:text-white hover:text-primary transition-colors line-clamp-1">
                {{ rec.job.title }}
              </NuxtLink>
              <p class="text-xs text-gray-500 font-medium">{{ rec.job.company }} · {{ rec.job.location }}</p>
            </div>

            <!-- Salary & Type -->
            <div class="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <span class="text-emerald-600 dark:text-emerald-400 font-bold">{{ rec.job.salary }}</span>
              <span>•</span>
              <span>{{ rec.job.type }}</span>
            </div>

            <!-- Matched Skills Chips -->
            <div class="space-y-1.5 pt-1">
              <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Skill Alignment</span>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="skill in rec.matchedSkills"
                  :key="skill"
                  class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                >
                  <UIcon name="i-lucide-check" class="size-3 text-emerald-600" />
                  {{ skill }}
                </span>
                <span
                  v-for="skill in rec.missingSkills.slice(0, 2)"
                  :key="skill"
                  class="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                >
                  +{{ skill }}
                </span>
              </div>
            </div>

            <!-- Career Tip / Alignment Note -->
            <p v-if="rec.careerTip" class="text-[11px] text-gray-500 italic bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
              {{ rec.careerTip }}
            </p>
          </div>

          <!-- Bottom Action Button -->
          <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <span v-if="hasApplied(rec.job.id)" class="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1 py-1">
              <UIcon name="i-lucide-check-circle" class="size-4" /> Already Applied
            </span>
            <UButton
              v-else
              :to="`/jobs/${rec.job.id}`"
              size="xs"
              color="primary"
              variant="solid"
              block
              icon="i-lucide-send"
              label="1-Click Apply"
            />
          </div>
        </UCard>
      </div>

      <!-- Skill Upskill Hint Box -->
      <div class="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-white p-4 dark:border-indigo-950 dark:bg-gray-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="grid size-9 place-items-center rounded-lg bg-indigo-600 text-white shadow-xs shrink-0">
            <UIcon name="i-lucide-compass" class="size-4" />
          </div>
          <div>
            <h4 class="font-bold text-xs text-gray-900 dark:text-white">Want to unlock higher matching scores?</h4>
            <p class="text-[11px] text-gray-500">
              Adding verified skills (like Docker, Python, or System Design) to your profile will instantly match you with senior openings.
            </p>
          </div>
        </div>
        <UButton
          to="/candidate/profile"
          size="xs"
          variant="outline"
          color="primary"
          label="Update Profile Skills"
          icon="i-lucide-arrow-right"
          class="shrink-0"
        />
      </div>
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
