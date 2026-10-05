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
const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'candidate' as UserRole
})

function openCreateModal(defaultRole?: UserRole) {
  modalError.value = ''
  form.name = ''
  form.email = ''
  form.password = ''
  form.role = defaultRole || 'candidate'
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
    store.createUser({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      passwordHash: 'demo_hash'
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
    <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/75 text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th class="px-5 py-3">User</th>
              <th class="px-5 py-3">Current Role</th>
              <th class="px-5 py-3">Change Role</th>
              <th class="px-5 py-3">Created</th>
              <th class="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
            >
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="grid size-10 place-items-center rounded-full text-sm font-bold text-white shadow-sm"
                    :class="{
                      'bg-red-600': user.role === 'admin',
                      'bg-purple-600': user.role === 'officer',
                      'bg-blue-600': user.role === 'candidate',
                      'bg-emerald-600': user.role === 'employer'
                    }"
                  >
                    {{ user.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <p class="font-semibold text-gray-950 dark:text-white">{{ user.name }}</p>
                    <p class="truncate text-xs text-gray-500">{{ user.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4">
                <UBadge
                  :color="roleBadgeColor(user.role)"
                  variant="subtle"
                  :label="roleLabel(user.role)"
                  size="sm"
                />
              </td>
              <td class="px-5 py-4">
                <select
                  :value="user.role"
                  class="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  @change="changeRole(user.id, ($event.target as HTMLSelectElement).value as UserRole)"
                >
                  <option value="admin">Admin</option>
                  <option value="officer">Placement Officer</option>
                  <option value="candidate">Candidate (Student)</option>
                  <option value="employer">Employer / Client</option>
                </select>
              </td>
              <td class="px-5 py-4 text-xs text-gray-500">
                {{ user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' }}
              </td>
              <td class="px-5 py-4 text-right">
                <div v-if="confirmDeleteId === user.id" class="flex items-center justify-end gap-2">
                  <span class="text-xs text-red-500">Confirm?</span>
                  <UButton size="xs" color="error" label="Yes, delete" @click="handleDeleteUser(user.id)" />
                  <UButton size="xs" color="neutral" variant="ghost" label="Cancel" @click="confirmDeleteId = null" />
                </div>
                <div v-else>
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

          <div class="flex items-center justify-end gap-2 pt-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showModal = false" />
            <UButton type="submit" label="Create User" color="primary" :loading="modalLoading" />
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
