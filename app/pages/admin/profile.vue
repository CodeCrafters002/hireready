<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { currentUser, updateCurrentUser, signOut } = useAuth()
const store = useDataStore()

onMounted(async () => {
  await store.syncWithDatabase()
  hydrateForm()
})

// ── Profile Form State ────────────────────────────────────────────────────────
const form = reactive({
  name: '',
  email: '',
  phone: '',
  designation: '',
  company: '',
  city: '',
  bio: '',
  profilePhotoUrl: ''
})

const photoPreview = ref('')
const photoInputRef = ref<HTMLInputElement | null>(null)
const profileSaving = ref(false)
const profileSuccess = ref('')
const profileError = ref('')

function hydrateForm() {
  if (currentUser.value) {
    form.name = currentUser.value.name || ''
    form.email = currentUser.value.email || ''
    form.phone = (currentUser.value as any).phone || ''
    form.designation = (currentUser.value as any).designation || ''
    form.company = (currentUser.value as any).company || ''
    form.city = (currentUser.value as any).city || ''
    form.bio = (currentUser.value as any).bio || ''
    form.profilePhotoUrl = (currentUser.value as any).profilePhotoUrl || ''
    photoPreview.value = (currentUser.value as any).profilePhotoUrl || ''
  }
}

watch(currentUser, () => {
  hydrateForm()
}, { immediate: true })

// ── Photo Upload & Compression ────────────────────────────────────────────────
function triggerPhotoUpload() {
  profileError.value = ''
  photoInputRef.value?.click()
}

function handlePhotoChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  profileError.value = ''
  if (!file.type.startsWith('image/')) {
    profileError.value = 'Please select a valid image file (JPG, PNG, WEBP).'
    return
  }

  if (file.size > 4 * 1024 * 1024) {
    profileError.value = 'Image size should be less than 4MB.'
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

// ── Save Profile Details ──────────────────────────────────────────────────────
async function handleSaveProfile() {
  profileError.value = ''
  profileSuccess.value = ''

  if (!form.name.trim()) {
    profileError.value = 'Full name is required.'
    return
  }
  if (!form.email.trim()) {
    profileError.value = 'Email address is required.'
    return
  }

  if (!currentUser.value?.id) {
    profileError.value = 'User session not found.'
    return
  }

  profileSaving.value = true
  try {
    const updates = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      designation: form.designation.trim(),
      company: form.company.trim(),
      city: form.city.trim(),
      bio: form.bio.trim(),
      profilePhotoUrl: form.profilePhotoUrl
    }

    // Update in store (which syncs to MongoDB /api/users/:id and updates currentUser)
    store.updateUser(currentUser.value.id, updates as any)
    updateCurrentUser(updates as any)

    profileSuccess.value = 'Profile updated successfully! All fields and changes are saved.'
    setTimeout(() => { profileSuccess.value = '' }, 5000)
  } catch (err: any) {
    profileError.value = err.message || 'Failed to save profile changes.'
  } finally {
    profileSaving.value = false
  }
}

// ── Password Management ───────────────────────────────────────────────────────
const passwordForm = reactive({
  newPassword: '',
  confirmPassword: '',
  showPw: false
})
const passwordSaving = ref(false)
const passwordSuccess = ref('')
const passwordError = ref('')

function generateStrongPassword() {
  const words = ['Shield', 'Ready', 'Prime', 'Apex', 'Titan', 'Matrix', 'Nexus']
  const specials = ['@', '#', '$', '!']
  const word = words[Math.floor(Math.random() * words.length)]
  const char = specials[Math.floor(Math.random() * specials.length)]
  const num = Math.floor(1000 + Math.random() * 9000)
  const pwd = `${word}${char}${num}`
  passwordForm.newPassword = pwd
  passwordForm.confirmPassword = pwd
  passwordForm.showPw = true
  passwordError.value = ''
}

