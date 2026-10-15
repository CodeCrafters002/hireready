<script setup lang="ts">
import type { Application, ApplicationStatus, Job } from '~/types/portal'

const props = defineProps<{
  applications: Application[]
  role?: 'employer' | 'admin'
}>()

const emit = defineEmits<{
  (e: 'open-chat', app: Application): void
  (e: 'schedule-interview', app: Application): void
  (e: 'generate-offer', app: Application): void
  (e: 'status-changed', payload: { appId: string; newStatus: ApplicationStatus }): void
}>()

const store = useDataStore()
const { currentUser } = useAuth()

interface ColumnDef {
  id: string
  title: string
  icon: string
  badgeColor: string
  borderColor: string
  headerBg: string
  statuses: ApplicationStatus[]
  targetStatus: ApplicationStatus
}

const columns: ColumnDef[] = [
  {
    id: 'applied',
    title: 'New Applications',
    icon: 'i-lucide-inbox',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    borderColor: 'border-blue-500/30',
    headerBg: 'bg-blue-50/60 dark:bg-blue-950/20',
    statuses: ['payment_pending', 'mcq_pending', 'assessment_passed'],
    targetStatus: 'assessment_passed'
  },
  {
    id: 'shortlisted',
    title: 'Shortlisted / In Review',
    icon: 'i-lucide-user-check',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    borderColor: 'border-purple-500/30',
    headerBg: 'bg-purple-50/60 dark:bg-purple-950/20',
    statuses: ['submitted_to_client', 'interview_pending'],
    targetStatus: 'submitted_to_client'
  },
  {
    id: 'interview',
    title: 'Interview Scheduled',
    icon: 'i-lucide-calendar-clock',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    borderColor: 'border-amber-500/30',
    headerBg: 'bg-amber-50/60 dark:bg-amber-950/20',
    statuses: ['interview_scheduled'],
    targetStatus: 'interview_scheduled'
  },
  {
    id: 'offered',
    title: 'Offer Extended / Hired',
    icon: 'i-lucide-trophy',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    borderColor: 'border-emerald-500/30',
    headerBg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
    statuses: ['selected', 'interview_passed'],
    targetStatus: 'selected'
  },
  {
    id: 'rejected',
    title: 'Archived / Rejected',
    icon: 'i-lucide-x-circle',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    borderColor: 'border-rose-500/30',
    headerBg: 'bg-rose-50/60 dark:bg-rose-950/20',
    statuses: ['rejected', 'assessment_failed', 'interview_failed'],
    targetStatus: 'rejected'
  }
]

function getColumnApps(col: ColumnDef): Application[] {
  return props.applications.filter(a => col.statuses.includes(a.status))
}

function getJob(jobId: string): Job | undefined {
  return store.getJobById(jobId)
}

function getCandidateAvatar(app: Application): string | undefined {
  const profile = store.getProfileByUserId(app.candidateId)
  if (profile?.profilePhotoUrl) return profile.profilePhotoUrl
  const user = store.getUserById(app.candidateId)
  return user?.profilePhotoUrl
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────
const draggedAppId = ref<string | null>(null)
const dragOverColumnId = ref<string | null>(null)

function onDragStart(event: DragEvent, app: Application) {
  draggedAppId.value = app.id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', app.id)
  }
}

function onDragOver(event: DragEvent, columnId: string) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverColumnId.value = columnId
}

function onDragLeave(columnId: string) {
  if (dragOverColumnId.value === columnId) {
    dragOverColumnId.value = null
  }
}

function onDrop(event: DragEvent, targetColumn: ColumnDef) {
  event.preventDefault()
  dragOverColumnId.value = null
  const appId = draggedAppId.value || event.dataTransfer?.getData('text/plain')
  if (!appId) return

  const app = props.applications.find(a => a.id === appId)
  if (!app) return

  // If dropped in Interview column, trigger interview scheduler modal!
  if (targetColumn.id === 'interview' && app.status !== 'interview_scheduled') {
    emit('schedule-interview', app)
    return
  }

  // If dropped in Offered column, trigger offer letter generator modal!
  if (targetColumn.id === 'offered' && app.status !== 'selected') {
    emit('generate-offer', app)
    return
  }

  // Otherwise direct status update
  moveStatus(app, targetColumn.targetStatus)
  draggedAppId.value = null
}

function moveStatus(app: Application, newStatus: ApplicationStatus) {
  store.updateApplication(app.id, { status: newStatus })
  const job = getJob(app.jobId)

  // In-app notification to candidate
  store.addNotification({
    userId: app.candidateId,
    type: newStatus === 'selected' ? 'selection' : newStatus === 'interview_scheduled' ? 'interview' : 'general',
    title: newStatus === 'selected' ? '🎉 Congratulations! Selected for Role' : `Application Status Updated`,
    message: `Your application for ${job?.title || 'the role'} has been moved to: ${newStatus.replace(/_/g, ' ').toUpperCase()}`
  })

  emit('status-changed', { appId: app.id, newStatus })
}
</script>

