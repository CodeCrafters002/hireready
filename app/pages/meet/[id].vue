<script setup lang="ts">
import type { Application } from '~/types/portal'

const route = useRoute()
const router = useRouter()
const store = useDataStore()
const { currentUser } = useAuth()

const meetingId = computed(() => String(route.params.id))
const application = computed<Application | undefined>(() => {
  return store.getApplicationById(meetingId.value)
})
const job = computed(() => {
  return application.value ? store.getJobById(application.value.jobId) : undefined
})

// ── WebRTC & Media Device State ──────────────────────────────────────────────
const isCameraOn = ref(true)
const isMicOn = ref(true)
const isScreenSharing = ref(false)
const isInCall = ref(false)
const callDuration = ref(0)
let timerInterval: any = null

const videoStream = ref<MediaStream | null>(null)
const previewVideo = ref<HTMLVideoElement | null>(null)
const callVideo = ref<HTMLVideoElement | null>(null)

// Interview Notes State
const interviewerNotes = ref(application.value?.interviewFeedback || '')
const showNotesDrawer = ref(true)
const notesSavedToast = ref(false)

async function startMedia() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    videoStream.value = stream
    if (previewVideo.value) {
      previewVideo.value.srcObject = stream
    }
  } catch (err) {
    console.warn('[VideoRoom] Camera/Mic permission denied or not available:', err)
    isCameraOn.value = false
  }
}

function toggleCamera() {
  isCameraOn.value = !isCameraOn.value
  if (videoStream.value) {
    videoStream.value.getVideoTracks().forEach(track => {
      track.enabled = isCameraOn.value
    })
  }
}

function toggleMic() {
  isMicOn.value = !isMicOn.value
  if (videoStream.value) {
    videoStream.value.getAudioTracks().forEach(track => {
      track.enabled = isMicOn.value
    })
  }
}

async function toggleScreenShare() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) return
  if (!isScreenSharing.value) {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      isScreenSharing.value = true
      if (callVideo.value) {
        callVideo.value.srcObject = screenStream
      }
      screenStream.getVideoTracks()[0].onended = () => {
        isScreenSharing.value = false
        if (callVideo.value && videoStream.value) {
          callVideo.value.srcObject = videoStream.value
        }
      }
    } catch {
      isScreenSharing.value = false
    }
  } else {
    isScreenSharing.value = false
    if (callVideo.value && videoStream.value) {
      callVideo.value.srcObject = videoStream.value
    }
  }
}

function joinRoom() {
  isInCall.value = true
  nextTick(() => {
    if (callVideo.value && videoStream.value) {
      callVideo.value.srcObject = videoStream.value
    }
  })
  timerInterval = setInterval(() => {
    callDuration.value++
  }, 1000)
}

function endCall() {
  if (timerInterval) clearInterval(timerInterval)
  if (videoStream.value) {
    videoStream.value.getTracks().forEach(track => track.stop())
  }
  // Save notes if any
  if (application.value && interviewerNotes.value) {
    store.updateApplication(application.value.id, {
      interviewFeedback: interviewerNotes.value
    })
  }

  if (currentUser.value?.role === 'employer') {
    router.push('/employer')
  } else {
    router.push('/candidate/interviews')
  }
}

