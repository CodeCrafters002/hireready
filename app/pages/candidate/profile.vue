<script setup lang="ts">
definePageMeta({ layout: 'candidate' })

const { currentUser } = useAuth()
const store = useDataStore()

const profile = computed(() => currentUser.value ? store.getProfileByUserId(currentUser.value.id) : null)

const form = reactive({
  fullName: '',
  email: '',
  mobile: '',
  city: '',
  skills: '',
  education: '',
  experience: '',
  resumeFilename: ''
})

const saving = ref(false)
const saved = ref(false)

// Load profile data
onMounted(() => {
  if (profile.value) {
    form.fullName = profile.value.fullName
    form.email = profile.value.email
    form.mobile = profile.value.mobile
    form.city = profile.value.city
    form.skills = profile.value.skills.join(', ')
    form.education = profile.value.education
    form.experience = profile.value.experience
    form.resumeFilename = profile.value.resumeFilename
  }
})

const profileCompletion = computed(() => {
  const fields = [form.fullName, form.email, form.mobile, form.city, form.skills, form.education, form.experience, form.resumeFilename]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
})

function saveProfile() {
  if (!currentUser.value) return
  saving.value = true
  saved.value = false
  store.upsertProfile({
    userId: currentUser.value.id,
    fullName: form.fullName,
    email: form.email,
    mobile: form.mobile,
    city: form.city,
    skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
    education: form.education,
    experience: form.experience,
    resumeFilename: form.resumeFilename,
    profilePhotoUrl: '',
    updatedAt: new Date().toISOString()
  })
  setTimeout(() => {
    saving.value = false
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  }, 500)
}

function handleResumeDemo() {
  form.resumeFilename = `${form.fullName.replace(/\s+/g, '_').toLowerCase()}_resume.pdf`
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-950 dark:text-white">My Profile</h2>
      <p class="mt-1 text-gray-500">Keep your profile updated for the best results.</p>
    </div>

    <!-- Completion bar -->
    <UCard class="mb-6">
      <div class="flex items-center gap-4">
        <div class="grid size-14 shrink-0 place-items-center rounded-full bg-primary-100 text-xl font-bold text-primary dark:bg-primary-900">
          {{ currentUser?.name?.charAt(0) || '?' }}
        </div>
        <div class="flex-1">
          <p class="font-semibold text-gray-950 dark:text-white">{{ form.fullName || 'Your Name' }}</p>
          <div class="mt-2 flex items-center gap-3">
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                class="h-full rounded-full transition-all"
                :class="profileCompletion === 100 ? 'bg-emerald-500' : 'bg-primary'"
                :style="{ width: profileCompletion + '%' }"
              />
            </div>
            <span class="text-sm font-medium" :class="profileCompletion === 100 ? 'text-emerald-600' : 'text-gray-500'">{{ profileCompletion }}%</span>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Profile form -->
    <UCard>
      <form class="space-y-5" @submit.prevent="saveProfile">
        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField label="Full name" required>
            <UInput v-model="form.fullName" class="w-full" placeholder="Your full name" icon="i-lucide-user" />
          </UFormField>
          <UFormField label="Email" required>
            <UInput v-model="form.email" class="w-full" type="email" placeholder="you@example.com" icon="i-lucide-mail" />
          </UFormField>
          <UFormField label="Mobile number">
            <UInput v-model="form.mobile" class="w-full" type="tel" placeholder="10-digit mobile" icon="i-lucide-phone" />
          </UFormField>
          <UFormField label="City / Location">
            <UInput v-model="form.city" class="w-full" placeholder="e.g. Bengaluru" icon="i-lucide-map-pin" />
          </UFormField>
        </div>

        <UFormField label="Skills" hint="Comma-separated">
          <UInput v-model="form.skills" class="w-full" placeholder="JavaScript, Vue.js, TypeScript" icon="i-lucide-sparkles" />
        </UFormField>

        <UFormField label="Education">
          <UTextarea v-model="form.education" class="w-full" placeholder="B.Tech in Computer Science — VIT, 2024" :rows="2" />
        </UFormField>

        <UFormField label="Experience">
          <UTextarea v-model="form.experience" class="w-full" placeholder="1.5 years as Frontend Intern at TechCorp" :rows="2" />
        </UFormField>

        <UFormField label="Résumé">
          <div class="flex items-center gap-3">
            <UInput v-model="form.resumeFilename" class="flex-1" placeholder="No file uploaded" icon="i-lucide-file-text" readonly />
            <UButton type="button" variant="soft" label="Demo upload" icon="i-lucide-upload" @click="handleResumeDemo" />
          </div>
          <p class="mt-1 text-xs text-gray-400">Demo mode: clicking "Demo upload" generates a placeholder filename.</p>
        </UFormField>

        <UAlert v-if="saved" color="success" variant="soft" title="Profile saved!" description="Your profile has been updated." icon="i-lucide-check-circle" />

        <div class="flex justify-end">
          <UButton type="submit" size="lg" label="Save profile" icon="i-lucide-save" :loading="saving" />
        </div>
      </form>
    </UCard>
  </div>
</template>