<template>
  <div class="overflow-x-auto pb-4">
    <div class="flex gap-4 min-w-[1100px] items-start">
      <!-- Column -->
      <div
        v-for="col in columns"
        :key="col.id"
        class="flex-1 min-w-[220px] max-w-[270px] rounded-2xl border bg-gray-50/80 dark:bg-gray-900/60 flex flex-col transition-all duration-200"
        :class="[
          col.borderColor,
          dragOverColumnId === col.id ? 'ring-2 ring-indigo-500 scale-[1.01] bg-indigo-50/30' : ''
        ]"
        @dragover="onDragOver($event, col.id)"
        @dragleave="onDragLeave(col.id)"
        @drop="onDrop($event, col)"
      >
        <!-- Column Header -->
        <div class="p-3.5 border-b border-gray-200 dark:border-gray-800 rounded-t-2xl flex items-center justify-between" :class="col.headerBg">
          <div class="flex items-center gap-2">
            <UIcon :name="col.icon" class="size-4 shrink-0 text-gray-700 dark:text-gray-300" />
            <h4 class="font-bold text-xs text-gray-900 dark:text-white truncate">{{ col.title }}</h4>
          </div>
          <span class="rounded-full px-2 py-0.5 text-[10px] font-black" :class="col.badgeColor">
            {{ getColumnApps(col).length }}
          </span>
        </div>

        <!-- Cards Container -->
        <div class="p-2.5 space-y-2.5 min-h-[480px] max-h-[72vh] overflow-y-auto">
          <!-- Card Item -->
          <div
            v-for="app in getColumnApps(col)"
            :key="app.id"
            draggable="true"
            class="group relative rounded-xl border border-gray-200/90 bg-white p-3 shadow-2xs transition-all hover:shadow-md hover:border-indigo-400 dark:border-gray-800 dark:bg-gray-800/90 cursor-grab active:cursor-grabbing"
            @dragstart="onDragStart($event, app)"
          >
            <!-- Card Header: Avatar & Name -->
            <div class="flex items-start gap-2.5">
              <!-- Avatar -->
              <div class="relative size-9 shrink-0 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
                <img
                  v-if="getCandidateAvatar(app)"
                  :src="getCandidateAvatar(app)"
                  alt="Avatar"
                  class="size-full object-cover"
                />
                <div v-else class="grid size-full place-items-center text-xs font-bold text-gray-600 dark:text-gray-300">
                  {{ app.candidateName.charAt(0) }}
                </div>
              </div>

              <!-- Name & Email -->
              <div class="min-w-0 flex-1">
                <h5 class="text-xs font-bold text-gray-950 dark:text-white truncate leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {{ app.candidateName }}
                </h5>
                <p class="text-[10px] text-gray-500 truncate mt-0.5">{{ app.email }}</p>
              </div>

              <!-- Drag Handle Icon -->
              <UIcon name="i-lucide-grip-vertical" class="size-3.5 text-gray-300 group-hover:text-gray-500 shrink-0" />
            </div>

            <!-- Job Badge -->
            <div class="mt-2.5">
              <span class="inline-block max-w-full truncate rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                💼 {{ getJob(app.jobId)?.title || app.jobId }}
              </span>
            </div>

            <!-- Metrics Pills -->
            <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span v-if="app.assessmentScore !== undefined" class="rounded px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold dark:bg-emerald-950/60 dark:text-emerald-400">
                MCQ: {{ app.assessmentScore }}%
              </span>
              <span v-if="app.interviewSlot" class="rounded px-1.5 py-0.5 bg-cyan-50 text-cyan-700 font-medium dark:bg-cyan-950/60 dark:text-cyan-400 truncate max-w-[140px]">
                📅 {{ app.interviewSlot }}
              </span>
              <span v-if="app.offerLetterDetails" class="rounded px-1.5 py-0.5 bg-amber-50 text-amber-700 font-bold dark:bg-amber-950/60 dark:text-amber-400">
                🏆 Offer Sent
              </span>
            </div>

            <!-- Card Bottom Action Row -->
            <div class="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-1">
              <div class="flex items-center gap-1">
                <!-- Chat Button -->
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-300 transition cursor-pointer"
                  title="Direct Message Candidate"
                  @click.stop="emit('open-chat', app)"
                >
                  <UIcon name="i-lucide-message-square" class="size-3.5" />
                </button>

                <!-- Interview Button -->
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950 dark:hover:text-amber-300 transition cursor-pointer"
                  title="Schedule Interview Invite"
                  @click.stop="emit('schedule-interview', app)"
                >
                  <UIcon name="i-lucide-calendar-plus" class="size-3.5" />
                </button>

                <!-- Offer Letter Button -->
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:text-emerald-300 transition cursor-pointer"
                  title="1-Click Offer Letter Generator"
                  @click.stop="emit('generate-offer', app)"
                >
                  <UIcon name="i-lucide-file-badge" class="size-3.5" />
                </button>
              </div>

              <!-- Quick Move Dropdown -->
              <select
                :value="app.status"
                class="rounded-md border border-gray-200 bg-gray-50 text-[10px] py-0.5 px-1 font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 focus:outline-hidden cursor-pointer"
                @change="moveStatus(app, ($event.target as HTMLSelectElement).value as any)"
              >
                <option value="assessment_passed">Applied</option>
                <option value="submitted_to_client">Shortlist</option>
                <option value="interview_scheduled">Interview</option>
                <option value="selected">Offer/Hire</option>
                <option value="rejected">Reject</option>
              </select>
            </div>
          </div>

          <!-- Empty Column State -->
          <div
            v-if="getColumnApps(col).length === 0"
            class="h-28 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-800 p-4 text-center text-gray-400"
          >
            <UIcon :name="col.icon" class="size-5 opacity-40 mb-1" />
            <span class="text-[11px]">Drop candidates here</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
