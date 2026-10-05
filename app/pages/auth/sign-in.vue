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
          <p class="mt-1.5 text-sm text-gray-500">Sign in to continue to your dashboard</p>
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
                placeholder="Enter your password"
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
