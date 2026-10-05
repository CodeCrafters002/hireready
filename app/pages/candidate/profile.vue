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
  resumeFilename: '',
  resumeDataUrl: '',
  resumeFileSize: '',
  profilePhotoUrl: '',
  upiId: ''
})

const fileInput = ref<HTMLInputElement | null>(null)
const resumeFileInput = ref<HTMLInputElement | null>(null)
const uploadingPhoto = ref(false)
const uploadingResume = ref(false)
const photoError = ref('')
const resumeError = ref('')
const showPdfModal = ref(false)
const saving = ref(false)
const saved = ref(false)

// Load profile data
onMounted(() => {
  if (profile.value) {
    form.fullName = profile.value.fullName || ''
    form.email = profile.value.email || ''
    form.mobile = profile.value.mobile || ''
    form.city = profile.value.city || ''
    form.skills = profile.value.skills?.join(', ') || ''
    form.education = profile.value.education || ''
    form.experience = profile.value.experience || ''
    form.resumeFilename = profile.value.resumeFilename || ''
    form.resumeDataUrl = profile.value.resumeDataUrl || ''
    form.resumeFileSize = profile.value.resumeFileSize || ''
    form.profilePhotoUrl = profile.value.profilePhotoUrl || ''
    form.upiId = profile.value.upiId || ''
  }
})

// Calculate profile completion percentage
const profileCompletion = computed(() => {
  const fields = [
    form.fullName,
    form.email,
    form.mobile,
    form.city,
    form.skills,
    form.education,
    form.experience,
    form.resumeFilename,
    form.profilePhotoUrl
  ]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
})

function triggerFileInput() {
  photoError.value = ''
  fileInput.value?.click()
}

function handlePhotoChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  photoError.value = ''

  if (!file.type.startsWith('image/')) {
    photoError.value = 'Please select a valid image file (JPG, PNG, WEBP).'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    photoError.value = 'File size should be less than 5MB.'
    return
  }

  uploadingPhoto.value = true

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      // Compress and scale photo to max 320x320 for optimal performance & MongoDB storage
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
        form.profilePhotoUrl = canvas.toDataURL('image/jpeg', 0.85)
      }
      uploadingPhoto.value = false
    }
    img.src = e.target?.result as string
  }
  reader.onerror = () => {
    photoError.value = 'Failed reading image file.'
    uploadingPhoto.value = false
  }
  reader.readAsDataURL(file)
}

function removePhoto() {
  form.profilePhotoUrl = ''
  if (fileInput.value) fileInput.value.value = ''
}

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
    resumeDataUrl: form.resumeDataUrl,
    resumeFileSize: form.resumeFileSize,
    profilePhotoUrl: form.profilePhotoUrl,
    upiId: form.upiId,
    updatedAt: new Date().toISOString()
  })

  setTimeout(() => {
    saving.value = false
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  }, 500)
}

function triggerResumeUpload() {
  resumeError.value = ''
  resumeFileInput.value?.click()
}

function handleResumeFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  resumeError.value = ''
  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
  if (!isPdf) {
    resumeError.value = 'Please select a valid PDF file (.pdf).'
    return
  }

  // 10MB limit
  if (file.size > 10 * 1024 * 1024) {
    resumeError.value = 'Resume file size should be less than 10MB.'
    return
  }

  uploadingResume.value = true
  const reader = new FileReader()
  reader.onload = (e) => {
    form.resumeFilename = file.name
    form.resumeDataUrl = e.target?.result as string
    form.resumeFileSize = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(file.size / 1024)} KB`
    uploadingResume.value = false
  }
  reader.onerror = () => {
    resumeError.value = 'Failed reading PDF file.'
    uploadingResume.value = false
  }
  reader.readAsDataURL(file)
}

function downloadResume() {
  if (!form.resumeDataUrl && !form.resumeFilename) return
  if (form.resumeDataUrl) {
    const a = document.createElement('a')
    a.href = form.resumeDataUrl
    a.download = form.resumeFilename || 'resume.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

function removeResume() {
  form.resumeFilename = ''
  form.resumeDataUrl = ''
  form.resumeFileSize = ''
  if (resumeFileInput.value) resumeFileInput.value.value = ''
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-950 dark:text-white">My Profile</h2>
      <p class="mt-1 text-sm text-gray-500">
        Update your personal details, resume, and profile picture to stand out to employers.
      </p>
    </div>

    <!-- Completion Card with Avatar Upload -->
    <UCard>
      <div class="flex flex-col gap-6 sm:flex-row sm:items-center">
        <!-- Photo Upload Box -->
        <div class="relative group mx-auto sm:mx-0">
          <input
            ref="fileInput"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            class="hidden"
            @change="handlePhotoChange"
          >

          <div
            class="relative size-24 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-gray-300 transition-all hover:border-primary dark:border-gray-700"
            @click="triggerFileInput"
          >
            <img
              v-if="form.profilePhotoUrl"
              :src="form.profilePhotoUrl"
              alt="Profile photo"
              class="size-full object-cover"
            >
            <div
              v-else
              class="grid size-full place-items-center bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white"
            >
              {{ form.fullName ? form.fullName.charAt(0).toUpperCase() : (currentUser?.name?.charAt(0) || 'C') }}
            </div>

            <!-- Hover overlay -->
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <UIcon name="i-lucide-camera" class="size-6" />
              <span class="mt-1 text-[10px] font-semibold">Change</span>
            </div>
          </div>

          <button
            v-if="form.profilePhotoUrl"
            type="button"
            class="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700"
            title="Remove photo"
            @click.stop="removePhoto"
          >
            <UIcon name="i-lucide-x" class="size-3.5" />
          </button>
        </div>

        <!-- Name & Completion Meter -->
        <div class="flex-1 text-center sm:text-left">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-lg font-bold text-gray-950 dark:text-white">{{ form.fullName || currentUser?.name || 'Candidate' }}</p>
              <p class="text-xs text-gray-500">{{ form.email || currentUser?.email }}</p>
            </div>
            <div class="mt-2 sm:mt-0">
              <UButton
                size="xs"
                variant="soft"
                color="primary"
                icon="i-lucide-upload"
                label="Upload Photo"
                :loading="uploadingPhoto"
                @click="triggerFileInput"
              />
            </div>
          </div>

          <p v-if="photoError" class="mt-2 text-xs text-red-500">{{ photoError }}</p>

          <div class="mt-4">
            <div class="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
              <span>Profile Completion</span>
              <span :class="profileCompletion === 100 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-primary font-bold'">
                {{ profileCompletion }}%
              </span>
            </div>
            <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="profileCompletion === 100 ? 'bg-emerald-500' : 'bg-primary'"
                :style="{ width: profileCompletion + '%' }"
              />
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Profile Form -->
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
          <UFormField label="UPI ID (for 1-Day Shift Payouts)" hint="e.g. yourname@okaxis or 9876543210@upi">
            <UInput v-model="form.upiId" class="w-full" placeholder="e.g. user@okaxis" icon="i-lucide-wallet" />
          </UFormField>
        </div>

        <UFormField label="Skills" hint="Comma-separated">
          <UInput v-model="form.skills" class="w-full" placeholder="JavaScript, Vue.js, TypeScript, Node.js" icon="i-lucide-sparkles" />
        </UFormField>

        <UFormField label="Education">
          <UTextarea v-model="form.education" class="w-full" placeholder="B.Tech in Computer Science — 2024" :rows="2" />
        </UFormField>

        <UFormField label="Experience">
          <UTextarea v-model="form.experience" class="w-full" placeholder="1.5 years as Frontend Developer at TechCorp" :rows="2" />
        </UFormField>

        <div>
          <label class="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Résumé / CV (PDF)
          </label>

          <!-- Hidden File Input -->
          <input
            ref="resumeFileInput"
            type="file"
            accept=".pdf,application/pdf"
            class="hidden"
            @change="handleResumeFileChange"
          >

          <!-- If Resume is Uploaded -->
          <div
            v-if="form.resumeFilename"
            class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/75 p-4 dark:border-gray-800 dark:bg-gray-800/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex items-center gap-3">
              <div class="grid size-11 place-items-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <UIcon name="i-lucide-file-text" class="size-6" />
              </div>
              <div>
                <p class="font-semibold text-gray-900 dark:text-white">{{ form.resumeFilename }}</p>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>{{ form.resumeFileSize || 'PDF Document' }}</span>
                  <span>•</span>
                  <span class="inline-flex items-center gap-1 font-medium text-emerald-600">
                    <UIcon name="i-lucide-check-circle" class="size-3.5" /> Ready for employers
                  </span>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <UButton
                v-if="form.resumeDataUrl"
                size="xs"
                color="primary"
                variant="subtle"
                icon="i-lucide-eye"
                label="Preview"
                @click="showPdfModal = true"
              />
              <UButton
                v-if="form.resumeDataUrl"
                size="xs"
                color="neutral"
                variant="outline"
                icon="i-lucide-download"
                label="Download"
                @click="downloadResume"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-refresh-cw"
                label="Replace"
                :loading="uploadingResume"
                @click="triggerResumeUpload"
              />
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                title="Remove resume"
                @click="removeResume"
              />
            </div>
          </div>

          <!-- If No Resume Uploaded -->
          <div
            v-else
            class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 text-center transition-colors hover:border-primary dark:border-gray-700 dark:bg-gray-800/30"
          >
            <div class="grid size-12 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <UIcon name="i-lucide-file-up" class="size-6" />
            </div>
            <p class="mt-2 text-sm font-semibold text-gray-900 dark:text-white">Upload your PDF Resume</p>
            <p class="mt-1 text-xs text-gray-500">Accepted formats: .pdf up to 10MB</p>
            <div class="mt-4">
              <UButton
                size="sm"
                color="primary"
                icon="i-lucide-upload"
                label="Choose PDF File"
                :loading="uploadingResume"
                @click="triggerResumeUpload"
              />
            </div>
          </div>

          <p v-if="resumeError" class="mt-2 text-xs font-medium text-red-500">{{ resumeError }}</p>
        </div>

        <UAlert v-if="saved" color="success" variant="soft" title="Profile saved!" description="Your profile, resume, and photo have been updated and synced to the database." icon="i-lucide-check-circle" />

        <div class="flex justify-end gap-3 pt-2">
          <UButton type="submit" size="lg" label="Save Profile" icon="i-lucide-save" :loading="saving" />
        </div>
      </form>
    </UCard>

    <!-- PDF Preview Modal -->
    <div
      v-if="showPdfModal && form.resumeDataUrl"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div class="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div class="mb-0 flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-file-text" class="size-5 text-red-500" />
            <h3 class="font-bold text-gray-900 dark:text-white">{{ form.resumeFilename || 'Resume Preview' }}</h3>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              size="xs"
              color="primary"
              variant="outline"
              icon="i-lucide-download"
              label="Download"
              @click="downloadResume"
            />
            <button class="text-gray-400 hover:text-gray-600 dark:hover:text-white" @click="showPdfModal = false">
              <UIcon name="i-lucide-x" class="size-5" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-hidden p-2">
          <iframe
            :src="form.resumeDataUrl"
            class="size-full rounded-xl border border-gray-200 dark:border-gray-800"
            title="PDF Resume Preview"
          />
        </div>
      </div>
    </div>
  </div>
</template>
