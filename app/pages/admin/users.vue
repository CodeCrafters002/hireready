<script setup lang="ts">
import type { User, UserRole } from '~/types/portal'

definePageMeta({ layout: 'admin' })

const store = useDataStore()

const allUsers = computed(() => store.getUsers())
const search = ref('')
const selectedRole = ref<string>('all')

const roles: { value: string; label: string; icon: string; color: string }[] = [
  { value: 'all', label: 'All Users', icon: 'i-lucide-users', color: 'neutral' },
  { value: 'admin', label: 'Admins', icon: 'i-lucide-shield-check', color: 'error' },
  { value: 'officer', label: 'Officers', icon: 'i-lucide-award', color: 'primary' },
  { value: 'candidate', label: 'Candidates / Students', icon: 'i-lucide-graduation-cap', color: 'info' },
  { value: 'employer', label: 'Employers', icon: 'i-lucide-building-2', color: 'success' }
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

const filteredUsers = computed(() => {
  return allUsers.value.filter(u => {
    const matchesRole = selectedRole.value === 'all' || u.role === selectedRole.value
    const query = search.value.toLowerCase().trim()
    const matchesSearch = !query || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
    return matchesRole && matchesSearch
  })
})

// ── Modal State ─────────────────────────────────────────────────────────────
const showModal = ref(false)
const modalLoading = ref(false)
const modalError = ref('')
const successNotification = ref('')
const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'candidate' as UserRole,
  sendInviteEmail: true
})

function openCreateModal(defaultRole?: UserRole) {
  modalError.value = ''
  form.name = ''
  form.email = ''
  form.password = ''
  form.role = defaultRole || 'candidate'
  form.sendInviteEmail = true
  showModal.value = true
}

