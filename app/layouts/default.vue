<script setup lang="ts">
const { currentUser, isAuthenticated, isCandidate, isAdmin, isEmployer, signOut } = useAuth()
const route = useRoute()

const navLinks = computed(() => [
  { to: '/jobs', label: 'Find Jobs', icon: 'i-lucide-briefcase' },
  { to: '/gigs', label: '1-Day Gigs', icon: 'i-lucide-calendar-clock' },
  { to: '/application', label: 'Applications', icon: 'i-lucide-file-text', auth: true },
  ...(isCandidate.value ? [{ to: '/candidate', label: 'Dashboard', icon: 'i-lucide-layout-dashboard' }] : []),
  ...(isAdmin.value ? [{ to: '/admin', label: 'Admin', icon: 'i-lucide-shield-check' }] : []),
  ...(isEmployer.value ? [{ to: '/employer', label: 'Employer', icon: 'i-lucide-building-2' }] : []),
])

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <UApp>
    <!-- ── Navbar ─────────────────────────────────────────────── -->
    <header class="sticky top-0 z-50 border-b border-white/10 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-gray-950/80">
      <!-- Top accent line -->
      <div class="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500" />

      <UContainer class="flex min-h-16 items-center justify-between gap-4">
        <!-- Logo -->
        <NuxtLink to="/" class="group flex items-center gap-2.5">
          <div class="nav-logo-icon grid size-9 place-items-center rounded-xl text-white">
            <span class="text-base font-black tracking-tight">HR</span>
          </div>
          <div class="flex flex-col leading-none">
            <span class="text-sm font-bold text-gray-900 dark:text-white">HireReady</span>
            <span class="text-[10px] font-medium text-indigo-500">Assess · Prepare · Hire</span>
          </div>
        </NuxtLink>

        <!-- Desktop Nav -->
        <nav class="hidden items-center gap-1 md:flex">
          <NuxtLink
            v-for="link in navLinks.filter(l => !l.auth || isAuthenticated)"
            :key="link.to"
            :to="link.to"
            class="group flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200"
            :class="isActive(link.to)
              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'"
          >
            <UIcon :name="link.icon" class="size-4 opacity-70 group-hover:opacity-100" />
            {{ link.label }}
          </NuxtLink>
        </nav>

        <!-- Auth Controls -->
        <div class="flex items-center gap-2">
          <template v-if="isAuthenticated">
            <!-- User chip -->
            <div class="hidden items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 sm:flex dark:border-indigo-900/40 dark:bg-indigo-950/30">
              <div class="size-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
              <span class="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{{ currentUser?.name?.split(' ')[0] }}</span>
              <UBadge
                :label="currentUser?.role"
                color="primary"
                variant="subtle"
                size="xs"
                class="capitalize"
              />
            </div>
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              icon="i-lucide-log-out"
              class="opacity-60 hover:opacity-100"
              @click="signOut"
            />
          </template>
          <template v-else>
            <UButton to="/auth/sign-in" size="sm" color="neutral" variant="ghost" label="Sign in" icon="i-lucide-log-in" />
            <UButton
              to="/auth/sign-up"
              size="sm"
              label="Get started"
              icon="i-lucide-sparkles"
              class="btn-glow rounded-xl px-4"
            />
          </template>
        </div>
      </UContainer>
    </header>

    <!-- ── Page Content ───────────────────────────────────────── -->
    <UMain>
      <slot />
    </UMain>

    <!-- ── Footer ─────────────────────────────────────────────── -->
    <footer class="relative mt-20 overflow-hidden border-t border-gray-100 dark:border-gray-800/60">
      <!-- Subtle gradient background -->
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950" />

      <div class="relative">
        <UContainer class="py-12">
          <div class="grid gap-8 md:grid-cols-4">
            <!-- Brand -->
            <div class="md:col-span-2">
              <div class="flex items-center gap-2">
                <div class="nav-logo-icon grid size-8 place-items-center rounded-lg text-white text-xs font-black">HR</div>
                <span class="font-bold text-gray-900 dark:text-white">HireReady</span>
              </div>
              <p class="mt-3 max-w-xs text-sm leading-6 text-gray-500">
                A qualification-first job portal — candidates are assessed and prepared before reaching employers.
              </p>
              <div class="mt-4 flex gap-3">
                <div class="size-2 rounded-full bg-green-400 animate-pulse" />
                <span class="text-xs text-gray-400">All systems operational</span>
              </div>
            </div>

            <!-- Links -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-gray-400">Platform</p>
              <ul class="mt-4 space-y-3 text-sm">
                <li><NuxtLink to="/jobs" class="text-gray-500 hover:text-indigo-600 transition-colors">Browse Jobs</NuxtLink></li>
                <li><NuxtLink to="/auth/sign-up" class="text-gray-500 hover:text-indigo-600 transition-colors">Create Account</NuxtLink></li>
                <li><NuxtLink to="/auth/sign-in" class="text-gray-500 hover:text-indigo-600 transition-colors">Sign In</NuxtLink></li>
              </ul>
            </div>

            <!-- Info -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-gray-400">Process</p>
              <ul class="mt-4 space-y-3 text-sm">
                <li class="text-gray-500">Apply & Pay ₹1,000</li>
                <li class="text-gray-500">MCQ Assessment</li>
                <li class="text-gray-500">Mock Interview</li>
                <li class="text-gray-500">Employer Review</li>
              </ul>
            </div>
          </div>

          <div class="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 text-xs text-gray-400 dark:border-gray-800 sm:flex-row">
            <p>© {{ new Date().getFullYear() }} HireReady · Assess. Prepare. Get hired.</p>
            <p class="flex items-center gap-1">
              Built with <span class="text-red-400">♥</span> for serious candidates
            </p>
          </div>
        </UContainer>
      </div>
    </footer>
  </UApp>
</template>
