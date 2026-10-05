<script setup lang="ts">
const route = useRoute()

// Modes: 'otp' | 'breakglass'
const recoveryMode = ref<'otp' | 'breakglass'>('otp')

// OTP Flow Steps: 1 = Request, 2 = Verify & Reset
const step = ref<1 | 2>(1)

const form = reactive({
  email: (route.query.email as string) || '',
  otp: '',
  newPassword: '',
  confirmPassword: '',
  masterKey: ''
})

const loading = ref(false)
const error = ref('')
const successMessage = ref('')
const previewOtp = ref<string | null>(null)
const emailSentReal = ref(false)

// Step 1: Request 6-digit recovery code
async function handleRequestOtp() {
  error.value = ''
  successMessage.value = ''
  previewOtp.value = null
  emailSentReal.value = false

  if (!form.email.trim()) {
    error.value = 'Please enter your registered email address.'
    return
  }

  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; message: string; previewOtp?: string; emailSent?: boolean }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: form.email.trim() }
    })

    if (res.emailSent) {
      emailSentReal.value = true
      form.otp = '' // Force user to retrieve code from real email
    } else if (res.previewOtp) {
      previewOtp.value = res.previewOtp
      form.otp = res.previewOtp // Auto-fill preview for quick local testing
    }

    successMessage.value = res.message || 'Recovery code generated!'
    step.value = 2
  } catch (err: any) {
    error.value = err.data?.statusMessage || err.message || 'Failed to request recovery code.'
  } finally {
    loading.value = false
  }
}

// Step 2: Verify code and set new password
async function handleResetWithOtp() {
  error.value = ''
  successMessage.value = ''

  if (!form.otp.trim()) {
    error.value = 'Please enter the 6-digit verification code.'
    return
  }

  if (!form.newPassword || form.newPassword.length < 6) {
    error.value = 'Password must be at least 6 characters long.'
    return
  }

  if (form.newPassword !== form.confirmPassword) {
    error.value = 'Passwords do not match.'
    return
  }

  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: {
        email: form.email.trim(),
        otp: form.otp.trim(),
        newPassword: form.newPassword
      }
    })

    successMessage.value = res.message || 'Password successfully reset!'
    setTimeout(() => {
      navigateTo('/auth/sign-in?reset=success')
    }, 2000)
  } catch (err: any) {
    error.value = err.data?.statusMessage || err.message || 'Failed to reset password.'
  } finally {
    loading.value = false
  }
}

