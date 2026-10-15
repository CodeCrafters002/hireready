<script setup lang="ts">
import type { Conversation, ChatMessage } from '~/types/portal'

definePageMeta({ layout: 'candidate' })

const store = useDataStore()
const { currentUser, hydrate } = useAuth()
const route = useRoute()

let pollInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  hydrate()
  store.syncChatWithDatabase()
  scrollToBottom(true)
  pollInterval = setInterval(() => {
    store.syncChatWithDatabase()
  }, 2500)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

// ── Active Candidate ID (Hydration-safe) ───────────────────────────────────────
const activeCandidateId = computed(() => {
  if (currentUser.value?.id) return currentUser.value.id
  if (!import.meta.server) {
    try {
      const raw = localStorage.getItem('hr_current_user')
      if (raw) {
        const u = JSON.parse(raw)
        if (u?.id) return u.id
      }
    } catch {}
  }
  return 'demo-candidate'
})

// ── Reactive Data ─────────────────────────────────────────────────────────────
const searchQuery = ref('')
const selectedConvId = ref<string>((route.query.conversationId as string) || '')
const newMessageText = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)
const mobileShowChat = ref(false)

const conversations = computed(() => {
  void store.chatVersion.value
  let all = store.getConversationsForUser(activeCandidateId.value, 'candidate')

  // If a specific conversation was opened via query param (e.g. from applications page), guarantee it appears
  const queryId = route.query.conversationId as string | undefined
  if (queryId && !all.some(c => c.id === queryId)) {
    const targetConv = store.getConversationById(queryId)
    if (targetConv) {
      all = [targetConv, ...all]
    }
  }

  if (!searchQuery.value.trim()) return all
  const q = searchQuery.value.toLowerCase().trim()
  return all.filter(c =>
    (c.companyName && c.companyName.toLowerCase().includes(q)) ||
    (c.employerName && c.employerName.toLowerCase().includes(q)) ||
    (c.candidateName && c.candidateName.toLowerCase().includes(q)) ||
    (c.candidateEmail && c.candidateEmail.toLowerCase().includes(q)) ||
    (c.jobTitle && c.jobTitle.toLowerCase().includes(q)) ||
    (c.lastMessageText && c.lastMessageText.toLowerCase().includes(q))
  )
})

const matchingDirectoryUsers = computed(() => {
  if (!searchQuery.value.trim()) return []
  const q = searchQuery.value.toLowerCase().trim()
  const allUsers = store.getUsers()
  return allUsers.filter(u => {
    if (u.id === activeCandidateId.value || (currentUser.value?.email && u.email?.toLowerCase() === currentUser.value.email.toLowerCase())) return false
    if (u.role === 'candidate') return false
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.company && u.company.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    )
  }).slice(0, 5)
})

function startDirectChatWithUser(user: any) {
  const isEmp = user.role === 'employer'
  const conv = store.getOrCreateConversation({
    jobTitle: isEmp ? (user.company ? `Inquiry with ${user.company}` : 'Recruiter Discussion') : 'Direct Advisory Hotline',
    companyName: isEmp ? (user.company || user.name) : 'HireReady Official Support',
    candidateId: activeCandidateId.value,
    candidateName: currentUser.value?.name || 'Candidate',
    candidateEmail: currentUser.value?.email,
    employerId: isEmp ? user.id : 'admin-support',
    employerName: user.name,
    employerCompany: isEmp ? (user.company || user.name) : 'HireReady Platform Team',
    initialMessage: `Hello ${user.name}! I would like to connect with your team.`,
    initialSenderRole: 'candidate',
    requestStatus: 'accepted',
    isSupportChat: !isEmp
  })
  selectedConvId.value = conv.id
  searchQuery.value = ''
  mobileShowChat.value = true
  scrollToBottom()
}

// Auto-select query param or first conversation
watch([conversations, () => route.query.conversationId], ([list, queryId]) => {
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
  return conversations.value.find(c => c.id === selectedConvId.value) || conversations.value[0]
})

const messages = computed<ChatMessage[]>(() => {
  void store.chatVersion.value
  const targetId = selectedConvId.value || (route.query.conversationId as string) || activeConversation.value?.id
  if (!targetId) return []
  return store.getChatMessages(targetId)
})

