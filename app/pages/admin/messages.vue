<script setup lang="ts">
import type { Conversation, ChatMessage } from '~/types/portal'

definePageMeta({ layout: 'admin' })

const store = useDataStore()
const { currentUser, hydrate } = useAuth()
const route = useRoute()

onMounted(() => {
  hydrate()
  scrollToBottom(true)
})

// ── Reactive Data ─────────────────────────────────────────────────────────────
const searchQuery = ref('')
const selectedRoleFilter = ref<'all' | 'candidate' | 'employer'>('all')
const selectedConvId = ref<string>((route.query.conversationId as string) || '')
const newMessageText = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)
const mobileShowChat = ref(false)

const allConversations = computed(() => {
  void store.chatVersion.value
  return store.getConversationsForUser(currentUser.value?.id || 'admin', 'admin')
})

const filteredConversations = computed(() => {
  let list = allConversations.value

  if (selectedRoleFilter.value === 'candidate') {
    list = list.filter(c => c.candidateId)
  } else if (selectedRoleFilter.value === 'employer') {
    list = list.filter(c => !c.isSupportChat && c.employerId !== 'admin-support')
  }

  if (!searchQuery.value.trim()) return list
  const q = searchQuery.value.toLowerCase().trim()
  return list.filter(c =>
    (c.candidateName && c.candidateName.toLowerCase().includes(q)) ||
    (c.companyName && c.companyName.toLowerCase().includes(q)) ||
    (c.employerName && c.employerName.toLowerCase().includes(q)) ||
    (c.jobTitle && c.jobTitle.toLowerCase().includes(q)) ||
    (c.lastMessageText && c.lastMessageText.toLowerCase().includes(q))
  )
})

// Auto-select query param or first conversation
watch([filteredConversations, () => route.query.conversationId], ([list, queryId]) => {
  if (queryId && typeof queryId === 'string' && list.some(c => c.id === queryId)) {
    selectedConvId.value = queryId
    mobileShowChat.value = true
  } else if (!selectedConvId.value && list.length > 0) {
    selectedConvId.value = list[0]?.id || ''
  } else if (selectedConvId.value && !list.some(c => c.id === selectedConvId.value) && list.length > 0) {
    selectedConvId.value = list[0]?.id || ''
  }
}, { immediate: true })

const activeConversation = computed<Conversation | undefined>(() => {
  return allConversations.value.find(c => c.id === selectedConvId.value) || filteredConversations.value[0]
})

const messages = computed<ChatMessage[]>(() => {
  void store.chatVersion.value
  const targetId = selectedConvId.value || (route.query.conversationId as string) || activeConversation.value?.id
  if (!targetId) return []
  return store.getChatMessages(targetId)
})

watch(selectedConvId, (newId) => {
  if (newId) {
    store.markConversationRead(newId, 'admin')
    scrollToBottom(false)
  }
}, { immediate: true })

watch(messages, () => {
  scrollToBottom(false)
})

function selectConversation(id: string) {
  selectedConvId.value = id
  mobileShowChat.value = true
  scrollToBottom(false)
}

function scrollToBottom(instant = false) {
  nextTick(() => {
    setTimeout(() => {
      if (chatContainerRef.value) {
        chatContainerRef.value.scrollTo({
          top: chatContainerRef.value.scrollHeight,
          behavior: instant ? 'auto' : 'smooth'
        })
      }
    }, 40)
  })
}

function handleSendMessage(presetText?: string) {
  const text = presetText || newMessageText.value.trim()
  if (!text || !activeConversation.value) return

  const senderId = currentUser.value?.id || 'admin-support'
  const senderName = currentUser.value?.name ? `${currentUser.value.name} (Admin)` : 'HireReady Admin Team'
  const convId = activeConversation.value.id

  store.sendMessage({
    conversationId: convId,
    senderId,
    senderName,
    senderRole: 'admin',
    text
  })

  // If conversation was pending, automatically accept upon admin engagement
  if (activeConversation.value.requestStatus === 'pending') {
    store.acceptConversation(convId)
  }

  newMessageText.value = ''
  scrollToBottom()

  // In-app notification for candidate
  store.addNotification({
    userId: activeConversation.value.candidateId,
    type: 'general',
    title: '🛡️ Official Message from HireReady Admin',
    message: text.slice(0, 120)
  })
}

function formatMessageTime(isoString: string): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatListTime(isoString: string): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    const now = new Date()
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 3600)
    if (diffHours < 24) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

