<script setup lang="ts">
import type { Conversation, ChatMessage } from '~/types/portal'

definePageMeta({ layout: 'candidate' })

const store = useDataStore()
const { currentUser } = useAuth()
const route = useRoute()

// ── Reactive Data ─────────────────────────────────────────────────────────────
const searchQuery = ref('')
const selectedConvId = ref<string>('')
const newMessageText = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)

const conversations = computed(() => {
  if (!currentUser.value) return []
  const all = store.getConversationsForUser(currentUser.value.id, 'candidate')
  if (!searchQuery.value.trim()) return all
  const q = searchQuery.value.toLowerCase().trim()
  return all.filter(c =>
    (c.companyName && c.companyName.toLowerCase().includes(q)) ||
    (c.employerName && c.employerName.toLowerCase().includes(q)) ||
    (c.jobTitle && c.jobTitle.toLowerCase().includes(q)) ||
    (c.lastMessageText && c.lastMessageText.toLowerCase().includes(q))
  )
})

// Auto-select query param or first conversation
watch([conversations, () => route.query.conversationId], ([list, queryId]) => {
  if (queryId && typeof queryId === 'string' && list.some(c => c.id === queryId)) {
    selectedConvId.value = queryId
  } else if (!selectedConvId.value && list.length > 0) {
    selectedConvId.value = list[0]?.id || ''
  }
}, { immediate: true })

const activeConversation = computed<Conversation | undefined>(() => {
  return conversations.value.find(c => c.id === selectedConvId.value)
})

const messages = computed<ChatMessage[]>(() => {
  if (!selectedConvId.value) return []
  return store.getChatMessages(selectedConvId.value)
})

// Mark read when selecting conversation
watch(selectedConvId, (newId) => {
  if (newId) {
    store.markConversationRead(newId, 'candidate')
    scrollToBottom()
  }
}, { immediate: true })

function scrollToBottom() {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
}

