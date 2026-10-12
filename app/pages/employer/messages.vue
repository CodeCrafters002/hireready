<script setup lang="ts">
import type { Conversation, ChatMessage } from '~/types/portal'

definePageMeta({ layout: 'employer' })

const store = useDataStore()
const { currentUser, hydrate } = useAuth()
const route = useRoute()

onMounted(() => {
  hydrate()
  scrollToBottom(true)
})

// ── Active Employer ID (Hydration-safe) ────────────────────────────────────────
const activeEmployerId = computed(() => {
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
  return 'emp-demo'
})

// ── Reactive Data ─────────────────────────────────────────────────────────────
const searchQuery = ref('')
const selectedConvId = ref<string>((route.query.conversationId as string) || '')
const newMessageText = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)
const mobileShowChat = ref(false)

const conversations = computed(() => {
  void store.chatVersion.value
  let all = store.getConversationsForUser(activeEmployerId.value, 'employer')

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
    (c.candidateName && c.candidateName.toLowerCase().includes(q)) ||
    (c.candidateEmail && c.candidateEmail.toLowerCase().includes(q)) ||
    (c.jobTitle && c.jobTitle.toLowerCase().includes(q)) ||
    (c.lastMessageText && c.lastMessageText.toLowerCase().includes(q))
  )
})

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

const candidateProfile = computed(() => {
  if (!activeConversation.value) return null
  return store.getProfileByUserId(activeConversation.value.candidateId)
})

