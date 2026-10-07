<script setup lang="ts">
const route = useRoute()
const { currentUser, updateCurrentUser } = useAuth()
const store = useDataStore()

onMounted(async () => {
  await store.syncWithDatabase()
  if (route.query.role === 'candidate') {
    activeTab.value = 'candidate'
  } else if (route.query.role === 'employer' || route.query.role === 'recruiter') {
    activeTab.value = 'employer'
  }
})

// Tab selection
const activeTab = ref<'employer' | 'candidate' | 'escrow'>('employer')

// Checkout Modal State
const showCheckoutModal = ref(false)
const selectedPlan = ref<{
  id: string
  name: string
  price: number
  priceDisplay: string
  billing: string
  forRole: 'employer' | 'candidate'
  credits?: number
  features: string[]
} | null>(null)

const checkoutProcessing = ref(false)
const checkoutSuccess = ref(false)
const selectedPaymentMethod = ref('upi')

function openCheckout(plan: any) {
  selectedPlan.value = plan
  checkoutSuccess.value = false
  showCheckoutModal.value = true
}

async function handleCompleteCheckout() {
  if (!selectedPlan.value) return

  checkoutProcessing.value = true
  await new Promise(r => setTimeout(r, 1200)) // smooth realistic payment processing

  try {
    if (currentUser.value?.id) {
      if (selectedPlan.value.forRole === 'employer') {
        const credits = selectedPlan.value.credits || 15
        const existingCredits = (currentUser.value as any).creditsRemaining || 0
        const newCredits = existingCredits + credits

        store.updateUser(currentUser.value.id, {
          creditsRemaining: newCredits,
          activePlan: selectedPlan.value.name
        } as any)

        updateCurrentUser({
          creditsRemaining: newCredits,
          activePlan: selectedPlan.value.name
        } as any)
      } else if (selectedPlan.value.forRole === 'candidate') {
        // Upgrade candidate to FastTrack Pro
        store.updateUser(currentUser.value.id, {
          activePlan: 'FastTrack Pro'
        } as any)

        const prof = store.getProfileByUserId(currentUser.value.id)
        if (prof) {
          store.upsertProfile({
            ...prof,
            isFastTrackPro: true,
            fastTrackBadge: 'Verified FastTrack Pro'
          })
        }

        updateCurrentUser({
          activePlan: 'FastTrack Pro'
        } as any)
      }
    }

    checkoutSuccess.value = true
  } finally {
    checkoutProcessing.value = false
  }
}

// ── Plans Data ────────────────────────────────────────────────────────────────
const employerPlans = [
  {
    id: 'emp_featured',
    name: 'Featured Urgent Job Boost',
    badge: 'Single Opening',
    price: 999,
    priceDisplay: '₹999',
    billing: 'per job post',
    forRole: 'employer' as const,
    description: 'Pin your critical position to the top of the board with maximum candidate reach.',
    features: [
      'Pinned #1 on HireReady Job Board',
      'Glowing "🔥 Featured Urgent" Badge',
      'Targeted email blast to top 200 matched candidates',
      '7x more candidate views & faster applications',
      'Active for 30 days'
    ],
    cta: 'Boost a Job opening',
    popular: false
  },
  {
    id: 'emp_pro',
    name: 'Recruiter Pro Pack',
    badge: 'Most Popular',
    price: 3999,
    priceDisplay: '₹3,999',
    billing: 'per month',
    forRole: 'employer' as const,
    credits: 50,
    description: 'The complete hiring toolkit for fast-growing companies and recruitment agencies.',
    features: [
      '50 Candidate Contact & Resume Unlocks (Direct Mobile & Email)',
      '3 Featured Urgent Job Boosts included (worth ₹2,997)',
      '1-Click PDF Resume Downloads',
      'Instant Candidate Match Score (%) on all applicants',
      'Priority Matching for 1-Day Duty Rosters',
      '10% CSR Education Pledge included'
    ],
    cta: 'Get Recruiter Pro',
    popular: true
  },
  {
    id: 'emp_enterprise',
    name: 'Corporate & Campus Drive',
    badge: 'High Volume',
    price: 8999,
    priceDisplay: '₹8,999',
    billing: 'per quarter',
    forRole: 'employer' as const,
    credits: 150,
    description: 'Designed for institutions, large enterprises, and exam conduction bodies.',
    features: [
      '150 Candidate Contact & Resume Unlocks',
      'Unlimited Job Posts for 90 days',
      'Dedicated Account & Placement Coordinator',
      'Campus Drive & College Batch Access',
      'Custom MCQ Question Bank upload',
      'Formal CSR Impact Certificate'
    ],
    cta: 'Select Enterprise',
    popular: false
  }
]

