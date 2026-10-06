<script setup lang="ts">
import type { Gig, GigCategory } from '~/types/portal'

const store = useDataStore()
const { currentUser, isAuthenticated, isCandidate } = useAuth()

onMounted(async () => {
  await store.syncWithDatabase()
})

const search = ref('')
const selectedCategory = ref<string>('all')
const selectedCity = ref<string>('all')

const allGigs = computed(() => store.getGigs())

const categories = [
  { id: 'all', label: 'All Shifts', icon: 'i-lucide-grid' },
  { id: 'exam_duty', label: 'Exam Duty & Invigilation', icon: 'i-lucide-graduation-cap' },
  { id: 'technical_support', label: 'CBT Lab & Tech Support', icon: 'i-lucide-laptop' },
  { id: 'event_coordination', label: 'Conferences & Hackathons', icon: 'i-lucide-calendar' },
  { id: 'field_survey', label: 'Field & Campus Surveys', icon: 'i-lucide-clipboard-list' }
]

const cities = computed(() => {
  const c = [...new Set(allGigs.value.map(g => g.city).filter(Boolean))]
  return ['all', ...c]
})

const filteredGigs = computed(() => {
  let list = allGigs.value
  const term = search.value.toLowerCase().trim()

  if (term) {
    list = list.filter(g =>
      [g.title, g.organization, g.location, g.city, g.description].some(v => v?.toLowerCase().includes(term))
    )
  }

  if (selectedCategory.value !== 'all') {
    list = list.filter(g => g.category === selectedCategory.value)
  }

  if (selectedCity.value !== 'all') {
    list = list.filter(g => g.city === selectedCity.value)
  }

  return list
})

const myApplications = computed(() => {
  if (!currentUser.value) return []
  return store.getGigApplicationsByCandidate(currentUser.value.id)
})

function hasApplied(gigId: string) {
  return myApplications.value.some(a => a.gigId === gigId)
}

function myApplicationForGig(gigId: string) {
  return myApplications.value.find(a => a.gigId === gigId)
}

// ── Apply Modal State ──────────────────────────────────────────────────────────
const isModalOpen = ref(false)
const selectedGig = ref<Gig | null>(null)
const applySuccess = ref(false)
const submitting = ref(false)
const applyError = ref('')

const applyForm = reactive({
  candidateName: '',
  candidateEmail: '',
  candidateMobile: '',
  college: '',
  upiId: ''
})

function openApplyModal(gig: Gig) {
  selectedGig.value = gig
  applySuccess.value = false
  applyError.value = ''

  if (currentUser.value) {
    applyForm.candidateName = currentUser.value.name || ''
    applyForm.candidateEmail = currentUser.value.email || ''

    const profile = store.getProfileByUserId(currentUser.value.id)
    if (profile) {
      applyForm.candidateMobile = profile.mobile || ''
      applyForm.college = profile.education || ''
      applyForm.upiId = profile.upiId || ''
    }
  }

  isModalOpen.value = true
}

async function handleApply() {
  if (!selectedGig.value) return
  if (!isAuthenticated.value) {
    navigateTo('/auth/sign-in?redirect=/gigs')
    return
  }

  if (!applyForm.candidateName || !applyForm.candidateEmail || !applyForm.upiId) {
    applyError.value = 'Please provide your full name, email, and valid UPI ID.'
    return
  }

  // Validate basic UPI ID format (must have @)
  if (!applyForm.upiId.includes('@')) {
    applyError.value = 'Please enter a valid UPI ID (e.g. mobile@upi or username@okaxis)'
    return
  }

  submitting.value = true
  applyError.value = ''

  try {
    await store.applyToGig({
      gigId: selectedGig.value.id,
      candidateId: currentUser.value!.id,
      candidateName: applyForm.candidateName,
      candidateEmail: applyForm.candidateEmail,
      candidateMobile: applyForm.candidateMobile,
      college: applyForm.college,
      upiId: applyForm.upiId,
      payoutAmount: selectedGig.value.dailyPay
    })

    // If profile exists, save upiId if not present
    const profile = store.getProfileByUserId(currentUser.value!.id)
    if (profile && !profile.upiId) {
      store.upsertProfile({ ...profile, upiId: applyForm.upiId })
    }

    applySuccess.value = true
  } catch (err: any) {
    applyError.value = err?.data?.statusMessage || err?.message || 'Failed to submit application. Please try again.'
  } finally {
    submitting.value = false
  }
}

