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
  AppNotification
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

// ─── Composable ───────────────────────────────────────────────────────────────
export function useDataStore() {
  // ── Database Sync ────────────────────────────────────────────────────────
  async function syncWithDatabase(): Promise<void> {
    if (import.meta.server) return
    try {
      // 1. First trigger server seed if needed
      await $fetch('/api/seed', { method: 'POST', body: { force: false } }).catch(() => null)

      // 2. Fetch latest data in parallel from MongoDB
      const [jobsData, appsData, questionsData, usersData] = await Promise.all([
        $fetch<Job[]>('/api/jobs').catch(() => null),
        $fetch<Application[]>('/api/applications').catch(() => null),
        $fetch<AssessmentQuestion[]>('/api/questions?all=true').catch(() => null),
        $fetch<User[]>('/api/users').catch(() => null)
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
    } catch (err) {
      console.warn('[DataStore] Database sync non-fatal error:', err)
    }
  }

  // ── Users ───────────────────────────────────────────────────────────────
  function getUsers(): User[] { return read<User>(KEYS.users) }
  function saveUsers(users: User[]): void { write(KEYS.users, users) }
  function getUserById(id: string): User | undefined { return getUsers().find(u => u.id === id) }
  function getUserByEmail(email: string): User | undefined { return getUsers().find(u => u.email === email) }
  function createUser(data: Omit<User, 'id' | 'createdAt'>): User {
    const users = getUsers()
    const user: User = { ...data, id: uid('user'), createdAt: new Date().toISOString() }
    users.push(user)
    saveUsers(users)

    // Sync to MongoDB
    $fetch('/api/users', { method: 'POST', body: user }).catch(err => {
      console.warn('[DataStore] MongoDB createUser error:', err)
    })

    return user
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
  function getProfiles(): CandidateProfile[] { return read<CandidateProfile>(KEYS.profiles) }
  function saveProfiles(profiles: CandidateProfile[]): void { write(KEYS.profiles, profiles) }
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
  function getApplications(): Application[] { return read<Application>(KEYS.applications) }
  function saveApplications(apps: Application[]): void { write(KEYS.applications, apps) }
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
  function getPayments(): Payment[] { return read<Payment>(KEYS.payments) }
  function savePayments(payments: Payment[]): void { write(KEYS.payments, payments) }
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

  return {
    syncWithDatabase,
    // Users
    getUsers, saveUsers, getUserById, getUserByEmail, createUser, updateUserRole, deleteUser,
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
    getNotificationsByUser, addNotification, markNotificationRead, markAllNotificationsRead
  }
}