function saveNotes() {
  if (application.value && interviewerNotes.value) {
    store.updateApplication(application.value.id, {
      interviewFeedback: interviewerNotes.value
    })
    notesSavedToast.value = true
    setTimeout(() => { notesSavedToast.value = false }, 3000)
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

onMounted(() => {
  startMedia()
})

onBeforeUnmount(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (videoStream.value) {
    videoStream.value.getTracks().forEach(track => track.stop())
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
    <!-- Top Header Bar -->
    <header class="border-b border-gray-800 bg-gray-900/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between z-10 shrink-0">
      <div class="flex items-center gap-3">
        <NuxtLink to="/" class="flex items-center gap-2">
          <div class="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm">
            HR
          </div>
          <span class="font-bold text-sm tracking-tight text-white hidden sm:inline">HireReady Call</span>
        </NuxtLink>
        <span class="text-gray-600">|</span>
        <div class="flex items-center gap-2">
          <span class="font-semibold text-xs text-indigo-400">
            {{ application?.interviewDetails?.roundName || 'Technical Interview Session' }}
          </span>
          <span class="text-xs text-gray-500 hidden md:inline">
            • {{ job?.company || 'Hiring Partner' }} ({{ job?.title || 'Open Role' }})
          </span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div v-if="isInCall" class="flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs font-mono font-bold text-red-400 border border-red-500/30">
          <span class="size-2 rounded-full bg-red-500 animate-pulse"></span>
          {{ formatDuration(callDuration) }}
        </div>
        <UButton
          v-if="!isInCall"
          to="/candidate/interviews"
          size="xs"
          variant="ghost"
          color="neutral"
          label="Leave Lobby"
          icon="i-lucide-arrow-left"
        />
        <UButton
          v-else
          size="xs"
          color="error"
          variant="solid"
          label="End Meeting"
          icon="i-lucide-phone-off"
          @click="endCall"
        />
      </div>
    </header>

    <!-- ════════════════════════════════════════════════════════════════════════
         MODE 1: PRE-FLIGHT LOBBY
         ════════════════════════════════════════════════════════════════════════ -->
    <main v-if="!isInCall" class="flex-1 flex items-center justify-center p-6">
      <div class="max-w-2xl w-full space-y-6">
        <div class="text-center space-y-1">
          <h1 class="text-2xl font-bold tracking-tight">Ready to join your interview?</h1>
          <p class="text-xs text-gray-400">Check your camera, microphone, and audio before entering the room.</p>
        </div>

        <!-- Video Camera Preview Frame -->
        <div class="relative aspect-video rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 shadow-2xl flex items-center justify-center">
          <video
            ref="previewVideo"
            autoplay
            playsinline
            muted
            class="size-full object-cover"
            :class="{ hidden: !isCameraOn }"
          />

          <!-- Fallback when camera is disabled -->
          <div v-if="!isCameraOn" class="flex flex-col items-center justify-center text-gray-500 space-y-2">
            <div class="grid size-16 place-items-center rounded-full bg-gray-800 text-gray-400">
              <UIcon name="i-lucide-video-off" class="size-8" />
            </div>
            <p class="text-xs">Camera is switched off</p>
          </div>

          <!-- Bottom Media Controls Bar -->
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-gray-700">
            <button
              type="button"
              class="grid size-10 place-items-center rounded-full transition-colors"
              :class="isCameraOn ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-600 text-white'"
              :title="isCameraOn ? 'Turn camera off' : 'Turn camera on'"
              @click="toggleCamera"
            >
              <UIcon :name="isCameraOn ? 'i-lucide-video' : 'i-lucide-video-off'" class="size-5" />
            </button>

            <button
              type="button"
              class="grid size-10 place-items-center rounded-full transition-colors"
              :class="isMicOn ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-600 text-white'"
              :title="isMicOn ? 'Mute microphone' : 'Unmute microphone'"
              @click="toggleMic"
            >
              <UIcon :name="isMicOn ? 'i-lucide-mic' : 'i-lucide-mic-off'" class="size-5" />
            </button>
          </div>

          <!-- Participant Label -->
          <div class="absolute top-4 left-4 bg-gray-950/70 backdrop-blur-xs px-3 py-1 rounded-lg text-xs font-semibold text-gray-200">
            {{ currentUser?.name || 'Candidate' }}
          </div>
        </div>

        <!-- Pre-call Checklist & Enter Button -->
        <div class="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <UIcon name="i-lucide-shield-check" class="size-4" />
              <span>Encrypted High-Definition Video Room</span>
            </div>
            <p class="text-xs text-gray-400">
              Session: {{ application?.interviewDetails?.roundName || 'Technical Assessment' }} with {{ application?.interviewDetails?.interviewerName || 'Hiring Lead' }}
            </p>
          </div>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all cursor-pointer"
            @click="joinRoom"
          >
            <UIcon name="i-lucide-sparkles" class="size-4" />
            Enter Interview Room
          </button>
        </div>
      </div>
    </main>

    <!-- ════════════════════════════════════════════════════════════════════════
         MODE 2: ACTIVE VIDEO CALL ROOM
         ════════════════════════════════════════════════════════════════════════ -->
    <main v-else class="flex-1 flex overflow-hidden">
      <!-- Left: Video Grid -->
      <div class="flex-1 flex flex-col p-4 space-y-4">
        <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Main Candidate Stream -->
          <div class="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 shadow-md flex items-center justify-center">
            <video
              ref="callVideo"
              autoplay
              playsinline
              muted
              class="size-full object-cover"
              :class="{ hidden: !isCameraOn && !isScreenSharing }"
            />
            <div v-if="!isCameraOn && !isScreenSharing" class="flex flex-col items-center justify-center text-gray-500 space-y-2">
              <div class="grid size-16 place-items-center rounded-full bg-gray-800 text-gray-400">
                <UIcon name="i-lucide-user" class="size-8" />
              </div>
              <p class="text-xs font-semibold">{{ currentUser?.name || 'Candidate' }} (Camera Off)</p>
            </div>
            <div class="absolute bottom-3 left-3 bg-gray-950/80 backdrop-blur-xs px-2.5 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-1.5">
              <span>{{ currentUser?.name || 'You' }}</span>
              <UIcon v-if="!isMicOn" name="i-lucide-mic-off" class="size-3.5 text-red-400" />
            </div>
          </div>

          <!-- Interviewer / Hiring Partner Stream -->
          <div class="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-indigo-950/40 to-gray-900 border border-indigo-900/50 shadow-md flex items-center justify-center">
            <div class="flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div class="relative">
                <div class="grid size-20 place-items-center rounded-2xl bg-indigo-600 text-white font-bold text-2xl shadow-lg">
                  {{ (application?.interviewDetails?.interviewerName || 'H').charAt(0).toUpperCase() }}
                </div>
                <span class="absolute -bottom-1 -right-1 size-4 rounded-full bg-emerald-500 border-2 border-gray-900"></span>
              </div>
              <div>
                <h4 class="font-bold text-sm text-white">
                  {{ application?.interviewDetails?.interviewerName || 'Hiring Lead' }}
                </h4>
                <p class="text-xs text-indigo-300">{{ job?.company || 'Employer' }}</p>
                <div class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-medium text-indigo-300">
                  <span class="size-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                  Active on Call
                </div>
              </div>
            </div>
            <div class="absolute bottom-3 left-3 bg-gray-950/80 backdrop-blur-xs px-2.5 py-1 rounded-md text-xs font-semibold text-white">
              {{ application?.interviewDetails?.interviewerName || 'Interviewer' }}
            </div>
          </div>
        </div>

        <!-- Call Toolbar -->
        <div class="flex items-center justify-center gap-3 bg-gray-900/90 border border-gray-800 rounded-2xl p-3 shrink-0">
          <button
            type="button"
            class="grid size-11 place-items-center rounded-xl transition-all cursor-pointer"
            :class="isMicOn ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-600 text-white'"
            :title="isMicOn ? 'Mute Mic' : 'Unmute Mic'"
            @click="toggleMic"
          >
            <UIcon :name="isMicOn ? 'i-lucide-mic' : 'i-lucide-mic-off'" class="size-5" />
          </button>

          <button
            type="button"
            class="grid size-11 place-items-center rounded-xl transition-all cursor-pointer"
            :class="isCameraOn ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-600 text-white'"
            :title="isCameraOn ? 'Stop Camera' : 'Start Camera'"
            @click="toggleCamera"
          >
            <UIcon :name="isCameraOn ? 'i-lucide-video' : 'i-lucide-video-off'" class="size-5" />
          </button>

          <button
            type="button"
            class="grid size-11 place-items-center rounded-xl transition-all cursor-pointer"
            :class="isScreenSharing ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'"
            title="Share Screen"
            @click="toggleScreenShare"
          >
            <UIcon name="i-lucide-screen-share" class="size-5" />
          </button>

          <button
            type="button"
            class="grid size-11 place-items-center rounded-xl transition-all cursor-pointer"
            :class="showNotesDrawer ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'"
            title="Toggle Notes &amp; Agenda"
            @click="showNotesDrawer = !showNotesDrawer"
          >
            <UIcon name="i-lucide-notebook-pen" class="size-5" />
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-colors cursor-pointer"
            @click="endCall"
          >
            <UIcon name="i-lucide-phone-off" class="size-4" />
            End Call
          </button>
        </div>
      </div>

      <!-- Right: Agenda & Interview Notes Panel -->
      <aside
        v-if="showNotesDrawer"
        class="w-80 border-l border-gray-800 bg-gray-900 flex flex-col shrink-0"
      >
        <div class="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 class="font-bold text-xs uppercase tracking-wider text-gray-400">Interview Agenda</h3>
          <button class="text-gray-400 hover:text-white" @click="showNotesDrawer = false">
            <UIcon name="i-lucide-x" class="size-4" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          <!-- Job & Candidate Card -->
          <div class="rounded-xl border border-gray-800 bg-gray-950/60 p-3 space-y-1">
            <p class="font-bold text-white">{{ job?.title || 'Open Role' }}</p>
            <p class="text-gray-400">{{ job?.company }} · {{ job?.location }}</p>
            <p class="text-[11px] text-indigo-400 pt-1">
              Candidate: {{ application?.candidateName }}
            </p>
          </div>

          <!-- Round Agenda -->
          <div class="space-y-2">
            <p class="font-bold text-gray-300">Agenda Topics</p>
            <div class="space-y-1.5 text-gray-400">
              <label class="flex items-center gap-2">
                <input type="checkbox" checked class="rounded border-gray-700 bg-gray-800 text-indigo-600">
                <span>1. Introduction &amp; Background (5m)</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" class="rounded border-gray-700 bg-gray-800 text-indigo-600">
                <span>2. Core Technical Problem Solving (25m)</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" class="rounded border-gray-700 bg-gray-800 text-indigo-600">
                <span>3. System Design &amp; Architecture (15m)</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" class="rounded border-gray-700 bg-gray-800 text-indigo-600">
                <span>4. Candidate Q&amp;A (5m)</span>
              </label>
            </div>
          </div>

          <!-- Notes Area -->
          <div class="space-y-2 pt-2 border-t border-gray-800">
            <div class="flex items-center justify-between">
              <p class="font-bold text-gray-300">Live Session Notes</p>
              <span v-if="notesSavedToast" class="text-[10px] text-emerald-400 font-semibold">Saved!</span>
            </div>
            <textarea
              v-model="interviewerNotes"
              rows="6"
              placeholder="Record candidate strengths, code quality, communication, or key observations..."
              class="w-full rounded-xl border border-gray-700 bg-gray-950 p-2.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              @blur="saveNotes"
            />
            <UButton
              size="xs"
              variant="soft"
              color="primary"
              label="Save Notes"
              icon="i-lucide-save"
              block
              @click="saveNotes"
            />
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>
