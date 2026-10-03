<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const store = useDataStore()
const jobs = ref(store.getJobs())
const showForm = ref(false)
const editingJob = ref<string | null>(null)
const confirmDelete = ref<string | null>(null)

const form = reactive({
  title: '', company: '', location: '', type: 'Full-time', salary: '',
  summary: '', description: '', requirements: '', published: true
})

function resetForm() {
  Object.assign(form, { title: '', company: '', location: '', type: 'Full-time', salary: '', summary: '', description: '', requirements: '', published: true })
  editingJob.value = null
}

function openCreate() {
  resetForm()
  showForm.value = true
}

function openEdit(id: string) {
  const job = store.getJobById(id)
  if (!job) return
  editingJob.value = id
  Object.assign(form, {
    title: job.title, company: job.company, location: job.location,
    type: job.type, salary: job.salary, summary: job.summary,
    description: job.description, requirements: job.requirements.join('\n'),
    published: job.published
  })
  showForm.value = true
}

function saveJob() {
  const requirements = form.requirements.split('\n').map(r => r.trim()).filter(Boolean)
  if (editingJob.value) {
    store.updateJob(editingJob.value, { ...form, requirements })
  } else {
    store.createJob({ ...form, requirements })
  }
  jobs.value = store.getJobs()
  showForm.value = false
  resetForm()
}

function togglePublish(id: string) {
  const job = store.getJobById(id)
  if (job) {
    store.updateJob(id, { published: !job.published })
    jobs.value = store.getJobs()
  }
}

function deleteJob(id: string) {
  store.deleteJob(id)
  jobs.value = store.getJobs()
  confirmDelete.value = null
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Manage Jobs</h2>
        <p class="mt-1 text-gray-500">{{ jobs.length }} total jobs · {{ jobs.filter(j => j.published).length }} published</p>
      </div>
      <UButton label="Add Job" icon="i-lucide-plus" @click="openCreate" />
    </div>

    <!-- Job form modal -->
    <UModal v-model:open="showForm">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-950 dark:text-white">{{ editingJob ? 'Edit Job' : 'Create Job' }}</h3>
              <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="showForm = false" />
            </div>
          </template>
          <form class="space-y-4" @submit.prevent="saveJob">
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Job title" required>
                <UInput v-model="form.title" class="w-full" placeholder="e.g. Frontend Developer" />
              </UFormField>
              <UFormField label="Company" required>
                <UInput v-model="form.company" class="w-full" placeholder="e.g. BrightStack Technologies" />
              </UFormField>
              <UFormField label="Location">
                <UInput v-model="form.location" class="w-full" placeholder="e.g. Bengaluru / Remote" />
              </UFormField>
              <UFormField label="Salary">
                <UInput v-model="form.salary" class="w-full" placeholder="e.g. ₹5–8 LPA" />
              </UFormField>
              <UFormField label="Type">
                <UInput v-model="form.type" class="w-full" placeholder="Full-time" />
              </UFormField>
            </div>
            <UFormField label="Summary">
              <UTextarea v-model="form.summary" class="w-full" :rows="2" placeholder="Brief one-liner" />
            </UFormField>
            <UFormField label="Description">
              <UTextarea v-model="form.description" class="w-full" :rows="3" placeholder="Full role description" />
            </UFormField>
            <UFormField label="Requirements" hint="One per line">
              <UTextarea v-model="form.requirements" class="w-full" :rows="4" placeholder="1+ year of experience&#10;JavaScript or TypeScript" />
            </UFormField>
            <USwitch v-model="form.published" label="Published" />
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" label="Cancel" @click="showForm = false" />
              <UButton type="submit" :label="editingJob ? 'Update' : 'Create'" />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- Jobs list -->
    <div class="space-y-3">
      <UCard v-for="job in jobs" :key="job.id">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="flex items-center gap-2">
              <p class="font-semibold text-gray-950 dark:text-white">{{ job.title }}</p>
              <UBadge v-if="job.published" color="success" variant="subtle" label="Published" size="xs" />
              <UBadge v-else color="neutral" variant="subtle" label="Draft" size="xs" />
            </div>
            <p class="mt-1 text-sm text-gray-500">{{ job.company }} · {{ job.location }} · {{ job.salary }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UButton size="xs" variant="soft" :color="job.published ? 'warning' : 'success'" :label="job.published ? 'Unpublish' : 'Publish'" @click="togglePublish(job.id)" />
            <UButton size="xs" variant="soft" color="neutral" label="Edit" icon="i-lucide-pencil" @click="openEdit(job.id)" />
            <UButton v-if="confirmDelete !== job.id" size="xs" variant="soft" color="error" icon="i-lucide-trash-2" @click="confirmDelete = job.id" />
            <UButton v-else size="xs" color="error" label="Confirm delete" @click="deleteJob(job.id)" />
          </div>
        </div>
      </UCard>
    </div>

    <UCard v-if="!jobs.length" class="mt-4">
      <div class="py-8 text-center text-gray-500">No jobs found. Create your first job above.</div>
    </UCard>
  </div>
</template>
