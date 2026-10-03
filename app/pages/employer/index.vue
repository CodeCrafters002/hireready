<script setup lang="ts">
definePageMeta({ layout: 'employer' })

const store = useDataStore()
const { currentUser } = useAuth()

const allApplications = ref(store.getApplications())
const jobs = computed(() => store.getJobs())
const profiles = computed(() => store.getProfiles())

// Submitted candidates ready for client review
const submittedApplications = computed(() => {
  return allApplications.value.filter(a =>
    a.status === 'submitted_to_client' ||
    a.status === 'selected' ||
    a.status === 'rejected'
  )
})

const stats = computed(() => {
  const pending = submittedApplications.value.filter(a => a.status === 'submitted_to_client').length
  const selected = submittedApplications.value.filter(a => a.status === 'selected').length
  const rejected = submittedApplications.value.filter(a => a.status === 'rejected').length
  return {
    total: submittedApplications.value.length,
    pending,
    selected,
    rejected
  }
})

function getJobTitle(jobId: string) {
  return jobs.value.find(j => j.id === jobId)?.title || jobId
}

function getCandidateProfile(candidateId: string) {
  return profiles.value.find(p => p.userId === candidateId)
}

function handleDecision(appId: string, decision: 'selected' | 'rejected') {
  const updated = store.updateApplication(appId, { status: decision })
  if (updated) {
    allApplications.value = store.getApplications()
    // Send notification to candidate
    store.addNotification({
      userId: updated.candidateId,
      type: 'selection',
      title: decision === 'selected' ? 'Offer Extended!' : 'Application Update',
      message: decision === 'selected'
        ? `Congratulations! You have been selected for the ${getJobTitle(updated.jobId)} role.`
        : `Update regarding your application for ${getJobTitle(updated.jobId)}: Not selected at this time.`
    })
  }
}
</script>

