<script setup lang="ts">
import type { User, UserRole } from '~/types/portal'

definePageMeta({ layout: 'admin' })

const store = useDataStore()
const { currentUser } = useAuth()

// ── Reactive data ────────────────────────────────────────────────────────────
const allUsers = computed(() => store.getUsers())
const search = ref('')
const selectedRole = ref<string>('all')

const roles = [
  { value: 'all',       label: 'All Users',            icon: 'i-lucide-users',          color: 'neutral' },
  { value: 'admin',     label: 'Admins',               icon: 'i-lucide-shield-check',   color: 'error' },
  { value: 'officer',   label: 'Officers',             icon: 'i-lucide-award',          color: 'primary' },
  { value: 'candidate', label: 'Candidates / Students', icon: 'i-lucide-graduation-cap', color: 'info' },
  { value: 'employer',  label: 'Employers',            icon: 'i-lucide-building-2',     color: 'success' }
]

const stats = computed(() => {
  const users = allUsers.value
  return {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    officers: users.filter(u => u.role === 'officer').length,
    candidates: users.filter(u => u.role === 'candidate').length,
    employers: users.filter(u => u.role === 'employer').length
  }
})

const filteredUsers = computed(() =>
  allUsers.value.filter(u => {
    const matchesRole = selectedRole.value === 'all' || u.role === selectedRole.value
    const query = search.value.toLowerCase().trim()
    const matchesSearch = !query
      || u.name.toLowerCase().includes(query)
      || u.email.toLowerCase().includes(query)
      || (u.company || '').toLowerCase().includes(query)
    return matchesRole && matchesSearch
  })
)

// ── Success/error banners ────────────────────────────────────────────────────
const successMsg = ref('')
const showSuccess = (msg: string) => {
  successMsg.value = msg
  setTimeout(() => { successMsg.value = '' }, 6000)
}

// ── Security: who can do what ────────────────────────────────────────────────
const isSuperAdmin = computed(() => currentUser.value?.role === 'admin')

function canEditUser(target: User): boolean {
  if (!currentUser.value) return false
  // Super Admin can edit anyone
  if (isSuperAdmin.value) return true
  // Regular officers can only edit candidates/employers
  return target.role === 'candidate' || target.role === 'employer'
}

function canResetPassword(target: User): boolean {
  if (!currentUser.value) return false
  // Super Admin can reset ANY user's password anytime
  if (isSuperAdmin.value) return true
  // Regular officers can reset candidate & employer passwords
  return target.role === 'candidate' || target.role === 'employer'
}

// ── CREATE modal ─────────────────────────────────────────────────────────────
const showCreateModal = ref(false)
const createLoading = ref(false)
const createError = ref('')
const createForm = reactive({
  name: '', email: '', password: '', role: 'candidate' as UserRole, sendInviteEmail: true
})

function openCreateModal(defaultRole?: UserRole) {
  Object.assign(createForm, { name: '', email: '', password: '', role: defaultRole || 'candidate', sendInviteEmail: true })
  createError.value = ''
  showCreateModal.value = true
}

