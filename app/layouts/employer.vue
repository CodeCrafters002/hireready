<script setup lang="ts">
const { currentUser, signOut } = useAuth()
const store = useDataStore()
const route = useRoute()
const sidebarOpen = ref(false)

const unreadMessagesCount = computed(() => {
  if (!currentUser.value) return 0
  return store.getUnreadMessagesCount(currentUser.value.id, 'employer')
})

const navItems = [
  { label: 'Client Dashboard', icon: 'i-lucide-layout-dashboard', to: '/employer' },
  { label: 'Candidate Messages 💬', icon: 'i-lucide-message-square', to: '/employer/messages' },
  { label: '1-Day Gigs & Shifts', icon: 'i-lucide-calendar-clock', to: '/employer/gigs' },
  { label: 'Plans & Unlock Credits', icon: 'i-lucide-sparkles', to: '/pricing?role=employer' },
  { label: 'Company Profile & Settings', icon: 'i-lucide-building-2', to: '/employer/profile' },
  { label: 'Browse Portal Jobs', icon: 'i-lucide-briefcase', to: '/jobs' }
]

function isActiveRoute(path: string) {
  if (path === '/employer') return route.path === '/employer'
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
            <span class="grid size-8 place-items-center rounded-lg bg-emerald-600 text-sm text-white">E</span>
            <span>Client Portal</span>
          </NuxtLink>
          <UButton class="ml-auto lg:hidden" icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="sidebarOpen = false" />
        </div>

        <div class="border-b border-gray-200 p-4 dark:border-gray-800">
          <NuxtLink
            to="/employer/profile"
            class="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/60"
            title="Edit Organization Profile"
          >
            <div
              v-if="(currentUser as any)?.profilePhotoUrl"
              class="relative size-10 shrink-0 overflow-hidden rounded-full border border-emerald-500/30"
            >
              <img :src="(currentUser as any)?.profilePhotoUrl" alt="Avatar" class="size-full object-cover" />
            </div>
            <div
              v-else
              class="grid size-10 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 shrink-0"
            >
              {{ currentUser?.name?.charAt(0) || 'E' }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-gray-950 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400">{{ currentUser?.name }}</p>
              <div class="flex items-center gap-1.5">
                <UBadge color="success" variant="subtle" label="Hiring Partner" size="xs" />
                <span class="text-[10px] text-gray-400 hover:underline">Edit &rarr;</span>
              </div>
            </div>
          </NuxtLink>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto p-3">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            :class="isActiveRoute(item.to) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'"
            @click="sidebarOpen = false"
          >
            <UIcon :name="item.icon" class="size-5 shrink-0" />
            <span>{{ item.label }}</span>
            <UBadge v-if="item.to === '/employer/messages' && unreadMessagesCount > 0" :label="String(unreadMessagesCount)" color="primary" variant="solid" size="xs" class="ml-auto" />
          </NuxtLink>
        </nav>

        <div class="border-t border-gray-200 p-3 dark:border-gray-800">
          <UButton
            block
            variant="ghost"
            color="neutral"
            icon="i-lucide-log-out"
            label="Sign out"
            class="justify-start"
            @click="signOut"
          />
        </div>
      </aside>

      <!-- Backdrop for mobile -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-black/40 lg:hidden"
        @click="sidebarOpen = false"
      />

      <!-- Main content area -->
      <div class="flex flex-1 flex-col lg:pl-64">
        <!-- Top bar -->
        <header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
          <div class="flex items-center gap-3">
            <UButton class="lg:hidden" icon="i-lucide-menu" variant="ghost" color="neutral" size="sm" @click="sidebarOpen = true" />
            <h1 class="text-lg font-semibold text-gray-950 dark:text-white">Employer / Client Workspace</h1>
          </div>
          <div class="flex items-center gap-3">
            <NuxtLink to="/employer/messages" class="relative" title="Candidate Messages">
              <UIcon name="i-lucide-message-square" class="size-5 text-gray-500 hover:text-emerald-600 transition-colors" />
              <span v-if="unreadMessagesCount > 0" class="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">{{ unreadMessagesCount > 9 ? '9+' : unreadMessagesCount }}</span>
            </NuxtLink>
            <NuxtLink
              to="/employer/profile"
              class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <div
                v-if="(currentUser as any)?.profilePhotoUrl"
                class="size-6 overflow-hidden rounded-full border border-emerald-400"
              >
                <img :src="(currentUser as any)?.profilePhotoUrl" alt="Avatar" class="size-full object-cover" />
              </div>
              <UIcon v-else name="i-lucide-building" class="size-4 text-emerald-500" />
              <span>{{ (currentUser as any)?.company || currentUser?.name }}</span>
            </NuxtLink>
            <UButton to="/jobs" size="sm" variant="outline" color="neutral" icon="i-lucide-external-link" label="View Public Jobs" />
          </div>
        </header>

        <!-- Page body -->
        <main class="flex-1 p-4 sm:p-6 lg:p-8">
          <slot />
        </main>
      </div>
    </div>
  </UApp>
</template>
