import type {
  User,
  CandidateProfile,
  Job,
  Application,
  Payment,
  AssessmentQuestion,
  AssessmentAttempt,
  InterviewSlot,
  InterviewFeedback,
  AppNotification,
  Gig,
  GigApplication,
  GigCategory,
  ChatMessage,
  Conversation
} from '~/types/portal'

// ─── Keys ─────────────────────────────────────────────────────────────────────
const KEYS = {
  users: 'hr_users',
  profiles: 'hr_profiles',
  jobs: 'hr_jobs',
  applications: 'hr_applications',
  payments: 'hr_payments',
  questions: 'hr_questions',
  attempts: 'hr_attempts',
  interviewSlots: 'hr_interview_slots',
  interviewFeedback: 'hr_interview_feedback',
  notifications: 'hr_notifications',
  gigs: 'hr_gigs',
  gigApplications: 'hr_gig_applications',
  conversations: 'hr_conversations',
  chatMessages: 'hr_chat_messages',
  seeded: 'hr_seeded'
} as const

// ─── Generic helpers ──────────────────────────────────────────────────────────
function read<T>(key: string): T[] {
  if (import.meta.server) return []
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T[] : []
  } catch {
    return []
  }
}

function write<T>(key: string, data: T[]): void {
  if (import.meta.server) return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    console.error(`[DataStore] Failed writing to ${key}:`, err)
  }
}

function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const DEMO_EMAILS = new Set([
  'admin@hireready.demo',
  'rahul@demo.com',
  'ananya@demo.com',
  'vikram@demo.com',
  'employer@brightstack.demo'
])

function isDemoEmail(email?: string): boolean {
  if (!email) return false
  const lower = email.toLowerCase().trim()
  return DEMO_EMAILS.has(lower) || lower.endsWith('@demo.com') || lower.endsWith('@hireready.demo') || lower.endsWith('@brightstack.demo')
}

