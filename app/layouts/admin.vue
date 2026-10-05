<script setup lang="ts">
const { currentUser, signOut } = useAuth()
const route = useRoute()
const sidebarOpen = ref(false)

const navItems = [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/admin' },
  { label: 'Users & Roles', icon: 'i-lucide-shield-check', to: '/admin/users' },
  { label: 'Manage Jobs', icon: 'i-lucide-briefcase', to: '/admin/jobs' },
  { label: 'Manage Candidates', icon: 'i-lucide-users', to: '/admin/candidates' },
  { label: 'Applications', icon: 'i-lucide-file-text', to: '/admin/applications' },
  { label: 'Payments', icon: 'i-lucide-indian-rupee', to: '/admin/payments' },
  { label: 'MCQ Questions', icon: 'i-lucide-list-checks', to: '/admin/questions' },
  { label: 'MCQ Results', icon: 'i-lucide-bar-chart-3', to: '/admin/results' },
  { label: 'Interview Slots', icon: 'i-lucide-calendar', to: '/admin/interviews' }
]

function isActiveRoute(path: string) {
  if (path === '/admin') return route.path === '/admin'
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
            <span class="grid size-8 place-items-center rounded-lg bg-red-600 text-sm text-white">A</span>
            <span>Admin Panel</span>
          </NuxtLink>
          <UButton class="ml-auto lg:hidden" icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="sidebarOpen = false" />
        </div>

        <div class="border-b border-gray-200 p-4 dark:border-gray-800">
          <div class="flex items-center gap-3">
            <div class="grid size-10 place-items-center rounded-full bg-red-100 text-sm font-bold text-red-600 dark:bg-red-900 dark:text-red-300">
              {{ currentUser?.name?.charAt(0) || 'A' }}
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-gray-950 dark:text-white">{{ currentUser?.name }}</p>
              <UBadge color="error" variant="subtle" label="Admin" size="xs" />
            </div>
          </div>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto p-3">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            :class="isActiveRoute(item.to) ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'"
            @click="sidebarOpen = false"
          >
            <UIcon :name="item.icon" class="size-5 shrink-0" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>

        <div class="space-y-1 border-t border-gray-200 p-3 dark:border-gray-800">
          <UButton block color="neutral" variant="ghost" label="View Site" icon="i-lucide-external-link" to="/" />
          <UButton block color="neutral" variant="ghost" label="Sign out" icon="i-lucide-log-out" @click="signOut" />
        </div>
      </aside>

      <!-- Overlay -->
      <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-black/50 lg:hidden" @click="sidebarOpen = false" />

      <!-- Main content -->
      <div class="flex flex-1 flex-col lg:pl-64">
        <header class="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-gray-200 bg-white/90 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90 sm:px-6">
          <UButton class="lg:hidden" icon="i-lucide-menu" variant="ghost" color="neutral" @click="sidebarOpen = true" />
          <h1 class="text-lg font-semibold text-gray-950 dark:text-white">Admin Panel</h1>
        </header>

        <main class="flex-1 p-4 sm:p-6">
          <slot />
        </main>
      </div>
    </div>
  </UApp>
</template>