// Emergency Break-Glass Master Recovery for Super Admins
async function handleBreakGlassRecovery() {
  error.value = ''
  successMessage.value = ''

  if (!form.email.trim() || !form.masterKey.trim() || !form.newPassword) {
    error.value = 'All fields are required for emergency recovery.'
    return
  }

  if (form.newPassword.length < 6) {
    error.value = 'Password must be at least 6 characters.'
    return
  }

  if (form.newPassword !== form.confirmPassword) {
    error.value = 'Passwords do not match.'
    return
  }

  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/auth/admin-recovery', {
      method: 'POST',
      body: {
        email: form.email.trim(),
        recoveryKey: form.masterKey.trim(),
        newPassword: form.newPassword
      }
    })

    successMessage.value = res.message || 'Admin account successfully recovered!'
    setTimeout(() => {
      navigateTo('/auth/sign-in?reset=success')
    }, 2000)
  } catch (err: any) {
    error.value = err.data?.statusMessage || err.message || 'Emergency recovery failed.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="relative flex min-h-[100vh] items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/30">
    <!-- Animated background accents -->
    <div class="hero-orb hero-orb-1 animate-mesh opacity-20" />
    <div class="hero-orb hero-orb-2 animate-mesh opacity-15" style="animation-delay: -8s;" />

    <div class="relative w-full max-w-md px-4">
      <div class="glass-card overflow-hidden rounded-3xl p-8 shadow-2xl">
        <!-- Logo & Header -->
        <div class="mb-6 text-center">
          <NuxtLink to="/" class="inline-flex items-center gap-2">
            <div class="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/25">
              <UIcon name="i-lucide-shield-alert" class="size-6 text-white" />
            </div>
            <span class="text-xl font-bold tracking-tight text-gray-950 dark:text-white">HireReady</span>
          </NuxtLink>

          <h1 class="mt-4 text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
            Account Recovery
          </h1>
          <p class="mt-1 text-xs text-gray-500">
            Secure password reset for Candidates, Officers, and Super Admins.
          </p>
        </div>

        <!-- Mode Toggle (Standard vs Emergency Break-Glass) -->
        <div class="mb-6 flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            class="flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all"
            :class="recoveryMode === 'otp' ? 'bg-white text-gray-950 shadow-sm dark:bg-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'"
            @click="recoveryMode = 'otp'; error = ''; successMessage = ''"
          >
            Email / Code
          </button>
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all"
            :class="recoveryMode === 'breakglass' ? 'bg-white text-red-600 shadow-sm dark:bg-gray-900 dark:text-red-400' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'"
            @click="recoveryMode = 'breakglass'; error = ''; successMessage = ''"
          >
            <UIcon name="i-lucide-key" class="size-3.5" />
            Admin Master Key
          </button>
        </div>

        <!-- Feedback Alerts -->
        <div v-if="error" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
            <span>{{ error }}</span>
          </div>
        </div>

        <div v-if="successMessage" class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-check-circle" class="size-4 shrink-0" />
            <span>{{ successMessage }}</span>
          </div>
        </div>

        <!-- ── MODE A: Standard OTP Code Flow ────────────────────────────── -->
        <div v-if="recoveryMode === 'otp'">
          <!-- Step 1: Request Code -->
          <form v-if="step === 1" class="space-y-4" @submit.prevent="handleRequestOtp">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Account Email</label>
              <div class="relative">
                <UIcon name="i-lucide-mail" class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="form.email"
                  type="email"
                  required
                  placeholder="admin@hireready.demo"
                  class="w-full rounded-xl border border-gray-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                >
              </div>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:opacity-95 disabled:opacity-50"
            >
              <span v-if="loading">Generating Code...</span>
              <span v-else>Send Recovery Code</span>
            </button>
          </form>

          <!-- Step 2: Enter Code & New Password -->
          <form v-else class="space-y-4" @submit.prevent="handleResetWithOtp">
            <div v-if="emailSentReal" class="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900 dark:border-indigo-800/50 dark:bg-indigo-950/40 dark:text-indigo-200">
              <div class="flex items-start gap-2">
                <UIcon name="i-lucide-mail-check" class="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p class="font-semibold">Check your Gmail inbox</p>
                  <p class="text-[11px] text-indigo-700 dark:text-indigo-300">We dispatched a 6-digit verification code to <strong>{{ form.email }}</strong>. Please check your Inbox and Spam/Junk folder.</p>
                </div>
              </div>
            </div>

            <div v-else-if="previewOtp" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300">
              <div class="flex items-center justify-between">
                <div>
                  <span class="font-semibold">Dev/Demo Mode Code:</span>
                  <span class="ml-2 font-mono font-bold tracking-widest text-amber-900 dark:text-amber-100">{{ previewOtp }}</span>
                </div>
                <button
                  type="button"
                  class="rounded bg-amber-200/60 px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-100"
                  @click="form.otp = previewOtp"
                >
                  Auto-fill
                </button>
              </div>
              <p class="mt-1 text-[10px] text-amber-700 dark:text-amber-400">Configure GMAIL_USER and GMAIL_APP_PASSWORD in .env / Vercel to receive emails directly in Gmail.</p>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">6-Digit Verification Code</label>
              <div class="relative">
                <UIcon name="i-lucide-shield-check" class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="form.otp"
                  type="text"
                  required
                  maxlength="6"
                  placeholder="e.g. 123456"
                  class="w-full rounded-xl border border-gray-200 bg-white/80 py-2.5 pl-9 pr-3 font-mono text-sm tracking-wider text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                >
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">New Password</label>
              <div class="relative">
                <UIcon name="i-lucide-lock" class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="form.newPassword"
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  class="w-full rounded-xl border border-gray-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                >
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
              <div class="relative">
                <UIcon name="i-lucide-lock" class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="form.confirmPassword"
                  type="password"
                  required
                  placeholder="Re-enter password"
                  class="w-full rounded-xl border border-gray-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                >
              </div>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:opacity-95 disabled:opacity-50"
            >
              <span v-if="loading">Resetting Password...</span>
              <span v-else>Update Password & Sign In</span>
            </button>

            <button
              type="button"
              class="w-full text-center text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
              @click="step = 1; previewOtp = null"
            >
              ← Resend code / Change email
            </button>
          </form>
        </div>

        <!-- ── MODE B: Break-Glass Master Key for Super Admin ──────────── -->
        <div v-else>
          <form class="space-y-4" @submit.prevent="handleBreakGlassRecovery">
            <div class="rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <p class="font-semibold">⚠️ Emergency Break-Glass Procedure</p>
              <p class="mt-0.5 text-[11px] opacity-90">
                Use this master key if you have lost access to your Super Admin email.
              </p>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Super Admin Email</label>
              <div class="relative">
                <UIcon name="i-lucide-mail" class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="form.email"
                  type="email"
                  required
                  placeholder="admin@hireready.demo"
                  class="w-full rounded-xl border border-gray-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                >
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Master Recovery Key</label>
              <div class="relative">
                <UIcon name="i-lucide-key-round" class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-red-500" />
                <input
                  v-model="form.masterKey"
                  type="password"
                  required
                  placeholder="Enter ADMIN_RECOVERY_KEY"
                  class="w-full rounded-xl border border-gray-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                >
              </div>
              <p class="mt-1 text-[11px] text-gray-400">Default key: <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">HireReady-Admin-Recovery-2026!</code></p>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Set New Password</label>
              <div class="relative">
                <UIcon name="i-lucide-lock" class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="form.newPassword"
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  class="w-full rounded-xl border border-gray-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                >
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
              <div class="relative">
                <UIcon name="i-lucide-lock" class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="form.confirmPassword"
                  type="password"
                  required
                  placeholder="Re-enter password"
                  class="w-full rounded-xl border border-gray-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                >
              </div>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-500/20 transition-all hover:opacity-95 disabled:opacity-50"
            >
              <span v-if="loading">Verifying Key...</span>
              <span v-else>Recover Super Admin Account</span>
            </button>
          </form>
        </div>

        <!-- Back to Sign In Link -->
        <div class="mt-6 border-t border-gray-100 pt-4 text-center dark:border-gray-800">
          <NuxtLink to="/auth/sign-in" class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            <UIcon name="i-lucide-arrow-left" class="size-3.5" />
            Back to Sign In
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
