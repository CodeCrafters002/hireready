<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const store = useDataStore()
const payments = ref(store.getPayments())

const statusColor: Record<string, string> = {
  pending: 'warning',
  paid: 'success',
  refunded: 'info'
}

function updatePaymentStatus(id: string, status: 'pending' | 'paid' | 'refunded') {
  const updates: any = { status }
  if (status === 'paid') updates.paidAt = new Date().toISOString()
  store.updatePayment(id, updates)
  payments.value = store.getPayments()

  // Notify candidate
  const payment = store.getPayments().find(p => p.id === id)
  if (payment) {
    const app = store.getApplicationById(payment.applicationId)
    const job = app ? store.getJobById(app.jobId) : undefined
    store.addNotification({
      userId: payment.candidateId,
      type: 'payment',
      title: status === 'paid' ? 'Payment confirmed' : status === 'refunded' ? 'Payment refunded' : 'Payment pending',
      message: `₹${payment.amount.toLocaleString('en-IN')} payment for ${job?.title || 'your application'} is now ${status}.`
    })
    // If paid, also update application status
    if (status === 'paid' && app && app.status === 'payment_pending') {
      store.updateApplication(app.id, { status: 'mcq_pending' })
    }
  }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Manage Payments</h2>
      <p class="mt-1 text-gray-500">{{ payments.length }} total · ₹{{ payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN') }} received</p>
    </div>

    <div class="space-y-3">
      <UCard v-for="p in payments" :key="p.id">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="flex items-center gap-2">
              <p class="font-semibold text-gray-950 dark:text-white">₹{{ p.amount.toLocaleString('en-IN') }}</p>
              <UBadge :color="(statusColor[p.status] as any) || 'neutral'" variant="subtle" :label="p.status" />
            </div>
            <p class="mt-1 text-sm text-gray-500">
              {{ store.getApplicationById(p.applicationId)?.candidateName || 'Unknown' }} ·
              {{ store.getJobById(store.getApplicationById(p.applicationId)?.jobId || '')?.title || 'N/A' }} ·
              {{ new Date(p.createdAt).toLocaleDateString() }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UButton v-if="p.status === 'pending'" size="xs" color="success" variant="soft" label="Mark Paid" @click="updatePaymentStatus(p.id, 'paid')" />
            <UButton v-if="p.status === 'paid'" size="xs" color="info" variant="soft" label="Refund" @click="updatePaymentStatus(p.id, 'refunded')" />
            <UButton v-if="p.status === 'refunded'" size="xs" color="neutral" variant="soft" label="Mark Pending" @click="updatePaymentStatus(p.id, 'pending')" />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