const candidatePlans = [
  {
    id: 'cand_free',
    name: 'Standard Job Seeker',
    badge: 'Always Free',
    price: 0,
    priceDisplay: '₹0',
    billing: 'forever free',
    forRole: 'candidate' as const,
    description: 'Explore full-time jobs and sign up for 1-day duty shifts across your city.',
    features: [
      'Apply to unlimited full-time job openings',
      'Direct profile delivery to hiring partners (₹0 fee)',
      'Sign up for 1-Day micro-duties (exam duty, events)',
      'Download 1-Day Duty Admit Card with venue info',
      'Basic MCQ skill assessments'
    ],
    cta: 'Current Free Plan',
    popular: false
  },
  {
    id: 'cand_pro',
    name: 'Candidate FastTrack Pro ⚡',
    badge: 'Career Booster',
    price: 399,
    priceDisplay: '₹399',
    billing: 'one-time lifetime',
    forRole: 'candidate' as const,
    description: 'Stand out at the very top of recruiter applicant lists and get hired 4x faster.',
    features: [
      '⚡ "Verified Talent" Pro Checkmark badge on profile',
      'Top Ranking on Recruiter Dashboards (flagged as Priority Applicant)',
      '2-Hour Early Access to high-paying 1-Day Duty Shifts before standard candidates',
      '1-Click ATS-Optimized PDF Resume Generator',
      'Verified Skill Assessment Certificate for LinkedIn',
      '10% of fee donated to the Student Education Fund'
    ],
    cta: 'Upgrade to FastTrack Pro',
    popular: true
  }
]

