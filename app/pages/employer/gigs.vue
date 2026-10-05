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

const isCreateModalOpen = ref(false)
const isRosterModalOpen = ref(false)
const selectedGigForRoster = ref<Gig | null>(null)
const creating = ref(false)
const createError = ref('')

const newGigForm = reactive({
  title: '',
  organization: currentUser.value?.name || 'Academic Council & Examination Board',
  category: 'exam_duty' as GigCategory,
  date: '',
  shiftTime: '08:00 AM – 03:00 PM',
  location: '',
  city: 'New Delhi',
  dailyPay: 1800,
  openings: 10,
  description: '',
  instructions: 'Report in formal business attire with original Govt ID. Phones must be deposited upon check-in.'
})

const totalEscrowRequired = computed(() => {
  return (newGigForm.openings || 0) * (newGigForm.dailyPay || 0)
})

const stats = computed(() => {
  const myGigs = gigs.value
  const totalOpenings = myGigs.reduce((acc, g) => acc + (g.openings || 0), 0)
  const totalFilled = myGigs.reduce((acc, g) => acc + (g.filled || 0), 0)
  const totalEscrow = myGigs.reduce((acc, g) => acc + ((g.openings || 0) * (g.dailyPay || 0)), 0)
  const totalApps = allApplications.value.length
  const checkedIn = allApplications.value.filter(a => a.status === 'checked_in' || a.status === 'completed' || a.status === 'paid').length

  return {
    totalShifts: myGigs.length,
    totalOpenings,
    totalFilled,
    totalEscrow,
    totalApps,
    checkedIn
  }
})

function openRoster(gig: Gig) {
  selectedGigForRoster.value = gig
  isRosterModalOpen.value = true
}

const currentRoster = computed(() => {
  if (!selectedGigForRoster.value) return []
  return allApplications.value.filter(a => a.gigId === selectedGigForRoster.value?.id)
})

async function handleCreateGig() {
  if (!newGigForm.title || !newGigForm.date || !newGigForm.location || !newGigForm.city) {
    createError.value = 'Please fill all required shift details.'
    return
  }

  creating.value = true
  createError.value = ''

  try {
    await store.createGig({
      title: newGigForm.title,
      organization: newGigForm.organization,
      category: newGigForm.category,
      date: newGigForm.date,
      shiftTime: newGigForm.shiftTime,
      location: newGigForm.location,
      city: newGigForm.city,
      dailyPay: Number(newGigForm.dailyPay),
      openings: Number(newGigForm.openings),
      description: newGigForm.description,
      responsibilities: [
        'Adhere to supervisor and presiding officer guidelines throughout the shift',
        'Verify identification documents and maintain duty log',
        'Complete shift sign-off with the duty manager'
      ],
      instructions: newGigForm.instructions,
      escrowStatus: 'deposited',
      status: 'open',
      postedBy: currentUser.value?.id || 'employer'
    })

    isCreateModalOpen.value = false
    // reset form
    newGigForm.title = ''
    newGigForm.date = ''
    newGigForm.location = ''
    newGigForm.description = ''
  } catch (err: any) {
    createError.value = err?.data?.statusMessage || err?.message || 'Failed to create gig'
  } finally {
    creating.value = false
  }
}