async function handleCreateUser() {
  modalError.value = ''
  if (!form.name.trim() || !form.email.trim()) {
    modalError.value = 'Please provide both full name and email.'
    return
  }

  // Check duplicate email
  if (store.getUserByEmail(form.email)) {
    modalError.value = 'A user with this email already exists.'
    return
  }

  modalLoading.value = true
  try {
    const createdUser = await store.createUser({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      passwordHash: form.password || `pwd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      temporaryPassword: form.password || undefined,
      sendInviteEmail: form.sendInviteEmail
    })

    // If candidate, initialize profile
    if (form.role === 'candidate') {
      const created = store.getUserByEmail(form.email)
      if (created) {
        store.upsertProfile({
          userId: created.id,
          fullName: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          mobile: '',
          city: '',
          skills: [],
          education: '',
          experience: '',
          resumeFilename: '',
          profilePhotoUrl: '',
          updatedAt: new Date().toISOString()
        })
      }
    }

    showModal.value = false
    if (createdUser.emailSent) {
      successNotification.value = `User "${form.name}" created and a welcome invitation email was sent to ${form.email}!`
    } else {
      successNotification.value = `User "${form.name}" (${form.role.toUpperCase()}) created successfully!`
    }
    setTimeout(() => {
      successNotification.value = ''
    }, 6000)
  } catch (err: any) {
    modalError.value = err.message || 'Failed to create user.'
  } finally {
    modalLoading.value = false
  }
}

// ── Role Management ─────────────────────────────────────────────────────────
function changeRole(userId: string, newRole: UserRole) {
  store.updateUserRole(userId, newRole)
}

const confirmDeleteId = ref<string | null>(null)
function handleDeleteUser(userId: string) {
  store.deleteUser(userId)
  confirmDeleteId.value = null
}

function roleBadgeColor(role: UserRole) {
  switch (role) {
    case 'admin': return 'error'
    case 'officer': return 'primary'
    case 'employer': return 'success'
    case 'candidate': return 'info'
    default: return 'neutral'
  }
}

function roleLabel(role: UserRole) {
  switch (role) {
    case 'admin': return 'Admin'
    case 'officer': return 'Placement Officer'
    case 'candidate': return 'Candidate (Student)'
    case 'employer': return 'Employer / Client'
    default: return role
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-950 dark:text-white">User & Role Management</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Create, assign roles, and manage permissions for Admins, Officers, Students, and Employers.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          label="Add User"
          icon="i-lucide-user-plus"
          color="primary"
          @click="openCreateModal()"
        />
      </div>
    </div>

    <!-- Success Banner -->
    <div
      v-if="successNotification"
      class="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200"
    >
      <UIcon name="i-lucide-check-circle" class="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span class="font-medium">{{ successNotification }}</span>
      <button class="ml-auto text-emerald-600 hover:text-emerald-800" @click="successNotification = ''">
        <UIcon name="i-lucide-x" class="size-4" />
      </button>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
            <UIcon name="i-lucide-shield-check" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500">Super Admins</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.admins }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
            <UIcon name="i-lucide-award" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500">Placement Officers</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.officers }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <UIcon name="i-lucide-graduation-cap" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500">Candidates / Students</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.candidates }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <UIcon name="i-lucide-building-2" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500">Employers</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.employers }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters & Search -->
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
          placeholder="Search by name or email..."
          class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
      </div>
    </div>

    <!-- Users Table -->
    <ClientOnly>
      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[780px] table-fixed text-left text-sm">
            <colgroup>
              <col class="w-[34%]">
              <col class="w-[18%]">
              <col class="w-[24%]">
              <col class="w-[14%]">
              <col class="w-[10%]">
            </colgroup>
            <thead class="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th class="px-5 py-3.5">User</th>
                <th class="px-5 py-3.5">Current Role</th>
                <th class="px-5 py-3.5">Change Role</th>
                <th class="px-5 py-3.5">Created</th>
                <th class="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <tr
                v-for="user in filteredUsers"
                :key="user.id"
                class="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
              >
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-sm"
                      :class="{
                        'bg-red-600': user.role === 'admin',
                        'bg-purple-600': user.role === 'officer',
                        'bg-blue-600': user.role === 'candidate',
                        'bg-emerald-600': user.role === 'employer'
                      }"
                    >
                      {{ user.name.charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0 flex-1 truncate">
                      <p class="truncate font-semibold text-gray-950 dark:text-white">{{ user.name }}</p>
                      <p class="truncate text-xs text-gray-500">{{ user.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4 whitespace-nowrap">
                  <UBadge
                    :color="roleBadgeColor(user.role)"
                    variant="subtle"
                    :label="roleLabel(user.role)"
                    size="sm"
                  />
                </td>
                <td class="px-5 py-4 whitespace-nowrap">
                  <select
                    :value="user.role"
                    class="w-full max-w-[180px] rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    @change="changeRole(user.id, ($event.target as HTMLSelectElement).value as UserRole)"
                  >
                    <option value="admin">Admin</option>
                    <option value="officer">Placement Officer</option>
                    <option value="candidate">Candidate (Student)</option>
                    <option value="employer">Employer / Client</option>
                  </select>
                </td>
                <td class="px-5 py-4 whitespace-nowrap text-xs text-gray-500">
                  {{ user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' }}
                </td>
                <td class="px-5 py-4 whitespace-nowrap text-right">
                  <div v-if="confirmDeleteId === user.id" class="flex items-center justify-end gap-1.5">
                    <UButton size="xs" color="error" label="Delete" @click="handleDeleteUser(user.id)" />
                    <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" @click="confirmDeleteId = null" />
                  </div>
                  <div v-else class="flex justify-end">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-trash-2"
                      title="Delete user"
                      @click="confirmDeleteId = user.id"
                    />
                  </div>
                </td>
              </tr>

              <tr v-if="filteredUsers.length === 0">
                <td colspan="5" class="py-12 text-center text-sm text-gray-500">
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

    <!-- Create User Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div class="mb-4 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-800">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Create New User</h2>
          <button class="text-gray-400 hover:text-gray-600" @click="showModal = false">
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="handleCreateUser">
          <div v-if="modalError" class="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {{ modalError }}
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Full Name</label>
            <input
              v-model="form.name"
              type="text"
              required
              placeholder="e.g. John Doe"
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
            <input
              v-model="form.email"
              type="email"
              required
              placeholder="e.g. officer@university.edu"
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Assign Role</label>
            <div class="grid grid-cols-2 gap-2">
              <label
                class="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all"
                :class="form.role === 'admin' ? 'border-red-500 bg-red-50/50 text-red-700 dark:border-red-600 dark:bg-red-950/40' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'"
              >
                <input v-model="form.role" type="radio" value="admin" class="sr-only">
                <UIcon name="i-lucide-shield-check" class="size-4 text-red-500" />
                <span>Admin</span>
              </label>

              <label
                class="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all"
                :class="form.role === 'officer' ? 'border-purple-500 bg-purple-50/50 text-purple-700 dark:border-purple-600 dark:bg-purple-950/40' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'"
              >
                <input v-model="form.role" type="radio" value="officer" class="sr-only">
                <UIcon name="i-lucide-award" class="size-4 text-purple-500" />
                <span>Placement Officer</span>
              </label>

              <label
                class="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all"
                :class="form.role === 'candidate' ? 'border-blue-500 bg-blue-50/50 text-blue-700 dark:border-blue-600 dark:bg-blue-950/40' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'"
              >
                <input v-model="form.role" type="radio" value="candidate" class="sr-only">
                <UIcon name="i-lucide-graduation-cap" class="size-4 text-blue-500" />
                <span>Candidate / Student</span>
              </label>

              <label
                class="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all"
                :class="form.role === 'employer' ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/40' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'"
              >
                <input v-model="form.role" type="radio" value="employer" class="sr-only">
                <UIcon name="i-lucide-building-2" class="size-4 text-emerald-500" />
                <span>Employer / Client</span>
              </label>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Initial Password <span class="text-xs font-normal text-gray-400">(Optional)</span>
            </label>
            <input
              v-model="form.password"
              type="password"
              placeholder="Leave blank to let user set custom password via email"
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
          </div>

          <div class="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
            <input
              id="sendInvite"
              v-model="form.sendInviteEmail"
              type="checkbox"
              class="size-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-700"
            >
            <label for="sendInvite" class="cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
              Send branded Welcome & Invitation Email to their Gmail/inbox
            </label>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showModal = false" />
            <UButton type="submit" label="Create User" color="primary" :loading="modalLoading" />
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