async function handleCreateUser() {
  createError.value = ''
  if (!createForm.name.trim() || !createForm.email.trim()) {
    createError.value = 'Please provide both full name and email.'
    return
  }
  if (store.getUserByEmail(createForm.email)) {
    createError.value = 'A user with this email already exists.'
    return
  }

  createLoading.value = true
  try {
    const created = await store.createUser({
      name: createForm.name.trim(),
      email: createForm.email.trim().toLowerCase(),
      role: createForm.role,
      passwordHash: createForm.password || `pwd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      temporaryPassword: createForm.password || undefined,
      sendInviteEmail: createForm.sendInviteEmail
    })
    if (createForm.role === 'candidate') {
      const freshUser = store.getUserByEmail(createForm.email)
      if (freshUser) {
        store.upsertProfile({ userId: freshUser.id, fullName: createForm.name.trim(), email: createForm.email.trim().toLowerCase(), mobile: '', city: '', skills: [], education: '', experience: '', resumeFilename: '', profilePhotoUrl: '', updatedAt: new Date().toISOString() })
      }
    }
    showCreateModal.value = false
    showSuccess(`User "${createForm.name}" (${createForm.role}) created successfully!` + (created.emailSent ? ' Invite email sent.' : ''))
  } catch (err: any) {
    createError.value = err.message || 'Failed to create user.'
  } finally {
    createLoading.value = false
  }
}

// ── EDIT PROFILE modal ───────────────────────────────────────────────────────
const showEditModal = ref(false)
const editingUser = ref<User | null>(null)
const editLoading = ref(false)
const editError = ref('')
const editForm = reactive({
  name: '', email: '', company: '', orgType: '', city: '', role: 'candidate' as UserRole,
  profilePhotoUrl: ''
})
const photoPreview = ref('')
const photoInputRef = ref<HTMLInputElement | null>(null)

function openEditModal(user: User) {
  editingUser.value = user
  Object.assign(editForm, {
    name: user.name || '',
    email: user.email || '',
    company: (user as any).company || '',
    orgType: (user as any).orgType || '',
    city: (user as any).city || '',
    role: user.role,
    profilePhotoUrl: (user as any).profilePhotoUrl || ''
  })
  photoPreview.value = (user as any).profilePhotoUrl || ''
  editError.value = ''
  showEditModal.value = true
}

function handlePhotoUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    editError.value = 'Please select a valid image file (JPG, PNG, etc.)'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    editError.value = 'Image must be smaller than 2 MB.'
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    photoPreview.value = dataUrl
    editForm.profilePhotoUrl = dataUrl
    editError.value = ''
  }
  reader.readAsDataURL(file)
}

function removePhoto() {
  photoPreview.value = ''
  editForm.profilePhotoUrl = ''
  if (photoInputRef.value) photoInputRef.value.value = ''
}

async function handleEditUser() {
  if (!editingUser.value) return
  editError.value = ''
  if (!editForm.name.trim()) { editError.value = 'Name is required.'; return }

  editLoading.value = true
  try {
    store.updateUser(editingUser.value.id, {
      name: editForm.name.trim(),
      email: editForm.email.trim().toLowerCase(),
      role: editForm.role,
      company: editForm.company,
      orgType: editForm.orgType,
      city: editForm.city,
      profilePhotoUrl: editForm.profilePhotoUrl
    } as any)

    // If the target user is a candidate, also sync their profile name/photo
    if (editForm.role === 'candidate') {
      const profile = store.getProfileByUserId(editingUser.value.id)
      if (profile) {
        store.upsertProfile({
          ...profile,
          fullName: editForm.name.trim(),
          email: editForm.email.trim().toLowerCase(),
          city: editForm.city,
          profilePhotoUrl: editForm.profilePhotoUrl
        })
      }
    }

    showEditModal.value = false
    showSuccess(`User "${editForm.name}" updated successfully.`)
  } catch (err: any) {
    editError.value = err.message || 'Failed to update user.'
  } finally {
    editLoading.value = false
  }
}

// ── RESET PASSWORD modal ─────────────────────────────────────────────────────
const showPasswordModal = ref(false)
const passwordTarget = ref<User | null>(null)
const selectedTargetUserId = ref('')
const passwordLoading = ref(false)
const passwordError = ref('')
const passwordForm = reactive({ newPassword: '', confirmPassword: '', showPw: true })
const passwordResetCompleted = ref(false)
const lastResetResult = ref<{ user: User | null; password: string } | null>(null)
const copiedPw = ref(false)

function generateRandomPassword() {
  const prefixes = ['Ready', 'Career', 'Hire', 'Talent', 'Prime', 'Spark', 'Swift', 'Secure']
  const specials = ['@', '#', '$', '!']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const special = specials[Math.floor(Math.random() * specials.length)]
  const num = Math.floor(1000 + Math.random() * 9000)
  const generated = `${prefix}${special}${num}`
  passwordForm.newPassword = generated
  passwordForm.confirmPassword = generated
  passwordForm.showPw = true
  passwordError.value = ''
}

function copyPasswordToClipboard(text: string) {
  if (navigator?.clipboard) {
    navigator.clipboard.writeText(text)
  }
  copiedPw.value = true
  setTimeout(() => { copiedPw.value = false }, 2500)
}

function openPasswordModal(user?: User) {
  passwordResetCompleted.value = false
  lastResetResult.value = null
  copiedPw.value = false
  passwordError.value = ''

  if (user) {
    passwordTarget.value = user
    selectedTargetUserId.value = user.id
  } else {
    passwordTarget.value = null
    selectedTargetUserId.value = ''
  }

  // Auto-generate a strong suggestion right away
  const prefixes = ['Ready', 'Career', 'Hire', 'Talent', 'Prime']
  const specials = ['@', '#', '!']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const special = specials[Math.floor(Math.random() * specials.length)]
  const num = Math.floor(1000 + Math.random() * 9000)
  const initialGenerated = `${prefix}${special}${num}`

  Object.assign(passwordForm, {
    newPassword: initialGenerated,
    confirmPassword: initialGenerated,
    showPw: true
  })

  showPasswordModal.value = true
}

function onSelectTargetUser(userId: string) {
  selectedTargetUserId.value = userId
  passwordTarget.value = allUsers.value.find(u => u.id === userId) || null
  passwordError.value = ''
}

async function handleResetPassword() {
  if (!passwordTarget.value) {
    passwordError.value = 'Please select a user to set password for.'
    return
  }
  passwordError.value = ''

  if (passwordForm.newPassword.length < 6) {
    passwordError.value = 'Password must be at least 6 characters.'
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = 'Passwords do not match.'
    return
  }

  // Security guard: prevent resetting admin password if not super admin
  if (passwordTarget.value.role === 'admin' && !isSuperAdmin.value) {
    passwordError.value = 'Only a Super Admin can reset another admin\'s password.'
    return
  }

  passwordLoading.value = true
  try {
    store.updateUser(passwordTarget.value.id, { newPassword: passwordForm.newPassword } as any)

    // Send a notification to the user
    store.addNotification({
      userId: passwordTarget.value.id,
      type: 'general',
      title: '🔐 Password Reset by Admin',
      message: `Your account password has been reset by an administrator. Please log in with your new temporary password.`,
      read: false
    })

    lastResetResult.value = {
      user: passwordTarget.value,
      password: passwordForm.newPassword
    }
    passwordResetCompleted.value = true
    showSuccess(`Password for "${passwordTarget.value.name}" updated successfully.`)
  } catch (err: any) {
    passwordError.value = err.message || 'Failed to reset password.'
  } finally {
    passwordLoading.value = false
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────
const confirmDeleteId = ref<string | null>(null)
function handleDeleteUser(userId: string) {
  store.deleteUser(userId)
  confirmDeleteId.value = null
  showSuccess('User deleted successfully.')
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function roleBadgeColor(role: UserRole) {
  return { admin: 'error', officer: 'primary', employer: 'success', candidate: 'info' }[role] || 'neutral'
}
function roleLabel(role: UserRole) {
  return { admin: 'Admin', officer: 'Placement Officer', candidate: 'Candidate', employer: 'Employer' }[role] || role
}
function avatarColor(role: UserRole) {
  return { admin: 'bg-red-600', officer: 'bg-purple-600', candidate: 'bg-blue-600', employer: 'bg-emerald-600' }[role] || 'bg-gray-500'
}
</script>

<template>
  <div class="space-y-6">

    <!-- ── Header ────────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-950 dark:text-white">User &amp; Role Management</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Create, edit details, reset passwords, and manage roles for all platform users.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          label="Reset User Password"
          icon="i-lucide-key-round"
          color="warning"
          variant="subtle"
          @click="openPasswordModal()"
        />
        <UButton label="Add User" icon="i-lucide-user-plus" color="primary" @click="openCreateModal()" />
      </div>
    </div>

    <!-- ── Success Banner ────────────────────────────────────────────────────── -->
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="successMsg" class="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200">
        <UIcon name="i-lucide-check-circle" class="size-5 shrink-0 text-emerald-600" />
        <span class="font-medium">{{ successMsg }}</span>
        <button class="ml-auto text-emerald-600 hover:text-emerald-800" @click="successMsg = ''">
          <UIcon name="i-lucide-x" class="size-4" />
        </button>
      </div>
    </Transition>

    <!-- ── Stats ─────────────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div v-for="(stat, i) in [
        { icon: 'i-lucide-shield-check', label: 'Admins',    value: stats.admins,    bg: 'bg-red-50 dark:bg-red-950', color: 'text-red-600 dark:text-red-400' },
        { icon: 'i-lucide-award',        label: 'Officers',  value: stats.officers,  bg: 'bg-purple-50 dark:bg-purple-950', color: 'text-purple-600 dark:text-purple-400' },
        { icon: 'i-lucide-graduation-cap', label: 'Candidates', value: stats.candidates, bg: 'bg-blue-50 dark:bg-blue-950', color: 'text-blue-600 dark:text-blue-400' },
        { icon: 'i-lucide-building-2',   label: 'Employers', value: stats.employers, bg: 'bg-emerald-50 dark:bg-emerald-950', color: 'text-emerald-600 dark:text-emerald-400' },
      ]" :key="i" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-lg" :class="stat.bg">
            <UIcon :name="stat.icon" class="size-5" :class="stat.color" />
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Filters ───────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="r in roles"
          :key="r.value"
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          :class="selectedRole === r.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
          @click="selectedRole = r.value"
        >
          <UIcon :name="r.icon" class="size-3.5" />
          {{ r.label }}
        </button>
      </div>
      <div class="relative w-full sm:w-72">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Search name, email, or company..."
          class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
      </div>
    </div>

    <!-- ── Users Table ───────────────────────────────────────────────────────── -->
    <ClientOnly>
      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[820px] text-left text-sm">
            <thead class="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th class="px-5 py-3.5">User</th>
                <th class="px-5 py-3.5">Role</th>
                <th class="px-5 py-3.5">Company / City</th>
                <th class="px-5 py-3.5">Change Role</th>
                <th class="px-5 py-3.5">Joined</th>
                <th class="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <tr
                v-for="user in filteredUsers"
                :key="user.id"
                class="group transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
              >
                <!-- User Cell -->
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-3">
                    <div class="relative size-9 shrink-0 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
                      <img v-if="(user as any).profilePhotoUrl" :src="(user as any).profilePhotoUrl" class="size-full object-cover" alt="">
                      <div v-else class="grid size-full place-items-center text-xs font-bold text-white" :class="avatarColor(user.role)">
                        {{ user.name.charAt(0).toUpperCase() }}
                      </div>
                    </div>
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-gray-950 dark:text-white">{{ user.name }}</p>
                      <p class="truncate text-xs text-gray-500">{{ user.email }}</p>
                    </div>
                    <UBadge v-if="user.id === currentUser?.id" label="You" color="neutral" variant="subtle" size="xs" class="shrink-0" />
                  </div>
                </td>

                <!-- Role Badge -->
                <td class="px-5 py-3.5 whitespace-nowrap">
                  <UBadge :color="roleBadgeColor(user.role) as any" variant="subtle" :label="roleLabel(user.role)" size="sm" />
                </td>

                <!-- Company/City -->
                <td class="px-5 py-3.5 whitespace-nowrap">
                  <p class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ (user as any).company || '—' }}</p>
                  <p class="text-xs text-gray-400">{{ (user as any).city || '' }}</p>
                </td>

                <!-- Change Role -->
                <td class="px-5 py-3.5 whitespace-nowrap">
                  <select
                    :value="user.role"
                    :disabled="user.id === currentUser?.id"
                    class="w-full max-w-[160px] rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    @change="store.updateUserRole(user.id, ($event.target as HTMLSelectElement).value as UserRole)"
                  >
                    <option value="admin">Admin</option>
                    <option value="officer">Placement Officer</option>
                    <option value="candidate">Candidate</option>
                    <option value="employer">Employer</option>
                  </select>
                </td>

                <!-- Joined -->
                <td class="px-5 py-3.5 whitespace-nowrap text-xs text-gray-500">
                  {{ user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '—' }}
                </td>

                <!-- Actions -->
                <td class="px-5 py-3.5 whitespace-nowrap text-right">
                  <!-- Confirm delete row -->
                  <div v-if="confirmDeleteId === user.id" class="flex items-center justify-end gap-1.5">
                    <span class="text-xs text-gray-500">Sure?</span>
                    <UButton size="xs" color="error" label="Delete" @click="handleDeleteUser(user.id)" />
                    <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" @click="confirmDeleteId = null" />
                  </div>

                  <!-- Normal action buttons -->
                  <div v-else class="flex items-center justify-end gap-1.5">
                    <!-- Edit Details -->
                    <button
                      v-if="canEditUser(user)"
                      type="button"
                      class="grid size-7 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                      title="Edit user details & profile picture"
                      @click="openEditModal(user)"
                    >
                      <UIcon name="i-lucide-pencil" class="size-3.5" />
                    </button>

                    <!-- Reset Password (Prominent button) -->
                    <button
                      v-if="canResetPassword(user)"
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 hover:border-amber-400 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60 transition-colors shadow-2xs"
                      title="Reset or create new password for this user"
                      @click="openPasswordModal(user)"
                    >
                      <UIcon name="i-lucide-key-round" class="size-3 text-amber-600 dark:text-amber-400" />
                      <span>Reset PW</span>
                    </button>

                    <!-- Delete -->
                    <button
                      v-if="user.id !== currentUser?.id"
                      type="button"
                      class="grid size-7 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                      title="Delete user"
                      @click="confirmDeleteId = user.id"
                    >
                      <UIcon name="i-lucide-trash-2" class="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredUsers.length === 0">
                <td colspan="6" class="py-12 text-center text-sm text-gray-500">
                  No users found matching your filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <template #fallback>
        <div class="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          <UIcon name="i-lucide-loader-2" class="mr-2 size-5 animate-spin text-primary" />
          Loading users directory...
        </div>
      </template>
    </ClientOnly>

    <!-- ════════════════════════════════════════════════════════════════════════
         CREATE USER MODAL
         ════════════════════════════════════════════════════════════════════════ -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div class="mb-4 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-800">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Create New User</h2>
          <button class="text-gray-400 hover:text-gray-600" @click="showCreateModal = false">
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="handleCreateUser">
          <div v-if="createError" class="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">{{ createError }}</div>

          <UFormField label="Full Name *" required>
            <UInput v-model="createForm.name" placeholder="e.g. John Doe" class="w-full" />
          </UFormField>
          <UFormField label="Email Address *" required>
            <UInput v-model="createForm.email" type="email" placeholder="e.g. officer@university.edu" class="w-full" />
          </UFormField>

          <div>
            <p class="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Assign Role</p>
            <div class="grid grid-cols-2 gap-2">
              <label v-for="r in [
                { value: 'admin', label: 'Admin', icon: 'i-lucide-shield-check', color: 'border-red-500 bg-red-50/50 text-red-700 dark:border-red-600 dark:bg-red-950/40' },
                { value: 'officer', label: 'Officer', icon: 'i-lucide-award', color: 'border-purple-500 bg-purple-50/50 text-purple-700 dark:border-purple-600 dark:bg-purple-950/40' },
                { value: 'candidate', label: 'Candidate', icon: 'i-lucide-graduation-cap', color: 'border-blue-500 bg-blue-50/50 text-blue-700 dark:border-blue-600 dark:bg-blue-950/40' },
                { value: 'employer', label: 'Employer', icon: 'i-lucide-building-2', color: 'border-emerald-500 bg-emerald-50/50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/40' },
              ]" :key="r.value"
                class="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all"
                :class="createForm.role === r.value ? r.color : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'"
              >
                <input v-model="createForm.role" type="radio" :value="r.value" class="sr-only">
                <UIcon :name="r.icon" class="size-4" />
                {{ r.label }}
              </label>
            </div>
          </div>

          <UFormField label="Initial Password (Optional)">
            <UInput v-model="createForm.password" type="password" placeholder="Leave blank to auto-generate" class="w-full" />
          </UFormField>

          <div class="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
            <input id="sendInvite" v-model="createForm.sendInviteEmail" type="checkbox" class="size-4 rounded border-gray-300 text-primary">
            <label for="sendInvite" class="cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
              Send Welcome &amp; Invitation Email
            </label>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showCreateModal = false" />
            <UButton type="submit" label="Create User" color="primary" :loading="createLoading" />
          </div>
        </form>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════
         EDIT USER MODAL
         ════════════════════════════════════════════════════════════════════════ -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10 backdrop-blur-sm">
      <div class="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900 mb-10">

        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">Edit User Details</h2>
            <p class="text-xs text-gray-500 mt-0.5">Update profile info for {{ editingUser?.name }}</p>
          </div>
          <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" @click="showEditModal = false">
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
        </div>

        <form class="px-6 py-5 space-y-5" @submit.prevent="handleEditUser">
          <div v-if="editError" class="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
            {{ editError }}
          </div>

          <!-- Profile Photo -->
          <div>
            <p class="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Profile Photo</p>
            <div class="flex items-center gap-4">
              <!-- Avatar preview -->
              <div class="relative size-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600">
                <img v-if="photoPreview" :src="photoPreview" class="size-full object-cover" alt="Profile preview">
                <div v-else class="grid size-full place-items-center" :class="avatarColor(editForm.role)">
                  <span class="text-2xl font-bold text-white">{{ editForm.name.charAt(0).toUpperCase() || '?' }}</span>
                </div>
                <!-- Camera overlay -->
                <div class="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity" @click="photoInputRef?.click()">
                  <UIcon name="i-lucide-camera" class="size-6 text-white" />
                </div>
              </div>

              <div class="space-y-2">
                <input ref="photoInputRef" type="file" accept="image/*" class="hidden" @change="handlePhotoUpload">
                <UButton label="Upload Photo" icon="i-lucide-upload" color="neutral" variant="outline" size="sm" type="button" @click="photoInputRef?.click()" />
                <UButton v-if="photoPreview" label="Remove" icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" type="button" @click="removePhoto" />
                <p class="text-[11px] text-gray-400">JPG, PNG · Max 2 MB</p>
              </div>
            </div>
          </div>

          <!-- Basic Info -->
          <div>
            <p class="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Basic Information</p>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Full Name *" required>
                <UInput v-model="editForm.name" placeholder="Full name" class="w-full" />
              </UFormField>
              <UFormField label="Email Address *" required>
                <UInput v-model="editForm.email" type="email" placeholder="Email" class="w-full" />
              </UFormField>
              <UFormField label="City">
                <UInput v-model="editForm.city" placeholder="e.g. Mumbai" class="w-full" />
              </UFormField>
              <UFormField label="Role">
                <select
                  v-model="editForm.role"
                  class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="admin">Admin</option>
                  <option value="officer">Placement Officer</option>
                  <option value="candidate">Candidate</option>
                  <option value="employer">Employer</option>
                </select>
              </UFormField>
            </div>
          </div>

          <!-- Organization Info (shown for employer/admin) -->
          <div v-if="['employer', 'admin', 'officer'].includes(editForm.role)">
            <p class="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Organization Details</p>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Company / Organization">
                <UInput v-model="editForm.company" placeholder="e.g. TCS, CBSE, IIT Delhi" class="w-full" />
              </UFormField>
              <UFormField label="Organization Type">
                <select
                  v-model="editForm.orgType"
                  class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select type</option>
                  <option value="private_company">Private Company</option>
                  <option value="government_body">Government Body</option>
                  <option value="university">University / College</option>
                  <option value="ngo">NGO / Non-Profit</option>
                  <option value="startup">Startup</option>
                  <option value="other">Other</option>
                </select>
              </UFormField>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <UButton label="Cancel" color="neutral" variant="ghost" type="button" @click="showEditModal = false" />
            <UButton type="submit" label="Save Changes" icon="i-lucide-save" color="primary" :loading="editLoading" />
          </div>
        </form>

      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════
         RESET PASSWORD MODAL
         ════════════════════════════════════════════════════════════════════════ -->
    <div v-if="showPasswordModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">

        <!-- Header -->
        <div class="mb-5 flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
          <div class="flex items-center gap-2.5">
            <div class="grid size-9 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/50">
              <UIcon name="i-lucide-key-round" class="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Create &amp; Reset Password</h2>
              <p class="text-xs text-gray-500">Provide an immediate new password for any user account</p>
            </div>
          </div>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="showPasswordModal = false">
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
        </div>

        <!-- ── STATE 1: Completed / Success Screen ── -->
        <div v-if="passwordResetCompleted" class="space-y-4">
          <div class="flex flex-col items-center text-center p-3">
            <div class="mb-2 grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <UIcon name="i-lucide-check" class="size-6" />
            </div>
            <h3 class="text-base font-bold text-gray-900 dark:text-white">Password Updated Successfully!</h3>
            <p class="mt-1 text-xs text-gray-500">
              The new credentials for
              <strong class="text-gray-700 dark:text-gray-200">{{ lastResetResult?.user?.name }}</strong>
              are ready to share.
            </p>
          </div>

          <!-- Highlighted Password Box -->
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/60">
            <p class="mb-1 text-xs font-medium text-gray-500">New Login Password</p>
            <div class="flex items-center justify-between gap-2">
              <code class="font-mono text-base font-bold text-gray-900 dark:text-white select-all">
                {{ lastResetResult?.password }}
              </code>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-all hover:bg-gray-50 border border-gray-300 text-gray-800 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                @click="copyPasswordToClipboard(lastResetResult?.password || '')"
              >
                <UIcon :name="copiedPw ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" :class="copiedPw ? 'text-emerald-600' : ''" />
                <span>{{ copiedPw ? 'Copied!' : 'Copy' }}</span>
              </button>
            </div>
          </div>

          <div class="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300">
            <p class="font-semibold mb-0.5 flex items-center gap-1">
              <UIcon name="i-lucide-info" class="size-3.5" />
              Next Step
            </p>
            <p>Share this temporary password with <strong>{{ lastResetResult?.user?.email }}</strong>. They can log in immediately.</p>
          </div>

          <div class="pt-2">
            <UButton label="Done" color="primary" class="w-full justify-center" @click="showPasswordModal = false" />
          </div>
        </div>

        <!-- ── STATE 2: Set / Reset Form ── -->
        <form v-else class="space-y-4" @submit.prevent="handleResetPassword">
          <div v-if="passwordError" class="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
            {{ passwordError }}
          </div>

          <!-- Target User Selection -->
          <div v-if="!passwordTarget" class="space-y-1.5">
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Select User Account *
            </label>
            <select
              :value="selectedTargetUserId"
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              @change="onSelectTargetUser(($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>-- Choose a user --</option>
              <option
                v-for="u in allUsers"
                :key="u.id"
                :value="u.id"
                :disabled="u.role === 'admin' && !isSuperAdmin"
              >
                {{ u.name }} ({{ u.email }}) — {{ roleLabel(u.role) }}
              </option>
            </select>
          </div>

          <!-- Selected Target Card -->
          <div v-else class="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
            <div class="flex items-center gap-2.5">
              <div class="grid size-9 place-items-center rounded-full text-xs font-bold text-white shrink-0" :class="avatarColor(passwordTarget.role)">
                {{ passwordTarget.name.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <p class="truncate font-semibold text-xs text-gray-900 dark:text-white">{{ passwordTarget.name }}</p>
                  <UBadge :color="roleBadgeColor(passwordTarget.role) as any" variant="subtle" :label="roleLabel(passwordTarget.role)" size="xs" />
                </div>
                <p class="truncate text-xs text-gray-500">{{ passwordTarget.email }}</p>
              </div>
            </div>
            <button
              type="button"
              class="text-xs font-semibold text-primary hover:underline ml-2 shrink-0"
              @click="passwordTarget = null; selectedTargetUserId = ''"
            >
              Change
            </button>
          </div>

          <!-- Security warning if target is admin -->
          <div v-if="passwordTarget?.role === 'admin'" class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
            <UIcon name="i-lucide-triangle-alert" class="size-4 shrink-0 mt-0.5" />
            <span>Target is an <strong>Admin</strong>. This action is restricted to Super Admins.</span>
          </div>

          <!-- Quick Generator Row -->
          <div class="flex items-center justify-between pt-1">
            <span class="text-xs font-medium text-gray-500">Need a strong password?</span>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 transition-colors"
              @click="generateRandomPassword"
            >
              <UIcon name="i-lucide-sparkles" class="size-3.5 text-indigo-500" />
              <span>🎲 Auto-Generate</span>
            </button>
          </div>

          <UFormField label="New Password *" required>
            <UInput
              v-model="passwordForm.newPassword"
              :type="passwordForm.showPw ? 'text' : 'password'"
              placeholder="At least 6 characters"
              class="w-full"
              :trailing-icon="passwordForm.showPw ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              @click:trailing="passwordForm.showPw = !passwordForm.showPw"
            />
          </UFormField>

          <UFormField label="Confirm New Password *" required>
            <UInput
              v-model="passwordForm.confirmPassword"
              :type="passwordForm.showPw ? 'text' : 'password'"
              placeholder="Re-enter new password"
              class="w-full"
            />
            <p v-if="passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword" class="mt-1 text-xs text-red-500">
              Passwords do not match
            </p>
            <p v-else-if="passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword" class="mt-1 text-xs text-emerald-600">
              ✓ Passwords match
            </p>
          </UFormField>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <UButton label="Cancel" color="neutral" variant="ghost" type="button" @click="showPasswordModal = false" />
            <UButton
              type="submit"
              label="Save &amp; Set Password"
              icon="i-lucide-key-round"
              color="warning"
              :loading="passwordLoading"
              :disabled="!passwordTarget || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword"
            />
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
