<script setup lang="ts">
import type { Gig, GigApplication } from '~/types/portal'

definePageMeta({ layout: 'candidate' })

const store = useDataStore()
const { currentUser } = useAuth()

onMounted(async () => {
  await store.syncWithDatabase()
})

const myApplications = computed(() => {
  if (!currentUser.value) return []
  return store.getGigApplicationsByCandidate(currentUser.value.id)
})

const gigMap = computed(() => {
  const m: Record<string, Gig> = {}
  store.getGigs().forEach(g => { m[g.id] = g })
  return m
})

const enriched = computed(() =>
  myApplications.value
    .map(app => ({ app, gig: gigMap.value[app.gigId] }))
    .filter(e => !!e.gig)
    .sort((a, b) => new Date(b.app.appliedAt).getTime() - new Date(a.app.appliedAt).getTime())
)

// Status helpers
function statusConfig(status: GigApplication['status']) {
  const map: Record<string, { label: string; color: string; icon: string; step: number }> = {
    applied:    { label: 'Application Submitted',     color: 'info',    icon: 'i-lucide-send',          step: 1 },
    accepted:   { label: 'Accepted — Admit Card Ready', color: 'primary', icon: 'i-lucide-badge-check',   step: 2 },
    checked_in: { label: 'Checked In / On Duty',      color: 'warning', icon: 'i-lucide-log-in',         step: 3 },
    completed:  { label: 'Shift Completed',            color: 'success', icon: 'i-lucide-check-circle-2', step: 4 },
    paid:       { label: 'Payout Released',            color: 'success', icon: 'i-lucide-banknote',       step: 4 },
    rejected:   { label: 'Not Selected',               color: 'error',   icon: 'i-lucide-x-circle',       step: 0 },
  }
  return map[status] || { label: status, color: 'neutral', icon: 'i-lucide-circle', step: 0 }
}

// ── Admit Card ────────────────────────────────────────────────────────────────
const admitCardTarget = ref<{ app: GigApplication; gig: Gig } | null>(null)
const showAdmitCard = ref(false)

function openAdmitCard(app: GigApplication, gig: Gig) {
  admitCardTarget.value = { app, gig }
  showAdmitCard.value = true
}