async function updateCandidateStatus(appId: string, status: GigApplication['status']) {
  await store.updateGigApplicationStatus(appId, { status })
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'applied':
      return { label: 'Registered', color: 'info' }
    case 'accepted':
      return { label: 'Accepted', color: 'primary' }
    case 'checked_in':
      return { label: 'Checked In / On Duty', color: 'warning' }
    case 'completed':
      return { label: 'Shift Completed', color: 'success' }
    case 'paid':
      return { label: 'Paid via UPI', color: 'success' }
    default:
      return { label: status, color: 'neutral' }
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- ── Header ───────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-black text-gray-950 dark:text-white">
          1-Day Shifts &amp; Campus Duty Manager
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Post one-day examination duties, event tasks, and manage candidate attendance with escrow-protected UPI payouts.
        </p>
      </div>

      <UButton
        label="+ Post 1-Day Duty"
        icon="i-lucide-plus"
        color="primary"
        class="self-start sm:self-auto"
        @click="isCreateModalOpen = true"
      />
    </div>

    <!-- ── Metrics ──────────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <UCard>
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <UIcon name="i-lucide-calendar" class="size-5" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Active Shifts</p>
            <p class="text-2xl font-black text-gray-900 dark:text-white">{{ stats.totalShifts }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            <UIcon name="i-lucide-users" class="size-5" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Total Applicants</p>
            <p class="text-2xl font-black text-gray-900 dark:text-white">{{ stats.totalApps }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <UIcon name="i-lucide-user-check" class="size-5" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Checked-In / Completed</p>
            <p class="text-2xl font-black text-gray-900 dark:text-white">{{ stats.checkedIn }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <UIcon name="i-lucide-shield-check" class="size-5" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Escrow Committed</p>
            <p class="text-2xl font-black text-gray-900 dark:text-white">₹{{ stats.totalEscrow.toLocaleString('en-IN') }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- ── Shifts List ──────────────────────────────────────────────────────── -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-gray-900 dark:text-white">Your Organization Shifts</h2>
          <span class="text-xs text-gray-500">Instant UPI payout on sign-off</span>
        </div>
      </template>

      <div v-if="gigs.length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
        <div
          v-for="gig in gigs"
          :key="gig.id"
          class="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-gray-900 dark:text-white">{{ gig.title }}</h3>
              <UBadge color="primary" variant="subtle" :label="gig.category" size="xs" />
            </div>
            <p class="text-xs text-gray-500 flex items-center gap-2">
              <span><UIcon name="i-lucide-calendar" class="size-3.5 inline mr-1" />{{ gig.date }} ({{ gig.shiftTime }})</span>
              <span>•</span>
              <span><UIcon name="i-lucide-map-pin" class="size-3.5 inline mr-1" />{{ gig.location }}, {{ gig.city }}</span>
            </p>
            <p class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              Daily Pay: ₹{{ gig.dailyPay }} · Openings: {{ gig.filled }} / {{ gig.openings }} filled
            </p>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              label="Manage Student Roster"
              icon="i-lucide-users"
              color="neutral"
              variant="outline"
              size="sm"
              @click="openRoster(gig)"
            />
          </div>
        </div>
      </div>

      <div v-else class="py-12 text-center text-gray-500 text-sm">
        No 1-day duties posted yet. Click "+ Post 1-Day Duty" above to create one.
      </div>
    </UCard>

    <!-- ── Roster Modal ─────────────────────────────────────────────────────── -->
    <UModal v-model:open="isRosterModalOpen">
      <template #content>
        <div class="p-6 max-w-3xl" v-if="selectedGigForRoster">
          <div class="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Shift Roster</span>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ selectedGigForRoster.title }}</h3>
              <p class="text-xs text-gray-500">{{ selectedGigForRoster.date }} · {{ selectedGigForRoster.shiftTime }}</p>
            </div>
            <UBadge color="success" variant="subtle" label="Escrow Secured" size="sm" />
          </div>

          <!-- Students list -->
          <div class="mt-4">
            <div v-if="currentRoster.length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
              <div
                v-for="app in currentRoster"
                :key="app.id"
                class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-bold text-sm text-gray-900 dark:text-white">{{ app.candidateName }}</p>
                    <UBadge :color="getStatusBadge(app.status).color as any" variant="subtle" :label="getStatusBadge(app.status).label" size="xs" />
                  </div>
                  <p class="text-xs text-gray-500">{{ app.candidateEmail }} · {{ app.candidateMobile }}</p>
                  <p class="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    UPI: {{ app.upiId || 'Not provided' }} (₹{{ app.payoutAmount }})
                  </p>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2">
                  <UButton
                    v-if="app.status === 'applied'"
                    size="xs"
                    color="primary"
                    label="Accept"
                    @click="updateCandidateStatus(app.id, 'accepted')"
                  />
                  <UButton
                    v-if="app.status === 'accepted'"
                    size="xs"
                    color="warning"
                    label="Check-In"
                    icon="i-lucide-check-square"
                    @click="updateCandidateStatus(app.id, 'checked_in')"
                  />
                  <UButton
                    v-if="app.status === 'checked_in'"
                    size="xs"
                    color="success"
                    label="Sign Off &amp; Release Payout"
                    icon="i-lucide-banknote"
                    @click="updateCandidateStatus(app.id, 'completed')"
                  />
                  <span v-if="app.status === 'completed' || app.status === 'paid'" class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <UIcon name="i-lucide-check-circle" class="size-4" />
                    Payout Released
                  </span>
                </div>
              </div>
            </div>

            <div v-else class="py-8 text-center text-sm text-gray-500">
              No students have applied for this shift yet.
            </div>
          </div>

          <div class="mt-6 flex justify-end border-t border-gray-100 pt-3 dark:border-gray-800">
            <UButton label="Close" color="neutral" variant="ghost" @click="isRosterModalOpen = false" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- ── Post Shift Modal ─────────────────────────────────────────────────── -->
    <UModal v-model:open="isCreateModalOpen">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Post a 1-Day Duty / Shift</h3>
          <p class="text-xs text-gray-500">Pre-deposit daily pay to escrow so students are guaranteed instant payment upon completion.</p>

          <form class="mt-5 space-y-4" @submit.prevent="handleCreateGig">
            <div v-if="createError" class="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {{ createError }}
            </div>

            <UFormField label="Shift Title / Role" required>
              <UInput v-model="newGigForm.title" placeholder="e.g. National Entrance Exam Invigilator" class="w-full" />
            </UFormField>

            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Duty Category">
                <select
                  v-model="newGigForm.category"
                  class="w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="exam_duty">Exam Duty &amp; Invigilation</option>
                  <option value="technical_support">CBT Lab &amp; Tech Support</option>
                  <option value="event_coordination">Conferences &amp; Hackathons</option>
                  <option value="field_survey">Campus &amp; Field Surveys</option>
                </select>
              </UFormField>

              <UFormField label="Shift Date" required>
                <UInput v-model="newGigForm.date" type="date" class="w-full" />
              </UFormField>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Shift Timing" required>
                <UInput v-model="newGigForm.shiftTime" placeholder="e.g. 08:00 AM – 03:00 PM" class="w-full" />
              </UFormField>

              <UFormField label="City" required>
                <UInput v-model="newGigForm.city" placeholder="e.g. New Delhi" class="w-full" />
              </UFormField>
            </div>

            <UFormField label="Venue / Testing Center Address" required>
              <UInput v-model="newGigForm.location" placeholder="e.g. Delhi Public School, Sector 12, RK Puram" class="w-full" />
            </UFormField>

            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Daily Pay per Student (₹)" required>
                <UInput v-model="newGigForm.dailyPay" type="number" min="500" step="100" class="w-full" />
              </UFormField>

              <UFormField label="Openings / Vacancies" required>
                <UInput v-model="newGigForm.openings" type="number" min="1" max="100" class="w-full" />
              </UFormField>
            </div>

            <!-- Escrow Summary Card -->
            <div class="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <div class="flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
                <span>Total Escrow Commitment:</span>
                <span class="font-bold text-sm">₹{{ totalEscrowRequired.toLocaleString('en-IN') }}</span>
              </div>
              <p class="mt-1 text-[11px] text-indigo-700 dark:text-indigo-300">
                100% refunded for any unfulfilled positions. Released directly to student UPI upon shift completion sign-off.
              </p>
            </div>

            <UFormField label="Instructions &amp; Attire Guidelines">
              <UTextarea v-model="newGigForm.instructions" :rows="2" class="w-full" />
            </UFormField>

            <div class="flex items-center justify-end gap-2 pt-2">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="isCreateModalOpen = false" />
              <UButton type="submit" label="Deposit Escrow &amp; Post Shift" color="primary" :loading="creating" />
            </div>
          </form>
        </div>
      </template>
    </UModal>
  </div>
</template>
