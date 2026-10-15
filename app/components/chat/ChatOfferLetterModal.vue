<script setup lang="ts">
import type { Conversation, Application, ChatMessage } from '~/types/portal'

const props = defineProps<{
  modelValue: boolean
  conversation?: Conversation | null
  application?: Application | null
  candidateName?: string
  candidateEmail?: string
  jobTitle?: string
  companyName?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'sent', msg?: ChatMessage): void
}>()

const store = useDataStore()
const { currentUser } = useAuth()

const activeTab = ref<'details' | 'preview'>('details')

// Default joining date: 2 weeks from now
const twoWeeksLater = new Date()
twoWeeksLater.setDate(twoWeeksLater.getDate() + 14)
const defaultJoinDate = twoWeeksLater.toISOString().split('T')[0]

// Default expiry: 5 days from now
const fiveDaysLater = new Date()
fiveDaysLater.setDate(fiveDaysLater.getDate() + 5)
const defaultExpiryDate = fiveDaysLater.toISOString().split('T')[0]

const form = reactive({
  candidateName: '',
  candidateEmail: '',
  companyName: '',
  jobTitle: '',
  salary: '₹8,50,000 per annum',
  joiningDate: defaultJoinDate,
  workMode: 'Hybrid (3 days in office)',
  location: 'Bangalore / Remote',
  department: 'Engineering & Technology',
  expiryDate: defaultExpiryDate,
  authorizedSignatory: '',
  signatoryTitle: 'Head of Talent Acquisition',
  specialBenefits: 'Comprehensive Health Insurance, ₹25,000 Annual Learning Stipend, Flexible Hours'
})

watch(() => [props.conversation, props.application, props.candidateName, props.jobTitle, props.companyName], () => {
  const cName = props.candidateName || props.conversation?.candidateName || props.application?.candidateName || 'Candidate'
  const cEmail = props.candidateEmail || props.conversation?.candidateEmail || props.application?.email || ''
  const jTitle = props.jobTitle || props.conversation?.jobTitle || (props.application?.jobId ? store.getJobById(props.application.jobId)?.title : '') || 'Software Engineer'
  const comp = props.companyName || props.conversation?.companyName || (props.application?.jobId ? store.getJobById(props.application.jobId)?.company : '') || (currentUser.value as any)?.company || 'HireReady Partner Organization'

  form.candidateName = cName
  form.candidateEmail = cEmail
  form.jobTitle = jTitle
  form.companyName = comp
  form.authorizedSignatory = currentUser.value?.name || 'Talent Acquisition Team'
}, { immediate: true })

const isSubmitting = ref(false)

function handlePrint() {
  activeTab.value = 'preview'
  nextTick(() => {
    setTimeout(() => {
      window.print()
    }, 200)
  })
}

function handleDownloadText() {
  const content = generateFullLetterText()
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Offer_Letter_${form.candidateName.replace(/\s+/g, '_')}_${form.jobTitle.replace(/\s+/g, '_')}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function generateFullLetterText(): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return `
================================================================================
                           ${form.companyName.toUpperCase()}
                        OFFICIAL OFFER OF EMPLOYMENT
================================================================================

Date: ${today}

To:
${form.candidateName}
${form.candidateEmail ? `Email: ${form.candidateEmail}` : ''}

Dear ${form.candidateName},

On behalf of ${form.companyName}, we are delighted to offer you the position of ${form.jobTitle} within our ${form.department} department. We were thoroughly impressed by your skills, experience, and background, and believe you will make significant contributions to our team.

1. POSITION AND REPORTING:
   - Job Title: ${form.jobTitle}
   - Department: ${form.department}
   - Work Location / Mode: ${form.workMode} (${form.location})
   - Expected Start / Joining Date: ${form.joiningDate}

2. COMPENSATION & BENEFITS:
   - Annual Total Compensation: ${form.salary}
   - Benefits & Perks: ${form.specialBenefits}

3. TERMS AND CONDITIONS:
   - This offer is contingent upon successful verification of references and standard onboarding compliance.
   - Please confirm your acceptance of this offer by ${form.expiryDate}.

We are genuinely excited to welcome you to ${form.companyName} and look forward to building extraordinary solutions together.

Sincerely,

${form.authorizedSignatory}
${form.signatoryTitle}
${form.companyName}

--------------------------------------------------------------------------------
CANDIDATE ACCEPTANCE:
I, ${form.candidateName}, accept the offer of employment for the position of ${form.jobTitle} under the terms outlined above.

Signature: __________________________    Date: __________________________
================================================================================
`.trim()
}