const adminTemplates = [
  '📢 Profile Verified: Your candidate profile has been approved for premier employer matching.',
  '🎯 Job Recommendation: We found top roles matching your test scores. Check your applications.',
  '📅 Mock Interview: Please schedule your placement screening round to complete qualification.',
  '🔒 Support Notice: Our compliance team has reviewed your account details.'
]
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl sm:text-2xl font-black text-gray-950 dark:text-white">Admin Messaging &amp; User Hotline</h1>
          <UBadge color="error" variant="subtle" size="xs" label="Supervisor Mode" />
          <UBadge color="primary" variant="subtle" size="xs" label="All Roles Connected" />
        </div>
        <p class="mt-0.5 text-xs sm:text-sm text-gray-500">
          Communicate directly with candidates and employer recruiters, manage message requests, and broadcast official updates.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          to="/admin/users"
          size="xs"
          variant="outline"
          color="neutral"
          icon="i-lucide-users"
          label="All Users"
        />
        <UButton
          to="/admin/candidates"
          size="xs"
          color="primary"
          icon="i-lucide-graduation-cap"
          label="Candidates"
        />
      </div>
    </div>

    <!-- Main Container -->
    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 grid grid-cols-1 md:grid-cols-12 h-[calc(100dvh-10.5rem)] min-h-[500px] max-h-[860px]">
      
      <!-- ── Left Column: Conversation Directory ────────────────────────────── -->
      <div
        class="md:col-span-4 lg:col-span-4 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full min-h-0 bg-gray-50/50 dark:bg-gray-900/50"
        :class="mobileShowChat ? 'hidden md:flex' : 'flex'"
      >
        <!-- Filter Tabs & Search -->
        <div class="p-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-2.5 shrink-0">
          <div class="relative">
            <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search user, company, role..."
              class="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-red-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div class="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              class="py-1 rounded-lg text-center transition"
              :class="selectedRoleFilter === 'all' ? 'bg-white dark:bg-gray-900 shadow-2xs text-gray-950 dark:text-white' : 'text-gray-500 hover:text-gray-900'"
              @click="selectedRoleFilter = 'all'"
            >
              All ({{ allConversations.length }})
            </button>
            <button
              type="button"
              class="py-1 rounded-lg text-center transition"
              :class="selectedRoleFilter === 'candidate' ? 'bg-white dark:bg-gray-900 shadow-2xs text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900'"
              @click="selectedRoleFilter = 'candidate'"
            >
              Candidates
            </button>
            <button
              type="button"
              class="py-1 rounded-lg text-center transition"
              :class="selectedRoleFilter === 'employer' ? 'bg-white dark:bg-gray-900 shadow-2xs text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-900'"
              @click="selectedRoleFilter = 'employer'"
            >
              Employers
            </button>
          </div>
        </div>

        <!-- Conversation List -->
        <div class="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
          <div
            v-if="filteredConversations.length === 0"
            class="p-8 text-center text-gray-400 text-xs"
          >
            <UIcon name="i-lucide-messages-square" class="mx-auto size-8 mb-2 opacity-50" />
            <p class="font-medium text-gray-700 dark:text-gray-300">No matching conversations</p>
            <p class="text-[11px] mt-1 text-gray-500">Go to Users &amp; Roles and click "💬 Message" to initiate a direct thread with any candidate or employer.</p>
          </div>

          <button
            v-for="conv in filteredConversations"
            :key="conv.id"
            type="button"
            class="w-full text-left p-3.5 transition-all flex items-start gap-3 hover:bg-white dark:hover:bg-gray-800/60 relative"
            :class="selectedConvId === conv.id ? 'bg-red-50/70 dark:bg-red-950/40 border-l-4 border-red-600' : 'bg-transparent'"
            @click="selectConversation(conv.id)"
          >
            <!-- Avatar -->
            <div
              class="relative size-10 shrink-0 rounded-full font-bold text-xs grid place-items-center shadow-2xs text-white"
              :class="conv.isSupportChat || conv.employerId === 'admin-support'
                ? 'bg-gradient-to-tr from-red-600 to-rose-700 ring-2 ring-red-400/40'
                : 'bg-gradient-to-tr from-indigo-600 to-purple-600'"
            >
              <UIcon v-if="conv.isSupportChat || conv.employerId === 'admin-support'" name="i-lucide-shield-check" class="size-5" />
              <span v-else>{{ conv.candidateName ? conv.candidateName.charAt(0).toUpperCase() : 'U' }}</span>

              <span
                v-if="(conv.unreadAdminCount || 0) > 0"
                class="absolute -top-1 -right-1 grid size-4.5 place-items-center rounded-full bg-red-600 text-[10px] font-black text-white ring-2 ring-white dark:ring-gray-900"
              >
                {{ conv.unreadAdminCount }}
              </span>
            </div>

            <!-- Details -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-1 mb-0.5">
                <div class="flex items-center gap-1 min-w-0">
                  <h4 class="font-bold text-xs text-gray-950 dark:text-white truncate">
                    {{ conv.candidateName }} &harr; {{ conv.companyName }}
                  </h4>
                </div>
                <span class="text-[10px] text-gray-400 shrink-0 font-medium">
                  {{ formatListTime(conv.lastMessageAt) }}
                </span>
              </div>

              <div class="flex items-center gap-1.5 mb-1">
                <UBadge
                  v-if="conv.requestStatus === 'pending'"
                  color="warning"
                  variant="subtle"
                  size="xs"
                  label="Pending Request"
                  class="text-[9px] py-0 px-1"
                />
                <UBadge
                  v-else
                  color="success"
                  variant="subtle"
                  size="xs"
                  label="Active"
                  class="text-[9px] py-0 px-1"
                />
                <span v-if="conv.jobTitle" class="text-[11px] font-medium text-gray-600 dark:text-gray-400 truncate">
                  {{ conv.jobTitle }}
                </span>
              </div>

              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ conv.lastMessageText }}
              </p>
            </div>
          </button>
        </div>
      </div>

      <!-- ── Right Column: Supervisor Active Chat ───────────────────────────── -->
      <div
        v-if="activeConversation"
        class="md:col-span-8 lg:col-span-8 flex flex-col h-full min-h-0 bg-white dark:bg-gray-900"
        :class="!mobileShowChat ? 'hidden md:flex' : 'flex'"
      >
        <!-- Top Header -->
        <div class="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <!-- Mobile Back Button -->
            <button
              type="button"
              class="md:hidden grid size-8 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 shrink-0"
              @click="mobileShowChat = false"
            >
              <UIcon name="i-lucide-arrow-left" class="size-5" />
            </button>

            <div class="grid size-10 place-items-center rounded-full bg-gradient-to-tr from-red-600 to-rose-700 text-white font-bold text-xs shrink-0 shadow-xs">
              <UIcon name="i-lucide-shield-check" class="size-5" />
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm text-gray-950 dark:text-white truncate">
                  Candidate: {{ activeConversation.candidateName }}
                </h3>
                <UBadge
                  v-if="activeConversation.requestStatus === 'pending'"
                  color="warning"
                  variant="subtle"
                  size="xs"
                  label="Privacy Shield Active"
                />
                <UBadge
                  v-else
                  color="success"
                  variant="subtle"
                  size="xs"
                  label="Mutual Connected"
                />
              </div>
              <p class="text-xs text-gray-500 truncate">
                <span>Company: <strong>{{ activeConversation.companyName }}</strong></span>
                <span v-if="activeConversation.candidateEmail"> · Email: {{ activeConversation.candidateEmail }}</span>
                <span v-if="activeConversation.jobTitle"> · Role: {{ activeConversation.jobTitle }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <UButton
              v-if="activeConversation.requestStatus === 'pending'"
              size="xs"
              color="primary"
              variant="soft"
              icon="i-lucide-check-circle"
              label="Unlock Thread"
              @click="store.acceptConversation(activeConversation.id)"
            />
            <UButton
              to="/admin/users"
              size="xs"
              variant="outline"
              color="neutral"
              icon="i-lucide-user"
              label="User Details"
            />
          </div>
        </div>

        <!-- Chat Messages Area -->
        <div
          ref="chatContainerRef"
          class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-gray-50/40 dark:bg-gray-950/20 scroll-smooth"
        >
          <!-- Notice Header -->
          <div class="text-center my-1">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-3 py-1 text-[11px] text-red-700 dark:text-red-300 font-medium shadow-2xs">
              <UIcon name="i-lucide-shield-alert" class="size-3.5 text-red-600" />
              <span>Admin Supervisor Console · Messages sent here will appear with Official Platform badge</span>
            </span>
          </div>

          <!-- Message Bubbles -->
          <template v-for="msg in messages" :key="msg.id">
            <!-- System Notice -->
            <div v-if="msg.isSystemNotice" class="text-center my-2">
              <span class="inline-block rounded-full bg-gray-100 border border-gray-200 px-3.5 py-1 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 shadow-2xs">
                {{ msg.text }}
              </span>
            </div>

            <!-- Chat Bubble -->
            <div
              v-else
              class="flex flex-col"
              :class="msg.senderRole === 'admin' ? 'items-end' : 'items-start'"
            >
              <div class="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                <!-- Avatar -->
                <div
                  v-if="msg.senderRole !== 'admin'"
                  class="grid size-7 place-items-center rounded-full text-white text-[10px] font-bold shrink-0"
                  :class="msg.senderRole === 'candidate' ? 'bg-blue-600' : 'bg-emerald-600'"
                >
                  {{ msg.senderRole === 'candidate' ? 'C' : 'E' }}
                </div>

                <!-- Bubble Box -->
                <div
                  class="rounded-2xl p-3 shadow-2xs"
                  :class="msg.senderRole === 'admin'
                    ? 'bg-red-600 text-white rounded-br-xs'
                    : msg.senderRole === 'candidate'
                      ? 'bg-blue-50 text-gray-950 border border-blue-200 dark:bg-blue-950/40 dark:text-white dark:border-blue-900/60 rounded-bl-xs'
                      : 'bg-emerald-50 text-gray-950 border border-emerald-200 dark:bg-emerald-950/40 dark:text-white dark:border-emerald-900/60 rounded-bl-xs'"
                >
                  <!-- Sender Name & Role Badge -->
                  <div class="flex items-center gap-1.5 mb-1">
                    <p
                      class="text-[10px] font-bold"
                      :class="msg.senderRole === 'admin'
                        ? 'text-red-100'
                        : msg.senderRole === 'candidate'
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-emerald-700 dark:text-emerald-300'"
                    >
                      {{ msg.senderName }}
                    </p>
                    <UBadge
                      :color="msg.senderRole === 'admin' ? 'error' : msg.senderRole === 'candidate' ? 'info' : 'success'"
                      variant="subtle"
                      size="xs"
                      :label="msg.senderRole"
                      class="text-[9px] py-0 px-1 capitalize"
                    />
                  </div>

                  <p class="text-xs leading-relaxed whitespace-pre-wrap">{{ msg.text }}</p>

                  <div
                    class="mt-1 text-[10px] text-right font-medium"
                    :class="msg.senderRole === 'admin' ? 'text-red-200' : 'text-gray-400'"
                  >
                    {{ formatMessageTime(msg.createdAt) }}
                    <span v-if="msg.senderRole === 'admin'"> · ✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Admin Quick Broadcast Templates -->
        <div class="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 flex items-center gap-1.5 overflow-x-auto text-nowrap shrink-0">
          <span class="text-[10px] font-bold text-gray-400 uppercase shrink-0">Admin Templates:</span>
          <button
            v-for="tmpl in adminTemplates"
            :key="tmpl"
            type="button"
            class="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 transition hover:border-red-500 hover:text-red-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-white shrink-0"
            @click="handleSendMessage(tmpl)"
          >
            {{ tmpl.slice(0, 32) }}...
          </button>
        </div>

        <!-- Input Bar -->
        <div class="p-3.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-2 shrink-0">
          <input
            v-model="newMessageText"
            type="text"
            placeholder="Type an official admin message or notice to this user... (Press Enter to send)"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 shadow-2xs placeholder-gray-400 focus:border-red-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            @keydown.enter.prevent="handleSendMessage()"
          />
          <UButton
            color="error"
            icon="i-lucide-send"
            size="sm"
            label="Send Official Notice"
            :disabled="!newMessageText.trim()"
            @click="handleSendMessage()"
          />
        </div>
      </div>

      <!-- Empty state if no conversation selected -->
      <div v-else class="md:col-span-8 flex flex-col items-center justify-center p-12 text-center text-gray-400">
        <UIcon name="i-lucide-messages-square" class="size-16 opacity-30 mb-3" />
        <h3 class="font-bold text-base text-gray-700 dark:text-gray-300">Select a conversation</h3>
        <p class="text-xs text-gray-500 max-w-sm mt-1">Choose a user thread from the left or message any user directly from Users &amp; Roles.</p>
      </div>

    </div>
  </div>
</template>