function getCategoryBadge(cat: GigCategory) {
  switch (cat) {
    case 'exam_duty':
      return { label: 'Exam Duty', color: 'primary', icon: 'i-lucide-graduation-cap' }
    case 'technical_support':
      return { label: 'Tech Support', color: 'info', icon: 'i-lucide-laptop' }
    case 'event_coordination':
      return { label: 'Event Staff', color: 'warning', icon: 'i-lucide-calendar' }
    case 'field_survey':
      return { label: 'Field Survey', color: 'success', icon: 'i-lucide-clipboard-list' }
    default:
      return { label: 'Micro-Gig', color: 'neutral', icon: 'i-lucide-briefcase' }
  }
}
</script>

<template>
  <div class="min-h-screen pb-24">
    <!-- ── Hero Banner ──────────────────────────────────────────────────────── -->
    <div class="relative overflow-hidden border-b border-gray-100 bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 py-16 text-white dark:border-gray-800">
      <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px); background-size: 24px 24px;" />
      <div class="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
      <div class="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <UContainer class="relative">
        <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div class="max-w-2xl">
            <div class="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md">
              <UIcon name="i-lucide-zap" class="size-3.5 text-amber-400" />
              1-Day Shifts · Instant UPI Payout · 100% Escrow Protected
            </div>
            <h1 class="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
              1-Day Campus Duties <br />
              <span class="bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                &amp; Paid Micro-Shifts
              </span>
            </h1>
            <p class="mt-4 text-base text-indigo-200/80 sm:text-lg">
              Earn ₹1,500 to ₹3,000 for single-day roles like Exam Invigilation, CBT Lab Proctoring, and Tech Summit Coordination. Guaranteed payment directly to your UPI ID upon shift sign-off.
            </p>
          </div>

          <!-- Escrow Trust Widget -->
          <div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:w-80">
            <div class="flex items-center gap-3">
              <div class="grid size-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <UIcon name="i-lucide-shield-check" class="size-6" />
              </div>
              <div>
                <p class="text-xs font-semibold text-emerald-400 uppercase tracking-wider">HireReady Escrow</p>
                <p class="text-sm font-bold text-white">Guaranteed Payout</p>
              </div>
            </div>
            <div class="mt-4 space-y-2 text-xs text-indigo-200/70 border-t border-white/10 pt-3">
              <div class="flex items-center justify-between">
                <span>Employer Pre-deposits</span>
                <span class="font-semibold text-white">100% Upfront</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Release Trigger</span>
                <span class="font-semibold text-emerald-400">Check-out Signoff</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Payout Method</span>
                <span class="font-semibold text-cyan-300">Direct UPI</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="mt-10 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-2.5 backdrop-blur-xl sm:flex-row">
          <div class="relative flex-1">
            <UIcon name="i-lucide-search" class="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-indigo-300" />
            <input
              v-model="search"
              type="text"
              placeholder="Search by role, testing center, city, or institution..."
              class="w-full rounded-xl bg-transparent py-2.5 pl-11 pr-4 text-sm text-white placeholder-indigo-300/60 focus:outline-none"
            />
          </div>
          <div class="flex items-center gap-2">
            <select
              v-model="selectedCity"
              class="rounded-xl border border-white/10 bg-indigo-900/60 px-4 py-2.5 text-sm text-white focus:outline-none"
            >
              <option value="all">All Cities</option>
              <option v-for="c in cities.filter(c => c !== 'all')" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>
      </UContainer>
    </div>

    <!-- ── Category Filter Chips ────────────────────────────────────────────── -->
    <div class="border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80 sticky top-16 z-30">
      <UContainer class="py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all"
          :class="selectedCategory === cat.id
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
          @click="selectedCategory = cat.id"
        >
          <UIcon :name="cat.icon" class="size-4" />
          {{ cat.label }}
        </button>
      </UContainer>
    </div>

    <!-- ── Gigs Listing Container ───────────────────────────────────────────── -->
    <UContainer class="mt-8">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-gray-950 dark:text-white">
            Available 1-Day Duties &amp; Shifts
          </h2>
          <p class="text-sm text-gray-500">
            Showing {{ filteredGigs.length }} verified shift{{ filteredGigs.length === 1 ? '' : 's' }}
          </p>
        </div>

        <div v-if="isAuthenticated && isCandidate" class="flex items-center gap-2">
          <NuxtLink
            to="/candidate/profile"
            class="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 flex items-center gap-1"
          >
            <UIcon name="i-lucide-wallet" class="size-3.5" />
            Verify UPI in Profile
          </NuxtLink>
        </div>
      </div>

      <!-- Shifts Grid -->
      <div v-if="filteredGigs.length > 0" class="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="gig in filteredGigs"
          :key="gig.id"
          class="group flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-500/50"
        >
          <div>
            <!-- Top Badges -->
            <div class="flex items-center justify-between gap-2">
              <span
                class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
                :class="`bg-${getCategoryBadge(gig.category).color}-50 text-${getCategoryBadge(gig.category).color}-700 dark:bg-${getCategoryBadge(gig.category).color}-950/40 dark:text-${getCategoryBadge(gig.category).color}-400`"
              >
                <UIcon :name="getCategoryBadge(gig.category).icon" class="size-3.5" />
                {{ getCategoryBadge(gig.category).label }}
              </span>

              <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <UIcon name="i-lucide-shield-check" class="size-3" />
                Escrow Funded
              </span>
            </div>

            <!-- Title & Organization -->
            <h3 class="mt-4 text-lg font-bold text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 line-clamp-2">
              {{ gig.title }}
            </h3>
            <p class="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <UIcon name="i-lucide-building" class="size-3.5" />
              {{ gig.organization }}
            </p>

            <!-- Shift Details Badges -->
            <div class="mt-4 space-y-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-calendar" class="size-4 text-indigo-500 shrink-0" />
                <span class="font-semibold">{{ gig.date }}</span>
                <span class="text-gray-400">·</span>
                <span>{{ gig.shiftTime }}</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-map-pin" class="size-4 text-rose-500 shrink-0" />
                <span class="truncate">{{ gig.location }}, <span class="font-semibold">{{ gig.city }}</span></span>
              </div>
            </div>

            <!-- Description -->
            <p class="mt-3 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {{ gig.description }}
            </p>

            <!-- Vacancies tracker -->
            <div class="mt-4">
              <div class="flex items-center justify-between text-xs font-medium">
                <span class="text-gray-500">Openings Available</span>
                <span class="font-bold text-gray-900 dark:text-white">
                  {{ Math.max(0, gig.openings - (gig.filled || 0)) }} of {{ gig.openings }} left
                </span>
              </div>
              <div class="mt-1.5 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                  :style="{ width: `${Math.min(100, ((gig.filled || 0) / gig.openings) * 100)}%` }"
                />
              </div>
            </div>
          </div>

          <!-- Bottom Footer -->
          <div class="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800 flex items-center justify-between">
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Guaranteed Pay</p>
              <p class="text-xl font-black text-gray-950 dark:text-white">
                ₹{{ gig.dailyPay.toLocaleString('en-IN') }}
                <span class="text-xs font-normal text-gray-500">/day</span>
              </p>
            </div>

            <div class="flex flex-col items-end gap-1.5">
              <!-- Accepted: show admit card button -->
              <NuxtLink
                v-if="['accepted','checked_in'].includes(myApplicationForGig(gig.id)?.status || '')"
                to="/candidate/my-gigs"
                class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
              >
                <UIcon name="i-lucide-id-card" class="size-4" />
                Admit Card
              </NuxtLink>
              <!-- Applied but not yet accepted -->
              <button
                v-else-if="hasApplied(gig.id)"
                disabled
                class="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
              >
                <UIcon name="i-lucide-check-circle" class="size-4" />
                Applied
              </button>
              <!-- Not applied -->
              <button
                v-else
                class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
                @click="openApplyModal(gig)"
              >
                <span>Apply Shift</span>
                <UIcon name="i-lucide-arrow-right" class="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="mt-12 rounded-3xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-800">
        <div class="mx-auto grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
          <UIcon name="i-lucide-calendar-x" class="size-6" />
        </div>
        <h3 class="mt-4 text-base font-bold text-gray-900 dark:text-white">No 1-day shifts match your filter</h3>
        <p class="mt-1 text-sm text-gray-500">Try choosing a different city or category.</p>
        <button
          class="mt-4 rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
          @click="selectedCategory = 'all'; selectedCity = 'all'; search = ''"
        >
          Reset Filters
        </button>
      </div>
    </UContainer>

    <!-- ── Apply Modal ──────────────────────────────────────────────────────── -->
    <UModal v-model:open="isModalOpen">
      <template #content>
        <div class="p-6 sm:p-8" v-if="selectedGig">
          <!-- Success State -->
          <div v-if="applySuccess" class="text-center py-4">
            <div class="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <UIcon name="i-lucide-check-circle-2" class="size-10" />
            </div>
            <h3 class="mt-4 text-2xl font-black text-gray-900 dark:text-white">
              Shift Application Confirmed!
            </h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
              You are registered for <span class="font-semibold text-gray-900 dark:text-white">{{ selectedGig.title }}</span>.
            </p>

            <!-- Digital Pass Card -->
            <div class="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 text-left dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <div class="flex items-center justify-between border-b border-indigo-100 pb-3 dark:border-indigo-900/40">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Duty Pass</p>
                  <p class="text-sm font-bold text-gray-900 dark:text-white">{{ selectedGig.organization }}</p>
                </div>
                <UBadge color="primary" variant="subtle" label="Registered" size="xs" />
              </div>
              <div class="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                <p><span class="font-semibold text-gray-900 dark:text-white">Duty Date:</span> {{ selectedGig.date }} ({{ selectedGig.shiftTime }})</p>
                <p><span class="font-semibold text-gray-900 dark:text-white">Venue:</span> {{ selectedGig.location }}, {{ selectedGig.city }}</p>
                <p><span class="font-semibold text-gray-900 dark:text-white">UPI Payout:</span> ₹{{ selectedGig.dailyPay }} to {{ applyForm.upiId }}</p>
              </div>
            </div>

            <div class="mt-6 flex justify-center gap-3">
              <UButton label="Close" color="neutral" variant="outline" @click="isModalOpen = false" />
              <UButton to="/candidate/my-gigs" label="Track My Applications" icon="i-lucide-id-card" color="primary" />
            </div>
          </div>

          <!-- Application Form -->
          <div v-else>
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">1-Day Duty Sign-Up</span>
                <h3 class="mt-1 text-xl font-bold text-gray-900 dark:text-white">{{ selectedGig.title }}</h3>
                <p class="text-xs text-gray-500">{{ selectedGig.organization }} · {{ selectedGig.city }}</p>
              </div>
              <div class="text-right">
                <span class="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{{ selectedGig.dailyPay }}</span>
                <p class="text-[10px] text-gray-400">Guaranteed Pay</p>
              </div>
            </div>

            <!-- Briefing Box -->
            <div class="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
              <p class="font-semibold text-gray-900 dark:text-white mb-1">Duty Instructions:</p>
              <p>{{ selectedGig.instructions || 'Report 15 minutes prior in formal attire with original photo ID.' }}</p>
            </div>

            <form class="mt-6 space-y-4" @submit.prevent="handleApply">
              <div v-if="applyError" class="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                {{ applyError }}
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <UFormField label="Your Full Name" required>
                  <UInput v-model="applyForm.candidateName" placeholder="Full Name" icon="i-lucide-user" class="w-full" />
                </UFormField>
                <UFormField label="Email" required>
                  <UInput v-model="applyForm.candidateEmail" type="email" placeholder="you@example.com" icon="i-lucide-mail" class="w-full" />
                </UFormField>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <UFormField label="Mobile Number" required>
                  <UInput v-model="applyForm.candidateMobile" placeholder="10-digit phone" icon="i-lucide-phone" class="w-full" />
                </UFormField>
                <UFormField label="College / University">
                  <UInput v-model="applyForm.college" placeholder="e.g. Delhi University / IIT" icon="i-lucide-graduation-cap" class="w-full" />
                </UFormField>
              </div>

              <!-- UPI ID Highlighted -->
              <div class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div class="flex items-center gap-2 mb-2">
                  <UIcon name="i-lucide-wallet" class="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300">UPI ID for Direct Bank Payout</span>
                </div>
                <UInput
                  v-model="applyForm.upiId"
                  placeholder="e.g. yourname@okhdfcbank or 9876543210@upi"
                  class="w-full"
                  required
                />
                <p class="mt-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                  Daily pay of ₹{{ selectedGig.dailyPay }} will be transferred to this UPI handle upon shift checkout.
                </p>
              </div>

              <div class="pt-2 flex items-center justify-end gap-3">
                <UButton label="Cancel" color="neutral" variant="ghost" @click="isModalOpen = false" />
                <UButton
                  type="submit"
                  color="primary"
                  label="Confirm &amp; Register for Shift"
                  :loading="submitting"
                  icon="i-lucide-check"
                />
              </div>
            </form>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
