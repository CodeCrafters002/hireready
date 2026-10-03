<script setup lang="ts">
const store = useDataStore()

const displayJobs = computed(() => store.getPublishedJobs().slice(0, 3))

const stats = [
  { value: '2,400+', label: 'Candidates placed', icon: 'i-lucide-users' },
  { value: '180+', label: 'Partner companies', icon: 'i-lucide-building-2' },
  { value: '94%', label: 'Interview success', icon: 'i-lucide-trending-up' },
  { value: '₹1K', label: 'Application fee', icon: 'i-lucide-shield-check' },
]

const steps = [
  { label: 'Choose a role', icon: 'i-lucide-search', color: 'from-indigo-500 to-indigo-600' },
  { label: 'Pay ₹1,000 assessment fee', icon: 'i-lucide-credit-card', color: 'from-purple-500 to-purple-600' },
  { label: 'Pass the MCQ assessment', icon: 'i-lucide-clipboard-check', color: 'from-violet-500 to-violet-600' },
  { label: 'Attend mock interview', icon: 'i-lucide-video', color: 'from-cyan-500 to-cyan-600' },
  { label: 'Profile shared with employer', icon: 'i-lucide-rocket', color: 'from-emerald-500 to-emerald-600' },
]

const features = [
  { icon: 'i-lucide-brain-circuit', label: 'AI-powered assessments', desc: 'Role-specific questions tailored to each job.' },
  { icon: 'i-lucide-shield-check', label: 'Verified profiles only', desc: 'Every candidate is screened before employer view.' },
  { icon: 'i-lucide-video', label: 'Mock interview prep', desc: 'Practice with professionals before the real thing.' },
  { icon: 'i-lucide-chart-line', label: 'Live progress tracking', desc: 'Follow your application every step of the way.' },
  { icon: 'i-lucide-bell', label: 'Smart notifications', desc: 'Never miss an update or deadline again.' },
  { icon: 'i-lucide-lock-keyhole', label: '100% transparent fees', desc: 'Flat ₹1,000 fee, no hidden charges ever.' },
]
</script>

