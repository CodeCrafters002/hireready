<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const store = useDataStore()

// ── State ─────────────────────────────────────────────────────────────────────
const allQuestions = ref(store.getQuestions())
const jobs = computed(() => store.getJobs())

/** Selected job tab. null = show all / global questions */
const filterJobId = ref<string | null>(null)

/** Questions shown based on active job tab */
const filteredQuestions = computed(() => {
  if (!filterJobId.value) {
    // "All / Global" tab — show questions with no job attached
    return allQuestions.value.filter(q => !q.jobId)
  }
  return allQuestions.value.filter(q => q.jobId === filterJobId.value)
})

const allCount = computed(() => allQuestions.value.filter(q => !q.jobId).length)

function countForJob(jobId: string) {
  return allQuestions.value.filter(q => q.jobId === jobId).length
}

// ── Form ──────────────────────────────────────────────────────────────────────
const showForm = ref(false)
const editingId = ref<string | null>(null)
const confirmDelete = ref<string | null>(null)

const form = reactive({
  question: '',
  option0: '', option1: '', option2: '', option3: '',
  correctIndex: 0,
  category: '',
  enabled: true,
  jobId: '' as string,   // empty = global
})

function resetForm() {
  Object.assign(form, {
    question: '', option0: '', option1: '', option2: '', option3: '',
    correctIndex: 0, category: '', enabled: true,
    jobId: filterJobId.value || ''   // pre-fill to active tab
  })
  editingId.value = null
}

function openCreate() { resetForm(); showForm.value = true }

function openEdit(id: string) {
  const q = allQuestions.value.find(q => q.id === id)
  if (!q) return
  editingId.value = id
  Object.assign(form, {
    question: q.question,
    option0: q.options[0] ?? '',
    option1: q.options[1] ?? '',
    option2: q.options[2] ?? '',
    option3: q.options[3] ?? '',
    correctIndex: q.correctIndex,
    category: q.category,
    enabled: q.enabled,
    jobId: q.jobId ?? ''
  })
  showForm.value = true
}

function saveQuestion() {
  const options = [form.option0, form.option1, form.option2, form.option3]
  const jobId = form.jobId || undefined
  const jobTitle = jobId ? (jobs.value.find(j => j.id === jobId)?.title ?? '') : undefined

  const payload = {
    question: form.question,
    options,
    correctIndex: form.correctIndex,
    category: form.category,
    enabled: form.enabled,
    jobId,
    jobTitle
  }

  if (editingId.value) {
    store.updateQuestion(editingId.value, payload)
  } else {
    store.createQuestion(payload)
  }
  allQuestions.value = store.getQuestions()
  showForm.value = false
  resetForm()
}

function toggleEnabled(id: string) {
  const q = allQuestions.value.find(q => q.id === id)
  if (q) {
    store.updateQuestion(id, { enabled: !q.enabled })
    allQuestions.value = store.getQuestions()
  }
}

function deleteQuestion(id: string) {
  store.deleteQuestion(id)
  allQuestions.value = store.getQuestions()
  confirmDelete.value = null
}

const correctIndexOptions = [
  { label: 'Option A', value: 0 },
  { label: 'Option B', value: 1 },
  { label: 'Option C', value: 2 },
  { label: 'Option D', value: 3 }
]