watch(selectedConvId, (newId) => {
  if (newId) {
    store.markConversationRead(newId, 'employer')
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

function handleSendMessage(presetText?: string, quickAction?: ChatMessage['quickAction']) {
  const text = presetText || newMessageText.value.trim()
  if (!text || !activeConversation.value) return

  const senderId = currentUser.value?.id || activeEmployerId.value || 'emp-demo'
  const senderName = (currentUser.value as any)?.company || currentUser.value?.name || activeConversation.value.employerName || 'Hiring Lead'
  const convId = activeConversation.value.id

  store.sendMessage({
    conversationId: convId,
    senderId,
    senderName,
    senderRole: 'employer',
    text,
    quickAction
  })

  newMessageText.value = ''
  scrollToBottom()

  // In-app notification for candidate
  store.addNotification({
    userId: activeConversation.value.candidateId,
    type: 'general',
    title: `💬 New message from ${activeConversation.value.companyName || 'Recruiter'}`,
    message: text.slice(0, 120)
  })

  // Simulated candidate reply
  setTimeout(() => {
    const currentConv = store.getConversationById(convId)
    if (!currentConv) return

    let reply = 'Thank you for reaching out! I will review this right away.'
    if (quickAction?.type === 'interview_invite') {
      reply = 'Thank you so much! I am available and looking forward to the screening discussion.'
    } else if (quickAction?.type === 'request_portfolio') {
      reply = 'I have updated my portfolio link and shared my latest projects.'
    }

    store.sendMessage({
      conversationId: convId,
      senderId: currentConv.candidateId,
      senderName: currentConv.candidateName || 'Candidate',
      senderRole: 'candidate',
      text: reply
    })
    scrollToBottom()
  }, 1800)
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

const recruiterTemplates = [
  {
    label: '📅 Invite to 1st Screening',
    text: 'Hi! We reviewed your profile and would love to schedule a 20-minute video screening call. Please choose a slot that works best for you.',
    action: {
      type: 'interview_invite' as const,
      title: '📅 1-Click Select Interview Slot',
      url: '/candidate/interviews'
    }
  },
  {
    label: '💼 Request Portfolio / Code',
    text: 'Hello! Could you please share links to any GitHub repositories, live demo URLs, or portfolio items showcasing your recent work?'
  },
  {
    label: '⏱️ Confirm Notice & Availability',
    text: 'Hi! Could you confirm your official notice period and earliest possible joining date if selected?'
  },
  {
    label: '🎉 Final Round Passed / Offer Prep',
    text: 'Congratulations! Our hiring team was thoroughly impressed with your technical rounds. We are preparing the official offer details.'
  }
]
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl sm:text-2xl font-black text-gray-950 dark:text-white">Candidate Messaging Console</h1>
          <UBadge color="success" variant="subtle" size="xs" label="Direct Recruiter Line" />
          <UBadge color="primary" variant="subtle" size="xs" label="Privacy Protected 🛡️" />
        </div>
        <p class="mt-0.5 text-xs sm:text-sm text-gray-500">
          Reach out, screen talent, and schedule interviews with applicants with built-in candidate privacy controls.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          to="/employer"
          size="xs"
          variant="outline"
          color="neutral"
          icon="i-lucide-arrow-left"
          label="Back to Applicants"
        />
        <UButton
          to="/employer/gigs"
          size="xs"
          variant="soft"
          color="neutral"
          icon="i-lucide-calendar-clock"
          label="1-Day Shifts"
        />
      </div>
    </div>

    <!-- Main Chat Container (Fixed Height with Independent Scroll Areas) -->
    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 grid grid-cols-1 md:grid-cols-12 h-[calc(100dvh-10.5rem)] min-h-[500px] max-h-[860px]">
      
      <!-- ── Left Sidebar: Candidates List ──────────────────────────────── -->
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
              placeholder="Search candidate name or role..."
              class="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <!-- Conversations List (Scrolls independently) -->
        <div class="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
          <div
            v-if="conversations.length === 0"
            class="p-8 text-center text-gray-400 text-xs"
          >
            <UIcon name="i-lucide-users" class="mx-auto size-8 mb-2 opacity-50" />
            <p class="font-medium text-gray-700 dark:text-gray-300">No active candidate chats</p>
            <p class="text-[11px] mt-1 text-gray-500">Click "Message Candidate" on any applicant or matched talent profile to initiate a thread.</p>
          </div>

          <button
            v-for="conv in conversations"
            :key="conv.id"
            type="button"
            class="w-full text-left p-3.5 transition-all flex items-start gap-3 hover:bg-white dark:hover:bg-gray-800/60 relative"
            :class="selectedConvId === conv.id ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-l-4 border-emerald-600' : 'bg-transparent'"
            @click="selectConversation(conv.id)"
          >
            <!-- Candidate Avatar -->
            <div class="relative size-10 shrink-0 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-bold text-xs grid place-items-center shadow-2xs">
              {{ conv.candidateName ? conv.candidateName.charAt(0).toUpperCase() : 'C' }}
              <span
                v-if="conv.unreadEmployerCount > 0"
                class="absolute -top-1 -right-1 grid size-4.5 place-items-center rounded-full bg-indigo-600 text-[10px] font-black text-white ring-2 ring-white dark:ring-gray-900"
              >
                {{ conv.unreadEmployerCount }}
              </span>
            </div>

            <!-- Thread Details -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-1 mb-0.5">
                <div class="flex items-center gap-1.5 min-w-0">
                  <h4 class="font-bold text-xs text-gray-950 dark:text-white truncate">
                    {{ conv.candidateName }}
                  </h4>
                  <UBadge
                    v-if="conv.requestStatus === 'pending'"
                    color="warning"
                    variant="subtle"
                    size="xs"
                    label="Pending Accept"
                    class="shrink-0 text-[9px] py-0 px-1"
                  />
                  <UBadge
                    v-else-if="conv.requestStatus === 'accepted'"
                    color="success"
                    variant="subtle"
                    size="xs"
                    label="Accepted"
                    class="shrink-0 text-[9px] py-0 px-1"
                  />
                </div>
                <span class="text-[10px] text-gray-400 shrink-0 font-medium">
                  {{ formatListTime(conv.lastMessageAt) }}
                </span>
              </div>

              <p v-if="conv.jobTitle" class="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 truncate mb-1">
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

            <div class="grid size-10 place-items-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-bold text-xs shrink-0 shadow-xs">
              {{ activeConversation.candidateName ? activeConversation.candidateName.charAt(0).toUpperCase() : 'C' }}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm text-gray-950 dark:text-white truncate">
                  {{ activeConversation.candidateName }}
                </h3>
                <span v-if="candidateProfile?.isFastTrackPro" class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  ⚡ FastTrack Pro
                </span>
                <span class="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span class="size-1.5 rounded-full bg-emerald-500" /> Online
                </span>
              </div>
              <p class="text-xs text-gray-500 truncate">
                <!-- If pending, mask candidate contact info for privacy protection -->
                <span v-if="activeConversation.requestStatus === 'pending'" class="text-amber-700 dark:text-amber-300 font-medium">
                  🔒 Contact masked until request accepted
                </span>
                <span v-else>{{ activeConversation.candidateEmail }}</span>
                <span v-if="candidateProfile?.city"> · {{ candidateProfile.city }}</span>
                <span v-if="activeConversation.jobTitle"> · Role: <strong>{{ activeConversation.jobTitle }}</strong></span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <UButton
              to="/employer"
              size="xs"
              color="primary"
              variant="solid"
              icon="i-lucide-calendar-plus"
              label="Schedule Call"
            />
          </div>
        </div>

        <!-- ── PRIVACY NOTICE BANNER ──────────────────────────────────────── -->
        <div
          v-if="activeConversation.requestStatus === 'pending'"
          class="p-2.5 bg-amber-50 border-b border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-800/40 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shrink-0"
        >
          <div class="flex items-center gap-2 min-w-0">
            <UIcon name="i-lucide-shield-check" class="size-4 text-amber-600 shrink-0" />
            <span class="truncate">
              <strong>Privacy Shield Active:</strong> Message request sent to candidate. Direct phone and resume contacts unlock upon candidate acceptance.
            </span>
          </div>
          <UBadge color="warning" variant="subtle" size="xs" label="Awaiting Candidate" class="shrink-0" />
        </div>

        <div
          v-else-if="activeConversation.requestStatus === 'accepted'"
          class="p-2 bg-emerald-50/70 border-b border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-800/40 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 shrink-0"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-check-circle" class="size-3.5 text-emerald-600 shrink-0" />
            <span><strong>Verified Mutual Connection:</strong> Candidate accepted your message request. Direct contact and screening unlocked.</span>
          </div>
          <UBadge color="success" variant="subtle" size="xs" label="Verified Active" class="shrink-0" />
        </div>

        <!-- Chat Messages Area (Main Scroll Container) -->
        <div
          ref="chatContainerRef"
          class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-gray-50/40 dark:bg-gray-950/20 scroll-smooth"
        >
          <!-- Notice Header -->
          <div class="text-center my-1">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1 text-[11px] text-gray-500 font-medium shadow-2xs">
              <UIcon name="i-lucide-lock" class="size-3 text-emerald-600" />
              <span>Direct Hiring Channel · HireReady Platform Verified</span>
            </span>
          </div>

          <!-- Message Bubbles -->
          <template v-for="msg in messages" :key="msg.id">
            <!-- System Notice message -->
            <div v-if="msg.isSystemNotice" class="text-center my-2">
              <span class="inline-block rounded-full bg-emerald-50 border border-emerald-200/80 px-3.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 shadow-2xs">
                {{ msg.text }}
              </span>
            </div>

            <!-- Standard Chat Bubble -->
            <div
              v-else
              class="flex flex-col"
              :class="msg.senderRole === 'employer' ? 'items-end' : 'items-start'"
            >
              <div class="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                <!-- Candidate Avatar -->
                <div
                  v-if="msg.senderRole === 'candidate'"
                  class="grid size-7 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold shrink-0"
                >
                  {{ activeConversation.candidateName.charAt(0) }}
                </div>

                <!-- Admin Avatar if admin notice -->
                <div
                  v-else-if="msg.senderRole === 'admin'"
                  class="grid size-7 place-items-center rounded-full bg-red-600 text-white text-[10px] font-bold shrink-0"
                >
                  <UIcon name="i-lucide-shield-check" class="size-3.5" />
                </div>

                <!-- Bubble Box -->
                <div
                  class="rounded-2xl p-3 shadow-2xs"
                  :class="msg.senderRole === 'employer'
                    ? 'bg-emerald-600 text-white rounded-br-xs'
                    : msg.senderRole === 'admin'
                      ? 'bg-red-50 text-gray-900 border border-red-200 dark:bg-red-950/40 dark:text-white dark:border-red-900/60 rounded-bl-xs'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-xs'"
                >
                  <!-- Sender label if candidate or admin -->
                  <p v-if="msg.senderRole !== 'employer'" class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    {{ msg.senderName }}
                  </p>

                  <p class="text-xs leading-relaxed whitespace-pre-wrap">{{ msg.text }}</p>

                  <!-- Attached Action if sent -->
                  <div v-if="msg.quickAction" class="mt-2.5 pt-2 border-t border-white/20">
                    <span class="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white">
                      <UIcon name="i-lucide-check-circle" class="size-3.5" />
                      {{ msg.quickAction.title }}
                    </span>
                  </div>

                  <div
                    class="mt-1 text-[10px] text-right font-medium"
                    :class="msg.senderRole === 'employer' ? 'text-emerald-200' : 'text-gray-400'"
                  >
                    {{ formatMessageTime(msg.createdAt) }}
                    <span v-if="msg.senderRole === 'employer'"> · ✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Recruiter Template Quick Buttons (Fixed above input) -->
        <div class="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 flex items-center gap-1.5 overflow-x-auto text-nowrap shrink-0">
          <span class="text-[10px] font-bold text-gray-400 uppercase shrink-0">Recruiter Quick-Send:</span>
          <button
            v-for="tmpl in recruiterTemplates"
            :key="tmpl.label"
            type="button"
            class="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 transition hover:border-emerald-500 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-white shrink-0"
            @click="handleSendMessage(tmpl.text, tmpl.action)"
          >
            {{ tmpl.label }}
          </button>
        </div>

        <!-- Message Input Bar (Fixed at bottom) -->
        <div class="p-3.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-2 shrink-0">
          <input
            v-model="newMessageText"
            type="text"
            placeholder="Type a message to the candidate... (Press Enter to send)"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 shadow-2xs placeholder-gray-400 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
        <h3 class="font-bold text-base text-gray-700 dark:text-gray-300">Select a candidate conversation</h3>
        <p class="text-xs text-gray-500 max-w-sm mt-1">Choose a candidate thread from the left or initiate a new chat from the applications list.</p>
      </div>

    </div>
  </div>
</template>
