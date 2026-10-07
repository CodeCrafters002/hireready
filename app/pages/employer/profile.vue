<script setup lang="ts">
definePageMeta({ layout: 'employer' })

const { currentUser, updateCurrentUser, signOut } = useAuth()
const store = useDataStore()

onMounted(async () => {
  await store.syncWithDatabase()
  hydrateForm()
})

const form = reactive({
  name: '',
  email: '',
  phone: '',
  company: '',
  orgType: '',
  city: '',
  bio: '',
  profilePhotoUrl: ''
})

const photoPreview = ref('')
const photoInputRef = ref<HTMLInputElement | null>(null)
const saving = ref(false)
const saveSuccess = ref('')
const saveError = ref('')

function hydrateForm() {
  if (currentUser.value) {
    form.name = currentUser.value.name || ''
    form.email = currentUser.value.email || ''
    form.phone = (currentUser.value as any).phone || ''
    form.company = (currentUser.value as any).company || ''
    form.orgType = (currentUser.value as any).orgType || ''
    form.city = (currentUser.value as any).city || ''
    form.bio = (currentUser.value as any).bio || ''
    form.profilePhotoUrl = (currentUser.value as any).profilePhotoUrl || ''
    photoPreview.value = (currentUser.value as any).profilePhotoUrl || ''
  }
}

watch(currentUser, () => {
  hydrateForm()
}, { immediate: true })

function triggerPhotoUpload() {
  saveError.value = ''
  photoInputRef.value?.click()
}

function handlePhotoChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  saveError.value = ''
  if (!file.type.startsWith('image/')) {
    saveError.value = 'Please upload a valid image (JPG, PNG, WEBP).'
    return
  }

  if (file.size > 4 * 1024 * 1024) {
    saveError.value = 'Image size should be less than 4MB.'
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxDim = 320
      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', 0.85)
        photoPreview.value = compressed
        form.profilePhotoUrl = compressed
      }
    }
    img.src = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

function removePhoto() {
  photoPreview.value = ''
  form.profilePhotoUrl = ''
  if (photoInputRef.value) photoInputRef.value.value = ''
}

async function handleSaveProfile() {
  saveError.value = ''
  saveSuccess.value = ''

  if (!form.name.trim() || !form.email.trim()) {
    saveError.value = 'Full name and email are required.'
    return
  }

  if (!currentUser.value?.id) {
    saveError.value = 'Session error. Please sign in again.'
    return
  }

  saving.value = true
  try {
    const updates = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      orgType: form.orgType.trim(),
      city: form.city.trim(),
      bio: form.bio.trim(),
      profilePhotoUrl: form.profilePhotoUrl
    }

    store.updateUser(currentUser.value.id, updates as any)
    updateCurrentUser(updates as any)

    saveSuccess.value = 'Organization profile updated successfully!'
    setTimeout(() => { saveSuccess.value = '' }, 5000)
  } catch (err: any) {
    saveError.value = err.message || 'Failed to update organization profile.'
  } finally {
    saving.value = false
  }
}

// ── Password Form ─────────────────────────────────────────────────────────────
const passwordForm = reactive({ newPassword: '', confirmPassword: '', showPw: false })
const pwSaving = ref(false)
const pwSuccess = ref('')
const pwError = ref('')

