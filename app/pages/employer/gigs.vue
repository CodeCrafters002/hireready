<script setup lang="ts">
import type { Gig, GigApplication, GigCategory } from '~/types/portal'

definePageMeta({ layout: 'employer' })

const store = useDataStore()
const { currentUser } = useAuth()

onMounted(async () => {
  await store.syncWithDatabase()
})

const gigs = computed(() => store.getGigs())
const allApplications = computed(() => store.getGigApplications())

// ── Modal state ──────────────────────────────────────────────────────────────
const isFormModalOpen = ref(false)
const isRosterModalOpen = ref(false)
const selectedGigForRoster = ref<Gig | null>(null)
const editingGig = ref<Gig | null>(null)
const submitting = ref(false)
const formError = ref('')

// ── Form ─────────────────────────────────────────────────────────────────────
const defaultForm = () => ({
  title: '',
  organization: currentUser.value?.name || '',
  category: 'exam_duty' as GigCategory,
  date: '',
  shiftTime: '08:00 AM – 03:00 PM',
  location: '',
  city: '',
  state: '',
  pincode: '',
  dailyPay: 1800,
  openings: 10,
  description: '',
  responsibilities: '',
  requirements: '',
  qualifications: '',
  dressCode: 'Formal business attire (light-coloured shirt, dark trousers). No jeans.',
  contactPerson: '',
  contactPhone: '',
  reportingInstructions: 'Report 30 minutes before shift start. Carry original government-issued photo ID.',
  instructions: 'Phones must be deposited at entry. No electronic devices inside exam hall.',
  tags: '',
})

const gigForm = reactive(defaultForm())

const totalEscrowRequired = computed(() => {
  return (gigForm.openings || 0) * (gigForm.dailyPay || 0)
})

const isEditMode = computed(() => !!editingGig.value)

function openCreateModal() {
  editingGig.value = null
  Object.assign(gigForm, defaultForm())
  formError.value = ''
  isFormModalOpen.value = true
}

function openEditModal(gig: Gig) {
  editingGig.value = gig
  Object.assign(gigForm, {
    title: gig.title || '',
    organization: gig.organization || '',
    category: gig.category || 'exam_duty',
    date: gig.date || '',
    shiftTime: gig.shiftTime || '',
    location: gig.location || '',
    city: gig.city || '',
    state: (gig as any).state || '',
    pincode: (gig as any).pincode || '',
    dailyPay: gig.dailyPay,      // locked in edit mode
    openings: gig.openings,      // locked in edit mode
    description: gig.description || '',
    responsibilities: Array.isArray(gig.responsibilities) ? gig.responsibilities.join('\n') : (gig.responsibilities || ''),
    requirements: (gig as any).requirements || '',
    qualifications: (gig as any).qualifications || '',
    dressCode: (gig as any).dressCode || '',
    contactPerson: (gig as any).contactPerson || '',
    contactPhone: (gig as any).contactPhone || '',
    reportingInstructions: (gig as any).reportingInstructions || '',
    instructions: gig.instructions || '',
    tags: Array.isArray((gig as any).tags) ? (gig as any).tags.join(', ') : ((gig as any).tags || ''),
  })
  formError.value = ''
  isFormModalOpen.value = true
}

