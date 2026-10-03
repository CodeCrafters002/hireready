<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const store = useDataStore()

const stats = computed(() => {
  const apps = store.getApplications()
  const payments = store.getPayments()
  return {
    totalCandidates: store.getUsers().filter(u => u.role === 'candidate').length,
    totalApplications: apps.length,
    totalPayments: payments.filter(p => p.status === 'paid').length,
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    pendingMCQ: apps.filter(a => a.status === 'mcq_pending').length,
    pendingInterviews: apps.filter(a => ['interview_pending', 'interview_scheduled'].includes(a.status)).length,
    submittedToClient: apps.filter(a => a.status === 'submitted_to_client').length,
    totalJobs: store.getJobs().length,
    publishedJobs: store.getPublishedJobs().length
  }
})

const cards = computed(() => [
  { label: 'Total Candidates', value: stats.value.totalCandidates, icon: 'i-lucide-users', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300', to: '/admin/candidates' },
  { label: 'Total Applications', value: stats.value.totalApplications, icon: 'i-lucide-file-text', color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-300', to: '/admin/applications' },
  { label: 'Payments Received', value: stats.value.totalPayments, icon: 'i-lucide-indian-rupee', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-300', to: '/admin/payments' },
  { label: 'Pending Payments', value: stats.value.pendingPayments, icon: 'i-lucide-clock', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900 dark:text-amber-300', to: '/admin/payments' },
  { label: 'Pending MCQs', value: stats.value.pendingMCQ, icon: 'i-lucide-list-checks', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300', to: '/admin/results' },
  { label: 'Pending Interviews', value: stats.value.pendingInterviews, icon: 'i-lucide-video', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-300', to: '/admin/interviews' },
  { label: 'Submitted to Clients', value: stats.value.submittedToClient, icon: 'i-lucide-send', color: 'text-teal-600 bg-teal-100 dark:bg-teal-900 dark:text-teal-300', to: '/admin/applications' },
  { label: 'Published Jobs', value: `${stats.value.publishedJobs} / ${stats.value.totalJobs}`, icon: 'i-lucide-briefcase', color: 'text-rose-600 bg-rose-100 dark:bg-rose-900 dark:text-rose-300', to: '/admin/jobs' }
])
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Admin Dashboard</h2>
      <p class="mt-1 text-gray-500">Overview of candidates, applications, payments, and more.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <NuxtLink v-for="card in cards" :key="card.label" :to="card.to" class="block">
        <UCard class="transition-shadow hover:shadow-md">
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
      </NuxtLink>
    </div>

    <UAlert class="mt-8" color="info" variant="soft" title="Demo Mode" description="All data is stored in localStorage. Clear browser storage to reset everything." icon="i-lucide-info" />
  </div>
</template>
