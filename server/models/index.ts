import mongoose, { Schema } from 'mongoose'

// ─── 1. User Schema ─────────────────────────────────────────────────────────
const UserSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['candidate', 'admin', 'officer', 'employer'], default: 'candidate' },
  passwordHash: { type: String, required: true },
  passwordResetToken: { type: String, default: null },
  passwordResetOtp: { type: String, default: null },
  passwordResetExpires: { type: Date, default: null },
  recoveryKeyUsedAt: { type: String, default: null },
  createdAt: { type: String, default: () => new Date().toISOString() }
})

// ─── 2. Candidate Profile Schema ────────────────────────────────────────────
const CandidateProfileSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, default: '' },
  email: { type: String, default: '' },
  mobile: { type: String, default: '' },
  city: { type: String, default: '' },
  skills: { type: [String], default: [] },
  education: { type: String, default: '' },
  experience: { type: String, default: '' },
  resumeFilename: { type: String, default: '' },
  resumeDataUrl: { type: String, default: '' },
  resumeFileSize: { type: String, default: '' },
  profilePhotoUrl: { type: String, default: '' },
  updatedAt: { type: String, default: () => new Date().toISOString() }
})

// ─── 3. Job Schema ──────────────────────────────────────────────────────────
const JobSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, required: true },
  salary: { type: String, required: true },
  summary: { type: String, default: '' },
  description: { type: String, default: '' },
  requirements: { type: [String], default: [] },
  published: { type: Boolean, default: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
})

// ─── 4. Application Schema ──────────────────────────────────────────────────
const ApplicationSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  jobId: { type: String, required: true, index: true },
  candidateId: { type: String, required: true, index: true },
  candidateName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  status: {
    type: String,
    enum: [
      'payment_pending',
      'mcq_pending',
      'assessment_passed',
      'assessment_failed',
      'interview_pending',
      'interview_scheduled',
      'interview_passed',
      'interview_failed',
      'submitted_to_client',
      'selected',
      'rejected'
    ],
    default: 'payment_pending'
  },
  paymentAmount: { type: Number, default: 299 },
  assessmentScore: { type: Number },
  interviewSlot: { type: String },
  interviewFeedback: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
})

// ─── 5. Assessment Question Schema ──────────────────────────────────────────
const AssessmentQuestionSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctIndex: { type: Number, required: true },
  enabled: { type: Boolean, default: true },
  category: { type: String, default: 'General' },
  jobId: { type: String, default: null, index: true }, // Optional job-specific link
  createdAt: { type: String, default: () => new Date().toISOString() }
})

// Mongoose model caching for serverless environments
export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema)
export const CandidateProfileModel = mongoose.models.CandidateProfile || mongoose.model('CandidateProfile', CandidateProfileSchema)
export const JobModel = mongoose.models.Job || mongoose.model('Job', JobSchema)
export const ApplicationModel = mongoose.models.Application || mongoose.model('Application', ApplicationSchema)
export const AssessmentQuestionModel = mongoose.models.AssessmentQuestion || mongoose.model('AssessmentQuestion', AssessmentQuestionSchema)