function handleSendMessage(presetText?: string) {
  const text = presetText || newMessageText.value.trim()
  if (!text || !activeConversation.value || !currentUser.value) return

  store.sendMessage({
    conversationId: activeConversation.value.id,
    senderId: currentUser.value.id,
    senderName: currentUser.value.name || 'Candidate',
    senderRole: 'candidate',
    text
  })

  newMessageText.value = ''
  scrollToBottom()

  // Simulate realistic employer acknowledgement after 3.5s if it was an interview availability confirmation
  if (text.toLowerCase().includes('available') || text.toLowerCase().includes('tomorrow') || text.toLowerCase().includes('yes')) {
    setTimeout(() => {
      if (activeConversation.value) {
        store.sendMessage({
          conversationId: activeConversation.value.id,
          senderId: activeConversation.value.employerId,
          senderName: activeConversation.value.employerName || 'Hiring Lead',
          senderRole: 'employer',
          text: 'Great! Our recruiter has reserved that slot for you. A calendar invite with the meeting link is attached to your dashboard.'
        })
        scrollToBottom()
      }
    }, 3500)
  }
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
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-black text-gray-950 dark:text-white">Messages &amp; Recruiter Chat</h1>
          <UBadge color="primary" variant="subtle" size="xs" label="Real-Time" />
        </div>
        <p class="mt-1 text-sm text-gray-500">
          Direct communication channel with hiring managers and corporate talent teams.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          to="/candidate/interviews"
          size="xs"
          variant="outline"
          color="neutral"
          icon="i-lucide-calendar"
          label="View Scheduled Calls"
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

    <!-- Main Chat Container (2 Columns) -->
    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 grid grid-cols-1 md:grid-cols-12 min-h-[640px] max-h-[80vh]">
      
      <!-- ── Left Sidebar: Conversations List ──────────────────────────────── -->
      <div class="md:col-span-4 lg:col-span-4 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-900/50">
        <!-- Search Bar -->
        <div class="p-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
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

        <!-- Conversations List -->
        <div class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
          <div
            v-if="conversations.length === 0"
            class="p-8 text-center text-gray-400 text-xs"
          >
            <UIcon name="i-lucide-message-square-off" class="mx-auto size-8 mb-2 opacity-50" />
            <p class="font-medium text-gray-700 dark:text-gray-300">No active conversations</p>
            <p class="text-[11px] mt-1 text-gray-500">When recruiters review your job applications, their direct chats will appear here.</p>
          </div>

          <button
            v-for="conv in conversations"
            :key="conv.id"
            type="button"
            class="w-full text-left p-3.5 transition-all flex items-start gap-3 hover:bg-white dark:hover:bg-gray-800/60 relative"
            :class="selectedConvId === conv.id ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-indigo-600' : 'bg-transparent'"
            @click="selectedConvId = conv.id"
          >
            <!-- Company / Recruiter Avatar -->
            <div class="relative size-10 shrink-0 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs grid place-items-center shadow-2xs">
              {{ conv.companyName ? conv.companyName.charAt(0).toUpperCase() : 'H' }}
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
                <h4 class="font-bold text-xs text-gray-950 dark:text-white truncate">
                  {{ conv.companyName || conv.employerName }}
                </h4>
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
      <div v-if="activeConversation" class="md:col-span-8 lg:col-span-8 flex flex-col h-full bg-white dark:bg-gray-900">
        <!-- Thread Top Header -->
        <div class="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
          <div class="flex items-center gap-3 min-w-0">
            <div class="grid size-10 place-items-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs shrink-0 shadow-xs">
              {{ activeConversation.companyName ? activeConversation.companyName.charAt(0).toUpperCase() : 'H' }}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm text-gray-950 dark:text-white truncate">
                  {{ activeConversation.companyName }}
                </h3>
                <span class="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span class="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                </span>
              </div>
              <p class="text-xs text-gray-500 truncate">
                Recruiter: <span class="font-medium text-gray-700 dark:text-gray-300">{{ activeConversation.employerName }}</span>
                <span v-if="activeConversation.jobTitle"> · Role: {{ activeConversation.jobTitle }}</span>
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

        <!-- Chat Messages Area -->
        <div
          ref="chatContainerRef"
          class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/40 dark:bg-gray-950/20"
        >
          <!-- Notice Header -->
          <div class="text-center my-2">
            <span class="inline-block rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-[11px] text-gray-500 font-medium">
              🔒 End-to-end encrypted direct hiring channel with {{ activeConversation.companyName }}
            </span>
          </div>

          <!-- Message Bubbles -->
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="flex flex-col"
            :class="msg.senderRole === 'candidate' ? 'items-end' : 'items-start'"
          >
            <div class="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
              <!-- Employer Avatar -->
              <div
                v-if="msg.senderRole !== 'candidate'"
                class="grid size-7 place-items-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold shrink-0"
              >
                {{ activeConversation.companyName.charAt(0) }}
              </div>

              <!-- Bubble Box -->
              <div
                class="rounded-2xl p-3 shadow-2xs"
                :class="msg.senderRole === 'candidate'
                  ? 'bg-indigo-600 text-white rounded-br-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-xs'"
              >
                <!-- Sender label if not candidate -->
                <p v-if="msg.senderRole !== 'candidate'" class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                  {{ msg.senderName }}
                </p>

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
        </div>

        <!-- Quick Replies Carousel / Chips -->
        <div class="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 flex items-center gap-1.5 overflow-x-auto text-nowrap">
          <span class="text-[10px] font-bold text-gray-400 uppercase shrink-0">Quick reply:</span>
          <button
            v-for="reply in quickReplies"
            :key="reply"
            type="button"
            class="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-white shrink-0"
            @click="handleSendMessage(reply)"
          >
            {{ reply }}
          </button>
        </div>

        <!-- Message Input Bar -->
        <div class="p-3.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-2">
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