<template>
  <div>
    <!-- ── HERO SECTION ──────────────────────────────────────── -->
    <section class="hero-mesh relative overflow-hidden">
      <!-- Animated gradient orbs -->
      <div class="hero-orb hero-orb-1 animate-mesh" />
      <div class="hero-orb hero-orb-2 animate-mesh" style="animation-delay: -6s;" />
      <div class="hero-orb hero-orb-3 animate-mesh" style="animation-delay: -12s;" />

      <!-- Grid pattern overlay -->
      <div class="absolute inset-0 opacity-[0.03]" style="background-image: linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px); background-size: 40px 40px;" />

      <UContainer class="relative py-24 lg:py-32">
        <div class="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">

          <!-- Left: Main copy -->
          <div class="opacity-0 animate-fade-up" style="animation-fill-mode: forwards;">
            <!-- Badge -->
            <div class="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 dark:border-indigo-800/50 dark:bg-indigo-950/40">
              <div class="size-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">India's qualification-first job portal</span>
            </div>

            <!-- Headline -->
            <h1 class="mt-6 text-5xl font-black leading-[1.1] tracking-tight text-gray-950 dark:text-white sm:text-6xl lg:text-7xl">
              Get hired
              <span class="block gradient-text">the right way.</span>
            </h1>

            <p class="mt-6 max-w-xl text-lg leading-8 text-gray-600 dark:text-gray-300">
              Stop sending blind applications. At HireReady, you complete a short assessment and mock interview
              <strong class="text-gray-900 dark:text-white">before</strong> your profile reaches employers — so every introduction counts.
            </p>

            <!-- CTA buttons -->
            <div class="mt-8 flex flex-wrap gap-4">
              <NuxtLink
                to="/jobs"
                class="btn-glow flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold shadow-lg"
              >
                <UIcon name="i-lucide-briefcase" class="size-4" />
                Explore jobs
                <UIcon name="i-lucide-arrow-right" class="size-4" />
              </NuxtLink>
              <NuxtLink
                to="/auth/sign-up"
                class="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <UIcon name="i-lucide-user-plus" class="size-4" />
                Create free account
              </NuxtLink>
            </div>

            <!-- Social proof -->
            <div class="mt-10 flex items-center gap-4">
              <div class="flex -space-x-2">
                <div v-for="(color, i) in ['from-indigo-400 to-indigo-600', 'from-purple-400 to-purple-600', 'from-cyan-400 to-cyan-600', 'from-pink-400 to-pink-600']"
                  :key="i"
                  class="size-8 rounded-full border-2 border-white bg-gradient-to-br dark:border-gray-900"
                  :class="color"
                />
              </div>
              <p class="text-sm text-gray-500">
                <span class="font-semibold text-gray-900 dark:text-white">2,400+</span> candidates successfully placed this year
              </p>
            </div>
          </div>

          <!-- Right: Journey card -->
          <div class="opacity-0 animate-slide-right delay-200" style="animation-fill-mode: forwards;">
            <div class="glass-card overflow-hidden rounded-3xl p-6 shadow-2xl">
              <!-- Card header -->
              <div class="mb-6 flex items-center justify-between">
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-widest text-indigo-500">Your journey</p>
                  <h2 class="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">Path to the client</h2>
                </div>
                <div class="rounded-xl bg-indigo-50 p-2 dark:bg-indigo-950/40">
                  <UIcon name="i-lucide-route" class="size-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>

              <!-- Steps -->
              <ol class="space-y-3">
                <li
                  v-for="(step, index) in steps"
                  :key="step.label"
                  class="flex items-center gap-4 rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-indigo-100 hover:bg-indigo-50/50 dark:hover:border-indigo-900/30 dark:hover:bg-indigo-950/20"
                >
                  <div class="step-badge grid size-9 shrink-0 place-items-center rounded-xl text-white" :class="`bg-gradient-to-br ${step.color}`">
                    <UIcon :name="step.icon" class="size-4" />
                  </div>
                  <div class="flex-1">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ step.label }}</span>
                  </div>
                  <div class="size-1.5 shrink-0 rounded-full" :class="index === 4 ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700'" />
                </li>
              </ol>

              <!-- Fee callout -->
              <div class="mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4 dark:from-indigo-900/30 dark:to-purple-900/30">
                <UIcon name="i-lucide-info" class="size-4 shrink-0 text-indigo-500" />
                <p class="text-xs text-gray-600 dark:text-gray-300">
                  One-time <strong class="text-indigo-600 dark:text-indigo-400">₹1,000</strong> assessment fee — refundable if not shortlisted.
                </p>
              </div>
            </div>
          </div>

        </div>

        <!-- Stats row -->
        <div class="mt-16 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div
            v-for="(stat, i) in stats"
            :key="stat.label"
            class="stat-card opacity-0 animate-fade-up"
            :class="`delay-${(i + 3) * 100}`"
            style="animation-fill-mode: forwards;"
          >
            <div class="flex items-start justify-between">
              <UIcon :name="stat.icon" class="size-5 text-indigo-500" />
              <div class="size-1.5 rounded-full bg-green-400 animate-pulse" />
            </div>
            <p class="mt-3 text-2xl font-black text-gray-900 dark:text-white">{{ stat.value }}</p>
            <p class="mt-0.5 text-xs font-medium text-gray-500">{{ stat.label }}</p>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- ── FEATURED JOBS ─────────────────────────────────────── -->
    <section class="py-20">
      <UContainer>
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-indigo-500">Open opportunities</p>
            <h2 class="mt-2 text-3xl font-black tracking-tight text-gray-950 dark:text-white">
              Featured <span class="gradient-text">jobs</span>
            </h2>
          </div>
          <NuxtLink
            to="/jobs"
            class="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
          >
            View all
            <UIcon name="i-lucide-arrow-right" class="size-4" />
          </NuxtLink>
        </div>

        <div class="mt-8 grid gap-5 md:grid-cols-3">
          <NuxtLink
            v-for="job in displayJobs"
            :key="job.id"
            :to="`/jobs/${job.id}`"
            class="job-card glass-card group flex flex-col rounded-2xl p-5 no-underline"
          >
            <!-- Job header -->
            <div class="flex items-start justify-between gap-3">
              <!-- Company logo placeholder -->
              <div class="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-base font-black text-white shadow-lg">
                {{ job.company.charAt(0) }}
              </div>
              <span class="tag-pill ml-auto">{{ job.type }}</span>
            </div>

            <div class="mt-4 flex-1">
              <h3 class="font-bold text-gray-950 group-hover:text-indigo-600 transition-colors dark:text-white dark:group-hover:text-indigo-400">
                {{ job.title }}
              </h3>
              <p class="mt-0.5 text-sm font-medium text-gray-500">{{ job.company }}</p>
              <p class="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400 line-clamp-2">{{ job.summary }}</p>
            </div>

            <!-- Meta -->
            <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-gray-100 pt-4 text-xs text-gray-500 dark:border-gray-800">
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-map-pin" class="size-3.5 text-indigo-400" />
                {{ job.location }}
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-banknote" class="size-3.5 text-emerald-500" />
                {{ job.salary }}
              </span>
              <span class="ml-auto flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                Apply now
                <UIcon name="i-lucide-arrow-right" class="size-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </NuxtLink>
        </div>
      </UContainer>
    </section>

    <!-- ── WHY HIREREADY ─────────────────────────────────────── -->
    <section class="py-20">
      <!-- Section background -->
      <div class="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 py-20 dark:from-indigo-900 dark:via-purple-900 dark:to-indigo-900">
        <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px); background-size: 24px 24px;" />
        <div class="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div class="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

        <UContainer class="relative text-center">
          <p class="text-xs font-bold uppercase tracking-widest text-indigo-200">Why choose us</p>
          <h2 class="mt-3 text-4xl font-black text-white">
            Everything you need to succeed
          </h2>
          <p class="mt-4 max-w-xl mx-auto text-indigo-200">
            We believe great talent deserves a fair shot. Our platform removes noise and surfaces the best-prepared candidates.
          </p>

          <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 text-left">
            <div
              v-for="feature in features"
              :key="feature.label"
              class="group rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/12"
            >
              <div class="flex size-10 items-center justify-center rounded-xl bg-white/10 group-hover:bg-white/20 transition-colors">
                <UIcon :name="feature.icon" class="size-5 text-white" />
              </div>
              <h3 class="mt-4 font-bold text-white">{{ feature.label }}</h3>
              <p class="mt-1.5 text-sm text-indigo-200">{{ feature.desc }}</p>
            </div>
          </div>
        </UContainer>
      </div>
    </section>

    <!-- ── FINAL CTA ──────────────────────────────────────────── -->
    <section class="py-20">
      <UContainer>
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-950 to-indigo-950 p-12 text-center shadow-2xl dark:from-gray-900 dark:to-indigo-950">
          <div class="absolute inset-0 opacity-5" style="background-image: linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px); background-size: 32px 32px;" />
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-indigo-600/20 blur-3xl" />

          <div class="relative">
            <p class="text-xs font-bold uppercase tracking-widest text-indigo-400">Ready to begin?</p>
            <h2 class="mt-3 text-4xl font-black text-white">
              Your next opportunity<br><span class="shimmer-text">starts here.</span>
            </h2>
            <p class="mt-4 mx-auto max-w-md text-gray-400">
              Join thousands of candidates who got hired through a fair, transparent, and merit-based process.
            </p>
            <div class="mt-8 flex flex-wrap justify-center gap-4">
              <NuxtLink
                to="/auth/sign-up"
                class="btn-glow flex items-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-bold shadow-xl"
              >
                <UIcon name="i-lucide-sparkles" class="size-4" />
                Create your account
              </NuxtLink>
              <NuxtLink
                to="/jobs"
                class="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              >
                Browse jobs first
                <UIcon name="i-lucide-arrow-right" class="size-4" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </UContainer>
    </section>
  </div>
</template>