/** Job select options for the form dropdown */
const jobOptions = computed(() => [
  { label: '🌐 Global (applies to all jobs)', value: '' },
  ...jobs.value.map(j => ({ label: j.title, value: j.id }))
])
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-950 dark:text-white">MCQ Questions</h2>
        <p class="mt-1 text-sm text-gray-500">
          {{ allQuestions.length }} total ·
          {{ allQuestions.filter(q => q.enabled).length }} enabled ·
          Create questions for specific jobs or global questions that apply to all roles.
        </p>
      </div>
      <UButton label="Add Question" icon="i-lucide-plus" @click="openCreate" />
    </div>

    <!-- Job Tab Filter -->
    <div class="mb-6 flex flex-wrap gap-2">
      <UButton
        size="sm"
        :variant="filterJobId === null ? 'solid' : 'outline'"
        color="neutral"
        @click="filterJobId = null"
      >
        🌐 Global Questions
        <UBadge class="ml-1.5" :color="filterJobId === null ? 'primary' : 'neutral'" variant="subtle" :label="String(allCount)" size="xs" />
      </UButton>
      <UButton
        v-for="job in jobs"
        :key="job.id"
        size="sm"
        :variant="filterJobId === job.id ? 'solid' : 'outline'"
        :color="filterJobId === job.id ? 'primary' : 'neutral'"
        @click="filterJobId = job.id"
      >
        {{ job.title }}
        <UBadge class="ml-1.5" :color="filterJobId === job.id ? 'primary' : 'neutral'" variant="subtle" :label="String(countForJob(job.id))" size="xs" />
      </UButton>
    </div>

    <!-- Active section context -->
    <div class="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/20">
      <p class="text-sm text-blue-700 dark:text-blue-300">
        <span v-if="!filterJobId">
          <strong>Global Questions</strong> — These questions apply to all jobs as fallback when a specific job doesn't have enough questions.
        </span>
        <span v-else>
          <strong>{{ jobs.find(j => j.id === filterJobId)?.title }} Questions</strong> —
          Candidates applying for this role will get these questions first.
          {{ countForJob(filterJobId!) < 5 ? `⚠️ Only ${countForJob(filterJobId!)} question(s) — add ${5 - countForJob(filterJobId!)} more or candidates will see global questions to fill the gap.` : `✅ ${countForJob(filterJobId!)} questions available.` }}
        </span>
      </p>
    </div>

    <!-- Add/Edit Form Modal -->
    <UModal v-model:open="showForm">
      <template #content>
        <UCard class="max-h-[90vh] overflow-y-auto">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-950 dark:text-white">
                {{ editingId ? 'Edit Question' : 'New Question' }}
              </h3>
              <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="showForm = false" />
            </div>
          </template>

          <form class="space-y-5" @submit.prevent="saveQuestion">
            <!-- Job assignment — key field -->
            <UFormField label="Assign to Job" required>
              <USelectMenu
                v-model="form.jobId"
                :items="jobOptions"
                value-key="value"
                class="w-full"
                placeholder="Select a job or leave as Global"
              />
              <p class="mt-1 text-xs text-gray-400">
                Choose a specific job to lock this question to that role, or select "Global" to include it as a fallback for all jobs.
              </p>
            </UFormField>

            <!-- Question text -->
            <UFormField label="Question" required>
              <UTextarea v-model="form.question" class="w-full" :rows="3" placeholder="Enter the MCQ question…" />
            </UFormField>

            <!-- Answer options -->
            <div class="grid gap-3 sm:grid-cols-2">
              <UFormField label="Option A" required>
                <UInput v-model="form.option0" class="w-full" placeholder="First option" />
              </UFormField>
              <UFormField label="Option B" required>
                <UInput v-model="form.option1" class="w-full" placeholder="Second option" />
              </UFormField>
              <UFormField label="Option C" required>
                <UInput v-model="form.option2" class="w-full" placeholder="Third option" />
              </UFormField>
              <UFormField label="Option D" required>
                <UInput v-model="form.option3" class="w-full" placeholder="Fourth option" />
              </UFormField>
            </div>

            <!-- Correct answer + category -->
            <div class="grid gap-3 sm:grid-cols-2">
              <UFormField label="Correct Answer">
                <USelectMenu v-model="form.correctIndex" :items="correctIndexOptions" value-key="value" class="w-full" />
              </UFormField>
              <UFormField label="Category / Topic">
                <UInput v-model="form.category" class="w-full" placeholder="e.g. Frontend, Database…" />
              </UFormField>
            </div>

            <USwitch v-model="form.enabled" label="Enabled (shown in assessments)" />

            <div class="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <UButton variant="ghost" color="neutral" label="Cancel" @click="showForm = false" />
              <UButton type="submit" :label="editingId ? 'Update Question' : 'Create Question'" />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- Empty state -->
    <div
      v-if="filteredQuestions.length === 0"
      class="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700"
    >
      <UIcon name="i-lucide-list-plus" class="mx-auto size-12 text-gray-400" />
      <h4 class="mt-3 text-base font-semibold text-gray-950 dark:text-white">
        {{ filterJobId ? 'No questions for this job yet' : 'No global questions yet' }}
      </h4>
      <p class="mt-1 text-sm text-gray-500">
        {{ filterJobId
          ? `Click "Add Question" to create questions specifically for ${jobs.find(j => j.id === filterJobId)?.title}. They will be shown to candidates applying for this role.`
          : 'Global questions act as a fallback for all jobs. Add some to ensure every assessment has enough questions.' }}
      </p>
      <UButton class="mt-4" label="Add first question" icon="i-lucide-plus" @click="openCreate" />
    </div>

    <!-- Questions list -->
    <div v-else class="space-y-3">
      <UCard v-for="q in filteredQuestions" :key="q.id" class="border border-gray-200 dark:border-gray-800">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex-1 space-y-2">
            <!-- Question header -->
            <div class="flex flex-wrap items-start gap-2">
              <p class="font-medium text-gray-950 dark:text-white">{{ q.question }}</p>
              <UBadge v-if="q.enabled" color="success" variant="subtle" label="Enabled" size="xs" />
              <UBadge v-else color="neutral" variant="subtle" label="Disabled" size="xs" />
            </div>

            <!-- Options -->
            <div class="flex flex-wrap gap-2 text-xs text-gray-500">
              <span
                v-for="(opt, i) in q.options"
                :key="i"
                class="rounded-md px-2 py-0.5"
                :class="i === q.correctIndex
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-800'"
              >
                {{ String.fromCharCode(65 + i) }}. {{ opt }}
              </span>
            </div>

            <!-- Meta -->
            <div class="flex flex-wrap gap-3 text-xs text-gray-400">
              <span v-if="q.category">📁 {{ q.category }}</span>
              <span v-if="q.jobTitle" class="text-primary font-medium">🏢 {{ q.jobTitle }}</span>
              <span v-else class="text-blue-500">🌐 Global</span>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex shrink-0 flex-wrap items-center gap-2">
            <UButton
              size="xs"
              variant="soft"
              :color="q.enabled ? 'warning' : 'success'"
              :label="q.enabled ? 'Disable' : 'Enable'"
              @click="toggleEnabled(q.id)"
            />
            <UButton size="xs" variant="soft" color="neutral" icon="i-lucide-pencil" @click="openEdit(q.id)" />
            <UButton
              v-if="confirmDelete !== q.id"
              size="xs"
              variant="soft"
              color="error"
              icon="i-lucide-trash-2"
              @click="confirmDelete = q.id"
            />
            <UButton v-else size="xs" color="error" label="Confirm" @click="deleteQuestion(q.id)" />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