async function handleSendToChat() {
  isSubmitting.value = true
  try {
    const targetConv = props.conversation || (props.application ? store.getOrCreateConversation({
      jobId: props.application.jobId,
      jobTitle: form.jobTitle,
      companyName: form.companyName,
      candidateId: props.application.candidateId,
      candidateName: form.candidateName,
      candidateEmail: form.candidateEmail,
      employerId: currentUser.value?.id || 'emp-demo',
      employerName: currentUser.value?.name || 'Hiring Lead',
      employerCompany: form.companyName,
      requestStatus: 'accepted'
    }) : null)

    if (!targetConv) return

    const quickAction: ChatMessage['quickAction'] = {
      type: 'offer_letter',
      title: `🏆 Formal Offer Extended: ${form.jobTitle}`,
      offerRole: form.jobTitle,
      offerCompany: form.companyName,
      offerSalary: form.salary,
      offerJoiningDate: form.joiningDate,
      offerLocation: form.location,
      offerWorkMode: form.workMode,
      offerDepartment: form.department,
      offerExpiryDate: form.expiryDate,
      offerStatus: 'pending',
      offerLetterContent: generateFullLetterText()
    }

    const offerMessageText = `🎉 Congratulations ${form.candidateName}! We are pleased to formally extend an Offer of Employment for the ${form.jobTitle} position at ${form.companyName}.\n\nAnnual Compensation: ${form.salary}\nJoining Date: ${form.joiningDate}\nWork Mode: ${form.workMode}\n\nPlease review the terms and click "Accept Offer" to confirm.`

    const msg = store.sendMessage({
      conversationId: targetConv.id,
      senderId: currentUser.value?.id || targetConv.employerId || 'emp-lead',
      senderName: form.companyName,
      senderRole: currentUser.value?.role === 'admin' ? 'admin' : 'employer',
      text: offerMessageText,
      quickAction
    })

    // If an application is matched, update status to selected and record offer
    if (props.application) {
      store.updateApplication(props.application.id, {
        status: 'selected',
        offerLetterDetails: {
          jobTitle: form.jobTitle,
          companyName: form.companyName,
          salary: form.salary,
          joiningDate: form.joiningDate,
          workMode: form.workMode,
          location: form.location,
          department: form.department,
          expiryDate: form.expiryDate,
          issuedAt: new Date().toISOString(),
          status: 'sent',
          letterContent: generateFullLetterText()
        }
      })
    }

    // In-app notification to candidate
    store.addNotification({
      userId: targetConv.candidateId,
      type: 'selection',
      title: `🎉 Offer Letter Received: ${form.companyName}`,
      message: `${form.companyName} has extended an official employment offer for ${form.jobTitle} (${form.salary}). Review and respond in Messages.`
    })

    emit('sent', msg)
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
    <div class="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 dark:border-gray-800 dark:bg-gray-900 animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
        <div class="flex items-center gap-2.5">
          <div class="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <UIcon name="i-lucide-file-badge" class="size-5" />
          </div>
          <div>
            <h3 class="font-bold text-sm text-gray-950 dark:text-white">1-Click Branded Offer Letter Generator</h3>
            <p class="text-xs text-gray-500">Generate, customize, print PDF, or send directly via candidate chat</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- View Switcher -->
          <div class="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-xs">
            <button
              type="button"
              class="px-2.5 py-1 rounded-md font-medium transition cursor-pointer"
              :class="activeTab === 'details' ? 'bg-white dark:bg-gray-900 shadow-2xs text-emerald-600 font-bold' : 'text-gray-500 hover:text-gray-900'"
              @click="activeTab = 'details'"
            >
              Offer Details
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-md font-medium transition cursor-pointer"
              :class="activeTab === 'preview' ? 'bg-white dark:bg-gray-900 shadow-2xs text-emerald-600 font-bold' : 'text-gray-500 hover:text-gray-900'"
              @click="activeTab = 'preview'"
            >
              Letterhead Preview 📄
            </button>
          </div>

          <button
            type="button"
            class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            @click="emit('update:modelValue', false)"
          >
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
        </div>
      </div>

      <!-- Tab 1: Offer Form Details -->
      <div v-show="activeTab === 'details'" class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Candidate Full Name</label>
            <input
              v-model="form.candidateName"
              type="text"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Candidate Email</label>
            <input
              v-model="form.candidateEmail"
              type="email"
              class="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Hiring Organization / Company</label>
            <input
              v-model="form.companyName"
              type="text"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Designation / Role Title</label>
            <input
              v-model="form.jobTitle"
              type="text"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Total Compensation / CTC</label>
            <input
              v-model="form.salary"
              type="text"
              placeholder="e.g. ₹9,00,000 / year"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Joining / Start Date</label>
            <input
              v-model="form.joiningDate"
              type="date"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Offer Expiration Date</label>
            <input
              v-model="form.expiryDate"
              type="date"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Work Mode</label>
            <select
              v-model="form.workMode"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="Full Remote">Full Remote</option>
              <option value="Hybrid (3 days office)">Hybrid (3 days office)</option>
              <option value="On-Site Full Time">On-Site Full Time</option>
              <option value="Flexible Shift">Flexible Shift</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <input
              v-model="form.location"
              type="text"
              placeholder="e.g. Bangalore / Remote"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Department</label>
            <input
              v-model="form.department"
              type="text"
              placeholder="e.g. Product Engineering"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Key Perks, Allowances &amp; Benefits</label>
          <input
            v-model="form.specialBenefits"
            type="text"
            placeholder="e.g. Health Insurance, Performance Bonus, Equity Stock Options"
            class="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Authorized Signatory Name</label>
            <input
              v-model="form.authorizedSignatory"
              type="text"
              class="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Signatory Title</label>
            <input
              v-model="form.signatoryTitle"
              type="text"
              class="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      <!-- Tab 2: Letterhead Preview -->
      <div v-show="activeTab === 'preview'" class="p-6 max-h-[70vh] overflow-y-auto bg-gray-100 dark:bg-gray-950/60">
        <div id="offer-letter-print-area" class="mx-auto max-w-2xl bg-white text-gray-900 p-8 rounded-xl shadow-lg border border-gray-200 font-sans text-xs leading-relaxed">
          <!-- Corporate Header -->
          <div class="flex items-center justify-between border-b-2 border-emerald-600 pb-4 mb-6">
            <div>
              <h1 class="text-xl font-black text-gray-950 tracking-tight">{{ form.companyName }}</h1>
              <p class="text-[11px] text-gray-500">Official Employment Offer &amp; Appointment Contract</p>
            </div>
            <div class="text-right">
              <span class="inline-block rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold">
                HIRED READY VERIFIED 🛡️
              </span>
              <p class="text-[10px] text-gray-400 mt-1">Date: {{ new Date().toLocaleDateString() }}</p>
            </div>
          </div>

          <!-- Salutation -->
          <div class="mb-4">
            <p class="font-bold text-gray-900">Dear {{ form.candidateName }},</p>
            <p class="mt-2 text-gray-600 leading-normal">
              On behalf of <strong>{{ form.companyName }}</strong>, we are thrilled to offer you the position of
              <strong class="text-gray-950">{{ form.jobTitle }}</strong> in our {{ form.department }} team.
              We believe your background and skills will be an invaluable asset to our mission.
            </p>
          </div>

          <!-- Table of Terms -->
          <div class="my-4 rounded-lg border border-gray-200 overflow-hidden">
            <div class="grid grid-cols-2 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50 p-2 font-bold text-[11px]">
              <div>Position &amp; Role Details</div>
              <div>Terms</div>
            </div>
            <div class="divide-y divide-gray-100">
              <div class="grid grid-cols-2 divide-x divide-gray-200 p-2 text-[11px]">
                <span class="text-gray-500">Designation</span>
                <span class="font-semibold text-gray-900">{{ form.jobTitle }}</span>
              </div>
              <div class="grid grid-cols-2 divide-x divide-gray-200 p-2 text-[11px]">
                <span class="text-gray-500">Annual CTC / Compensation</span>
                <span class="font-bold text-emerald-700">{{ form.salary }}</span>
              </div>
              <div class="grid grid-cols-2 divide-x divide-gray-200 p-2 text-[11px]">
                <span class="text-gray-500">Joining Date</span>
                <span class="font-semibold text-gray-900">{{ form.joiningDate }}</span>
              </div>
              <div class="grid grid-cols-2 divide-x divide-gray-200 p-2 text-[11px]">
                <span class="text-gray-500">Work Arrangement</span>
                <span class="text-gray-700">{{ form.workMode }} ({{ form.location }})</span>
              </div>
              <div class="grid grid-cols-2 divide-x divide-gray-200 p-2 text-[11px]">
                <span class="text-gray-500">Benefits &amp; Allowances</span>
                <span class="text-gray-700">{{ form.specialBenefits }}</span>
              </div>
              <div class="grid grid-cols-2 divide-x divide-gray-200 p-2 text-[11px]">
                <span class="text-gray-500">Offer Expiration</span>
                <span class="text-amber-800 font-medium">Valid until {{ form.expiryDate }}</span>
              </div>
            </div>
          </div>

          <!-- Standard Terms -->
          <div class="my-4 space-y-2 text-[10px] text-gray-500 leading-normal border-t border-gray-100 pt-3">
            <p><strong>Contingencies:</strong> This offer is subject to satisfactory reference verification and academic credential validation.</p>
            <p><strong>Acceptance:</strong> Please confirm your acceptance by signing electronically via the HireReady portal or returning a signed copy by {{ form.expiryDate }}.</p>
          </div>

          <!-- Signatures -->
          <div class="mt-8 pt-4 border-t border-gray-200 flex items-end justify-between">
            <div>
              <p class="font-serif italic text-base text-gray-800 mb-1">{{ form.authorizedSignatory }}</p>
              <div class="w-36 h-0.5 bg-gray-400 mb-1" />
              <p class="font-bold text-gray-950">{{ form.authorizedSignatory }}</p>
              <p class="text-[10px] text-gray-500">{{ form.signatoryTitle }}, {{ form.companyName }}</p>
            </div>

            <div class="text-right">
              <div class="w-36 h-0.5 bg-gray-400 mb-1 ml-auto" />
              <p class="font-bold text-gray-950">Candidate Acceptance</p>
              <p class="text-[10px] text-gray-500">{{ form.candidateName }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer"
            @click="handlePrint"
          >
            <UIcon name="i-lucide-printer" class="size-3.5" />
            <span>Print / Save PDF</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer"
            @click="handleDownloadText"
          >
            <UIcon name="i-lucide-download" class="size-3.5" />
            <span>Export Text</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            label="Cancel"
            @click="emit('update:modelValue', false)"
          />
          <UButton
            color="success"
            size="sm"
            icon="i-lucide-send"
            :loading="isSubmitting"
            label="Send Official Offer into Chat"
            @click="handleSendToChat"
          />
        </div>
      </div>
    </div>
  </div>
</template>
