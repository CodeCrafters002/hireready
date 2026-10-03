<script setup lang="ts">
const { signUp, isAuthenticated } = useAuth()

const form = reactive({ name: '', email: '', password: '', confirmPassword: '' })
const error = ref('')
const loading = ref(false)

watch(isAuthenticated, (val) => {
  if (val) navigateTo('/candidate')
}, { immediate: true })

function handleSignUp() {
  error.value = ''
  if (!form.name || !form.email || !form.password) {
    error.value = 'Please fill in all fields.'
    return
  }
  if (form.password !== form.confirmPassword) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  const result = signUp(form.name, form.email, form.password, 'candidate')
  loading.value = false
  if (!result.success) {
    error.value = result.error || 'Sign-up failed.'
    return
  }
  navigateTo('/candidate')
}
</script>

<template>
  <UContainer class="flex min-h-[80vh] items-center justify-center py-12">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <NuxtLink to="/" class="inline-flex items-center gap-2 font-bold text-gray-950 dark:text-white">
            <span class="grid size-9 place-items-center rounded-lg bg-primary text-lg text-white">H</span>
            <span class="text-xl">HireReady</span>
          </NuxtLink>
          <h1 class="mt-4 text-2xl font-bold text-gray-950 dark:text-white">Create your account</h1>
          <p class="mt-2 text-sm text-gray-500">Demo mode — no real data is stored</p>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="handleSignUp">
        <UFormField label="Full name" required>
          <UInput v-model="form.name" placeholder="Your full name" class="w-full" icon="i-lucide-user" />
        </UFormField>
        <UFormField label="Email" required>
          <UInput v-model="form.email" type="email" placeholder="you@example.com" class="w-full" icon="i-lucide-mail" />
        </UFormField>
        <UFormField label="Password" required>
          <UInput v-model="form.password" type="password" placeholder="Choose a password" class="w-full" icon="i-lucide-lock" />
        </UFormField>
        <UFormField label="Confirm password" required>
          <UInput v-model="form.confirmPassword" type="password" placeholder="Confirm your password" class="w-full" icon="i-lucide-lock" />
        </UFormField>

        <UAlert v-if="error" color="error" variant="soft" :description="error" icon="i-lucide-circle-alert" />

        <UButton type="submit" block size="lg" label="Create account" :loading="loading" />
      </form>

      <template #footer>
        <p class="text-center text-sm text-gray-500">
          Already have an account?
          <NuxtLink to="/auth/sign-in" class="font-medium text-primary hover:underline">Sign in</NuxtLink>
        </p>
      </template>
    </UCard>
  </UContainer>
</template>
