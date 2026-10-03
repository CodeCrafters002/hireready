<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const store = useDataStore()

const candidates = computed(() => {
  const users = store.getUsers().filter(u => u.role === 'candidate')
  return users.map(user => {
    const profile = store.getProfileByUserId(user.id)
    const apps = store.getApplicationsByCandidate(user.id)
    return { user, profile, applications: apps }
  })
})

const selectedCandidate = ref<string | null>(null)
const detail = computed(() => candidates.value.find(c => c.user.id === selectedCandidate.value))

const statusLabel: Record<string, string> = {
  payment_pending: 'Payment Pending', mcq_pending: 'MCQ Pending',
  assessment_passed: 'MCQ Passed', assessment_failed: 'MCQ Failed',
  interview_pending: 'Interview Pending', interview_scheduled: 'Interview Scheduled',
  interview_passed: 'Interview Passed', interview_failed: 'Interview Failed',
  submitted_to_client: 'Submitted', selected: 'Selected', rejected: 'Rejected'
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Manage Candidates</h2>
      <p class="mt-1 text-gray-500">{{ candidates.length }} registered candidates</p>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <!-- Candidate list -->
      <div class="space-y-3">
        <UCard
          v-for="c in candidates"
          :key="c.user.id"
          class="cursor-pointer transition-shadow hover:shadow-md"
          :class="selectedCandidate === c.user.id ? 'ring-2 ring-primary' : ''"
          @click="selectedCandidate = c.user.id"
        >
          <div class="flex items-center gap-3">
            <div class="grid size-10 shrink-0 place-items-center rounded-full bg-primary-100 text-sm font-bold text-primary dark:bg-primary-900">
              {{ c.user.name.charAt(0) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-gray-950 dark:text-white">{{ c.user.name }}</p>
              <p class="truncate text-sm text-gray-500">{{ c.user.email }} · {{ c.applications.length }} application{{ c.applications.length === 1 ? '' : 's' }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Detail panel -->
      <div>
        <UCard v-if="detail">
          <template #header>
            <h3 class="text-lg font-semibold text-gray-950 dark:text-white">{{ detail.user.name }}</h3>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div><span class="text-gray-500">Email:</span> <span class="ml-1 text-gray-950 dark:text-white">{{ detail.profile?.email || detail.user.email }}</span></div>
              <div><span class="text-gray-500">Mobile:</span> <span class="ml-1 text-gray-950 dark:text-white">{{ detail.profile?.mobile || '—' }}</span></div>
              <div><span class="text-gray-500">City:</span> <span class="ml-1 text-gray-950 dark:text-white">{{ detail.profile?.city || '—' }}</span></div>
              <div><span class="text-gray-500">Résumé:</span> <span class="ml-1 text-gray-950 dark:text-white">{{ detail.profile?.resumeFilename || 'Not uploaded' }}</span></div>
            </div>

            <div v-if="detail.profile?.skills?.length">
              <p class="text-sm text-gray-500">Skills</p>
              <div class="mt-1 flex flex-wrap gap-1.5">
                <UBadge v-for="skill in detail.profile.skills" :key="skill" variant="subtle" color="primary" :label="skill" size="xs" />
              </div>
            </div>

            <div v-if="detail.profile?.education">
              <p class="text-sm text-gray-500">Education</p>
              <p class="text-sm text-gray-950 dark:text-white">{{ detail.profile.education }}</p>
            </div>

            <div v-if="detail.profile?.experience">
              <p class="text-sm text-gray-500">Experience</p>
              <p class="text-sm text-gray-950 dark:text-white">{{ detail.profile.experience }}</p>
            </div>

            <UDivider />

            <div>
              <p class="font-semibold text-gray-950 dark:text-white">Application History</p>
              <div v-if="detail.applications.length" class="mt-3 space-y-2">
                <div v-for="app in detail.applications" :key="app.id" class="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div>
                    <p class="text-sm font-medium text-gray-950 dark:text-white">{{ store.getJobById(app.jobId)?.title || app.jobId }}</p>
                    <p class="text-xs text-gray-500">{{ new Date(app.createdAt).toLocaleDateString() }}</p>
                  </div>
                  <UBadge variant="subtle" :label="statusLabel[app.status] || app.status" size="xs" />
                </div>
              </div>
              <p v-else class="mt-2 text-sm text-gray-400">No applications</p>
            </div>
          </div>
        </UCard>
        <UCard v-else>
          <div class="py-12 text-center text-gray-400">
            <UIcon name="i-lucide-user" class="mx-auto size-12 text-gray-300" />
            <p class="mt-3">Select a candidate to view details</p>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