// ─── Composable ───────────────────────────────────────────────────────────────
export function useDataStore() {
  function purgeDemoData(): void {
    if (import.meta.server) return
    try {
      const users = read<User>(KEYS.users).filter(u => !isDemoEmail(u.email))
      write(KEYS.users, users)

      const profiles = read<CandidateProfile>(KEYS.profiles).filter(p => !isDemoEmail(p.email))
      write(KEYS.profiles, profiles)

      const apps = read<Application>(KEYS.applications).filter(a => !isDemoEmail(a.email) && !a.candidateId?.startsWith('user-cand-'))
      write(KEYS.applications, apps)

      const payments = read<Payment>(KEYS.payments).filter(p => !p.candidateId?.startsWith('user-cand-'))
      write(KEYS.payments, payments)

      const slots = read<InterviewSlot>(KEYS.interviewSlots).map(s => {
        if (s.bookedBy?.startsWith('user-cand-')) {
          return { ...s, available: true, bookedBy: undefined, applicationId: undefined }
        }
        return s
      })
      write(KEYS.interviewSlots, slots)

      const notifs = read<AppNotification>(KEYS.notifications).filter(n => !n.userId?.startsWith('user-cand-'))
      write(KEYS.notifications, notifs)
    } catch (e) {
      console.warn('[DataStore] purgeDemoData error:', e)
    }
  }

  // ── Database Sync ────────────────────────────────────────────────────────
  async function syncWithDatabase(): Promise<void> {
    if (import.meta.server) return
    try {
      // Clean any demo accounts from client storage
      purgeDemoData()

      // 1. First trigger server seed if needed
      await $fetch('/api/seed', { method: 'POST', body: { force: false } }).catch(() => null)

      // 2. Fetch latest data in parallel from MongoDB
      const [jobsData, appsData, questionsData, usersData, gigsData, gigAppsData] = await Promise.all([
        $fetch<Job[]>('/api/jobs').catch(() => null),
        $fetch<Application[]>('/api/applications').catch(() => null),
        $fetch<AssessmentQuestion[]>('/api/questions?all=true').catch(() => null),
        $fetch<User[]>('/api/users').catch(() => null),
        $fetch<Gig[]>('/api/gigs').catch(() => null),
        $fetch<GigApplication[]>('/api/gigs/applications').catch(() => null)
      ])

      if (jobsData && jobsData.length > 0) {
        saveJobs(jobsData)
      }
      if (appsData && appsData.length > 0) {
        saveApplications(appsData)
      }
      if (questionsData && questionsData.length > 0) {
        saveQuestions(questionsData)
      }
      if (usersData && usersData.length > 0) {
        saveUsers(usersData)
      }
      if (gigsData && gigsData.length > 0) {
        saveGigs(gigsData)
      }
      if (gigAppsData && gigAppsData.length > 0) {
        saveGigApplications(gigAppsData)
      }

      purgeDemoData()
    } catch (err) {
      console.warn('[DataStore] Database sync non-fatal error:', err)
    }
  }

  // ── Users ───────────────────────────────────────────────────────────────
  function getUsers(): User[] { return read<User>(KEYS.users).filter(u => !isDemoEmail(u.email)) }
  function saveUsers(users: User[]): void { write(KEYS.users, users.filter(u => !isDemoEmail(u.email))) }
  function getUserById(id: string): User | undefined { return getUsers().find(u => u.id === id) }
  function getUserByEmail(email: string): User | undefined { return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) }
  async function createUser(data: Omit<User, 'id' | 'createdAt'> & { temporaryPassword?: string; sendInviteEmail?: boolean }): Promise<User & { emailSent?: boolean }> {
    const users = getUsers()
    const user: User = {
      id: uid('user'),
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash: data.temporaryPassword || data.passwordHash || `pwd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString()
    }
    users.push(user)
    saveUsers(users)

    let emailSent = false
    try {
      const res = await $fetch<{ emailSent?: boolean }>('/api/users', {
        method: 'POST',
        body: {
          ...user,
          temporaryPassword: data.temporaryPassword,
          sendInviteEmail: data.sendInviteEmail
        }
      })
      emailSent = Boolean(res?.emailSent)
    } catch (err) {
      console.warn('[DataStore] MongoDB createUser error:', err)
    }

    return { ...user, emailSent }
  }
  function updateUserRole(id: string, role: UserRole): User | undefined {
    const users = getUsers()
    const index = users.findIndex(u => u.id === id)
    if (index < 0) return undefined
    const current = users[index]
    if (!current) return undefined
    const updated = { ...current, role }
    users[index] = updated
    saveUsers(users)

    // Sync to MongoDB
    $fetch(`/api/users/${id}`, { method: 'PUT', body: { role } }).catch(err => {
      console.warn('[DataStore] MongoDB updateUserRole error:', err)
    })

    return updated
  }

  function updateUser(id: string, updates: Partial<User> & { newPassword?: string }): User | undefined {
    const users = getUsers()
    const index = users.findIndex(u => u.id === id)
    if (index < 0) return undefined
    const current = users[index]
    if (!current) return undefined

    const { newPassword, ...safeUpdates } = updates
    const updated: User = { ...current, ...safeUpdates }

    // If a new password is being set, update the passwordHash
    if (newPassword && newPassword.trim()) {
      updated.passwordHash = newPassword.trim()
    }

    users[index] = updated
    saveUsers(users)

    // If the updated user is currently logged in, sync currentUser
    try {
      const auth = useAuth()
      if (auth.currentUser.value?.id === id) {
        auth.updateCurrentUser(updated)
      }
    } catch {}

    // Sync to MongoDB — include passwordHash if resetting
    const serverPayload: any = { ...safeUpdates }
    if (newPassword && newPassword.trim()) {
      serverPayload.passwordHash = newPassword.trim()
    }
    $fetch(`/api/users/${id}`, { method: 'PUT', body: serverPayload }).catch(err => {
      console.warn('[DataStore] MongoDB updateUser error:', err)
    })

    return updated
  }

  function deleteUser(id: string): boolean {
    const users = getUsers()
    const filtered = users.filter(u => u.id !== id)
    if (filtered.length === users.length) return false
    saveUsers(filtered)

    // Sync to MongoDB
    $fetch(`/api/users/${id}`, { method: 'DELETE' }).catch(err => {
      console.warn('[DataStore] MongoDB deleteUser error:', err)
    })

    return true
  }

  // ── Profiles ────────────────────────────────────────────────────────────
  function getProfiles(): CandidateProfile[] { return read<CandidateProfile>(KEYS.profiles).filter(p => !isDemoEmail(p.email)) }
  function saveProfiles(profiles: CandidateProfile[]): void { write(KEYS.profiles, profiles.filter(p => !isDemoEmail(p.email))) }
  function getProfileByUserId(userId: string): CandidateProfile | undefined { return getProfiles().find(p => p.userId === userId) }
  function upsertProfile(data: CandidateProfile): CandidateProfile {
    const profiles = getProfiles()
    const index = profiles.findIndex(p => p.userId === data.userId)
    const updated = { ...data, updatedAt: new Date().toISOString() }
    if (index >= 0) profiles[index] = updated
    else profiles.push(updated)
    saveProfiles(profiles)

    // Sync to MongoDB
    $fetch(`/api/profile/${data.userId}`, { method: 'PUT', body: updated }).catch(err => {
      console.warn('[DataStore] MongoDB upsertProfile error:', err)
    })

    return updated
  }

  // ── Jobs ────────────────────────────────────────────────────────────────
  function getJobs(): Job[] { return read<Job>(KEYS.jobs) }
  function saveJobs(jobs: Job[]): void { write(KEYS.jobs, jobs) }
  function getPublishedJobs(): Job[] { return getJobs().filter(j => j.published) }
  function getJobById(id: string): Job | undefined { return getJobs().find(j => j.id === id) }
  function createJob(data: Omit<Job, 'id' | 'createdAt'>): Job {
    const jobs = getJobs()
    const job: Job = { ...data, id: uid('job'), createdAt: new Date().toISOString() }
    jobs.push(job)
    saveJobs(jobs)

    // Sync to MongoDB
    $fetch('/api/jobs', { method: 'POST', body: job }).catch(err => {
      console.warn('[DataStore] MongoDB createJob error:', err)
    })

    return job
  }
  function updateJob(id: string, updates: Partial<Job>): Job | undefined {
    const jobs = getJobs()
    const index = jobs.findIndex(j => j.id === id)
    if (index < 0) return undefined
    const current = jobs[index]
    if (!current) return undefined
    const updated: Job = { ...current, ...updates, id: current.id }
    jobs[index] = updated
    saveJobs(jobs)

    // Sync to MongoDB
    $fetch(`/api/jobs/${id}`, { method: 'PUT', body: updates }).catch(err => {
      console.warn('[DataStore] MongoDB updateJob error:', err)
    })

    return updated
  }
  function deleteJob(id: string): boolean {
    const jobs = getJobs()
    const filtered = jobs.filter(j => j.id !== id)
    if (filtered.length === jobs.length) return false
    saveJobs(filtered)
    return true
  }

  // ── Applications ────────────────────────────────────────────────────────
  function getApplications(): Application[] { return read<Application>(KEYS.applications).filter(a => !isDemoEmail(a.email) && !a.candidateId?.startsWith('user-cand-')) }
  function saveApplications(apps: Application[]): void { write(KEYS.applications, apps.filter(a => !isDemoEmail(a.email) && !a.candidateId?.startsWith('user-cand-'))) }
  function getApplicationById(id: string): Application | undefined { return getApplications().find(a => a.id === id) }
  function getApplicationsByCandidate(candidateId: string): Application[] { return getApplications().filter(a => a.candidateId === candidateId) }
  function createApplication(data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Application {
    const apps = getApplications()
    const existing = apps.find(a => a.jobId === data.jobId && a.candidateId === data.candidateId)
    if (existing) return existing
    const app: Application = { ...data, id: uid('app'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    apps.push(app)
    saveApplications(apps)

    // Sync to MongoDB
    $fetch('/api/applications', { method: 'POST', body: app }).catch(err => {
      console.warn('[DataStore] MongoDB createApplication error:', err)
    })

    return app
  }
  function updateApplication(id: string, updates: Partial<Application>): Application | undefined {
    const apps = getApplications()
    const index = apps.findIndex(a => a.id === id)
    if (index < 0) return undefined
    const current = apps[index]
    if (!current) return undefined
    const updated: Application = { ...current, ...updates, id: current.id, updatedAt: new Date().toISOString() }
    apps[index] = updated
    saveApplications(apps)

    // Sync to MongoDB
    $fetch(`/api/applications/${id}`, { method: 'PUT', body: updates }).catch(err => {
      console.warn('[DataStore] MongoDB updateApplication error:', err)
    })

    return updated
  }

  // ── Payments ────────────────────────────────────────────────────────────
  function getPayments(): Payment[] { return read<Payment>(KEYS.payments).filter(p => !p.candidateId?.startsWith('user-cand-')) }
  function savePayments(payments: Payment[]): void { write(KEYS.payments, payments.filter(p => !p.candidateId?.startsWith('user-cand-'))) }
  function getPaymentByApplication(applicationId: string): Payment | undefined { return getPayments().find(p => p.applicationId === applicationId) }
  function createPayment(data: Omit<Payment, 'id' | 'createdAt'>): Payment {
    const payments = getPayments()
    const payment: Payment = { ...data, id: uid('pay'), createdAt: new Date().toISOString() }
    payments.push(payment)
    savePayments(payments)
    return payment
  }
  function updatePayment(id: string, updates: Partial<Payment>): Payment | undefined {
    const payments = getPayments()
    const index = payments.findIndex(p => p.id === id)
    if (index < 0) return undefined
    const current = payments[index]
    if (!current) return undefined
    const updated: Payment = { ...current, ...updates, id: current.id }
    payments[index] = updated
    savePayments(payments)
    return updated
  }

  // ── Assessment Questions ────────────────────────────────────────────────
  function getQuestions(): AssessmentQuestion[] { return read<AssessmentQuestion>(KEYS.questions) }
  function saveQuestions(questions: AssessmentQuestion[]): void { write(KEYS.questions, questions) }
  function getEnabledQuestions(): AssessmentQuestion[] { return getQuestions().filter(q => q.enabled) }
  
  /** Returns all enabled questions for a specific job (jobId match) */
  function getQuestionsByJob(jobId: string): AssessmentQuestion[] {
    return getQuestions().filter(q => q.enabled && q.jobId === jobId)
  }
  
  /** Returns enabled questions NOT tied to any specific job (global fallback pool) */
  function getGlobalQuestions(): AssessmentQuestion[] {
    return getQuestions().filter(q => q.enabled && !q.jobId)
  }
  
  /**
   * Returns the question set a candidate should answer for a given job.
   * Priority: job-specific questions first, then padded with global questions
   * to reach the target count. Shuffled to avoid predictable ordering.
   */
  function getQuestionsForAssessment(jobId: string, count = 5): AssessmentQuestion[] {
    const jobQ = getQuestionsByJob(jobId)
    if (jobQ.length >= count) {
      return [...jobQ].sort(() => Math.random() - 0.5).slice(0, count)
    }
    const globalQ = getGlobalQuestions()
    const combined = [...jobQ, ...globalQ]
    if (combined.length === 0) {
      return getEnabledQuestions().slice(0, count)
    }
    const pool = combined.length >= count ? combined : getEnabledQuestions()
    return [...pool].sort(() => Math.random() - 0.5).slice(0, count)
  }

  function createQuestion(data: Omit<AssessmentQuestion, 'id' | 'createdAt'>): AssessmentQuestion {
    const questions = getQuestions()
    const question: AssessmentQuestion = { ...data, id: uid('q'), createdAt: new Date().toISOString() }
    questions.push(question)
    saveQuestions(questions)

    // Sync to MongoDB
    $fetch('/api/questions', { method: 'POST', body: question }).catch(err => {
      console.warn('[DataStore] MongoDB createQuestion error:', err)
    })

    return question
  }
  function updateQuestion(id: string, updates: Partial<AssessmentQuestion>): AssessmentQuestion | undefined {
    const questions = getQuestions()
    const index = questions.findIndex(q => q.id === id)
    if (index < 0) return undefined
    const current = questions[index]
    if (!current) return undefined
    const updated: AssessmentQuestion = { ...current, ...updates, id: current.id }
    questions[index] = updated
    saveQuestions(questions)
    return updated
  }
  function deleteQuestion(id: string): boolean {
    const questions = getQuestions()
    const filtered = questions.filter(q => q.id !== id)
    if (filtered.length === questions.length) return false
    saveQuestions(filtered)

    // Sync to MongoDB
    $fetch(`/api/questions/${id}`, { method: 'DELETE' }).catch(err => {
      console.warn('[DataStore] MongoDB deleteQuestion error:', err)
    })

    return true
  }

  // ── Assessment Attempts ─────────────────────────────────────────────────
  function getAttempts(): AssessmentAttempt[] { return read<AssessmentAttempt>(KEYS.attempts) }
  function saveAttempts(attempts: AssessmentAttempt[]): void { write(KEYS.attempts, attempts) }
  function getAttemptsByCandidate(candidateId: string): AssessmentAttempt[] { return getAttempts().filter(a => a.candidateId === candidateId) }
  function getAttemptByApplication(applicationId: string): AssessmentAttempt | undefined { return getAttempts().find(a => a.applicationId === applicationId) }
  function createAttempt(data: Omit<AssessmentAttempt, 'id'>): AssessmentAttempt {
    const attempts = getAttempts()
    const attempt: AssessmentAttempt = { ...data, id: uid('att') }
    attempts.push(attempt)
    saveAttempts(attempts)
    return attempt
  }

  // ── Interview Slots ─────────────────────────────────────────────────────
  function getInterviewSlots(): InterviewSlot[] { return read<InterviewSlot>(KEYS.interviewSlots) }
  function saveInterviewSlots(slots: InterviewSlot[]): void { write(KEYS.interviewSlots, slots) }
  function getAvailableSlots(): InterviewSlot[] { return getInterviewSlots().filter(s => s.available) }
  function createInterviewSlot(data: Omit<InterviewSlot, 'id'>): InterviewSlot {
    const slots = getInterviewSlots()
    const slot: InterviewSlot = { ...data, id: uid('slot') }
    slots.push(slot)
    saveInterviewSlots(slots)
    return slot
  }
  function updateInterviewSlot(id: string, updates: Partial<InterviewSlot>): InterviewSlot | undefined {
    const slots = getInterviewSlots()
    const index = slots.findIndex(s => s.id === id)
    if (index < 0) return undefined
    const current = slots[index]
    if (!current) return undefined
    const updated: InterviewSlot = { ...current, ...updates, id: current.id }
    slots[index] = updated
    saveInterviewSlots(slots)
    return updated
  }
  function deleteInterviewSlot(id: string): boolean {
    const slots = getInterviewSlots()
    const filtered = slots.filter(s => s.id !== id)
    if (filtered.length === slots.length) return false
    saveInterviewSlots(filtered)
    return true
  }

  // ── Interview Feedback ──────────────────────────────────────────────────
  function getInterviewFeedback(): InterviewFeedback[] { return read<InterviewFeedback>(KEYS.interviewFeedback) }
  function saveInterviewFeedback(feedback: InterviewFeedback[]): void { write(KEYS.interviewFeedback, feedback) }
  function getFeedbackByApplication(applicationId: string): InterviewFeedback | undefined { return getInterviewFeedback().find(f => f.applicationId === applicationId) }
  function createFeedback(data: Omit<InterviewFeedback, 'id' | 'createdAt'>): InterviewFeedback {
    const feedback = getInterviewFeedback()
    const entry: InterviewFeedback = { ...data, id: uid('fb'), createdAt: new Date().toISOString() }
    feedback.push(entry)
    saveInterviewFeedback(feedback)
    return entry
  }

  // ── Notifications ───────────────────────────────────────────────────────
  function getNotifications(): AppNotification[] { return read<AppNotification>(KEYS.notifications) }
  function saveNotifications(notifs: AppNotification[]): void { write(KEYS.notifications, notifs) }
  function getNotificationsByUser(userId: string): AppNotification[] { return getNotifications().filter(n => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }
  function addNotification(data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): AppNotification {
    const notifs = getNotifications()
    const n: AppNotification = { ...data, id: uid('notif'), read: false, createdAt: new Date().toISOString() }
    notifs.push(n)
    saveNotifications(notifs)
    return n
  }
  function markNotificationRead(id: string): void {
    const notifs = getNotifications()
    const n = notifs.find(n => n.id === id)
    if (n) { n.read = true; saveNotifications(notifs) }
  }
  function markAllNotificationsRead(userId: string): void {
    const notifs = getNotifications()
    notifs.filter(n => n.userId === userId).forEach(n => { n.read = true })
    saveNotifications(notifs)
  }

  // ── 1-Day Micro-Gigs / Campus Duty ───────────────────────────────────────
  function getGigs(): Gig[] { return read<Gig>(KEYS.gigs) }
  function saveGigs(gigs: Gig[]): void { write(KEYS.gigs, gigs) }
  function getGigById(id: string): Gig | undefined { return getGigs().find(g => g.id === id) }
  async function createGig(data: Omit<Gig, 'id' | 'createdAt' | 'filled'>): Promise<Gig> {
    const id = uid('gig')
    const gig: Gig = {
      ...data,
      id,
      filled: 0,
      createdAt: new Date().toISOString()
    }
    const gigs = getGigs()
    gigs.unshift(gig)
    saveGigs(gigs)

    try {
      await $fetch('/api/gigs', { method: 'POST', body: gig })
    } catch (err) {
      console.warn('[DataStore] MongoDB createGig error:', err)
    }

    return gig
  }
  async function updateGig(id: string, updates: Partial<Gig>): Promise<Gig | undefined> {
    const gigs = getGigs()
    const index = gigs.findIndex(g => g.id === id)
    if (index < 0) return undefined
    const updated = { ...gigs[index], ...updates } as Gig
    gigs[index] = updated
    saveGigs(gigs)

    try {
      await $fetch(`/api/gigs/${id}`, { method: 'PUT', body: updates })
    } catch (err) {
      console.warn('[DataStore] MongoDB updateGig error:', err)
    }

    return updated
  }

  // ── Gig Applications ─────────────────────────────────────────────────────
  function getGigApplications(): GigApplication[] { return read<GigApplication>(KEYS.gigApplications) }
  function saveGigApplications(apps: GigApplication[]): void { write(KEYS.gigApplications, apps) }
  function getGigApplicationsByGig(gigId: string): GigApplication[] {
    return getGigApplications().filter(a => a.gigId === gigId)
  }
  function getGigApplicationsByCandidate(candidateId: string): GigApplication[] {
    return getGigApplications().filter(a => a.candidateId === candidateId)
  }
  async function applyToGig(data: {
    gigId: string
    candidateId: string
    candidateName: string
    candidateEmail: string
    candidateMobile?: string
    upiId: string
    college?: string
    payoutAmount?: number
  }): Promise<GigApplication> {
    const existing = getGigApplications().find(a => a.gigId === data.gigId && a.candidateId === data.candidateId)
    if (existing) {
      return existing
    }

    const app: GigApplication = {
      id: uid('gig-app'),
      gigId: data.gigId,
      candidateId: data.candidateId,
      candidateName: data.candidateName,
      candidateEmail: data.candidateEmail,
      candidateMobile: data.candidateMobile || '',
      upiId: data.upiId,
      college: data.college || '',
      status: 'applied',
      payoutAmount: data.payoutAmount || 0,
      payoutStatus: 'escrowed',
      appliedAt: new Date().toISOString()
    }

    const apps = getGigApplications()
    apps.unshift(app)
    saveGigApplications(apps)

    try {
      const serverApp = await $fetch<GigApplication>('/api/gigs/applications', {
        method: 'POST',
        body: data
      })
      if (serverApp) {
        const idx = apps.findIndex(a => a.id === app.id)
        if (idx >= 0) {
          apps[idx] = serverApp
          saveGigApplications(apps)
        }
        return serverApp
      }
    } catch (err) {
      console.warn('[DataStore] MongoDB applyToGig error:', err)
    }

    return app
  }

  async function updateGigApplicationStatus(id: string, updates: Partial<GigApplication>): Promise<GigApplication | undefined> {
    const apps = getGigApplications()
    const index = apps.findIndex(a => a.id === id)
    if (index < 0) return undefined
    const current = apps[index]
    const updated = { ...current, ...updates } as GigApplication

    if (updates.status === 'checked_in' && !updated.checkedInAt) {
      updated.checkedInAt = new Date().toISOString()
    }
    if (updates.status === 'completed' && !updated.completedAt) {
      updated.completedAt = new Date().toISOString()
      updated.payoutStatus = 'approved'
    }
    if (updates.status === 'paid') {
      updated.payoutStatus = 'paid'
    }

    apps[index] = updated
    saveGigApplications(apps)

    // If accepted, increment filled count on gig
    if (updates.status === 'accepted' && current?.status !== 'accepted') {
      const gig = getGigById(updated.gigId)
      if (gig) {
        await updateGig(gig.id, { filled: (gig.filled || 0) + 1 })
      }
    }

    try {
      await $fetch(`/api/gigs/applications/${id}`, {
        method: 'PUT',
        body: updates
      })
    } catch (err) {
      console.warn('[DataStore] MongoDB updateGigApplicationStatus error:', err)
    }

    // ── Auto-fire notification to candidate ───────────────────────────────────
    const gig = getGigById(updated.gigId)
    if (updates.status === 'accepted') {
      addNotification({
        userId: updated.candidateId,
        type: 'selection',
        title: '🎉 Shift Accepted — Download Your Admit Card',
        message: `You have been selected for "${gig?.title || 'a 1-day shift'}" on ${gig?.date || ''}. Go to My Gig Applications to download your Admit Card.`,
        read: false
      })
    } else if (updates.status === 'checked_in') {
      addNotification({
        userId: updated.candidateId,
        type: 'general',
        title: '✅ Checked In — You are On Duty',
        message: `Your attendance for "${gig?.title || 'the shift'}" has been marked. Complete the shift to receive your payout of ₹${updated.payoutAmount}.`,
        read: false
      })
    } else if (updates.status === 'completed' || updates.status === 'paid') {
      addNotification({
        userId: updated.candidateId,
        type: 'payment',
        title: '💰 Shift Complete — Payout Approved',
        message: `Shift sign-off confirmed for "${gig?.title || 'your shift'}". ₹${updated.payoutAmount} will be transferred to your UPI ID (${updated.upiId}) shortly.`,
        read: false
      })
    } else if (updates.status === 'rejected') {
      addNotification({
        userId: updated.candidateId,
        type: 'general',
        title: 'Application Update',
        message: `Unfortunately, you were not selected for "${gig?.title || 'this shift'}". Keep applying — more shifts are posted regularly!`,
        read: false
      })
    }

    return updated
  }

  // ── Direct In-App Chat & Messaging ──────────────────────────────────────────
  function getConversations(): Conversation[] {
    return read<Conversation>(KEYS.conversations)
  }

  function saveConversations(items: Conversation[]): void {
    write(KEYS.conversations, items)
  }

  function getConversationsForUser(userId: string, role: 'candidate' | 'employer' | 'admin'): Conversation[] {
    ensureChatSeeded(userId, role)
    const convs = getConversations()
    if (role === 'candidate') {
      return convs.filter(c => c.candidateId === userId).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    }
    if (role === 'employer') {
      return convs.filter(c => c.employerId === userId || !c.employerId || c.employerCompany).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    }
    return convs.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
  }

  function getConversationById(id: string): Conversation | undefined {
    return getConversations().find(c => c.id === id)
  }

  function getOrCreateConversation(params: {
    jobId?: string
    jobTitle?: string
    companyName?: string
    candidateId: string
    candidateName: string
    candidateEmail?: string
    employerId: string
    employerName: string
    employerCompany?: string
    initialMessage?: string
  }): Conversation {
    const convs = getConversations()
    let existing = convs.find(c =>
      c.candidateId === params.candidateId &&
      (params.jobId ? c.jobId === params.jobId : (c.employerId === params.employerId || c.employerCompany === params.employerCompany))
    )

    if (!existing) {
      const newConv: Conversation = {
        id: uid('conv'),
        jobId: params.jobId,
        jobTitle: params.jobTitle,
        companyName: params.companyName || params.employerCompany || 'Hiring Partner',
        candidateId: params.candidateId,
        candidateName: params.candidateName,
        candidateEmail: params.candidateEmail,
        employerId: params.employerId,
        employerName: params.employerName,
        employerCompany: params.employerCompany || params.companyName,
        lastMessageText: params.initialMessage || 'Started conversation',
        lastMessageAt: new Date().toISOString(),
        unreadCandidateCount: params.initialMessage ? 1 : 0,
        unreadEmployerCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      convs.unshift(newConv)
      saveConversations(convs)
      existing = newConv

      if (params.initialMessage) {
        sendMessage({
          conversationId: newConv.id,
          senderId: params.employerId,
          senderName: params.employerName,
          senderRole: 'employer',
          text: params.initialMessage
        })
      }
    }

    return existing
  }

  function getChatMessages(conversationId?: string): ChatMessage[] {
    const all = read<ChatMessage>(KEYS.chatMessages)
    if (!conversationId) return all
    return all.filter(m => m.conversationId === conversationId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  function saveChatMessages(messages: ChatMessage[]): void {
    write(KEYS.chatMessages, messages)
  }

  function sendMessage(params: {
    conversationId: string
    senderId: string
    senderName: string
    senderRole: 'candidate' | 'employer' | 'admin'
    text: string
    quickAction?: ChatMessage['quickAction']
  }): ChatMessage {
    const all = read<ChatMessage>(KEYS.chatMessages)
    const newMsg: ChatMessage = {
      id: uid('msg'),
      conversationId: params.conversationId,
      senderId: params.senderId,
      senderName: params.senderName,
      senderRole: params.senderRole,
      text: params.text,
      createdAt: new Date().toISOString(),
      read: false,
      quickAction: params.quickAction
    }
    all.push(newMsg)
    saveChatMessages(all)

    // Update conversation last message & unread count
    const convs = getConversations()
    const idx = convs.findIndex(c => c.id === params.conversationId)
    if (idx !== -1) {
      convs[idx].lastMessageText = params.text
      convs[idx].lastMessageAt = newMsg.createdAt
      convs[idx].updatedAt = newMsg.createdAt
      if (params.senderRole === 'employer') {
        convs[idx].unreadCandidateCount = (convs[idx].unreadCandidateCount || 0) + 1
      } else {
        convs[idx].unreadEmployerCount = (convs[idx].unreadEmployerCount || 0) + 1
      }
      saveConversations(convs)
    }

    return newMsg
  }

  function markConversationRead(conversationId: string, role: 'candidate' | 'employer' | 'admin'): void {
    const convs = getConversations()
    const idx = convs.findIndex(c => c.id === conversationId)
    if (idx !== -1) {
      if (role === 'candidate') {
        convs[idx].unreadCandidateCount = 0
      } else {
        convs[idx].unreadEmployerCount = 0
      }
      saveConversations(convs)
    }

    // Also mark individual messages as read
    const msgs = read<ChatMessage>(KEYS.chatMessages)
    let changed = false
    for (const m of msgs) {
      if (m.conversationId === conversationId && !m.read && m.senderRole !== role) {
        m.read = true
        changed = true
      }
    }
    if (changed) {
      saveChatMessages(msgs)
    }
  }

  function getUnreadMessagesCount(userId: string, role: 'candidate' | 'employer'): number {
    const convs = getConversationsForUser(userId, role)
    return convs.reduce((acc, c) => acc + (role === 'candidate' ? (c.unreadCandidateCount || 0) : (c.unreadEmployerCount || 0)), 0)
  }

  function ensureChatSeeded(currentUserId?: string, role?: string): void {
    if (import.meta.server) return
    const existing = read<Conversation>(KEYS.conversations)
    if (existing.length === 0) {
      const candId = currentUserId || 'cand-seed-1'
      const conv1Id = 'conv-razorpay-01'
      const conv2Id = 'conv-flipkart-02'

      const now = new Date()
      const t1 = new Date(now.getTime() - 2 * 3600 * 1000).toISOString()
      const t2 = new Date(now.getTime() - 90 * 60 * 1000).toISOString()
      const t3 = new Date(now.getTime() - 15 * 60 * 1000).toISOString()

      const seededConvs: Conversation[] = [
        {
          id: conv1Id,
          jobId: 'job-1',
          jobTitle: 'Senior Frontend Engineer (Vue 3 / Nuxt)',
          companyName: 'Razorpay',
          candidateId: candId,
          candidateName: 'Candidate',
          candidateEmail: 'candidate@hireready.app',
          employerId: 'emp-razorpay',
          employerName: 'Kunal Shah',
          employerCompany: 'Razorpay Talent Team',
          lastMessageText: 'We loved your profile! Are you available for a 20-min technical screening tomorrow?',
          lastMessageAt: t3,
          unreadCandidateCount: 1,
          unreadEmployerCount: 0,
          createdAt: t1,
          updatedAt: t3
        },
        {
          id: conv2Id,
          jobId: 'job-2',
          jobTitle: 'Full Stack Engineer',
          companyName: 'Flipkart',
          candidateId: candId,
          candidateName: 'Candidate',
          candidateEmail: 'candidate@hireready.app',
          employerId: 'emp-flipkart',
          employerName: 'Priya Sharma',
          employerCompany: 'Flipkart Engineering Recruiting',
          lastMessageText: 'Your application has been received. Please share your live portfolio link.',
          lastMessageAt: t2,
          unreadCandidateCount: 1,
          unreadEmployerCount: 0,
          createdAt: t2,
          updatedAt: t2
        }
      ]

      const seededMsgs: ChatMessage[] = [
        {
          id: 'msg-1',
          conversationId: conv1Id,
          senderId: 'emp-razorpay',
          senderName: 'Kunal Shah (Razorpay)',
          senderRole: 'employer',
          text: 'Hello! Thanks for applying to the Senior Frontend Engineer position at Razorpay.',
          createdAt: t1,
          read: true
        },
        {
          id: 'msg-2',
          conversationId: conv1Id,
          senderId: candId,
          senderName: 'You',
          senderRole: 'candidate',
          text: 'Hi Kunal! Thank you for reviewing my profile. Really excited about the opportunity!',
          createdAt: t2,
          read: true
        },
        {
          id: 'msg-3',
          conversationId: conv1Id,
          senderId: 'emp-razorpay',
          senderName: 'Kunal Shah (Razorpay)',
          senderRole: 'employer',
          text: 'We loved your profile! Are you available for a 20-min technical screening tomorrow?',
          createdAt: t3,
          read: false,
          quickAction: {
            type: 'interview_invite',
            title: '📅 1-Click Schedule Screening Call',
            url: '/candidate/interviews'
          }
        },
        {
          id: 'msg-4',
          conversationId: conv2Id,
          senderId: 'emp-flipkart',
          senderName: 'Priya Sharma (Flipkart)',
          senderRole: 'employer',
          text: 'Your application has been received. Please share your live portfolio link.',
          createdAt: t2,
          read: false
        }
      ]

      write(KEYS.conversations, seededConvs)
      write(KEYS.chatMessages, seededMsgs)
    }
  }

  return {
    syncWithDatabase,
    // Users
    getUsers, saveUsers, getUserById, getUserByEmail, createUser, updateUserRole, updateUser, deleteUser,
    // Profiles
    getProfiles, getProfileByUserId, upsertProfile,
    // Jobs
    getJobs, getPublishedJobs, getJobById, createJob, updateJob, deleteJob, saveJobs,
    // Applications
    getApplications, getApplicationById, getApplicationsByCandidate, createApplication, updateApplication,
    // Payments
    getPayments, getPaymentByApplication, createPayment, updatePayment,
    // Questions
    getQuestions, getEnabledQuestions, getQuestionsByJob, getGlobalQuestions, getQuestionsForAssessment,
    createQuestion, updateQuestion, deleteQuestion,
    // Attempts
    getAttempts, getAttemptsByCandidate, getAttemptByApplication, createAttempt,
    // Interview Slots
    getInterviewSlots, getAvailableSlots, createInterviewSlot, updateInterviewSlot, deleteInterviewSlot,
    // Interview Feedback
    getInterviewFeedback, getFeedbackByApplication, createFeedback,
    // Notifications
    getNotificationsByUser, addNotification, markNotificationRead, markAllNotificationsRead,
    // 1-Day Gigs & Campus Duties
    getGigs, saveGigs, getGigById, createGig, updateGig,
    getGigApplications, saveGigApplications, getGigApplicationsByGig, getGigApplicationsByCandidate,
    applyToGig, updateGigApplicationStatus,
    // Direct In-App Chat & Messaging
    getConversations, saveConversations, getConversationsForUser, getConversationById,
    getOrCreateConversation, getChatMessages, saveChatMessages, sendMessage,
    markConversationRead, getUnreadMessagesCount
  }
}

