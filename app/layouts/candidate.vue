<script setup lang="ts">
const { currentUser, signOut } = useAuth()
const store = useDataStore()
const route = useRoute()

const notifications = computed(() => {
  if (!currentUser.value) return []
  return store.getNotificationsByUser(currentUser.value.id)
})
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)
const profile = computed(() => currentUser.value ? store.getProfileByUserId(currentUser.value.id) : null)

const profileCompletion = computed(() => {
  if (!profile.value) return 0
  const fields = [
    profile.value.fullName,
    profile.value.email,
    profile.value.mobile,
    profile.value.city,
    profile.value.skills.length > 0 ? 'yes' : '',
    profile.value.education,
    profile.value.experience,
    profile.value.resumeFilename,
    profile.value.profilePhotoUrl
  ]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
})

const sidebarOpen = ref(false)

const navItems = [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/candidate' },
  { label: 'Profile', icon: 'i-lucide-user', to: '/candidate/profile' },
  { label: 'My Applications', icon: 'i-lucide-briefcase', to: '/candidate/applications' },
  { label: 'Assessments', icon: 'i-lucide-file-check', to: '/candidate/assessments' },
  { label: 'Interviews', icon: 'i-lucide-video', to: '/candidate/interviews' },
  { label: 'Notifications', icon: 'i-lucide-bell', to: '/candidate/notifications' },
  { label: 'Browse Jobs', icon: 'i-lucide-search', to: '/jobs' }
]

function isActiveRoute(path: string) {
  if (path === '/candidate') return route.path === '/candidate'
  return route.path.startsWith(path)
}
</script>

<template>
  <UApp>
    <div class="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform dark:border-gray-800 dark:bg-gray-900 lg:translate-x-0"
        :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <div class="flex h-16 items-center gap-2 border-b border-gray-200 px-5 dark:border-gray-800">
          <NuxtLink to="/" class="flex items-center gap-2 font-bold text-gray-950 dark:text-white">
            <span class="grid size-8 place-items-center rounded-lg bg-primary text-sm text-white">H</span>
            <span>HireReady</span>
          </NuxtLink>
          <UButton class="ml-auto lg:hidden" icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="sidebarOpen = false" />
        </div>

        <!-- Profile summary -->
        <div class="border-b border-gray-200 p-4 dark:border-gray-800">
          <div class="flex items-center gap-3">
            <div class="relative size-10 shrink-0 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
              <img
                v-if="profile?.profilePhotoUrl"
                :src="profile.profilePhotoUrl"
                class="size-full object-cover"
                alt="Profile picture"
              >
              <div
                v-else
                class="grid size-full place-items-center bg-primary-100 text-sm font-bold text-primary dark:bg-primary-900"
              >
                {{ currentUser?.name?.charAt(0) || 'C' }}
              </div>
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-gray-950 dark:text-white">{{ currentUser?.name }}</p>
              <p class="truncate text-xs text-gray-500">{{ currentUser?.email }}</p>
            </div>
          </div>
          <div class="mt-3">
            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>Profile</span>
              <span>{{ profileCompletion }}%</span>
            </div>
            <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div class="h-full rounded-full bg-primary transition-all" :style="{ width: profileCompletion + '%' }" />
            </div>
          </div>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto p-3">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            :class="isActiveRoute(item.to) ? 'bg-primary-50 text-primary dark:bg-primary-950' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'"
            @click="sidebarOpen = false"
          >
            <UIcon :name="item.icon" class="size-5 shrink-0" />
            <span>{{ item.label }}</span>
            <UBadge v-if="item.label === 'Notifications' && unreadCount > 0" :label="String(unreadCount)" color="error" variant="solid" size="xs" class="ml-auto" />
          </NuxtLink>
        </nav>

        <div class="border-t border-gray-200 p-3 dark:border-gray-800">
          <UButton block color="neutral" variant="ghost" label="Sign out" icon="i-lucide-log-out" @click="signOut" />
        </div>
      </aside>

      <!-- Sidebar overlay for mobile -->
      <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-black/50 lg:hidden" @click="sidebarOpen = false" />

      <!-- Main content -->
      <div class="flex flex-1 flex-col lg:pl-64">
        <header class="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-gray-200 bg-white/90 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90 sm:px-6">
          <UButton class="lg:hidden" icon="i-lucide-menu" variant="ghost" color="neutral" @click="sidebarOpen = true" />
          <h1 class="text-lg font-semibold text-gray-950 dark:text-white">Candidate Dashboard</h1>
          <div class="ml-auto flex items-center gap-3">
            <NuxtLink to="/candidate/notifications" class="relative">
              <UIcon name="i-lucide-bell" class="size-5 text-gray-500 hover:text-primary" />
              <span v-if="unreadCount > 0" class="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
            </NuxtLink>
          </div>
        </header>

        <main class="flex-1 p-4 sm:p-6">
          <slot />
        </main>
      </div>
    </div>
  </UApp>
</template>