<template>
  <div>
    <!-- Welcome Header -->
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Client Hiring Dashboard</h2>
      <p class="mt-1 text-sm text-gray-500">
        Review pre-vetted candidates who have paid, passed technical MCQ assessments, and cleared mock technical interviews.
      </p>
    </div>

    <!-- Stat Cards -->
    <div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <UCard>
        <p class="text-sm font-medium text-gray-500">Total Vetted Profiles</p>
        <p class="mt-2 text-3xl font-bold text-gray-950 dark:text-white">{{ stats.total }}</p>
        <p class="mt-1 text-xs text-gray-400">Screened by HireReady team</p>
      </UCard>
      <UCard>
        <p class="text-sm font-medium text-amber-600 dark:text-amber-400">Awaiting Client Decision</p>
        <p class="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">{{ stats.pending }}</p>
        <p class="mt-1 text-xs text-gray-400">Ready for final interview/offer</p>
      </UCard>
      <UCard>
        <p class="text-sm font-medium text-emerald-600 dark:text-emerald-400">Offers Extended</p>
        <p class="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{{ stats.selected }}</p>
        <p class="mt-1 text-xs text-gray-400">Selected candidates</p>
      </UCard>
      <UCard>
        <p class="text-sm font-medium text-gray-500">Passed / Archived</p>
        <p class="mt-2 text-3xl font-bold text-gray-950 dark:text-white">{{ stats.rejected }}</p>
        <p class="mt-1 text-xs text-gray-400">Not selected</p>
      </UCard>
    </div>

    <!-- Candidate List Section -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-950 dark:text-white">Pre-Vetted Candidate Pipeline</h3>
        <UBadge color="neutral" variant="subtle" :label="`${submittedApplications.length} Candidates`" />
      </div>

      <div v-if="submittedApplications.length === 0" class="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
        <UIcon name="i-lucide-user-check" class="mx-auto size-12 text-gray-400" />
        <h4 class="mt-3 text-base font-semibold text-gray-950 dark:text-white">No candidates submitted yet</h4>
        <p class="mt-1 text-sm text-gray-500">
          Once the HireReady admin reviews assessment and interview results and marks candidates as "Submitted to Client", they will appear here for your review.
        </p>
      </div>

      <div v-else class="grid gap-6">
        <UCard
          v-for="app in submittedApplications"
          :key="app.id"
          class="border border-gray-200 transition-shadow hover:shadow-md dark:border-gray-800"
        >
          <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div class="space-y-4">
              <div class="flex flex-wrap items-center gap-3">
                <div class="grid size-12 place-items-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {{ app.candidateName.charAt(0) }}
                </div>
                <div>
                  <h4 class="text-lg font-bold text-gray-950 dark:text-white">{{ app.candidateName }}</h4>
                  <p class="text-sm text-gray-500">{{ app.email }} • {{ app.phone }}</p>
                </div>
                <UBadge
                  :color="app.status === 'selected' ? 'success' : app.status === 'rejected' ? 'error' : 'warning'"
                  variant="subtle"
                  class="capitalize"
                  :label="app.status.replace(/_/g, ' ')"
                />
              </div>

              <!-- Job & Verification Metrics -->
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                  <span class="text-xs text-gray-400">Position</span>
                  <p class="text-sm font-semibold text-gray-950 dark:text-white">{{ getJobTitle(app.jobId) }}</p>
                </div>
                <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                  <span class="text-xs text-gray-400">MCQ Score</span>
                  <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {{ app.assessmentScore !== undefined ? `${app.assessmentScore}% (Passed)` : 'N/A' }}
                  </p>
                </div>
                <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                  <span class="text-xs text-gray-400">Mock Interview Slot</span>
                  <p class="text-sm font-semibold text-gray-950 dark:text-white">{{ app.interviewSlot || 'Completed' }}</p>
                </div>
              </div>

              <!-- Interviewer Feedback -->
              <div v-if="app.interviewFeedback" class="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <p class="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">HireReady Technical Reviewer Notes</p>
                <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">"{{ app.interviewFeedback }}"</p>
              </div>

              <!-- Candidate Profile Details -->
              <div v-if="getCandidateProfile(app.candidateId)" class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div v-if="getCandidateProfile(app.candidateId)?.skills?.length" class="flex flex-wrap items-center gap-1.5">
                  <span class="text-xs font-medium text-gray-400">Skills:</span>
                  <UBadge
                    v-for="s in getCandidateProfile(app.candidateId)?.skills"
                    :key="s"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                    :label="s"
                  />
                </div>
                <p v-if="getCandidateProfile(app.candidateId)?.education">
                  <span class="font-medium text-gray-500">Education:</span> {{ getCandidateProfile(app.candidateId)?.education }}
                </p>
                <p v-if="getCandidateProfile(app.candidateId)?.experience">
                  <span class="font-medium text-gray-500">Experience:</span> {{ getCandidateProfile(app.candidateId)?.experience }}
                </p>
                <p v-if="getCandidateProfile(app.candidateId)?.resumeFilename" class="text-xs text-primary">
                  📄 Résumé: {{ getCandidateProfile(app.candidateId)?.resumeFilename }}
                </p>
              </div>
            </div>

            <!-- Action Controls -->
            <div class="flex flex-row gap-2 border-t border-gray-100 pt-4 lg:flex-col lg:border-t-0 lg:pt-0">
              <UButton
                v-if="app.status === 'submitted_to_client'"
                color="success"
                icon="i-lucide-check-circle"
                label="Make Offer / Select"
                @click="handleDecision(app.id, 'selected')"
              />
              <UButton
                v-if="app.status === 'submitted_to_client'"
                color="error"
                variant="outline"
                icon="i-lucide-x-circle"
                label="Pass / Reject"
                @click="handleDecision(app.id, 'rejected')"
              />
              <span v-else class="text-xs text-gray-400">
                Decision finalized on this profile.
              </span>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
