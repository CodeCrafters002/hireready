<script setup lang="ts">
import type { Conversation, ChatMessage } from '~/types/portal'

const props = defineProps<{
  modelValue: boolean
  conversation?: Conversation | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'scheduled', msg: ChatMessage): void
}>()

const store = useDataStore()
const { currentUser } = useAuth()

// Tomorrow as default date
const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
const defaultDate = tomorrow.toISOString().split('T')[0]

const form = reactive({
  roundName: 'Technical Screening Round',
  interviewDate: defaultDate,
  interviewTime: '11:00',
  durationMinutes: 45,
  interviewType: 'video' as 'video' | 'phone' | 'in_person',
  platformName: 'Google Meet',
  meetingLink: '',
  interviewerName: '',
  notes: 'Please keep your webcam on and prepare a 5-minute walkthrough of your key projects.'
})

watch(() => props.conversation, (conv) => {
  if (conv) {
    form.meetingLink = generateMeetLink()
    form.interviewerName = (currentUser.value as any)?.name || conv.employerName || 'Hiring Lead'
  }
}, { immediate: true })

function generateMeetLink(): string {
  const code = () => Math.random().toString(36).substring(2, 6)
  return `https://meet.google.com/hry-${code()}-${code().slice(0, 3)}`
}

const isSubmitting = ref(false)

