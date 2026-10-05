<script setup lang="ts">
import type { UserRole } from '~/types/portal'

const { signUp, isAuthenticated, isCandidate, isEmployer } = useAuth()
const route = useRoute()

// Check if deep-linked via ?type=employer or ?type=organization
const accountType = ref<'candidate' | 'employer'>('candidate')

onMounted(() => {
  const typeParam = String(route.query.type || '').toLowerCase()
  if (typeParam === 'employer' || typeParam === 'organization' || typeParam === 'company') {
    accountType.value = 'employer'
  }
})

watch(isAuthenticated, (val) => {
  if (val) {
    if (isEmployer.value) {
      navigateTo('/employer/gigs')
    } else {
      navigateTo('/candidate')
    }
  }
}, { immediate: true })

// Candidate state
const candidateForm = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// Organization state
const orgForm = reactive({
  companyName: '',
  contactPerson: '',
  workEmail: '',
  orgType: 'exam_board',
  city: '',
  password: '',
  confirmPassword: ''
})

const error = ref('')
const loading = ref(false)

async function handleCandidateSignUp() {
  error.value = ''
  if (!candidateForm.name || !candidateForm.email || !candidateForm.password) {
    error.value = 'Please fill in all required fields.'
    return
  }
  if (candidateForm.password !== candidateForm.confirmPassword) {
    error.value = 'Passwords do not match.'
    return
  }

  loading.value = true
  const result = await signUp(candidateForm.name, candidateForm.email, candidateForm.password, 'candidate')
  loading.value = false

  if (!result.success) {
    error.value = result.error || 'Sign-up failed.'
    return
  }

  navigateTo('/candidate')
}

async function handleOrgSignUp() {
  error.value = ''
  if (!orgForm.companyName || !orgForm.workEmail || !orgForm.password) {
    error.value = 'Please provide Organization Name, Work Email, and Password.'
    return
  }
  if (orgForm.password !== orgForm.confirmPassword) {
    error.value = 'Passwords do not match.'
    return
  }

  loading.value = true
  const result = await signUp(
    orgForm.companyName,
    orgForm.workEmail,
    orgForm.password,
    'employer',
    {
      company: orgForm.companyName,
      contactPerson: orgForm.contactPerson || orgForm.companyName,
      orgType: orgForm.orgType,
      city: orgForm.city
    }
  )
  loading.value = false

  if (!result.success) {
    error.value = result.error || 'Organization registration failed.'
    return
  }

  navigateTo('/employer/gigs')
}
</script>

<template>
  <UContainer class="flex min-h-[85vh] items-center justify-center py-12">
    <UCard class="w-full max-w-lg shadow-xl border border-gray-100 dark:border-gray-800">
      <template #header>
        <div class="text-center">
          <NuxtLink to="/" class="inline-flex items-center gap-2 font-bold text-gray-950 dark:text-white">
            <span class="grid size-9 place-items-center rounded-lg bg-primary text-lg text-white">H</span>
            <span class="text-xl">HireReady</span>
          </NuxtLink>
          <h1 class="mt-4 text-2xl font-black text-gray-950 dark:text-white">Create your account</h1>
          <p class="mt-1 text-xs text-gray-500">
            Join India's trusted platform for verified hiring and 1-day duty staffing.
          </p>

          <!-- ── Account Type Switcher ────────────────────────────────────── -->
          <div class="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1 dark:bg-gray-800/80">
            <button
              type="button"
              class="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all"
              :class="accountType === 'candidate'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
              @click="accountType = 'candidate'; error = ''"
            >
              <UIcon name="i-lucide-graduation-cap" class="size-4" />
              <span>Candidate / Student</span>
            </button>

            <button
              type="button"
              class="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all"
              :class="accountType === 'employer'
                ? 'bg-white text-emerald-600 shadow-sm dark:bg-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
              @click="accountType = 'employer'; error = ''"
            >
              <UIcon name="i-lucide-building-2" class="size-4" />
              <span>Organization / Employer</span>
            </button>
          </div>
        </div>
      </template>

      <!-- ── Candidate Form ───────────────────────────────────────────────── -->
      <form v-if="accountType === 'candidate'" class="space-y-4" @submit.prevent="handleCandidateSignUp">
        <UFormField label="Full Name" required>
          <UInput v-model="candidateForm.name" placeholder="Rahul Sharma" class="w-full" icon="i-lucide-user" />
        </UFormField>

        <UFormField label="Email" required hint="Used for exam duty alerts & login">
          <UInput v-model="candidateForm.email" type="email" placeholder="you@example.com" class="w-full" icon="i-lucide-mail" />
        </UFormField>

        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField label="Password" required>
            <UInput v-model="candidateForm.password" type="password" placeholder="Create password" class="w-full" icon="i-lucide-lock" />
          </UFormField>

          <UFormField label="Confirm Password" required>
            <UInput v-model="candidateForm.confirmPassword" type="password" placeholder="Confirm password" class="w-full" icon="i-lucide-lock" />
          </UFormField>
        </div>

        <UAlert v-if="error" color="error" variant="soft" :description="error" icon="i-lucide-circle-alert" />

        <UButton type="submit" block size="lg" label="Create Candidate Account" :loading="loading" />
      </form>

      <!-- ── Organization Form ────────────────────────────────────────────── -->
      <form v-else class="space-y-4" @submit.prevent="handleOrgSignUp">
        <!-- Trust badge for organizations -->
        <div class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center gap-2.5">
          <UIcon name="i-lucide-shield-check" class="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Post 1-day invigilation duties, tech lab shifts, and hire verified graduates with escrow protection.</span>
        </div>

        <UFormField label="Organization / Company Name" required hint="e.g. Tata Consultancy Services, National Testing Agency">
          <UInput v-model="orgForm.companyName" placeholder="e.g. Tata Consultancy Services" class="w-full" icon="i-lucide-building" />
        </UFormField>

        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField label="Official Work Email" required hint="Corporate/Official email preferred">
            <UInput v-model="orgForm.workEmail" type="email" placeholder="hr@company.com" class="w-full" icon="i-lucide-mail" />
          </UFormField>

          <UFormField label="Contact Person / Officer Name">
            <UInput v-model="orgForm.contactPerson" placeholder="e.g. Head of Operations" class="w-full" icon="i-lucide-user" />
          </UFormField>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField label="Organization Type">
            <select
              v-model="orgForm.orgType"
              class="w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="enterprise">IT &amp; Enterprise Corporation</option>
              <option value="exam_board">Examination Board / Testing Agency</option>
              <option value="university">University / Educational Institute</option>
              <option value="events">Conferences &amp; Event Logistics</option>
              <option value="startup">Startup / Growth Business</option>
            </select>
          </UFormField>

          <UFormField label="City / Head Office Location">
            <UInput v-model="orgForm.city" placeholder="e.g. Mumbai, New Delhi" class="w-full" icon="i-lucide-map-pin" />
          </UFormField>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField label="Password" required>
            <UInput v-model="orgForm.password" type="password" placeholder="Create password" class="w-full" icon="i-lucide-lock" />
          </UFormField>

          <UFormField label="Confirm Password" required>
            <UInput v-model="orgForm.confirmPassword" type="password" placeholder="Confirm password" class="w-full" icon="i-lucide-lock" />
          </UFormField>
        </div>

        <UAlert v-if="error" color="error" variant="soft" :description="error" icon="i-lucide-circle-alert" />

        <UButton
          type="submit"
          block
          size="lg"
          color="success"
          label="Register Organization &amp; Start Hiring"
          :loading="loading"
          icon="i-lucide-building-2"
        />
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
