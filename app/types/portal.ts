export type UserRole = 'candidate' | 'admin' | 'officer' | 'employer'

// ─── User & Auth ──────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  /** Demo-only hashed placeholder — never store real passwords client-side */
  passwordHash: string
  company?: string
  orgType?: string
  contactPerson?: string
  city?: string
  phone?: string
  designation?: string
  profilePhotoUrl?: string
  bio?: string
  creditsRemaining?: number
  activePlan?: string
  createdAt: string
}

// ─── Candidate Profile ────────────────────────────────────────────────────────
export interface CandidateProfile {
  userId: string
  fullName: string
  email: string
  mobile: string
  city: string
  skills: string[]
  education: string
  experience: string
  resumeFilename: string
  resumeDataUrl?: string
  resumeFileSize?: string
  profilePhotoUrl: string
  upiId?: string
  isFastTrackPro?: boolean
  fastTrackBadge?: string
  updatedAt: string
}

// ─── 1-Day Micro-Gigs & Duties ────────────────────────────────────────────────
export type GigCategory = 'exam_duty' | 'event_coordination' | 'technical_support' | 'field_survey' | 'other'

export interface Gig {
  id: string
  title: string
  organization: string
  category: GigCategory
  date: string
  shiftTime: string
  location: string
  city: string
  dailyPay: number
  openings: number
  filled: number
  description: string
  responsibilities: string[]
  instructions: string
  escrowStatus: 'deposited' | 'released' | 'pending'
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  postedBy: string
  createdAt: string
}

export interface GigApplication {
  id: string
  gigId: string
  candidateId: string
  candidateName: string
  candidateEmail: string
  candidateMobile: string
  upiId: string
  college: string
  status: 'applied' | 'accepted' | 'checked_in' | 'completed' | 'paid' | 'rejected'
  payoutAmount: number
  payoutStatus: 'escrowed' | 'approved' | 'paid'
  appliedAt: string
  checkedInAt?: string
  completedAt?: string
}

// ─── Job ──────────────────────────────────────────────────────────────────────
export interface Job {
  id: string
  title: string
  company: string
  location: string
  type: string
  salary: string
  summary: string
  description: string
  requirements: string[]
  published: boolean
  isFeatured?: boolean
  featuredBadge?: string
  isUrgent?: boolean
  createdAt: string
}

// ─── Application ──────────────────────────────────────────────────────────────
export type ApplicationStatus =
  | 'payment_pending'
  | 'mcq_pending'
  | 'assessment_passed'
  | 'assessment_failed'
  | 'interview_pending'
  | 'interview_scheduled'
  | 'interview_passed'
  | 'interview_failed'
  | 'submitted_to_client'
  | 'selected'
  | 'rejected'

export interface Application {
  id: string
  jobId: string
  candidateId: string
  candidateName: string
  email: string
  phone: string
  status: ApplicationStatus
  paymentAmount: number
  assessmentScore?: number
  interviewSlot?: string
  interviewFeedback?: string
  interviewDetails?: InterviewDetails
  createdAt: string
  updatedAt: string
}

export type InterviewPlatform = 'google_meet' | 'zoom' | 'hireready_call' | 'phone'
export type InterviewScheduleStatus = 'scheduled' | 'candidate_accepted' | 'reschedule_requested' | 'completed' | 'cancelled'

export interface InterviewDetails {
  roundName: string
  platform: InterviewPlatform
  meetingLink: string
  scheduledAt: string
  durationMinutes: number
  interviewerName: string
  notes?: string
  status: InterviewScheduleStatus
  candidateNote?: string
  feedback?: string
  rating?: number
}

// ─── Payment ──────────────────────────────────────────────────────────────────
export type PaymentStatus = 'pending' | 'paid' | 'refunded'

export interface Payment {
  id: string
  applicationId: string
  candidateId: string
  amount: number
  status: PaymentStatus
  method: string
  paidAt?: string
  createdAt: string
}

// ─── MCQ Assessment ───────────────────────────────────────────────────────────
export interface AssessmentQuestion {
  id: string
  question: string
  options: string[]
  /** Index of the correct option — only exposed after submission in the admin panel */
  correctIndex: number
  enabled: boolean
  category: string
  createdAt: string
  /** Optional: link to a specific job. If set, question is served for that job's MCQ.
   *  If unset, question is treated as global fallback for jobs without enough specific questions. */
  jobId?: string
  /** Denormalised label for display in admin (auto-filled when jobId is set) */
  jobTitle?: string
}

export interface AssessmentAttempt {
  id: string
  applicationId: string
  candidateId: string
  questionIds: string[]
  answers: number[]
  score: number
  passed: boolean
  submittedAt: string
}

// ─── Interview ────────────────────────────────────────────────────────────────
export interface InterviewSlot {
  id: string
  date: string
  time: string
  available: boolean
  bookedBy?: string
  applicationId?: string
}

export interface InterviewFeedback {
  id: string
  applicationId: string
  candidateId: string
  reviewerName: string
  rating: number
  comments: string
  passed: boolean
  createdAt: string
}

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotificationType = 'payment' | 'assessment' | 'interview' | 'selection' | 'general'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
}
