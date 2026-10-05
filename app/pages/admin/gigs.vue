<script setup lang="ts">
import type { Gig, GigApplication } from '~/types/portal'

definePageMeta({ layout: 'admin' })

const store = useDataStore()

onMounted(async () => {
  await store.syncWithDatabase()
})

const activeTab = ref<'shifts' | 'applications'>('shifts')
const gigs = computed(() => store.getGigs())
const applications = computed(() => store.getGigApplications())

const stats = computed(() => {
  const allG = gigs.value
  const allA = applications.value

  const totalEscrow = allG.reduce((acc, g) => acc + ((g.openings || 0) * (g.dailyPay || 0)), 0)
  const paidApps = allA.filter(a => a.status === 'paid' || a.payoutStatus === 'paid')
  const totalPaidOut = paidApps.reduce((acc, a) => acc + (a.payoutAmount || 0), 0)
  const pendingEscrow = Math.max(0, totalEscrow - totalPaidOut)

  return {
    totalShifts: allG.length,
    openShifts: allG.filter(g => g.status === 'open').length,
    totalApplicants: allA.length,
    totalPaidOut,
    pendingEscrow,
    totalEscrow
  }
})

async function updateShiftStatus(gigId: string, status: Gig['status']) {
  await store.updateGig(gigId, { status })
}

async function markApplicationPaid(appId: string) {
  await store.updateGigApplicationStatus(appId, {
    status: 'paid',
    payoutStatus: 'paid'
  })
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
      return { label: 'Shift Done (Ready for Pay)', color: 'success' }
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
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-black text-gray-950 dark:text-white">
          1-Day Shifts &amp; Escrow Management
        </h1>
        <p class="text-sm text-gray-500">
          Supervise organization duty postings, student shift assignments, and instant UPI escrow settlements.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          :variant="activeTab === 'shifts' ? 'solid' : 'ghost'"
          color="primary"
          size="sm"
          label="All Shifts"
          icon="i-lucide-calendar"
          @click="activeTab = 'shifts'"
        />
        <UButton
          :variant="activeTab === 'applications' ? 'solid' : 'ghost'"
          color="primary"
          size="sm"
          label="Candidate Roster &amp; Payouts"
          icon="i-lucide-indian-rupee"
          @click="activeTab = 'applications'"
        />
      </div>
    </div>

    <!-- ── Escrow Metrics ───────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <UCard>
        <p class="text-xs font-semibold text-gray-500">Total Shift Openings</p>
        <p class="mt-2 text-2xl font-black text-gray-900 dark:text-white">
          {{ stats.openShifts }} <span class="text-xs font-normal text-gray-400">/ {{ stats.totalShifts }} active</span>
        </p>
      </UCard>

      <UCard>
        <p class="text-xs font-semibold text-gray-500">Total Applications</p>
        <p class="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
          {{ stats.totalApplicants }}
        </p>
      </UCard>

      <UCard>
        <p class="text-xs font-semibold text-gray-500">Held in Escrow</p>
        <p class="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
          ₹{{ stats.pendingEscrow.toLocaleString('en-IN') }}
        </p>
      </UCard>

      <UCard>
        <p class="text-xs font-semibold text-gray-500">Settled UPI Payouts</p>
        <p class="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
          ₹{{ stats.totalPaidOut.toLocaleString('en-IN') }}
        </p>
      </UCard>
    </div>

    <!-- ── Tab: All Shifts ──────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'shifts'" class="space-y-4">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-gray-900 dark:text-white">All Organization Shifts</h2>
            <span class="text-xs text-gray-500">{{ gigs.length }} shifts total</span>
          </div>
        </template>

        <div v-if="gigs.length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
          <div
            v-for="gig in gigs"
            :key="gig.id"
            class="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-gray-900 dark:text-white">{{ gig.title }}</h3>
                <UBadge :label="gig.status" :color="gig.status === 'open' ? 'success' : 'neutral'" size="xs" />
                <UBadge :label="gig.category" color="primary" variant="subtle" size="xs" />
              </div>
              <p class="mt-1 text-xs text-gray-500">
                {{ gig.organization }} · {{ gig.date }} ({{ gig.shiftTime }}) · {{ gig.location }}, {{ gig.city }}
              </p>
              <p class="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                Daily Pay: ₹{{ gig.dailyPay }} · Openings: {{ gig.filled }} / {{ gig.openings }} filled · Escrow: ₹{{ (gig.openings * gig.dailyPay).toLocaleString('en-IN') }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <UButton
                v-if="gig.status === 'open'"
                size="xs"
                color="warning"
                variant="soft"
                label="Mark In-Progress"
                @click="updateShiftStatus(gig.id, 'in_progress')"
              />
              <UButton
                v-if="gig.status === 'in_progress'"
                size="xs"
                color="success"
                variant="soft"
                label="Mark Completed"
                @click="updateShiftStatus(gig.id, 'completed')"
              />
              <UButton
                v-if="gig.status !== 'cancelled'"
                size="xs"
                color="error"
                variant="ghost"
                label="Cancel Shift"
                @click="updateShiftStatus(gig.id, 'cancelled')"
              />
            </div>
          </div>
        </div>

        <div v-else class="py-12 text-center text-sm text-gray-500">
          No 1-day duty shifts currently in the database.
        </div>
      </UCard>
    </div>

    <!-- ── Tab: Student Applications & Payouts ───────────────────────────────── -->
    <div v-if="activeTab === 'applications'" class="space-y-4">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-gray-900 dark:text-white">Student Duty Applications &amp; UPI Settlements</h2>
            <span class="text-xs text-gray-500">{{ applications.length }} applications total</span>
          </div>
        </template>

        <div v-if="applications.length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
          <div
            v-for="app in applications"
            :key="app.id"
            class="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900 dark:text-white">{{ app.candidateName }}</span>
                <UBadge :color="getStatusBadge(app.status).color as any" variant="subtle" :label="getStatusBadge(app.status).label" size="xs" />
              </div>
              <p class="text-xs text-gray-500 mt-1">
                {{ app.candidateEmail }} · {{ app.candidateMobile }} · {{ app.college || 'College not specified' }}
              </p>
              <div class="mt-2 flex items-center gap-2 text-xs">
                <span class="rounded bg-emerald-50 px-2 py-0.5 font-mono font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  UPI: {{ app.upiId || 'Not provided' }}
                </span>
                <span class="font-bold text-gray-900 dark:text-white">
                  Payout: ₹{{ app.payoutAmount }}
                </span>
                <span class="text-gray-400">·</span>
                <span class="text-gray-500 capitalize">Status: {{ app.payoutStatus }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <UButton
                v-if="app.payoutStatus !== 'paid'"
                size="xs"
                color="success"
                icon="i-lucide-send"
                label="Settle UPI Payout"
                @click="markApplicationPaid(app.id)"
              />
              <span v-else class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <UIcon name="i-lucide-check-circle" class="size-4" />
                Settled to UPI
              </span>
            </div>
          </div>
        </div>

        <div v-else class="py-12 text-center text-sm text-gray-500">
          No student applications for 1-day shifts yet.
        </div>
      </UCard>
    </div>
  </div>
</template>