async function handleUpdatePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''

  if (!passwordForm.newPassword) {
    passwordError.value = 'Please enter a new password.'
    return
  }
  if (passwordForm.newPassword.length < 6) {
    passwordError.value = 'Password must be at least 6 characters long.'
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = 'New password and confirmation do not match.'
    return
  }

  if (!currentUser.value?.id) {
    passwordError.value = 'Session error. Please re-login.'
    return
  }

  passwordSaving.value = true
  try {
    store.updateUser(currentUser.value.id, {
      newPassword: passwordForm.newPassword.trim()
    })
    passwordSuccess.value = 'Password changed successfully! You can now use your new password.'
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    setTimeout(() => { passwordSuccess.value = '' }, 5000)
  } catch (err: any) {
    passwordError.value = err.message || 'Failed to update password.'
  } finally {
    passwordSaving.value = false
  }
}

// ── Platform Stats for Admin ──────────────────────────────────────────────────
const allUsersCount = computed(() => store.getUsers().length)
const allJobsCount = computed(() => store.getJobs().length)
const allAppsCount = computed(() => store.getApplications().length)
</script>

<template>
  <div class="space-y-8 max-w-5xl">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-black text-gray-950 dark:text-white">Admin Profile &amp; Account Settings</h1>
          <UBadge
            :color="currentUser?.role === 'admin' ? 'error' : 'primary'"
            variant="subtle"
            :label="currentUser?.role === 'admin' ? 'Super Admin' : 'Placement Officer'"
            size="xs"
          />
        </div>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Update your administrator credentials, personal info, contact details, and account security.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          to="/admin/users"
          variant="outline"
          color="neutral"
          size="sm"
          icon="i-lucide-users"
          label="Manage Users"
        />
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-log-out"
          label="Sign Out"
          @click="signOut"
        />
      </div>
    </div>

    <!-- Overview Banner / Profile Card -->
    <UCard class="border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-red-500/5 via-rose-500/5 to-transparent">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
          <!-- Profile Avatar -->
          <div class="relative shrink-0">
            <div
              v-if="photoPreview"
              class="relative size-24 overflow-hidden rounded-2xl border-2 border-red-500 shadow-lg"
            >
              <img :src="photoPreview" alt="Profile preview" class="size-full object-cover" />
            </div>
            <div
              v-else
              class="grid size-24 place-items-center rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-3xl font-black text-white shadow-lg"
            >
              {{ form.name?.charAt(0) || 'A' }}
            </div>

            <!-- Upload quick button -->
            <button
              type="button"
              class="absolute -bottom-2 -right-2 flex size-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-md ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700"
              title="Upload photo"
              @click="triggerPhotoUpload"
            >
              <UIcon name="i-lucide-camera" class="size-4" />
            </button>
          </div>

          <!-- User Details Summary -->
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-xl font-bold text-gray-950 dark:text-white">{{ form.name || 'Administrator' }}</h2>
              <UBadge color="error" variant="soft" size="xs" label="System Authority" />
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
              <UIcon name="i-lucide-mail" class="size-3.5 text-gray-400" />
              <span>{{ form.email }}</span>
            </p>
            <p v-if="form.designation || form.company" class="text-xs text-gray-500 flex items-center gap-1.5">
              <UIcon name="i-lucide-briefcase" class="size-3.5 text-gray-400" />
              <span>{{ [form.designation, form.company].filter(Boolean).join(' • ') }}</span>
            </p>
            <p v-if="form.city" class="text-xs text-gray-500 flex items-center gap-1.5">
              <UIcon name="i-lucide-map-pin" class="size-3.5 text-gray-400" />
              <span>{{ form.city }}</span>
            </p>
          </div>
        </div>

        <!-- Quick Platform Metrics -->
        <div class="flex flex-wrap items-center gap-4 border-t border-gray-200/80 pt-4 dark:border-gray-800 md:border-t-0 md:pt-0">
          <div class="rounded-xl bg-white p-3 text-center shadow-xs ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <p class="text-xs text-gray-500 font-medium">Platform Users</p>
            <p class="text-lg font-black text-gray-950 dark:text-white">{{ allUsersCount }}</p>
          </div>
          <div class="rounded-xl bg-white p-3 text-center shadow-xs ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <p class="text-xs text-gray-500 font-medium">Total Jobs</p>
            <p class="text-lg font-black text-gray-950 dark:text-white">{{ allJobsCount }}</p>
          </div>
          <div class="rounded-xl bg-white p-3 text-center shadow-xs ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <p class="text-xs text-gray-500 font-medium">Applications</p>
            <p class="text-lg font-black text-gray-950 dark:text-white">{{ allAppsCount }}</p>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Hidden file input for avatar -->
    <input
      ref="photoInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handlePhotoChange"
    />

    <!-- ── Profile Details Form ─────────────────────────────────────────────── -->
    <div class="grid gap-8 lg:grid-cols-3">
      <div class="lg:col-span-2 space-y-6">
        <UCard class="border border-gray-200 dark:border-gray-800">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-base text-gray-950 dark:text-white">Admin Personal &amp; Operational Info</h3>
                <p class="text-xs text-gray-500">These details identify you across system audit logs and email dispatches.</p>
              </div>
              <UIcon name="i-lucide-user" class="size-5 text-gray-400" />
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="handleSaveProfile">
            <div v-if="profileError" class="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {{ profileError }}
            </div>
            <div v-if="profileSuccess" class="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {{ profileSuccess }}
            </div>

            <!-- Avatar Action Row -->
            <div class="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
              <div
                v-if="photoPreview"
                class="size-12 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <img :src="photoPreview" alt="Profile" class="size-full object-cover" />
              </div>
              <div
                v-else
                class="grid size-12 place-items-center rounded-xl bg-red-100 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-300"
              >
                {{ form.name?.charAt(0) || 'A' }}
              </div>

              <div class="flex-1">
                <p class="text-xs font-semibold text-gray-950 dark:text-white">Profile Picture</p>
                <p class="text-[11px] text-gray-500">JPG, PNG or WEBP (Max 4MB)</p>
              </div>

              <div class="flex items-center gap-2">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-upload"
                  label="Upload"
                  @click="triggerPhotoUpload"
                />
                <UButton
                  v-if="photoPreview"
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  label="Remove"
                  @click="removePhoto"
                />
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Full Name *" required>
                <UInput v-model="form.name" placeholder="e.g. Abhik Kumar" class="w-full" icon="i-lucide-user" />
              </UFormField>

              <UFormField label="Official Email Address *" required>
                <UInput v-model="form.email" type="email" placeholder="admin@hireready.com" class="w-full" icon="i-lucide-mail" />
              </UFormField>

              <UFormField label="Phone / Mobile Number">
                <UInput v-model="form.phone" type="tel" placeholder="+91 98765 43210" class="w-full" icon="i-lucide-phone" />
              </UFormField>

              <UFormField label="Official Designation">
                <UInput v-model="form.designation" placeholder="e.g. Lead Administrator / Head of Ops" class="w-full" icon="i-lucide-badge-check" />
              </UFormField>

              <UFormField label="Organization / Department">
                <UInput v-model="form.company" placeholder="e.g. HireReady Administration" class="w-full" icon="i-lucide-building" />
              </UFormField>

              <UFormField label="Base Office / City">
                <UInput v-model="form.city" placeholder="e.g. Bengaluru, Karnataka" class="w-full" icon="i-lucide-map-pin" />
              </UFormField>
            </div>

            <UFormField label="Bio / Operational Notes">
              <UTextarea
                v-model="form.bio"
                placeholder="Brief summary of your administrative responsibilities, department, and contact hours..."
                :rows="3"
                class="w-full"
              />
            </UFormField>

            <div class="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <UButton
                type="submit"
                color="error"
                icon="i-lucide-save"
                label="Save Profile Changes"
                :loading="profileSaving"
              />
            </div>
          </form>
        </UCard>

        <!-- ── Security & Password Card ─────────────────────────────────────── -->
        <UCard class="border border-gray-200 dark:border-gray-800">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-base text-gray-950 dark:text-white">Security &amp; Password</h3>
                <p class="text-xs text-gray-500">Update your login password anytime with instant confirmation.</p>
              </div>
              <UIcon name="i-lucide-shield-alert" class="size-5 text-gray-400" />
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="handleUpdatePassword">
            <div v-if="passwordError" class="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {{ passwordError }}
            </div>
            <div v-if="passwordSuccess" class="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {{ passwordSuccess }}
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="New Password *" required>
                <div class="relative">
                  <UInput
                    v-model="passwordForm.newPassword"
                    :type="passwordForm.showPw ? 'text' : 'password'"
                    placeholder="Enter new password"
                    class="w-full font-mono"
                    icon="i-lucide-lock"
                  />
                </div>
              </UFormField>

              <UFormField label="Confirm New Password *" required>
                <UInput
                  v-model="passwordForm.confirmPassword"
                  :type="passwordForm.showPw ? 'text' : 'password'"
                  placeholder="Re-enter new password"
                  class="w-full font-mono"
                  icon="i-lucide-check-circle"
                />
              </UFormField>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div class="flex items-center gap-2">
                <UButton
                  type="button"
                  variant="outline"
                  color="neutral"
                  size="xs"
                  icon="i-lucide-key-round"
                  label="Generate Strong Password"
                  @click="generateStrongPassword"
                />
                <button
                  type="button"
                  class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                  @click="passwordForm.showPw = !passwordForm.showPw"
                >
                  <UIcon :name="passwordForm.showPw ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="size-3.5" />
                  <span>{{ passwordForm.showPw ? 'Hide' : 'Show' }}</span>
                </button>
              </div>

              <UButton
                type="submit"
                color="primary"
                icon="i-lucide-key"
                label="Update Password"
                :loading="passwordSaving"
              />
            </div>
          </form>
        </UCard>
      </div>

      <!-- ── Sidebar / Account Metadata ───────────────────────────────────── -->
      <div class="space-y-6">
        <!-- Account Card -->
        <UCard class="border border-gray-200 dark:border-gray-800">
          <template #header>
            <h4 class="font-bold text-sm text-gray-950 dark:text-white">Account Information</h4>
          </template>

          <div class="space-y-3 text-xs">
            <div>
              <p class="text-gray-400">Account ID</p>
              <p class="font-mono font-semibold text-gray-900 dark:text-gray-100">{{ currentUser?.id || '—' }}</p>
            </div>
            <div>
              <p class="text-gray-400">Role &amp; Privilege</p>
              <div class="mt-0.5 flex items-center gap-1.5">
                <span class="inline-block size-2 rounded-full bg-red-500"></span>
                <span class="font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  {{ currentUser?.role || 'admin' }}
                </span>
              </div>
            </div>
            <div>
              <p class="text-gray-400">Database Status</p>
              <p class="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <UIcon name="i-lucide-database" class="size-3.5" />
                <span>MongoDB Atlas Synced</span>
              </p>
            </div>
            <div>
              <p class="text-gray-400">Account Created</p>
              <p class="font-medium text-gray-700 dark:text-gray-300">
                {{ currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Platform Init' }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Permissions & Capabilities -->
        <UCard class="border border-gray-200 dark:border-gray-800">
          <template #header>
            <h4 class="font-bold text-sm text-gray-950 dark:text-white">Admin Privileges</h4>
          </template>

          <ul class="space-y-2 text-xs text-gray-600 dark:text-gray-300">
            <li class="flex items-center gap-2">
              <UIcon name="i-lucide-check" class="size-4 text-emerald-500 shrink-0" />
              <span>Full user profile editing &amp; role allocation</span>
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-lucide-check" class="size-4 text-emerald-500 shrink-0" />
              <span>Direct password reset authority for any account</span>
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-lucide-check" class="size-4 text-emerald-500 shrink-0" />
              <span>Job opening publication &amp; candidate review</span>
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-lucide-check" class="size-4 text-emerald-500 shrink-0" />
              <span>1-Day duty escrow &amp; payout management</span>
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-lucide-check" class="size-4 text-emerald-500 shrink-0" />
              <span>MCQ assessment question bank control</span>
            </li>
          </ul>
        </UCard>

        <!-- Quick Actions -->
        <UCard class="border border-gray-200 dark:border-gray-800">
          <template #header>
            <h4 class="font-bold text-sm text-gray-950 dark:text-white">Quick Navigation</h4>
          </template>

          <div class="space-y-2">
            <UButton
              to="/admin/users"
              block
              size="sm"
              variant="outline"
              color="neutral"
              icon="i-lucide-users"
              label="User &amp; Role Management"
            />
            <UButton
              to="/admin/jobs"
              block
              size="sm"
              variant="outline"
              color="neutral"
              icon="i-lucide-briefcase"
              label="Job Openings Directory"
            />
            <UButton
              to="/admin/gigs"
              block
              size="sm"
              variant="outline"
              color="neutral"
              icon="i-lucide-calendar-clock"
              label="1-Day Duties &amp; Escrow"
            />
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