// ── FAQs ──────────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: 'How does the 10% Social Impact Pledge work?',
    a: '10% of every subscription and employer platform fee is allocated directly to our Student Education Support Fund, which sponsors examination fees, interview attire, and certification courses for economically underprivileged candidates.'
  },
  {
    q: 'How do Recruiter Unlock Credits work?',
    a: 'You can freely browse candidate profiles, test scores, and experience on the HireReady candidate directory. 1 credit unlocks a candidate’s direct mobile number, email address, and full PDF resume.'
  },
  {
    q: 'Can I pay via UPI, Credit Card, or Corporate Netbanking?',
    a: 'Yes. When our live payment gateway goes active, we support all Indian UPI apps (Google Pay, PhonePe, Paytm), Netbanking, and Credit/Debit cards via Razorpay/Stripe.'
  },
  {
    q: 'What is the refund policy?',
    a: 'If a candidate unlocked via credits does not respond within 7 days, our recruiter guarantee provides an automatic credit refund to your balance.'
  }
]
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12 dark:bg-gray-950">
    <UContainer class="max-w-6xl space-y-12">

      <!-- ── Header Section ───────────────────────────────────────────────── -->
      <div class="text-center space-y-4 max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
          <UIcon name="i-lucide-sparkles" class="size-4" />
          <span>Fair, Transparent &amp; Purpose-Driven Pricing</span>
        </div>

        <h1 class="text-4xl font-black tracking-tight text-gray-950 dark:text-white sm:text-5xl">
          Hire Verified Talent Faster. <br />
          <span class="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">Empower Careers with Every Plan.</span>
        </h1>

        <p class="text-base text-gray-600 dark:text-gray-400">
          Whether you are an organization recruiting full-time talent or a candidate accelerating your career, HireReady offers clear, performance-backed plans.
        </p>

        <!-- Role Toggle Tabs -->
        <div class="mt-8 inline-flex rounded-2xl bg-gray-200/80 p-1.5 dark:bg-gray-800/80">
          <button
            class="rounded-xl px-5 py-2.5 text-xs font-bold transition-all sm:text-sm"
            :class="activeTab === 'employer' ? 'bg-white text-gray-950 shadow-md dark:bg-gray-900 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
            @click="activeTab = 'employer'"
          >
            🏢 For Employers &amp; Recruiters
          </button>
          <button
            class="rounded-xl px-5 py-2.5 text-xs font-bold transition-all sm:text-sm"
            :class="activeTab === 'candidate' ? 'bg-white text-gray-950 shadow-md dark:bg-gray-900 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
            @click="activeTab = 'candidate'"
          >
            🎓 For Candidates &amp; Students
          </button>
          <button
            class="rounded-xl px-5 py-2.5 text-xs font-bold transition-all sm:text-sm"
            :class="activeTab === 'escrow' ? 'bg-white text-gray-950 shadow-md dark:bg-gray-900 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
            @click="activeTab = 'escrow'"
          >
            ⚖️ 1-Day Duty Escrow Margin
          </button>
        </div>
      </div>

      <!-- ── Social Impact / CSR Pledge Banner ────────────────────────────── -->
      <div class="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-6 shadow-xs dark:border-emerald-900/60 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-4">
            <div class="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <UIcon name="i-lucide-heart-handshake" class="size-6" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-gray-950 dark:text-white text-base">HireReady 10% Social Impact Pledge</h3>
                <UBadge color="success" size="xs" variant="solid" label="CSR Compliant" />
              </div>
              <p class="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-2xl">
                For every subscription purchased and 1-day duty completed, <strong>10% of our platform fee</strong> is dedicated to funding examination entrance fees, professional resumes, and skill kits for economically disadvantaged youth across India.
              </p>
            </div>
          </div>
          <div class="shrink-0 text-right sm:text-left">
            <span class="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs dark:bg-emerald-900/40 dark:text-emerald-300">
              <UIcon name="i-lucide-shield-check" class="size-4" />
              Tax &amp; CSR Audit Compliant
            </span>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════════
           TAB 1: EMPLOYER / RECRUITER PLANS
           ══════════════════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'employer'" class="space-y-8">
        <div class="grid gap-6 lg:grid-cols-3">
          <div
            v-for="plan in employerPlans"
            :key="plan.id"
            class="relative flex flex-col rounded-3xl bg-white p-7 shadow-xl transition-transform hover:-translate-y-1 dark:bg-gray-900"
            :class="plan.popular ? 'border-2 border-emerald-500 ring-4 ring-emerald-500/10' : 'border border-gray-200 dark:border-gray-800'"
          >
            <!-- Badge -->
            <div class="flex items-center justify-between">
              <span
                class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                :class="plan.popular ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'"
              >
                {{ plan.badge }}
              </span>
              <span v-if="plan.credits" class="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {{ plan.credits }} Unlocks
              </span>
            </div>

            <!-- Title & Price -->
            <div class="mt-4 space-y-2">
              <h3 class="text-xl font-black text-gray-950 dark:text-white">{{ plan.name }}</h3>
              <p class="text-xs text-gray-500 min-h-[32px]">{{ plan.description }}</p>
              <div class="flex items-baseline gap-1 pt-2">
                <span class="text-4xl font-black tracking-tight text-gray-950 dark:text-white">{{ plan.priceDisplay }}</span>
                <span class="text-xs text-gray-400">/ {{ plan.billing }}</span>
              </div>
            </div>

            <!-- Features -->
            <ul class="mt-6 flex-1 space-y-3 border-t border-gray-100 py-6 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-300">
              <li v-for="(feat, idx) in plan.features" :key="idx" class="flex items-start gap-2.5">
                <UIcon name="i-lucide-check-circle" class="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <span>{{ feat }}</span>
              </li>
            </ul>

            <!-- CTA -->
            <div class="pt-4">
              <UButton
                block
                size="lg"
                :color="plan.popular ? 'primary' : 'neutral'"
                :variant="plan.popular ? 'solid' : 'outline'"
                :label="plan.cta"
                icon="i-lucide-arrow-right"
                @click="openCheckout(plan)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════════
           TAB 2: CANDIDATE PLANS
           ══════════════════════════════════════════════════════════════════════ -->
      <div v-else-if="activeTab === 'candidate'" class="space-y-8">
        <div class="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          <div
            v-for="plan in candidatePlans"
            :key="plan.id"
            class="relative flex flex-col rounded-3xl bg-white p-8 shadow-xl dark:bg-gray-900"
            :class="plan.popular ? 'border-2 border-indigo-500 ring-4 ring-indigo-500/10' : 'border border-gray-200 dark:border-gray-800'"
          >
            <div class="flex items-center justify-between">
              <span
                class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                :class="plan.popular ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'"
              >
                {{ plan.badge }}
              </span>
              <span v-if="plan.popular" class="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                1-Time Payment
              </span>
            </div>

            <div class="mt-4 space-y-2">
              <h3 class="text-2xl font-black text-gray-950 dark:text-white">{{ plan.name }}</h3>
              <p class="text-xs text-gray-500">{{ plan.description }}</p>
              <div class="flex items-baseline gap-1 pt-2">
                <span class="text-4xl font-black tracking-tight text-gray-950 dark:text-white">{{ plan.priceDisplay }}</span>
                <span class="text-xs text-gray-400">/ {{ plan.billing }}</span>
              </div>
            </div>

            <ul class="mt-6 flex-1 space-y-3.5 border-t border-gray-100 py-6 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-300">
              <li v-for="(feat, idx) in plan.features" :key="idx" class="flex items-start gap-2.5">
                <UIcon name="i-lucide-check-circle" class="size-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                <span>{{ feat }}</span>
              </li>
            </ul>

            <div class="pt-4">
              <UButton
                block
                size="lg"
                :color="plan.popular ? 'primary' : 'neutral'"
                :variant="plan.popular ? 'solid' : 'soft'"
                :label="plan.cta"
                icon="i-lucide-zap"
                @click="openCheckout(plan)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════════
           TAB 3: 1-DAY DUTY ESCROW PLATFORM MARGIN EXPLAINER
           ══════════════════════════════════════════════════════════════════════ -->
      <div v-else-if="activeTab === 'escrow'" class="space-y-8">
        <UCard class="border border-gray-200 dark:border-gray-800">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-black text-gray-950 dark:text-white">How 1-Day Duty Platform Margins Work</h3>
                <p class="text-xs text-gray-500">Transparent pricing per duty shift with 0 hidden deductions</p>
              </div>
              <UBadge color="primary" variant="subtle" label="Escrow Guaranteed" />
            </div>
          </template>

          <div class="grid gap-6 md:grid-cols-3 py-4">
            <!-- Box 1 -->
            <div class="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
              <div class="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                <UIcon name="i-lucide-user-check" class="size-5" />
                <span>Candidate Net Payout (80%)</span>
              </div>
              <p class="mt-2 text-3xl font-black text-gray-950 dark:text-white">₹1,600</p>
              <p class="mt-1 text-xs text-gray-500">Released directly to the candidate's verified UPI ID right after check-in and shift completion.</p>
            </div>

            <!-- Box 2 -->
            <div class="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
              <div class="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                <UIcon name="i-lucide-shield-check" class="size-5" />
                <span>HireReady Platform Fee (15%)</span>
              </div>
              <p class="mt-2 text-3xl font-black text-gray-950 dark:text-white">₹300</p>
              <p class="mt-1 text-xs text-gray-500">Covers candidate ID verification, attendance QR tracking, replacement guarantee, and escrow safety.</p>
            </div>

            <!-- Box 3 -->
            <div class="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
              <div class="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm">
                <UIcon name="i-lucide-graduation-cap" class="size-5" />
                <span>CSR Education Pledge (5%)</span>
              </div>
              <p class="mt-2 text-3xl font-black text-gray-950 dark:text-white">₹100</p>
              <p class="mt-1 text-xs text-gray-500">Dedicated fund that sponsors competitive examination books &amp; college fees for low-income candidates.</p>
            </div>
          </div>

          <div class="mt-6 rounded-2xl bg-gray-50 p-5 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p class="text-sm font-bold text-gray-950 dark:text-white">Total Employer Deposit per Duty Slot:</p>
              <p class="text-xs text-gray-500">Held safely in escrow and released only when duties are performed to satisfaction.</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-3xl font-black text-gray-950 dark:text-white">₹2,000</span>
              <UButton to="/employer/gigs" color="primary" label="Post a 1-Day Duty" icon="i-lucide-plus" size="sm" />
            </div>
          </div>
        </UCard>
      </div>

      <!-- ── FAQs Section ─────────────────────────────────────────────────── -->
      <div class="border-t border-gray-200 pt-12 dark:border-gray-800 space-y-6">
        <div class="text-center">
          <h2 class="text-2xl font-black text-gray-950 dark:text-white">Frequently Asked Questions</h2>
          <p class="mt-1 text-xs text-gray-500">Everything you need to know about plans, unlocks, and our social impact fund.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
          <div
            v-for="(faq, idx) in faqs"
            :key="idx"
            class="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900"
          >
            <h3 class="font-bold text-sm text-gray-950 dark:text-white">{{ faq.q }}</h3>
            <p class="mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{{ faq.a }}</p>
          </div>
        </div>
      </div>

    </UContainer>

    <!-- ════════════════════════════════════════════════════════════════════════
         CHECKOUT / DEMO GATEWAY MODAL (Ready for Razorpay / Stripe Keys)
         ════════════════════════════════════════════════════════════════════════ -->
    <div
      v-if="showCheckoutModal && selectedPlan"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 sm:p-8">

        <!-- Close Button -->
        <div class="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div class="flex items-center gap-2">
            <div class="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <UIcon name="i-lucide-lock" class="size-5" />
            </div>
            <div>
              <h3 class="font-bold text-base text-gray-950 dark:text-white">Secure Checkout</h3>
              <p class="text-[11px] text-gray-500">HireReady Payment &amp; Activation Gateway</p>
            </div>
          </div>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-white" @click="showCheckoutModal = false">
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
        </div>

        <!-- Success Screen -->
        <div v-if="checkoutSuccess" class="py-8 text-center space-y-4">
          <div class="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <UIcon name="i-lucide-check-circle" class="size-10" />
          </div>
          <div>
            <h4 class="text-xl font-bold text-gray-950 dark:text-white">Plan Activated Successfully!</h4>
            <p class="mt-1 text-xs text-gray-500">
              Your account has been upgraded to <strong>{{ selectedPlan.name }}</strong>.
              <span v-if="selectedPlan.credits"> {{ selectedPlan.credits }} unlocks have been added to your balance.</span>
            </p>
          </div>
          <div class="pt-2">
            <UButton
              color="primary"
              label="Return to Dashboard"
              icon="i-lucide-arrow-right"
              @click="showCheckoutModal = false"
            />
          </div>
        </div>

        <!-- Checkout Form -->
        <div v-else class="space-y-5 pt-4">
          <!-- Order Summary Card -->
          <div class="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500 font-medium">Selected Plan:</span>
              <span class="text-sm font-bold text-gray-950 dark:text-white">{{ selectedPlan.name }}</span>
            </div>
            <div class="flex items-center justify-between border-t border-gray-200/50 pt-2 dark:border-gray-700/50">
              <span class="text-xs text-gray-500 font-medium">10% Social Impact Allocation:</span>
              <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">₹{{ Math.round(selectedPlan.price * 0.1) }} (CSR)</span>
            </div>
            <div class="flex items-center justify-between border-t border-gray-200/50 pt-2 dark:border-gray-700/50 text-base font-black">
              <span class="text-gray-950 dark:text-white">Total Amount:</span>
              <span class="text-emerald-600 dark:text-emerald-400">{{ selectedPlan.priceDisplay }}</span>
            </div>
          </div>

          <!-- Payment Method Selector -->
          <div class="space-y-2">
            <label class="text-xs font-bold text-gray-700 dark:text-gray-300">Choose Payment Method</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                class="flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all"
                :class="selectedPaymentMethod === 'upi' ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold' : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'"
                @click="selectedPaymentMethod = 'upi'"
              >
                <UIcon name="i-lucide-qr-code" class="size-5 mb-1" />
                <span class="text-xs">UPI / QR</span>
              </button>

              <button
                type="button"
                class="flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all"
                :class="selectedPaymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold' : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'"
                @click="selectedPaymentMethod = 'card'"
              >
                <UIcon name="i-lucide-credit-card" class="size-5 mb-1" />
                <span class="text-xs">Cards</span>
              </button>

              <button
                type="button"
                class="flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all"
                :class="selectedPaymentMethod === 'netbanking' ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold' : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'"
                @click="selectedPaymentMethod = 'netbanking'"
              >
                <UIcon name="i-lucide-landmark" class="size-5 mb-1" />
                <span class="text-xs">NetBanking</span>
              </button>
            </div>
          </div>

          <!-- Razorpay / Gateway notice -->
          <div class="rounded-xl bg-blue-50/60 p-3 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 flex items-center gap-2">
            <UIcon name="i-lucide-shield-check" class="size-4 shrink-0" />
            <span>Ready for Razorpay / Stripe gateway live key integration. Test activation is enabled below.</span>
          </div>

          <!-- Action Button -->
          <div class="pt-2">
            <UButton
              block
              size="lg"
              color="primary"
              :label="selectedPlan.price === 0 ? 'Activate Free Plan' : `Pay ${selectedPlan.priceDisplay} & Activate Plan`"
              icon="i-lucide-check-circle"
              :loading="checkoutProcessing"
              @click="handleCompleteCheckout"
            />
          </div>
        </div>

      </div>
    </div>

  </div>
</template>