async function handleSubmit() {
  if (!props.conversation) return
  isSubmitting.value = true

  try {
    const roundTitle = form.roundName.trim() || 'Interview Round'
    const link = form.interviewType === 'video' ? (form.meetingLink || generateMeetLink()) : ''
    
    // Construct rich ChatAction
    const quickAction: ChatMessage['quickAction'] = {
      type: 'interview_invite',
      title: `📅 Respond to ${roundTitle}`,
      roundName: roundTitle,
      interviewDate: form.interviewDate,
      interviewTime: form.interviewTime,
      durationMinutes: Number(form.durationMinutes) || 45,
      interviewType: form.interviewType,
      meetingLink: link,
      interviewerName: form.interviewerName || (currentUser.value?.name || 'Hiring Team'),
      notes: form.notes,
      status: 'pending'
    }

    const senderId = currentUser.value?.id || props.conversation.employerId || 'emp-demo'
    const senderName = (currentUser.value as any)?.company || currentUser.value?.name || props.conversation.employerName || 'Hiring Manager'

    const inviteText = `📅 Interview Invitation: ${roundTitle}\nDate: ${form.interviewDate} at ${form.interviewTime} (${form.durationMinutes} mins)\nPlatform: ${form.interviewType === 'video' ? 'Google Meet Video' : form.interviewType === 'phone' ? 'Phone Screening' : 'In-Person'}\n\nPlease click "Accept Interview" below to confirm your slot.`

    const msg = store.sendMessage({
      conversationId: props.conversation.id,
      senderId,
      senderName,
      senderRole: currentUser.value?.role === 'admin' ? 'admin' : 'employer',
      text: inviteText,
      quickAction
    })

    // Also update any matching candidate application status
    if (props.conversation.jobId) {
      const apps = store.getApplications()
      const app = apps.find(a => a.jobId === props.conversation?.jobId && (a.candidateId === props.conversation?.candidateId || a.candidateName === props.conversation?.candidateName))
      if (app) {
        store.updateApplication(app.id, {
          status: 'interview_scheduled',
          interviewSlot: `${form.interviewDate} ${form.interviewTime}`,
          interviewDetails: {
            roundName: roundTitle,
            platform: 'google_meet',
            meetingLink: link,
            scheduledAt: `${form.interviewDate}T${form.interviewTime}`,
            durationMinutes: Number(form.durationMinutes) || 45,
            interviewerName: form.interviewerName || senderName,
            notes: form.notes,
            status: 'scheduled'
          }
        })
      }
    }

    // Candidate in-app notification
    store.addNotification({
      userId: props.conversation.candidateId,
      type: 'interview',
      title: `📅 Interview Invitation: ${props.conversation.companyName || 'Hiring Team'}`,
      message: `You've been invited to ${roundTitle} on ${form.interviewDate} at ${form.interviewTime}. Check messages to confirm.`
    })

    emit('scheduled', msg)
    emit('update:modelValue', false)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    @click.self="emit('update:modelValue', false)"
  >
    <div class="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 dark:border-gray-800 dark:bg-gray-900 animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
        <div class="flex items-center gap-2.5">
          <div class="grid size-9 place-items-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
            <UIcon name="i-lucide-calendar-plus" class="size-5" />
          </div>
          <div>
            <h3 class="font-bold text-sm text-gray-950 dark:text-white">Schedule &amp; Send Interview Invite</h3>
            <p class="text-xs text-gray-500">Interactive invite card will be dropped directly into chat</p>
          </div>
        </div>
        <button
          type="button"
          class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="emit('update:modelValue', false)"
        >
          <UIcon name="i-lucide-x" class="size-5" />
        </button>
      </div>

      <!-- Candidate Target Banner -->
      <div v-if="conversation" class="bg-indigo-50/70 dark:bg-indigo-950/30 px-6 py-2.5 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <span class="text-indigo-600 dark:text-indigo-400 font-semibold">Inviting:</span>
          <span class="font-bold text-gray-900 dark:text-white">{{ conversation.candidateName }}</span>
          <span v-if="conversation.jobTitle" class="text-gray-500">for {{ conversation.jobTitle }}</span>
        </div>
        <UBadge color="primary" variant="subtle" size="xs" label="In-Chat Card" />
      </div>

      <!-- Modal Body -->
      <form class="p-6 space-y-4 max-h-[75vh] overflow-y-auto" @submit.prevent="handleSubmit">
        <!-- Round Title -->
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Interview Round Title</label>
          <input
            v-model="form.roundName"
            type="text"
            required
            placeholder="e.g. Technical Round 1, Culture Fit, Executive Final"
            class="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-indigo-500 focus:outline-hidden"
          />
        </div>

        <!-- Date & Time Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-1">
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input
              v-model="form.interviewDate"
              type="date"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Time</label>
            <input
              v-model="form.interviewTime"
              type="time"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Duration</label>
            <select
              v-model="form.durationMinutes"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-indigo-500 focus:outline-hidden"
            >
              <option :value="30">30 Minutes</option>
              <option :value="45">45 Minutes</option>
              <option :value="60">60 Minutes</option>
              <option :value="90">90 Minutes</option>
            </select>
          </div>
        </div>

        <!-- Format Selector -->
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Interview Format</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class="flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition"
              :class="form.interviewType === 'video' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'"
              @click="form.interviewType = 'video'"
            >
              <UIcon name="i-lucide-video" class="size-4" />
              <span>Video Meet</span>
            </button>
            <button
              type="button"
              class="flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition"
              :class="form.interviewType === 'phone' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'"
              @click="form.interviewType = 'phone'"
            >
              <UIcon name="i-lucide-phone" class="size-4" />
              <span>Phone Call</span>
            </button>
            <button
              type="button"
              class="flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition"
              :class="form.interviewType === 'in_person' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'"
              @click="form.interviewType = 'in_person'"
            >
              <UIcon name="i-lucide-map-pin" class="size-4" />
              <span>In Person</span>
            </button>
          </div>
        </div>

        <!-- Meeting Link if Video -->
        <div v-if="form.interviewType === 'video'">
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-semibold text-gray-700 dark:text-gray-300">Video Meeting Link</label>
            <button
              type="button"
              class="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
              @click="form.meetingLink = generateMeetLink()"
            >
              <UIcon name="i-lucide-refresh-cw" class="size-3" />
              <span>Generate Google Meet</span>
            </button>
          </div>
          <div class="relative">
            <input
              v-model="form.meetingLink"
              type="url"
              required
              placeholder="https://meet.google.com/..."
              class="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        <!-- Interviewer & Notes -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Interviewer Name / Host</label>
            <input
              v-model="form.interviewerName"
              type="text"
              placeholder="e.g. Alex Johnson (Lead Architect)"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Instructions / Note</label>
            <input
              v-model="form.notes"
              type="text"
              placeholder="e.g. Keep resume & camera ready"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        <!-- Submit Button -->
        <div class="pt-2 flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            label="Cancel"
            @click="emit('update:modelValue', false)"
          />
          <UButton
            type="submit"
            color="primary"
            size="sm"
            icon="i-lucide-send"
            :loading="isSubmitting"
            label="Send Interview Invite into Chat"
          />
        </div>
      </form>
    </div>
  </div>
</template>
