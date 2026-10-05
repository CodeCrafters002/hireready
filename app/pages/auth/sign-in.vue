<script setup lang="ts">
const { signIn, isAuthenticated, currentUser } = useAuth()
const route = useRoute()

const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

watch(isAuthenticated, (val) => {
  if (val) {
    const redirect = route.query.redirect as string
    if (redirect) return navigateTo(redirect)
    if (currentUser.value?.role === 'admin') return navigateTo('/admin')
    if (currentUser.value?.role === 'employer') return navigateTo('/employer')
    return navigateTo('/candidate')
  }
}, { immediate: true })

function handleSignIn() {
  error.value = ''
  loading.value = true
  if (!form.email || !form.password) {
    error.value = 'Please enter both email and password.'
    loading.value = false
    return
  }
  const result = signIn(form.email, form.password)
  loading.value = false
  if (!result.success) {
    error.value = result.error || 'Sign-in failed.'
    return
  }
  const redirect = route.query.redirect as string
  if (redirect) return navigateTo(redirect)
  if (currentUser.value?.role === 'admin') return navigateTo('/admin')
  if (currentUser.value?.role === 'employer') return navigateTo('/employer')
  navigateTo('/candidate')
}

const demoAccounts = [
  { label: 'Rahul', subtitle: 'Candidate', email: 'rahul@demo.com', icon: 'i-lucide-user', color: 'from-indigo-500 to-purple-600' },
  { label: 'Ananya', subtitle: 'Candidate', email: 'ananya@demo.com', icon: 'i-lucide-user', color: 'from-pink-500 to-rose-600' },
  { label: 'Vikram', subtitle: 'Candidate', email: 'vikram@demo.com', icon: 'i-lucide-user', color: 'from-cyan-500 to-blue-600' },
  { label: 'Priya', subtitle: 'Admin', email: 'admin@hireready.demo', icon: 'i-lucide-shield-check', color: 'from-red-500 to-orange-600' },
  { label: 'Rohan', subtitle: 'Employer', email: 'employer@brightstack.demo', icon: 'i-lucide-building-2', color: 'from-emerald-500 to-teal-600' },
]
</script>

<template>
  <div class="relative flex min-h-[100vh] items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/30">
    <!-- Background orbs -->
    <div class="hero-orb hero-orb-1 animate-mesh opacity-20" />
    <div class="hero-orb hero-orb-2 animate-mesh opacity-15" style="animation-delay: -8s;" />
    <div class="absolute inset-0 opacity-[0.025]" style="background-image: radial-gradient(rgba(99,102,241,1) 1px, transparent 1px); background-size: 24px 24px;" />

    <div class="relative w-full max-w-md px-4">
      <!-- Card -->
      <div class="glass-card overflow-hidden rounded-3xl p-8 shadow-2xl">

        <!-- Logo + heading -->
        <div class="text-center">
          <NuxtLink to="/" class="inline-flex items-center gap-2">
            <div class="nav-logo-icon grid size-10 place-items-center rounded-xl text-white text-sm font-black">HR</div>
            <span class="text-xl font-black text-gray-900 dark:text-white">HireReady</span>
          </NuxtLink>
          <h1 class="mt-5 text-2xl font-black text-gray-950 dark:text-white">Welcome back</h1>
          <p class="mt-1.5 text-sm text-gray-500">
            <span class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <UIcon name="i-lucide-zap" class="size-3" />
              Demo mode — any password works
            </span>
          </p>
        </div>

        <!-- Form -->
        <form class="mt-7 space-y-4" @submit.prevent="handleSignIn">
          <!-- Email -->
          <div>
            <label class="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Email address</label>
            <div class="relative">
              <UIcon name="i-lucide-mail" class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="form.email"
                type="email"
                placeholder="you@example.com"
                class="h-11 w-full rounded-xl border border-gray-200 bg-white/80 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
            </div>
          </div>

          <!-- Password -->
          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Password</label>
              <NuxtLink to="/auth/forgot-password" class="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                Forgot / Recover?
              </NuxtLink>
            </div>
            <div class="relative">
              <UIcon name="i-lucide-lock" class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="form.password"
                type="password"
                placeholder="Any password (demo mode)"
                class="h-11 w-full rounded-xl border border-gray-200 bg-white/80 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
            </div>
          </div>

          <!-- Error -->
          <div v-if="error" class="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
            <UIcon name="i-lucide-circle-alert" class="size-4 shrink-0" />
            {{ error }}
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="loading"
            class="btn-glow flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold disabled:opacity-70"
          >
            <UIcon v-if="loading" name="i-lucide-loader-2" class="size-4 animate-spin" />
            <UIcon v-else name="i-lucide-log-in" class="size-4" />
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <!-- Demo accounts -->
        <div class="mt-6">
          <div class="flex items-center gap-3">
            <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span class="text-xs font-medium text-gray-400">or try a demo account</span>
            <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              v-for="account in demoAccounts"
              :key="account.email"
              class="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3 text-center transition-all hover:border-indigo-200 hover:bg-indigo-50 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"
              @click="form.email = account.email; form.password = 'demo'"
            >
              <div
                class="grid size-8 place-items-center rounded-lg text-white text-xs font-bold bg-gradient-to-br shadow"
                :class="account.color"
              >
                {{ account.label.charAt(0) }}
              </div>
              <span class="text-xs font-semibold text-gray-700 dark:text-gray-200">{{ account.label }}</span>
              <span class="text-[10px] text-gray-400">{{ account.subtitle }}</span>
            </button>
          </div>
        </div>

        <!-- Footer link -->
        <p class="mt-6 text-center text-sm text-gray-500">
          Don't have an account?
          <NuxtLink to="/auth/sign-up" class="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            Sign up free
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
