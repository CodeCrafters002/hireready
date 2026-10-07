<script setup lang="ts">
const store = useDataStore()

const search = ref('')
const selectedType = ref<string | null>(null)

const allJobs = computed(() => store.getPublishedJobs())

const jobTypes = computed(() => {
  const types = [...new Set(allJobs.value.map(j => j.type))]
  return types
})

const filteredJobs = computed(() => {
  let jobs = allJobs.value
  const term = search.value.toLowerCase().trim()
  if (term) {
    jobs = jobs.filter(job =>
      [job.title, job.company, job.location, job.summary].some(v => v.toLowerCase().includes(term))
    )
  }
  if (selectedType.value) {
    jobs = jobs.filter(j => j.type === selectedType.value)
  }
  // Prioritize Featured Urgent jobs to top of list
  return [...jobs].sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1
    if (!a.isFeatured && b.isFeatured) return 1
    return 0
  })
})

const typeColors: Record<string, string> = {
  'Full-time': 'from-emerald-500 to-teal-600',
  'Part-time': 'from-blue-500 to-cyan-600',
  'Contract': 'from-orange-500 to-amber-600',
  'Internship': 'from-pink-500 to-rose-600',
  'Remote': 'from-purple-500 to-violet-600',
}

function getBgColor(type: string) {
  return typeColors[type] || 'from-indigo-500 to-purple-600'
}
</script>

<template>
  <div>
    <!-- ── Page Header ─────────────────────────────────────────── -->
    <div class="relative overflow-hidden border-b border-gray-100 bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-14 dark:border-gray-800 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/30">
      <div class="absolute inset-0 opacity-[0.03]" style="background-image: radial-gradient(rgba(99,102,241,1) 1px, transparent 1px); background-size: 28px 28px;" />
      <div class="absolute top-0 right-0 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />

      <UContainer class="relative">
        <p class="text-xs font-bold uppercase tracking-widest text-indigo-500">Find your next role</p>
        <h1 class="mt-2 text-4xl font-black tracking-tight text-gray-950 dark:text-white">
          Open <span class="gradient-text">jobs</span>
        </h1>
        <p class="mt-3 max-w-lg text-gray-600 dark:text-gray-400">
          Every application follows a transparent path — pay → MCQ → mock interview → employer review.
          Fair for everyone.
        </p>

        <!-- Search bar -->
        <div class="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
          <div class="relative flex-1">
            <UIcon name="i-lucide-search" class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Search by role, company, or location…"
              class="h-12 w-full rounded-2xl border border-gray-200 bg-white/80 pl-10 pr-4 text-sm text-gray-900 shadow-sm backdrop-blur-sm placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs text-gray-400">Filter:</span>
            <button
              v-for="type in jobTypes"
              :key="type"
              class="rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
              :class="selectedType === type
                ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'"
              @click="selectedType = selectedType === type ? null : type"
            >
              {{ type }}
            </button>
          </div>
        </div>

        <!-- Result count -->
        <p class="mt-4 text-xs text-gray-400">
          Showing <strong class="text-gray-700 dark:text-gray-200">{{ filteredJobs.length }}</strong> of {{ allJobs.length }} positions
        </p>
      </UContainer>
    </div>

    <!-- ── Job Grid ────────────────────────────────────────────── -->
    <UContainer class="py-10">
      <!-- Empty state -->
      <div
        v-if="filteredJobs.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <div class="grid size-16 place-items-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <UIcon name="i-lucide-search-x" class="size-8 text-gray-400" />
        </div>
        <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No jobs found</h3>
        <p class="mt-1 text-sm text-gray-500">Try adjusting your search or clearing the filter.</p>
        <button
          class="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          @click="search = ''; selectedType = null"
        >Clear filters</button>
      </div>

      <div v-else class="grid gap-5 md:grid-cols-2">
        <NuxtLink
          v-for="job in filteredJobs"
          :key="job.id"
          :to="`/jobs/${job.id}`"
          class="job-card glass-card group flex flex-col rounded-2xl p-6 no-underline transition-all"
          :class="job.isFeatured ? 'border-2 border-amber-400 bg-amber-50/20 shadow-md ring-2 ring-amber-400/10 dark:border-amber-600/60 dark:bg-amber-950/20' : ''"
        >
          <div class="flex items-start gap-4">
            <!-- Company avatar -->
            <div
              class="grid size-12 shrink-0 place-items-center rounded-xl text-lg font-black text-white shadow-lg bg-gradient-to-br"
              :class="getBgColor(job.type)"
            >
              {{ job.company.charAt(0) }}
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h2 class="font-bold text-gray-950 group-hover:text-indigo-600 transition-colors dark:text-white dark:group-hover:text-indigo-400">
                    {{ job.title }}
                  </h2>
                  <p class="mt-0.5 text-sm text-gray-500">{{ job.company }}</p>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span
                    v-if="job.isFeatured"
                    class="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs"
                  >
                    <UIcon name="i-lucide-flame" class="size-3" />
                    {{ job.featuredBadge || 'Featured Urgent' }}
                  </span>
                  <span class="tag-pill shrink-0">{{ job.type }}</span>
                </div>
              </div>
            </div>
          </div>

          <p class="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-400 line-clamp-2">
            {{ job.summary }}
          </p>

          <!-- Requirements preview -->
          <div v-if="job.requirements?.length" class="mt-3 flex flex-wrap gap-1.5">
            <span
              v-for="req in job.requirements.slice(0, 3)"
              :key="req"
              class="rounded-lg bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            >
              {{ req }}
            </span>
            <span v-if="job.requirements.length > 3" class="text-[11px] text-gray-400 self-center">
              +{{ job.requirements.length - 3 }} more
            </span>
          </div>

          <!-- Footer meta -->
          <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-4 text-xs text-gray-500 dark:border-gray-800">
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-map-pin" class="size-3.5 text-indigo-400" />
              {{ job.location }}
            </span>
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-banknote" class="size-3.5 text-emerald-500" />
              {{ job.salary }}
            </span>
            <span class="ml-auto flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
              View & apply
              <UIcon name="i-lucide-arrow-right" class="size-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </NuxtLink>
      </div>
    </UContainer>
  </div>
</template>
