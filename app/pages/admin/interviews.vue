<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const store = useDataStore()
const slots = ref(store.getInterviewSlots())
const showSlotForm = ref(false)
const showFeedbackForm = ref(false)
const confirmDelete = ref<string | null>(null)
const feedbackAppId = ref('')

const slotForm = reactive({ date: '', time: '' })
const feedbackForm = reactive({ reviewerName: '', rating: 4, comments: '', passed: true })

function createSlot() {
  if (!slotForm.date || !slotForm.time) return
  store.createInterviewSlot({ date: slotForm.date, time: slotForm.time, available: true })
  slots.value = store.getInterviewSlots()
  showSlotForm.value = false
  slotForm.date = ''
  slotForm.time = ''
}

function deleteSlot(id: string) {
  store.deleteInterviewSlot(id)
  slots.value = store.getInterviewSlots()
  confirmDelete.value = null
}

// Interview feedback
const bookedSlots = computed(() => slots.value.filter(s => !s.available && s.applicationId))

function openFeedbackForm(applicationId: string) {
  feedbackAppId.value = applicationId
  Object.assign(feedbackForm, { reviewerName: '', rating: 4, comments: '', passed: true })
  showFeedbackForm.value = true
}

function submitFeedback() {
  const app = store.getApplicationById(feedbackAppId.value)
  if (!app) return

  store.createFeedback({
    applicationId: feedbackAppId.value,
    candidateId: app.candidateId,
    reviewerName: feedbackForm.reviewerName || 'Admin Reviewer',
    rating: feedbackForm.rating,
    comments: feedbackForm.comments,
    passed: feedbackForm.passed
  })

  // Update application status
  const newStatus = feedbackForm.passed ? 'interview_passed' : 'interview_failed'
  store.updateApplication(feedbackAppId.value, {
    status: newStatus,
    interviewFeedback: feedbackForm.comments
  })

  // Notify candidate
  const job = store.getJobById(app.jobId)
  store.addNotification({
    userId: app.candidateId,
    type: 'interview',
    title: feedbackForm.passed ? 'Interview passed!' : 'Interview result',
    message: feedbackForm.passed
      ? `You passed the mock interview for ${job?.title || 'your application'}. Your profile may be submitted to the client.`
      : `Unfortunately, you did not pass the mock interview for ${job?.title || 'your application'}.`
  })

  slots.value = store.getInterviewSlots()
  showFeedbackForm.value = false
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Interview Slots & Feedback</h2>
        <p class="mt-1 text-gray-500">{{ slots.length }} total slots · {{ slots.filter(s => s.available).length }} available</p>
      </div>
      <UButton label="Add Slot" icon="i-lucide-plus" @click="showSlotForm = true" />
    </div>

    <!-- Add slot modal -->
    <UModal v-model:open="showSlotForm">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-950 dark:text-white">Add Interview Slot</h3>
              <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="showSlotForm = false" />
            </div>
          </template>
          <form class="space-y-4" @submit.prevent="createSlot">
            <UFormField label="Date" required>
              <UInput v-model="slotForm.date" class="w-full" type="date" />
            </UFormField>
            <UFormField label="Time" required>
              <UInput v-model="slotForm.time" class="w-full" placeholder="e.g. 10:00 AM" />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" label="Cancel" @click="showSlotForm = false" />
              <UButton type="submit" label="Create Slot" />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- Feedback modal -->
    <UModal v-model:open="showFeedbackForm">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-950 dark:text-white">Interview Feedback</h3>
              <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="showFeedbackForm = false" />
            </div>
          </template>
          <form class="space-y-4" @submit.prevent="submitFeedback">
            <UFormField label="Reviewer name">
              <UInput v-model="feedbackForm.reviewerName" class="w-full" placeholder="Your name" />
            </UFormField>
            <UFormField label="Rating (1–5)">
              <UInput v-model.number="feedbackForm.rating" class="w-full" type="number" min="1" max="5" />
            </UFormField>
            <UFormField label="Comments">
              <UTextarea v-model="feedbackForm.comments" class="w-full" :rows="3" placeholder="Interview feedback..." />
            </UFormField>
            <USwitch v-model="feedbackForm.passed" label="Candidate passed" />
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" label="Cancel" @click="showFeedbackForm = false" />
              <UButton type="submit" label="Submit Feedback" />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- Available slots -->
    <h3 class="mb-3 text-lg font-semibold text-gray-950 dark:text-white">Available Slots</h3>
    <div class="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <UCard v-for="slot in slots.filter(s => s.available)" :key="slot.id">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-950 dark:text-white">{{ slot.date }}</p>
            <p class="text-sm text-gray-500">{{ slot.time }}</p>
          </div>
          <div class="flex gap-1">
            <UBadge color="success" variant="subtle" label="Open" size="xs" />
            <UButton v-if="confirmDelete !== slot.id" size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" @click="confirmDelete = slot.id" />
            <UButton v-else size="xs" color="error" label="Delete" @click="deleteSlot(slot.id)" />
          </div>
        </div>
      </UCard>
      <UCard v-if="!slots.filter(s => s.available).length">
        <p class="text-center text-sm text-gray-400">No available slots</p>
      </UCard>
    </div>

    <!-- Booked slots -->
    <h3 class="mb-3 text-lg font-semibold text-gray-950 dark:text-white">Booked Interviews</h3>
    <div class="space-y-3">
      <UCard v-for="slot in bookedSlots" :key="slot.id">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-medium text-gray-950 dark:text-white">{{ slot.date }} at {{ slot.time }}</p>
            <p class="text-sm text-gray-500">
              Candidate: {{ store.getUserById(slot.bookedBy || '')?.name || 'Unknown' }} ·
              {{ store.getJobById(store.getApplicationById(slot.applicationId || '')?.jobId || '')?.title || '' }}
            </p>
          </div>
          <div class="flex gap-2">
            <UBadge color="warning" variant="subtle" label="Booked" size="xs" />
            <UButton
              v-if="slot.applicationId && !store.getFeedbackByApplication(slot.applicationId)"
              size="xs"
              variant="soft"
              label="Add Feedback"
              icon="i-lucide-message-square"
              @click="openFeedbackForm(slot.applicationId!)"
            />
            <UBadge
              v-else-if="slot.applicationId && store.getFeedbackByApplication(slot.applicationId)"
              :color="store.getFeedbackByApplication(slot.applicationId)?.passed ? 'success' : 'error'"
              variant="subtle"
              :label="store.getFeedbackByApplication(slot.applicationId)?.passed ? 'Passed' : 'Failed'"
              size="xs"
            />
          </div>
        </div>
      </UCard>
      <UCard v-if="!bookedSlots.length">
        <p class="py-4 text-center text-sm text-gray-400">No booked interviews yet</p>
      </UCard>
    </div>
  </div>
</template>