async function handleUpdatePassword() {
  pwError.value = ''
  pwSuccess.value = ''

  if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
    pwError.value = 'Password must be at least 6 characters.'
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    pwError.value = 'Passwords do not match.'
    return
  }

  pwSaving.value = true
  try {
    store.updateUser(currentUser.value!.id, { newPassword: passwordForm.newPassword.trim() })
    pwSuccess.value = 'Password updated successfully!'
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    setTimeout(() => { pwSuccess.value = '' }, 5000)
  } catch (err: any) {
    pwError.value = err.message || 'Failed to update password.'
  } finally {
    pwSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-8 max-w-4xl">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-black text-gray-950 dark:text-white">Organization Profile &amp; Settings</h1>
          <UBadge color="success" variant="subtle" label="Hiring Partner" size="xs" />
        </div>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your hiring organization profile, primary contact person, and security settings.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton to="/employer" variant="outline" color="neutral" size="sm" icon="i-lucide-arrow-left" label="Back to Dashboard" />
      </div>
    </div>

    <!-- Hidden file input for logo/avatar -->
    <input ref="photoInputRef" type="file" accept="image/*" class="hidden" @change="handlePhotoChange" />

    <div class="grid gap-8 lg:grid-cols-3">
      <div class="lg:col-span-2 space-y-6">
        <!-- Main Form -->
        <UCard class="border border-gray-200 dark:border-gray-800">
          <template #header>
            <h3 class="font-bold text-base text-gray-950 dark:text-white">Organization &amp; Contact Details</h3>
          </template>

          <form class="space-y-4" @submit.prevent="handleSaveProfile">
            <div v-if="saveError" class="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {{ saveError }}
            </div>
            <div v-if="saveSuccess" class="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {{ saveSuccess }}
            </div>

            <!-- Logo / Photo Row -->
            <div class="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
              <div v-if="photoPreview" class="size-14 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <img :src="photoPreview" alt="Logo preview" class="size-full object-cover" />
              </div>
              <div v-else class="grid size-14 place-items-center rounded-xl bg-emerald-100 text-base font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {{ form.company?.charAt(0) || form.name?.charAt(0) || 'E' }}
              </div>

              <div class="flex-1">
                <p class="text-xs font-semibold text-gray-950 dark:text-white">Company Logo / Profile Photo</p>
                <p class="text-[11px] text-gray-500">Visible to candidates viewing your job openings</p>
              </div>

              <div class="flex items-center gap-2">
                <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-upload" label="Upload" @click="triggerPhotoUpload" />
                <UButton v-if="photoPreview" size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" label="Remove" @click="removePhoto" />
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Company / Organization Name *" required>
                <UInput v-model="form.company" placeholder="e.g. Acme Technologies" class="w-full" icon="i-lucide-building" />
              </UFormField>

              <UFormField label="Contact Person Name *" required>
                <UInput v-model="form.name" placeholder="e.g. John Doe (Lead Recruiter)" class="w-full" icon="i-lucide-user" />
              </UFormField>

              <UFormField label="Official Email Address *" required>
                <UInput v-model="form.email" type="email" placeholder="hiring@company.com" class="w-full" icon="i-lucide-mail" />
              </UFormField>

              <UFormField label="Mobile / Contact Phone">
                <UInput v-model="form.phone" type="tel" placeholder="+91 98765 43210" class="w-full" icon="i-lucide-phone" />
              </UFormField>

              <UFormField label="Headquarters / City">
                <UInput v-model="form.city" placeholder="e.g. Bengaluru, Karnataka" class="w-full" icon="i-lucide-map-pin" />
              </UFormField>

              <UFormField label="Organization Type">
                <select
                  v-model="form.orgType"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select type</option>
                  <option value="private_company">Private Enterprise</option>
                  <option value="startup">Startup</option>
                  <option value="government_body">Government Body</option>
                  <option value="university">University / College</option>
                  <option value="ngo">NGO / Non-Profit</option>
                  <option value="other">Other</option>
                </select>
              </UFormField>
            </div>

            <UFormField label="Company About / Summary">
              <UTextarea v-model="form.bio" placeholder="Brief summary of your company, culture, and what candidates can expect..." :rows="3" class="w-full" />
            </UFormField>

            <div class="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <UButton type="submit" color="primary" icon="i-lucide-save" label="Save Organization Details" :loading="saving" />
            </div>
          </form>
        </UCard>

        <!-- Password Card -->
        <UCard class="border border-gray-200 dark:border-gray-800">
          <template #header>
            <h3 class="font-bold text-base text-gray-950 dark:text-white">Update Password</h3>
          </template>

          <form class="space-y-4" @submit.prevent="handleUpdatePassword">
            <div v-if="pwError" class="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {{ pwError }}
            </div>
            <div v-if="pwSuccess" class="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {{ pwSuccess }}
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="New Password *" required>
                <UInput v-model="passwordForm.newPassword" type="password" placeholder="Min. 6 characters" class="w-full" icon="i-lucide-lock" />
              </UFormField>

              <UFormField label="Confirm Password *" required>
                <UInput v-model="passwordForm.confirmPassword" type="password" placeholder="Re-type password" class="w-full" icon="i-lucide-check" />
              </UFormField>
            </div>

            <div class="flex items-center justify-end border-t border-gray-100 pt-3 dark:border-gray-800">
              <UButton type="submit" color="neutral" variant="outline" label="Update Password" :loading="pwSaving" />
            </div>
          </form>
        </UCard>
      </div>

      <!-- Quick Info -->
      <div class="space-y-6">
        <UCard class="border border-gray-200 dark:border-gray-800">
          <template #header>
            <h4 class="font-bold text-sm text-gray-950 dark:text-white">Account Status</h4>
          </template>

          <div class="space-y-3 text-xs">
            <div>
              <p class="text-gray-400">Organization Status</p>
              <UBadge color="success" variant="subtle" label="Verified Partner" size="xs" class="mt-1" />
            </div>
            <div>
              <p class="text-gray-400">Account ID</p>
              <p class="font-mono text-gray-800 dark:text-gray-200">{{ currentUser?.id }}</p>
            </div>
            <div>
              <p class="text-gray-400">Portal Access</p>
              <p class="text-gray-700 dark:text-gray-300">Full Access to Candidate Resumes &amp; 1-Day Duties</p>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
