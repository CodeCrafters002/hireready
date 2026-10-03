import type { Application, ApplicationStatus } from '~/types/portal'

export function useApplications() {
  const store = useDataStore()

  const applications = computed(() => store.getApplications())

  function createApplication(input: { jobId: string; candidateName: string; email: string; phone: string; candidateId?: string }) {
    const auth = useAuth()
    const candidateId = input.candidateId || auth.currentUser.value?.id || 'anonymous'
    const existing = store.getApplications().find(a => a.jobId === input.jobId && (a.candidateId === candidateId || a.email === input.email))
    if (existing) return existing
    return store.createApplication({
      jobId: input.jobId,
      candidateId,
      candidateName: input.candidateName,
      email: input.email,
      phone: input.phone,
      status: 'payment_pending' as ApplicationStatus,
      paymentAmount: 1000
    })
  }

  function updateStatus(id: string, status: ApplicationStatus, updates: Partial<Application> = {}) {
    return store.updateApplication(id, { ...updates, status })
  }

  function findApplication(id: string) {
    return computed(() => store.getApplications().find(a => a.id === id))
  }

  return { applications, createApplication, updateStatus, findApplication }
}