function printAdmitCard() {
  const printSection = document.getElementById('admit-card-printable')
  if (!printSection) return

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Admit Card – HireReady</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; display: flex; justify-content: center; align-items: flex-start; padding: 24px; }
        .card { background: white; border-radius: 16px; overflow: hidden; width: 720px; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
        .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 28px 32px; }
        .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .logo { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
        .logo span { color: #a5b4fc; }
        .badge { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 999px; padding: 4px 14px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #e0e7ff; }
        .org { font-size: 13px; color: #c7d2fe; margin-top: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
        .title { font-size: 24px; font-weight: 800; margin-top: 6px; }
        .body { padding: 28px 32px; }
        .name-section { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px dashed #e2e8f0; }
        .candidate-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
        .candidate-name { font-size: 20px; font-weight: 800; color: #1e293b; margin-top: 4px; }
        .roll { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px; text-align: center; }
        .roll-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
        .roll-num { font-size: 18px; font-weight: 900; color: #4f46e5; font-family: monospace; margin-top: 2px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
        .field { }
        .field-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
        .field-value { font-size: 14px; font-weight: 600; color: #1e293b; }
        .full { grid-column: 1 / -1; }
        .instructions { margin-top: 20px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 16px; }
        .instructions-title { font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .instructions ul { padding-left: 16px; }
        .instructions li { font-size: 12px; color: #78350f; margin-bottom: 4px; line-height: 1.5; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; }
        .footer-note { font-size: 11px; color: #94a3b8; }
        .status-chip { background: #dcfce7; color: #166534; border: 1px solid #86efac; border-radius: 999px; padding: 4px 14px; font-size: 11px; font-weight: 700; }
        .escrow { font-size: 11px; color: #16a34a; font-weight: 600; }
        @media print {
          body { background: white; padding: 0; }
          .card { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      ${printSection.innerHTML}
    </body>
    </html>
  `)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 600)
}

// Generate a deterministic roll number from the application ID
function rollNumber(appId: string) {
  const hash = appId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-8)
  return `HR-${hash}`
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-black tracking-tight text-gray-950 dark:text-white">My Gig Applications</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Track all your 1-day shift applications. Download your admit card once accepted.
      </p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <UCard v-for="(stat, i) in [
        { label: 'Applied', value: myApplications.filter(a => a.status === 'applied').length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
        { label: 'Accepted', value: myApplications.filter(a => a.status === 'accepted').length, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
        { label: 'Completed', value: myApplications.filter(a => ['completed','paid'].includes(a.status)).length, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
        { label: 'Total Earned', value: '₹' + myApplications.filter(a => ['completed','paid'].includes(a.status)).reduce((s,a) => s + (a.payoutAmount || 0), 0).toLocaleString('en-IN'), color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
      ]" :key="i">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-xl" :class="stat.bg">
            <p :class="stat.color" class="text-lg font-black">{{ stat.value }}</p>
          </div>
          <p class="text-xs font-medium text-gray-500">{{ stat.label }}</p>
        </div>
      </UCard>
    </div>

    <!-- Applications list -->
    <div v-if="enriched.length > 0" class="space-y-4">
      <UCard
        v-for="{ app, gig } in enriched"
        :key="app.id"
        class="hover:shadow-md transition-shadow"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          <!-- Left: Gig info -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <UBadge
                :color="statusConfig(app.status).color as any"
                variant="subtle"
                :label="statusConfig(app.status).label"
                size="xs"
              />
              <span class="text-xs text-gray-400">Applied {{ formatDate(app.appliedAt) }}</span>
            </div>

            <h3 class="font-bold text-gray-900 dark:text-white">{{ gig.title }}</h3>
            <p class="text-sm text-gray-500 mt-0.5">{{ gig.organization }}</p>

            <div class="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-calendar" class="size-3.5 text-gray-400" />
                {{ gig.date }}
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-clock" class="size-3.5 text-gray-400" />
                {{ gig.shiftTime }}
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-map-pin" class="size-3.5 text-gray-400" />
                {{ gig.location }}, {{ gig.city }}
              </span>
              <span class="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <UIcon name="i-lucide-indian-rupee" class="size-3.5" />
                {{ (gig.dailyPay || 0).toLocaleString('en-IN') }} pay
              </span>
            </div>

            <!-- Progress steps -->
            <div class="mt-3 flex items-center gap-0">
              <template v-for="(step, si) in [
                { label: 'Applied' },
                { label: 'Accepted' },
                { label: 'On Duty' },
                { label: 'Paid' }
              ]" :key="si">
                <div class="flex flex-col items-center">
                  <div
                    class="grid size-6 place-items-center rounded-full text-[10px] font-bold border-2 transition-all"
                    :class="statusConfig(app.status).step > si
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : statusConfig(app.status).step === si + 1
                        ? 'bg-indigo-100 border-indigo-600 text-indigo-600 dark:bg-indigo-950'
                        : 'bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700'"
                  >
                    <UIcon v-if="statusConfig(app.status).step > si" name="i-lucide-check" class="size-3" />
                    <span v-else>{{ si + 1 }}</span>
                  </div>
                  <span class="mt-1 text-[9px] text-gray-400 whitespace-nowrap">{{ step.label }}</span>
                </div>
                <div
                  v-if="si < 3"
                  class="mb-3 h-px w-8 sm:w-12 transition-all"
                  :class="statusConfig(app.status).step > si + 1 ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'"
                />
              </template>
            </div>
          </div>

          <!-- Right: Actions -->
          <div class="flex flex-col gap-2 sm:items-end shrink-0">
            <!-- Admit Card button — only for accepted+ -->
            <UButton
              v-if="['accepted', 'checked_in'].includes(app.status)"
              label="Download Admit Card"
              icon="i-lucide-id-card"
              color="primary"
              size="sm"
              @click="openAdmitCard(app, gig)"
            />

            <div v-if="['completed', 'paid'].includes(app.status)" class="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <UIcon name="i-lucide-check-circle-2" class="size-4" />
              Payout: ₹{{ (app.payoutAmount || 0).toLocaleString('en-IN') }}
            </div>

            <div v-if="app.status === 'rejected'" class="text-xs text-gray-400">
              Not selected for this shift
            </div>

            <p class="text-[11px] text-gray-400">Roll: {{ rollNumber(app.id) }}</p>
          </div>

        </div>
      </UCard>
    </div>

    <!-- Empty state -->
    <UCard v-else>
      <div class="py-16 flex flex-col items-center gap-4 text-center">
        <div class="grid size-16 place-items-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
          <UIcon name="i-lucide-calendar-clock" class="size-8 text-indigo-400" />
        </div>
        <div>
          <p class="font-bold text-gray-900 dark:text-white">No gig applications yet</p>
          <p class="text-sm text-gray-500 mt-1 max-w-xs mx-auto">Browse available 1-day shifts and apply to earn ₹1,500–₹3,000 per shift.</p>
        </div>
        <UButton label="Browse 1-Day Shifts" icon="i-lucide-search" color="primary" to="/gigs" />
      </div>
    </UCard>

    <!-- ══════════════════════════════════════════════════════════════════════
         ADMIT CARD MODAL
         ══════════════════════════════════════════════════════════════════════ -->
    <UModal v-model:open="showAdmitCard" :ui="{ width: 'sm:max-w-2xl' }">
      <template #content>
        <div class="flex flex-col" style="max-height: 92vh;">

          <!-- Modal header -->
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0">
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">Shift Admit Card</h3>
              <p class="text-xs text-gray-500">Show this at the venue on the day of your shift</p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="showAdmitCard = false" />
          </div>

          <!-- Scrollable admit card content -->
          <div class="flex-1 overflow-y-auto p-6">
            <div v-if="admitCardTarget" id="admit-card-printable">
              <!-- THE ADMIT CARD (styled for both screen & print) -->
              <div class="card overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">

                <!-- Card Header -->
                <div class="header bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 p-6 text-white">
                  <div class="flex items-start justify-between">
                    <div>
                      <p class="text-xs font-bold uppercase tracking-widest text-indigo-300">HireReady Platform</p>
                      <p class="text-2xl font-black tracking-tight mt-1">
                        ADMIT CARD
                      </p>
                    </div>
                    <div class="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-200 backdrop-blur">
                      Official
                    </div>
                  </div>
                  <div class="mt-4 border-t border-white/20 pt-4">
                    <p class="text-xs text-indigo-300 uppercase tracking-widest">Duty Assignment</p>
                    <p class="text-xl font-bold text-white mt-0.5">{{ admitCardTarget.gig.title }}</p>
                    <p class="text-sm text-indigo-200 mt-0.5">{{ admitCardTarget.gig.organization }}</p>
                  </div>
                </div>

                <!-- Candidate Info -->
                <div class="bg-white dark:bg-gray-900 p-6">
                  <div class="flex items-start justify-between pb-5 border-b-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Candidate Name</p>
                      <p class="text-xl font-extrabold text-gray-900 dark:text-white mt-1">{{ admitCardTarget.app.candidateName }}</p>
                      <p class="text-sm text-gray-500 mt-0.5">{{ admitCardTarget.app.candidateEmail }}</p>
                    </div>
                    <div class="rounded-xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-800 p-3 text-center min-w-[100px]">
                      <p class="text-[9px] font-bold uppercase tracking-widest text-indigo-500">Roll Number</p>
                      <p class="text-base font-black text-indigo-700 dark:text-indigo-300 font-mono mt-1">{{ rollNumber(admitCardTarget.app.id) }}</p>
                    </div>
                  </div>

                  <!-- Details grid -->
                  <div class="grid grid-cols-2 gap-x-6 gap-y-4 mt-5">
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Shift Date</p>
                      <p class="text-sm font-bold text-gray-900 dark:text-white mt-1">{{ admitCardTarget.gig.date }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Shift Timing</p>
                      <p class="text-sm font-bold text-gray-900 dark:text-white mt-1">{{ admitCardTarget.gig.shiftTime }}</p>
                    </div>
                    <div class="col-span-2">
                      <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Venue / Reporting Location</p>
                      <p class="text-sm font-bold text-gray-900 dark:text-white mt-1">{{ admitCardTarget.gig.location }}</p>
                      <p class="text-xs text-gray-500">{{ admitCardTarget.gig.city }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Category</p>
                      <p class="text-sm font-bold text-gray-900 dark:text-white mt-1">{{ admitCardTarget.gig.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Stipend (UPI Payout)</p>
                      <p class="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{{ (admitCardTarget.app.payoutAmount || admitCardTarget.gig.dailyPay || 0).toLocaleString('en-IN') }}</p>
                    </div>
                    <div v-if="admitCardTarget.app.candidateMobile">
                      <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Registered Mobile</p>
                      <p class="text-sm font-bold text-gray-900 dark:text-white mt-1">{{ admitCardTarget.app.candidateMobile }}</p>
                    </div>
                    <div v-if="admitCardTarget.app.upiId">
                      <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">UPI ID (Payout)</p>
                      <p class="text-sm font-bold font-mono text-gray-900 dark:text-white mt-1">{{ admitCardTarget.app.upiId }}</p>
                    </div>
                  </div>

                  <!-- Instructions -->
                  <div class="mt-5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 p-4">
                    <p class="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                      <UIcon name="i-lucide-alert-triangle" class="size-3.5" />
                      Important Instructions
                    </p>
                    <ul class="space-y-1.5 text-xs text-amber-900 dark:text-amber-300">
                      <li class="flex items-start gap-1.5">
                        <UIcon name="i-lucide-dot" class="size-4 shrink-0 mt-px" />
                        Report <strong>30 minutes before</strong> shift start time with original Govt. photo ID.
                      </li>
                      <li v-if="admitCardTarget.gig.instructions" class="flex items-start gap-1.5">
                        <UIcon name="i-lucide-dot" class="size-4 shrink-0 mt-px" />
                        {{ admitCardTarget.gig.instructions }}
                      </li>
                      <li class="flex items-start gap-1.5">
                        <UIcon name="i-lucide-dot" class="size-4 shrink-0 mt-px" />
                        This admit card must be presented at the reporting desk.
                      </li>
                      <li class="flex items-start gap-1.5">
                        <UIcon name="i-lucide-dot" class="size-4 shrink-0 mt-px" />
                        UPI payout of <strong>₹{{ (admitCardTarget.app.payoutAmount || admitCardTarget.gig.dailyPay || 0).toLocaleString('en-IN') }}</strong> will be released after shift sign-off.
                      </li>
                    </ul>
                  </div>

                  <!-- Footer bar -->
                  <div class="mt-5 flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3">
                    <div class="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <UIcon name="i-lucide-shield-check" class="size-3.5" />
                      Escrow Protected Payout
                    </div>
                    <div class="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <UIcon name="i-lucide-badge-check" class="size-3.5" />
                      Status: Accepted
                    </div>
                    <p class="text-[10px] text-gray-400">Generated by HireReady</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- Sticky footer -->
          <div class="flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0 bg-white dark:bg-gray-900">
            <p class="text-xs text-gray-400 flex items-center gap-1">
              <UIcon name="i-lucide-printer" class="size-3.5" />
              Print or save as PDF from the print dialog
            </p>
            <div class="flex items-center gap-2">
              <UButton label="Close" color="neutral" variant="ghost" @click="showAdmitCard = false" />
              <UButton
                label="Print / Save PDF"
                icon="i-lucide-download"
                color="primary"
                @click="printAdmitCard"
              />
            </div>
          </div>

        </div>
      </template>
    </UModal>

  </div>
</template>