// Mark read when selecting conversation
watch(selectedConvId, (newId) => {
  if (newId) {
    store.markConversationRead(newId, 'candidate')
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

function handleAcceptRequest() {
  if (!activeConversation.value) return
  const convId = activeConversation.value.id
  store.acceptConversation(convId)
  if (activeConversation.value) {
    activeConversation.value.requestStatus = 'accepted'
  }
  scrollToBottom()
}

function handleDeclineRequest() {
  if (!activeConversation.value) return
  const convId = activeConversation.value.id
  store.declineConversation(convId)
  if (activeConversation.value) {
    activeConversation.value.requestStatus = 'declined'
  }
  scrollToBottom()
}

function handleSendMessage(presetText?: string) {
  const text = presetText || newMessageText.value.trim()
  if (!text || !activeConversation.value) return

  // Prevent sending if request is pending
  if (activeConversation.value.requestStatus === 'pending') {
    handleAcceptRequest()
  }

  const senderId = currentUser.value?.id || activeCandidateId.value || 'demo-candidate'
  const senderName = currentUser.value?.name || 'You'
  const convId = activeConversation.value.id

  store.sendMessage({
    conversationId: convId,
    senderId,
    senderName,
    senderRole: 'candidate',
    text
  })

  newMessageText.value = ''
  scrollToBottom()
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

const quickReplies = [
  'Yes, I am available tomorrow afternoon! 👍',
  'I have uploaded my updated resume and live portfolio 📄',
  'My notice period is immediate (available to join in 10 days) ⚡',
  'Could you share more details about the technical round format?'
]
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl sm:text-2xl font-black text-gray-950 dark:text-white">Messages &amp; Direct Chat</h1>
          <UBadge color="primary" variant="subtle" size="xs" label="Real-Time" />
          <UBadge color="success" variant="subtle" size="xs" label="Privacy Shielded 🛡️" />
        </div>
        <p class="mt-0.5 text-xs sm:text-sm text-gray-500">
          Direct communication channel with hiring managers, verified recruiters, and HireReady admin.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          to="/candidate/interviews"
          size="xs"
          variant="outline"
          color="neutral"
          icon="i-lucide-calendar"
          label="Interviews"
        />
        <UButton
          to="/jobs"
          size="xs"
          color="primary"
          icon="i-lucide-search"
          label="Browse Jobs"
        />
      </div>
    </div>

    <!-- Main Chat Shell (Height constrained to viewport so inner containers scroll cleanly) -->
    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 grid grid-cols-1 md:grid-cols-12 h-[calc(100dvh-10.5rem)] min-h-[500px] max-h-[860px]">
      
      <!-- ── Left Sidebar: Conversations List ──────────────────────────────── -->
      <div
        class="md:col-span-4 lg:col-span-4 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full min-h-0 bg-gray-50/50 dark:bg-gray-900/50"
        :class="mobileShowChat ? 'hidden md:flex' : 'flex'"
      >
        <!-- Search Bar -->
        <div class="p-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div class="relative">
            <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search companies &amp; recruiters..."
              class="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <!-- Privacy Status Note in sidebar -->
        <div class="px-3 py-2 bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300 font-medium shrink-0">
          <span class="flex items-center gap-1.5 truncate">
            <UIcon name="i-lucide-shield-check" class="size-3.5 text-indigo-600 shrink-0" />
            <span>End-to-end privacy shield</span>
          </span>
          <span class="text-[10px] text-indigo-500 font-bold shrink-0">Active</span>
        </div>

        <!-- Conversations List (Scrolls independently) -->
        <div class="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
          <!-- Start New Chat Search Results -->
          <div v-if="searchQuery.trim() && matchingDirectoryUsers.length > 0" class="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50">
            <p class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-1.5 mb-1.5">
              Available Contacts ({{ matchingDirectoryUsers.length }})
            </p>
            <div class="space-y-1">
              <button
                v-for="user in matchingDirectoryUsers"
                :key="user.id"
                type="button"
                class="w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2 bg-white dark:bg-gray-800/90 shadow-2xs hover:ring-1 hover:ring-indigo-500"
                @click="startDirectChatWithUser(user)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="size-7 rounded-full bg-indigo-600 text-white font-bold text-xs grid place-items-center shrink-0">
                    {{ user.name ? user.name.charAt(0).toUpperCase() : 'U' }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-gray-900 dark:text-white truncate">{{ user.name }}</p>
                    <p class="text-[10px] text-gray-500 truncate">{{ user.company || (user.role === 'admin' ? 'HireReady Admin' : user.role) }}</p>
                  </div>
                </div>
                <UIcon name="i-lucide-message-square-plus" class="size-4 text-indigo-600 shrink-0" />
              </button>
            </div>
          </div>
          <div
            v-if="conversations.length === 0"
            class="p-8 text-center text-gray-400 text-xs"
          >
            <UIcon name="i-lucide-message-square-off" class="mx-auto size-8 mb-2 opacity-50" />
            <p class="font-medium text-gray-700 dark:text-gray-300">No active conversations</p>
            <p class="text-[11px] mt-1 text-gray-500">When recruiters reach out or review your job applications, their chats will appear here.</p>
          </div>

          <button
            v-for="conv in conversations"
            :key="conv.id"
            type="button"
            class="w-full text-left p-3.5 transition-all flex items-start gap-3 hover:bg-white dark:hover:bg-gray-800/60 relative"
            :class="selectedConvId === conv.id ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-l-4 border-indigo-600' : 'bg-transparent'"
            @click="selectConversation(conv.id)"
          >
            <!-- Company / Sender Avatar -->
            <div
              class="relative size-10 shrink-0 rounded-full font-bold text-xs grid place-items-center shadow-2xs text-white"
              :class="conv.isSupportChat || conv.employerId === 'admin-support'
                ? 'bg-gradient-to-tr from-red-600 to-rose-700 ring-2 ring-red-400/30'
                : 'bg-gradient-to-tr from-indigo-600 to-purple-600'"
            >
              <UIcon v-if="conv.isSupportChat || conv.employerId === 'admin-support'" name="i-lucide-shield-check" class="size-5" />
              <span v-else>{{ conv.companyName ? conv.companyName.charAt(0).toUpperCase() : 'H' }}</span>

              <span
                v-if="conv.unreadCandidateCount > 0"
                class="absolute -top-1 -right-1 grid size-4.5 place-items-center rounded-full bg-emerald-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-gray-900"
              >
                {{ conv.unreadCandidateCount }}
              </span>
            </div>

            <!-- Thread Details -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-1 mb-0.5">
                <div class="flex items-center gap-1.5 min-w-0">
                  <h4 class="font-bold text-xs text-gray-950 dark:text-white truncate">
                    {{ conv.companyName || conv.employerName }}
                  </h4>
                  <UBadge
                    v-if="conv.isSupportChat || conv.employerId === 'admin-support'"
                    color="error"
                    variant="subtle"
                    size="xs"
                    label="Official"
                    class="shrink-0 text-[9px] py-0 px-1"
                  />
                  <UBadge
                    v-else-if="conv.requestStatus === 'pending'"
                    color="warning"
                    variant="subtle"
                    size="xs"
                    label="Request"
                    class="shrink-0 text-[9px] py-0 px-1"
                  />
                </div>
                <span class="text-[10px] text-gray-400 shrink-0 font-medium">
                  {{ formatListTime(conv.lastMessageAt) }}
                </span>
              </div>

              <p v-if="conv.jobTitle" class="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 truncate mb-1">
                {{ conv.jobTitle }}
              </p>

              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ conv.lastMessageText }}
              </p>
            </div>
          </button>
        </div>
      </div>

      <!-- ── Right Column: Active Chat Thread ──────────────────────────────── -->
      <div
        v-if="activeConversation"
        class="md:col-span-8 lg:col-span-8 flex flex-col h-full min-h-0 bg-white dark:bg-gray-900"
        :class="!mobileShowChat ? 'hidden md:flex' : 'flex'"
      >
        <!-- Thread Top Header (Fixed at top) -->
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

            <div
              class="grid size-10 place-items-center rounded-full text-white font-bold text-xs shrink-0 shadow-xs"
              :class="activeConversation.isSupportChat || activeConversation.employerId === 'admin-support'
                ? 'bg-gradient-to-tr from-red-600 to-rose-700'
                : 'bg-gradient-to-tr from-indigo-600 to-purple-600'"
            >
              <UIcon v-if="activeConversation.isSupportChat || activeConversation.employerId === 'admin-support'" name="i-lucide-shield-check" class="size-5" />
              <span v-else>{{ activeConversation.companyName ? activeConversation.companyName.charAt(0).toUpperCase() : 'H' }}</span>
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm text-gray-950 dark:text-white truncate">
                  {{ activeConversation.companyName }}
                </h3>
                <UBadge
                  v-if="activeConversation.isSupportChat || activeConversation.employerId === 'admin-support'"
                  color="error"
                  variant="subtle"
                  size="xs"
                  label="Official Support"
                />
                <span v-else class="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span class="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Line
                </span>
              </div>
              <p class="text-xs text-gray-500 truncate">
                <span v-if="activeConversation.isSupportChat">Platform Administration &amp; Career Hotline</span>
                <span v-else>
                  Recruiter: <strong class="font-medium text-gray-700 dark:text-gray-300">{{ activeConversation.employerName }}</strong>
                  <span v-if="activeConversation.jobTitle"> · Role: {{ activeConversation.jobTitle }}</span>
                </span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <UButton
              v-if="activeConversation.jobId"
              :to="`/jobs/${activeConversation.jobId}`"
              size="xs"
              variant="outline"
              color="neutral"
              icon="i-lucide-external-link"
              label="Job Details"
            />
            <UButton
              to="/candidate/interviews"
              size="xs"
              color="primary"
              variant="soft"
              icon="i-lucide-calendar"
              label="Interviews"
            />
          </div>
        </div>

        <!-- ── PRIVACY SHIELD & MESSAGE REQUEST BANNER ─────────────────────── -->
        <div
          v-if="activeConversation.requestStatus === 'pending'"
          class="p-3.5 bg-gradient-to-r from-amber-50 to-indigo-50 border-b border-amber-200/80 dark:from-amber-950/40 dark:to-indigo-950/40 dark:border-amber-800/40 shrink-0"
        >
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-start gap-2.5">
              <div class="grid size-8 place-items-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 shrink-0 mt-0.5">
                <UIcon name="i-lucide-shield-alert" class="size-4.5" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-gray-950 dark:text-white flex items-center gap-1.5">
                  <span>Message Request · Privacy Shield Active</span>
                  <UBadge color="warning" variant="subtle" size="xs" label="Action Required" />
                </h4>
                <p class="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 leading-snug">
                  {{ activeConversation.companyName }} sent you a message. Your personal phone and email remain protected and masked until you accept.
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0 sm:self-center">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95 cursor-pointer"
                @click="handleAcceptRequest"
              >
                <UIcon name="i-lucide-check-circle" class="size-3.5" />
                <span>Accept &amp; Unlock Chat</span>
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 transition active:scale-95 cursor-pointer"
                @click="handleDeclineRequest"
              >
                <UIcon name="i-lucide-x-circle" class="size-3.5" />
                <span>Decline</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Chat Messages Area (Main Scroll Container) -->
        <div
          ref="chatContainerRef"
          class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-gray-50/40 dark:bg-gray-950/20 scroll-smooth"
        >
          <!-- Notice Header -->
          <div class="text-center my-1">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1 text-[11px] text-gray-500 font-medium shadow-2xs">
              <UIcon name="i-lucide-lock" class="size-3 text-indigo-500" />
              <span>Direct encrypted hiring channel · HireReady Privacy Verified</span>
            </span>
          </div>

          <!-- Message Bubbles -->
          <template v-for="msg in messages" :key="msg.id">
            <!-- System Notice message -->
            <div v-if="msg.isSystemNotice" class="text-center my-2">
              <span class="inline-block rounded-full bg-indigo-50 border border-indigo-200/80 px-3.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 shadow-2xs">
                {{ msg.text }}
              </span>
            </div>

            <!-- Standard Chat Bubble -->
            <div
              v-else
              class="flex flex-col"
              :class="msg.senderRole === 'candidate' ? 'items-end' : 'items-start'"
            >
              <div class="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                <!-- Sender Avatar -->
                <div
                  v-if="msg.senderRole !== 'candidate'"
                  class="grid size-7 place-items-center rounded-full text-[10px] font-bold shrink-0 text-white"
                  :class="msg.senderRole === 'admin'
                    ? 'bg-red-600'
                    : 'bg-indigo-600'"
                >
                  <UIcon v-if="msg.senderRole === 'admin'" name="i-lucide-shield-check" class="size-3.5" />
                  <span v-else>{{ activeConversation.companyName.charAt(0) }}</span>
                </div>

                <!-- Bubble Box -->
                <div
                  class="rounded-2xl p-3 shadow-2xs"
                  :class="msg.senderRole === 'candidate'
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : msg.senderRole === 'admin'
                      ? 'bg-red-50 text-gray-900 border border-red-200 dark:bg-red-950/40 dark:text-white dark:border-red-900/60 rounded-bl-xs'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-xs'"
                >
                  <!-- Sender label if not candidate -->
                  <div v-if="msg.senderRole !== 'candidate'" class="flex items-center gap-1.5 mb-1">
                    <p
                      class="text-[10px] font-bold"
                      :class="msg.senderRole === 'admin' ? 'text-red-700 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'"
                    >
                      {{ msg.senderName }}
                    </p>
                    <UBadge
                      v-if="msg.senderRole === 'admin'"
                      color="error"
                      variant="subtle"
                      size="xs"
                      label="Admin"
                      class="text-[9px] py-0 px-1"
                    />
                  </div>

                  <p class="text-xs leading-relaxed whitespace-pre-wrap">{{ msg.text }}</p>

                  <!-- Action button inside message if provided -->
                  <div v-if="msg.quickAction" class="mt-2.5 pt-2 border-t border-indigo-100/30 dark:border-gray-700">
                    <UButton
                      :to="msg.quickAction.url || '/candidate/interviews'"
                      size="xs"
                      color="primary"
                      variant="solid"
                      :label="msg.quickAction.title"
                      icon="i-lucide-arrow-right"
                      block
                    />
                  </div>

                  <div
                    class="mt-1 text-[10px] text-right font-medium"
                    :class="msg.senderRole === 'candidate' ? 'text-indigo-200' : 'text-gray-400'"
                  >
                    {{ formatMessageTime(msg.createdAt) }}
                    <span v-if="msg.senderRole === 'candidate'"> · ✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>


        <!-- ── Message Input Bar OR Pending / Declined Status Box ──────────── -->
        <div
          v-if="activeConversation.requestStatus === 'pending'"
          class="p-3.5 border-t border-gray-200 dark:border-gray-800 bg-amber-50/50 dark:bg-amber-950/20 text-center shrink-0"
        >
          <p class="text-xs text-amber-900 dark:text-amber-200 font-medium">
            🔒 Click <strong class="underline cursor-pointer" @click="handleAcceptRequest">Accept &amp; Unlock Chat</strong> above to reply to {{ activeConversation.companyName }}.
          </p>
        </div>

        <div
          v-else-if="activeConversation.requestStatus === 'declined'"
          class="p-3.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 text-center shrink-0"
        >
          <p class="text-xs text-gray-500">
            ✕ This message request was declined. You can still read past messages.
          </p>
        </div>

        <!-- Message Input Bar (Fixed at bottom) -->
        <div
          v-else
          class="p-3.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-2 shrink-0"
        >
          <input
            v-model="newMessageText"
            type="text"
            placeholder="Type a message to the hiring team... (Press Enter to send)"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 shadow-2xs placeholder-gray-400 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            @keydown.enter.prevent="handleSendMessage()"
          />
          <UButton
            color="primary"
            icon="i-lucide-send"
            size="sm"
            label="Send"
            :disabled="!newMessageText.trim()"
            @click="handleSendMessage()"
          />
        </div>
      </div>

      <!-- Empty state if no conversation selected -->
      <div v-else class="md:col-span-8 flex flex-col items-center justify-center p-12 text-center text-gray-400">
        <UIcon name="i-lucide-messages-square" class="size-16 opacity-30 mb-3" />
        <h3 class="font-bold text-base text-gray-700 dark:text-gray-300">Select a conversation</h3>
        <p class="text-xs text-gray-500 max-w-sm mt-1">Choose an employer thread from the left to start or continue your discussion.</p>
      </div>

    </div>
  </div>
</template>