async function handleSubmitGig() {
  if (!gigForm.title || !gigForm.date || !gigForm.location || !gigForm.city) {
    formError.value = 'Please fill all required fields (marked with *).'
    return
  }

  submitting.value = true
  formError.value = ''

  const payload: any = {
    title: gigForm.title,
    organization: gigForm.organization,
    category: gigForm.category,
    date: gigForm.date,
    shiftTime: gigForm.shiftTime,
    location: gigForm.location,
    city: gigForm.city,
    state: gigForm.state,
    pincode: gigForm.pincode,
    description: gigForm.description,
    responsibilities: gigForm.responsibilities.split('\n').map(s => s.trim()).filter(Boolean),
    requirements: gigForm.requirements,
    qualifications: gigForm.qualifications,
    dressCode: gigForm.dressCode,
    contactPerson: gigForm.contactPerson,
    contactPhone: gigForm.contactPhone,
    reportingInstructions: gigForm.reportingInstructions,
    instructions: gigForm.instructions,
    tags: gigForm.tags.split(',').map(s => s.trim()).filter(Boolean),
  }

  try {
    if (isEditMode.value && editingGig.value) {
      // Edit: do NOT touch dailyPay or openings
      await store.updateGig(editingGig.value.id, payload)
    } else {
      // Create: include pay & openings
      payload.dailyPay = Number(gigForm.dailyPay)
      payload.openings = Number(gigForm.openings)
      payload.escrowStatus = 'deposited'
      payload.status = 'open'
      payload.postedBy = currentUser.value?.id || 'employer'
      await store.createGig(payload)
    }
    isFormModalOpen.value = false
  } catch (err: any) {
    formError.value = err?.data?.statusMessage || err?.message || 'Failed to save. Please try again.'
  } finally {
    submitting.value = false
  }
}

// ── Roster ───────────────────────────────────────────────────────────────────
function openRoster(gig: Gig) {
  selectedGigForRoster.value = gig
  isRosterModalOpen.value = true
}

const currentRoster = computed(() => {
  if (!selectedGigForRoster.value) return []
  return allApplications.value.filter(a => a.gigId === selectedGigForRoster.value?.id)
})

async function updateCandidateStatus(appId: string, status: GigApplication['status']) {
  await store.updateGigApplicationStatus(appId, { status })
}

// ── Stats ────────────────────────────────────────────────────────────────────
const stats = computed(() => {
  const myGigs = gigs.value
  const totalOpenings = myGigs.reduce((acc, g) => acc + (g.openings || 0), 0)
  const totalFilled = myGigs.reduce((acc, g) => acc + (g.filled || 0), 0)
  const totalEscrow = myGigs.reduce((acc, g) => acc + ((g.openings || 0) * (g.dailyPay || 0)), 0)
  const totalApps = allApplications.value.length
  const checkedIn = allApplications.value.filter(a => ['checked_in', 'completed', 'paid'].includes(a.status)).length

  return { totalShifts: myGigs.length, totalOpenings, totalFilled, totalEscrow, totalApps, checkedIn }
})

// ── Helpers ──────────────────────────────────────────────────────────────────
function getStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    applied:    { label: 'Registered',          color: 'info' },
    accepted:   { label: 'Accepted',            color: 'primary' },
    checked_in: { label: 'On Duty',             color: 'warning' },
    completed:  { label: 'Shift Completed',     color: 'success' },
    paid:       { label: 'Paid',                color: 'success' },
  }
  return map[status] || { label: status, color: 'neutral' }
}

function getCategoryLabel(cat: string) {
  const map: Record<string, string> = {
    exam_duty:          'Exam Duty',
    technical_support:  'Tech Support',
    event_coordination: 'Event',
    field_survey:       'Field Survey',
  }
  return map[cat] || cat
}

function statusColor(gig: Gig): string {
  if ((gig.filled || 0) >= (gig.openings || 1)) return 'text-emerald-600 dark:text-emerald-400'
  return 'text-indigo-600 dark:text-indigo-400'
}
</script>

