import type { Application, ApplicationStatus } from '~/types/portal'

export function useApplications() {
  const store = useDataStore()

  const applications = computed(() => store.getApplications())

  function createApplication(input: { jobId: string; candidateName: string; email: string; phone: string; candidateId?: string }) {
    const auth = useAuth()
    const candidateId = input.candidateId || auth.currentUser.value?.id || 'anonymous'
    const existing = store.getApplications().find(a => a.jobId === input.jobId && (a.candidateId === candidateId || a.email === input.email))
    if (existing) {
      // If it was stuck in payment_pending, elevate it directly so hiring partner gets it
      if (existing.status === 'payment_pending') {
        store.updateApplication(existing.id, { status: 'submitted_to_client' })
      }
      return existing
    }
    const created = store.createApplication({
      jobId: input.jobId,
      candidateId,
      candidateName: input.candidateName,
      email: input.email,
      phone: input.phone,
      status: 'submitted_to_client' as ApplicationStatus,
      paymentAmount: 0
    })

    // Notify candidate
    if (candidateId && candidateId !== 'anonymous') {
      const job = store.getJobById(input.jobId)
      store.addNotification({
        userId: candidateId,
        type: 'general',
        title: '🎉 Application Received by Hiring Partner',
        message: `Your application for "${job?.title || 'the role'}" at ${job?.company || 'the hiring partner'} has been delivered for review.`,
        read: false
      })
    }

    return created
  }

  function updateStatus(id: string, status: ApplicationStatus, updates: Partial<Application> = {}) {
    return store.updateApplication(id, { ...updates, status })
  }

  function findApplication(id: string) {
    return computed(() => store.getApplications().find(a => a.id === id))
  }

  return { applications, createApplication, updateStatus, findApplication }
}
