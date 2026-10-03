<script setup lang="ts">
definePageMeta({ layout: 'candidate' })

const { currentUser } = useAuth()
const store = useDataStore()

const notifications = computed(() => currentUser.value ? store.getNotificationsByUser(currentUser.value.id) : [])
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

function markRead(id: string) {
  store.markNotificationRead(id)
}

function markAllRead() {
  if (currentUser.value) store.markAllNotificationsRead(currentUser.value.id)
}

const typeIcon: Record<string, string> = {
  payment: 'i-lucide-indian-rupee',
  assessment: 'i-lucide-file-check',
  interview: 'i-lucide-video',
  selection: 'i-lucide-trophy',
  general: 'i-lucide-info'
}

const typeColor: Record<string, string> = {
  payment: 'text-amber-600 bg-amber-100 dark:bg-amber-900 dark:text-amber-300',
  assessment: 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300',
  interview: 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-300',
  selection: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-300',
  general: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300'
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Notifications</h2>
        <p class="mt-1 text-gray-500">{{ unreadCount }} unread notification{{ unreadCount === 1 ? '' : 's' }}</p>
      </div>
      <UButton v-if="unreadCount > 0" size="sm" variant="soft" label="Mark all read" icon="i-lucide-check-check" @click="markAllRead" />
    </div>

    <div v-if="notifications.length" class="space-y-3">
      <UCard
        v-for="n in notifications"
        :key="n.id"
        :class="!n.read ? 'ring-1 ring-primary/30' : ''"
      >
        <div class="flex items-start gap-4">
          <div class="grid size-10 shrink-0 place-items-center rounded-xl" :class="typeColor[n.type] || typeColor.general">
            <UIcon :name="typeIcon[n.type] || typeIcon.general" class="size-5" />
          </div>
          <div class="flex-1">
            <div class="flex items-start justify-between gap-2">
              <p class="font-semibold text-gray-950 dark:text-white">{{ n.title }}</p>
              <span class="shrink-0 text-xs text-gray-400">{{ new Date(n.createdAt).toLocaleDateString() }}</span>
            </div>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ n.message }}</p>
          </div>
          <UButton v-if="!n.read" size="xs" variant="ghost" color="neutral" icon="i-lucide-check" @click="markRead(n.id)" />
        </div>
      </UCard>
    </div>

    <UCard v-else>
      <div class="py-12 text-center">
        <UIcon name="i-lucide-bell-off" class="mx-auto size-16 text-gray-300" />
        <p class="mt-4 text-lg font-medium text-gray-500">No notifications</p>
      </div>
    </UCard>
  </div>
</template>