<template>
  <div class="space-y-6">

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-gray-950 dark:text-white">
          1-Day Shifts &amp; Campus Duty Manager
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xl">
          Post one-day examination duties, event tasks and manage candidate attendance.
          Escrow-protected UPI payouts guarantee payment to every confirmed candidate.
        </p>
      </div>
      <UButton
        id="btn-post-duty"
        label="+ Post 1-Day Duty"
        icon="i-lucide-plus"
        color="primary"
        size="md"
        class="shrink-0 self-start"
        @click="openCreateModal"
      />
    </div>

    <!-- ── Stats ──────────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <UCard class="hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <UIcon name="i-lucide-calendar-check" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500">Active Shifts</p>
            <p class="text-2xl font-black text-gray-900 dark:text-white">{{ stats.totalShifts }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            <UIcon name="i-lucide-users" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500">Total Applicants</p>
            <p class="text-2xl font-black text-gray-900 dark:text-white">{{ stats.totalApps }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <UIcon name="i-lucide-user-check" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500">On Duty / Done</p>
            <p class="text-2xl font-black text-gray-900 dark:text-white">{{ stats.checkedIn }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <UIcon name="i-lucide-shield-check" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-gray-500">Escrow Committed</p>
            <p class="text-2xl font-black text-gray-900 dark:text-white">₹{{ stats.totalEscrow.toLocaleString('en-IN') }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- ── Shift Cards ─────────────────────────────────────────────────────── -->
    <div v-if="gigs.length > 0" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <UCard
        v-for="gig in gigs"
        :key="gig.id"
        class="flex flex-col gap-0 hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-800"
      >
        <!-- Card header -->
        <div class="flex items-start justify-between gap-2 p-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5 mb-1">
              <UBadge color="primary" variant="subtle" :label="getCategoryLabel(gig.category)" size="xs" />
              <UBadge
                :color="(gig.filled || 0) >= (gig.openings || 1) ? 'success' : 'warning'"
                variant="subtle"
                :label="(gig.filled || 0) >= (gig.openings || 1) ? 'Filled' : 'Open'"
                size="xs"
              />
            </div>
            <h3 class="font-bold text-gray-900 dark:text-white leading-tight">{{ gig.title }}</h3>
            <p class="text-xs text-gray-500 mt-0.5">{{ gig.organization }}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-lg font-black text-indigo-600 dark:text-indigo-400">₹{{ (gig.dailyPay || 0).toLocaleString('en-IN') }}</p>
            <p class="text-[10px] text-gray-400">per day</p>
          </div>
        </div>

        <!-- Card body -->
        <div class="p-4 space-y-2 flex-1">
          <div class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <UIcon name="i-lucide-calendar" class="size-3.5 shrink-0 text-gray-400" />
            <span>{{ gig.date }}</span>
            <span class="text-gray-300">|</span>
            <span>{{ gig.shiftTime }}</span>
          </div>
          <div class="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
            <UIcon name="i-lucide-map-pin" class="size-3.5 shrink-0 mt-0.5 text-gray-400" />
            <span class="line-clamp-2">{{ gig.location }}, {{ gig.city }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <UIcon name="i-lucide-users" class="size-3.5 shrink-0 text-gray-400" />
            <span :class="statusColor(gig)" class="font-semibold">
              {{ gig.filled || 0 }} / {{ gig.openings }} filled
            </span>
            <div class="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                class="h-full rounded-full bg-indigo-500 transition-all"
                :style="{ width: `${Math.min(100, ((gig.filled || 0) / (gig.openings || 1)) * 100)}%` }"
              />
            </div>
          </div>
          <div v-if="gig.description" class="text-xs text-gray-500 line-clamp-2 mt-1">
            {{ gig.description }}
          </div>
        </div>

        <!-- Card footer -->
        <div class="flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800 px-4 py-3">
          <UButton
            label="Edit Post"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="openEditModal(gig)"
          />
          <UButton
            label="Roster"
            icon="i-lucide-clipboard-list"
            color="primary"
            variant="soft"
            size="xs"
            @click="openRoster(gig)"
          />
        </div>
      </UCard>
    </div>

    <!-- ── Empty State ─────────────────────────────────────────────────────── -->
    <UCard v-else>
      <div class="py-16 flex flex-col items-center gap-4 text-center">
        <div class="grid size-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-400 dark:bg-indigo-950/40">
          <UIcon name="i-lucide-clipboard-list" class="size-8" />
        </div>
        <div>
          <p class="font-bold text-gray-900 dark:text-white">No shifts posted yet</p>
          <p class="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
            Click the <strong>"+ Post 1-Day Duty"</strong> button above to create your first shift listing.
          </p>
        </div>
        <UButton label="Post Your First Shift" icon="i-lucide-plus" color="primary" @click="openCreateModal" />
      </div>
    </UCard>

    <!-- ════════════════════════════════════════════════════════════════════════
         POST / EDIT MODAL
         ════════════════════════════════════════════════════════════════════════ -->
    <UModal v-model:open="isFormModalOpen" :ui="{ width: 'sm:max-w-2xl' }">
      <template #content>
        <!-- Fixed-height scrollable layout so footer is always visible -->
        <div class="flex flex-col" style="max-height: 90vh;">

          <!-- Modal header (sticky) -->
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0">
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                {{ isEditMode ? 'Edit Shift Details' : 'Post a 1-Day Duty / Shift' }}
              </h3>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ isEditMode ? 'Update job details. Pay & openings are locked after posting.' : 'All required fields are marked with *.' }}
              </p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="isFormModalOpen = false" />
          </div>

          <!-- Scrollable form body -->
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <form id="gig-form" @submit.prevent="handleSubmitGig">

              <!-- Error banner -->
              <div
                v-if="formError"
                class="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
              >
                <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0 mt-0.5" />
                {{ formError }}
              </div>

              <!-- ── SECTION: Basic Information ── -->
              <div class="mb-5">
                <p class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
                  Basic Information
                </p>
                <div class="space-y-4">
                  <UFormField label="Shift Title / Role *" required>
                    <UInput
                      v-model="gigForm.title"
                      placeholder="e.g. National Entrance Exam Invigilator"
                      class="w-full"
                    />
                  </UFormField>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <UFormField label="Duty Category">
                      <select
                        v-model="gigForm.category"
                        class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="exam_duty">📋 Exam Duty &amp; Invigilation</option>
                        <option value="technical_support">💻 CBT Lab &amp; Tech Support</option>
                        <option value="event_coordination">🎤 Conferences &amp; Hackathons</option>
                        <option value="field_survey">🗺️ Campus &amp; Field Surveys</option>
                      </select>
                    </UFormField>

                    <UFormField label="Organizing Institution">
                      <UInput v-model="gigForm.organization" placeholder="e.g. CBSE / NTA / Your College" class="w-full" />
                    </UFormField>
                  </div>

                  <UFormField label="Brief Description">
                    <UTextarea
                      v-model="gigForm.description"
                      placeholder="Describe the nature of work, exam name, event details, etc."
                      :rows="2"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Tags (comma separated)">
                    <UInput v-model="gigForm.tags" placeholder="e.g. NEET, JEE, Fresher OK, Part-time" class="w-full" />
                  </UFormField>
                </div>
              </div>

              <!-- Divider -->
              <div class="my-5 border-t border-dashed border-gray-200 dark:border-gray-700" />

              <!-- ── SECTION: Schedule & Location ── -->
              <div class="mb-5">
                <p class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
                  Schedule &amp; Location
                </p>
                <div class="space-y-4">
                  <div class="grid gap-4 sm:grid-cols-2">
                    <UFormField label="Shift Date *" required>
                      <UInput v-model="gigForm.date" type="date" class="w-full" />
                    </UFormField>

                    <UFormField label="Shift Timing *" required>
                      <UInput v-model="gigForm.shiftTime" placeholder="08:00 AM – 03:00 PM" class="w-full" />
                    </UFormField>
                  </div>

                  <UFormField label="Venue / Testing Center Address *" required>
                    <UInput v-model="gigForm.location" placeholder="e.g. Delhi Public School, Sector 12, RK Puram" class="w-full" />
                  </UFormField>

                  <div class="grid gap-4 sm:grid-cols-3">
                    <UFormField label="City *" required>
                      <UInput v-model="gigForm.city" placeholder="New Delhi" class="w-full" />
                    </UFormField>
                    <UFormField label="State">
                      <UInput v-model="gigForm.state" placeholder="Delhi" class="w-full" />
                    </UFormField>
                    <UFormField label="PIN Code">
                      <UInput v-model="gigForm.pincode" placeholder="110001" class="w-full" />
                    </UFormField>
                  </div>
                </div>
              </div>

              <!-- Divider -->
              <div class="my-5 border-t border-dashed border-gray-200 dark:border-gray-700" />

              <!-- ── SECTION: Pay & Openings (locked in edit mode) ── -->
              <div class="mb-5">
                <div class="flex items-center justify-between mb-3">
                  <p class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Pay &amp; Vacancies
                  </p>
                  <span
                    v-if="isEditMode"
                    class="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-full px-2 py-0.5"
                  >
                    <UIcon name="i-lucide-lock" class="size-3" />
                    Locked after posting
                  </span>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <UFormField label="Daily Pay per Candidate (₹) *" required>
                    <UInput
                      v-model="gigForm.dailyPay"
                      type="number"
                      min="500"
                      step="100"
                      class="w-full"
                      :disabled="isEditMode"
                      :class="isEditMode ? 'opacity-50 cursor-not-allowed' : ''"
                    />
                  </UFormField>

                  <UFormField label="Number of Openings *" required>
                    <UInput
                      v-model="gigForm.openings"
                      type="number"
                      min="1"
                      max="500"
                      class="w-full"
                      :disabled="isEditMode"
                      :class="isEditMode ? 'opacity-50 cursor-not-allowed' : ''"
                    />
                  </UFormField>
                </div>

                <!-- Escrow Summary (create mode only) -->
                <div
                  v-if="!isEditMode"
                  class="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/30"
                >
                  <div class="flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
                    <span class="flex items-center gap-1.5">
                      <UIcon name="i-lucide-shield-check" class="size-3.5" />
                      Total Escrow Commitment
                    </span>
                    <span class="font-bold text-sm">₹{{ totalEscrowRequired.toLocaleString('en-IN') }}</span>
                  </div>
                  <p class="mt-1 text-[11px] text-indigo-700 dark:text-indigo-300">
                    {{ gigForm.openings }} candidate(s) × ₹{{ Number(gigForm.dailyPay).toLocaleString('en-IN') }} — 100% refunded for unfilled positions. Released to candidate UPI upon sign-off.
                  </p>
                </div>
              </div>

              <!-- Divider -->
              <div class="my-5 border-t border-dashed border-gray-200 dark:border-gray-700" />

              <!-- ── SECTION: Job Details ── -->
              <div class="mb-5">
                <p class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
                  Job Details
                </p>
                <div class="space-y-4">
                  <UFormField label="Responsibilities (one per line)">
                    <UTextarea
                      v-model="gigForm.responsibilities"
                      placeholder="Verify candidate IDs at entry&#10;Maintain duty log throughout the session&#10;Report incidents to presiding officer"
                      :rows="3"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Requirements / Skills Needed">
                    <UInput
                      v-model="gigForm.requirements"
                      placeholder="e.g. Must be a graduate, Basic computer literacy, Good communication"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Minimum Qualifications">
                    <UInput
                      v-model="gigForm.qualifications"
                      placeholder="e.g. Bachelor's degree in any stream, Age 20–35"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Dress Code / Uniform">
                    <UInput
                      v-model="gigForm.dressCode"
                      placeholder="e.g. Formal business attire, light shirt, dark trousers"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </div>

              <!-- Divider -->
              <div class="my-5 border-t border-dashed border-gray-200 dark:border-gray-700" />

              <!-- ── SECTION: Reporting & Contact ── -->
              <div class="mb-2">
                <p class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
                  Reporting &amp; Contact
                </p>
                <div class="space-y-4">
                  <div class="grid gap-4 sm:grid-cols-2">
                    <UFormField label="Contact Person (On-site)">
                      <UInput v-model="gigForm.contactPerson" placeholder="e.g. Mr. Rajesh Kumar" class="w-full" />
                    </UFormField>
                    <UFormField label="Contact Phone">
                      <UInput v-model="gigForm.contactPhone" placeholder="e.g. +91 98765 43210" class="w-full" />
                    </UFormField>
                  </div>

                  <UFormField label="Reporting Instructions">
                    <UTextarea
                      v-model="gigForm.reportingInstructions"
                      placeholder="Report 30 minutes before shift start. Carry original government-issued photo ID."
                      :rows="2"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Additional Instructions / Rules">
                    <UTextarea
                      v-model="gigForm.instructions"
                      placeholder="Phones must be deposited at entry. No electronic devices inside exam hall."
                      :rows="2"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </div>

            </form>
          </div>

          <!-- Modal footer (sticky — always visible) -->
          <div class="flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0 bg-white dark:bg-gray-900">
            <p v-if="isEditMode" class="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <UIcon name="i-lucide-info" class="size-3.5" />
              Pay &amp; openings cannot be changed after posting.
            </p>
            <span v-else />

            <div class="flex items-center gap-2">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="isFormModalOpen = false" />
              <UButton
                id="btn-submit-gig"
                type="submit"
                form="gig-form"
                :label="isEditMode ? 'Save Changes' : 'Post Shift'"
                :icon="isEditMode ? 'i-lucide-save' : 'i-lucide-send'"
                color="primary"
                :loading="submitting"
              />
            </div>
          </div>

        </div>
      </template>
    </UModal>

    <!-- ════════════════════════════════════════════════════════════════════════
         ROSTER MODAL
         ════════════════════════════════════════════════════════════════════════ -->
    <UModal v-model:open="isRosterModalOpen" :ui="{ width: 'sm:max-w-2xl' }">
      <template #content>
        <div class="flex flex-col" style="max-height: 85vh;">

          <!-- Roster header -->
          <div class="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0">
            <div v-if="selectedGigForRoster">
              <span class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Shift Roster</span>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">{{ selectedGigForRoster.title }}</h3>
              <p class="text-xs text-gray-500">{{ selectedGigForRoster.date }} · {{ selectedGigForRoster.shiftTime }} · {{ selectedGigForRoster.city }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UBadge color="success" variant="subtle" label="Escrow Secured" size="sm" />
              <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="isRosterModalOpen = false" />
            </div>
          </div>

          <!-- Roster list -->
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <div v-if="currentRoster.length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
              <div
                v-for="app in currentRoster"
                :key="app.id"
                class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="font-bold text-sm text-gray-900 dark:text-white">{{ app.candidateName }}</p>
                    <UBadge
                      :color="getStatusBadge(app.status).color as any"
                      variant="subtle"
                      :label="getStatusBadge(app.status).label"
                      size="xs"
                    />
                  </div>
                  <p class="text-xs text-gray-500 mt-0.5">{{ app.candidateEmail }} · {{ app.candidateMobile }}</p>
                  <p class="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    UPI: {{ app.upiId || 'Not provided' }}
                    <span class="font-sans font-semibold ml-1">(₹{{ app.payoutAmount }})</span>
                  </p>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <UButton
                    v-if="app.status === 'applied'"
                    size="xs"
                    color="primary"
                    label="Accept"
                    icon="i-lucide-check"
                    @click="updateCandidateStatus(app.id, 'accepted')"
                  />
                  <UButton
                    v-if="app.status === 'accepted'"
                    size="xs"
                    color="warning"
                    label="Check-In"
                    icon="i-lucide-log-in"
                    @click="updateCandidateStatus(app.id, 'checked_in')"
                  />
                  <UButton
                    v-if="app.status === 'checked_in'"
                    size="xs"
                    color="success"
                    label="Sign Off & Pay"
                    icon="i-lucide-banknote"
                    @click="updateCandidateStatus(app.id, 'completed')"
                  />
                  <span
                    v-if="app.status === 'completed' || app.status === 'paid'"
                    class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
                  >
                    <UIcon name="i-lucide-check-circle-2" class="size-4" />
                    Payout Released
                  </span>
                </div>
              </div>
            </div>

            <div v-else class="py-12 flex flex-col items-center gap-3 text-center text-gray-500">
              <UIcon name="i-lucide-users" class="size-10 text-gray-300" />
              <div>
                <p class="font-semibold text-sm">No applicants yet</p>
                <p class="text-xs mt-0.5">Candidates will appear here once they apply for this shift.</p>
              </div>
            </div>
          </div>

          <div class="border-t border-gray-100 dark:border-gray-800 px-6 py-3 shrink-0 flex justify-end">
            <UButton label="Close" color="neutral" variant="ghost" @click="isRosterModalOpen = false" />
          </div>
        </div>
      </template>
    </UModal>

  </div>
</template>
