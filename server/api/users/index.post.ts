import { connectDB } from '~~/server/utils/db'
import { UserModel, CandidateProfileModel } from '~~/server/models'
import { sendEmail, generateUserInvitationEmailHtml, isEmailConfigured } from '~~/server/utils/email'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)
  const {
    name,
    email,
    role = 'candidate',
    mobile = '',
    city = '',
    password = 'demo_password',
    temporaryPassword = '',
    sendInviteEmail = true
  } = body

  if (!name || !email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name and email are required'
    })
  }

  const existing = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean()
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'A user with this email already exists'
    })
  }

  const id = body.id || 'user-' + Date.now().toString(36)

  const newUser = await UserModel.create({
    id,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    role,
    passwordHash: 'demo_hash',
    createdAt: new Date().toISOString()
  })

  // If role is candidate (student), automatically create their profile record
  if (role === 'candidate') {
    await CandidateProfileModel.create({
      userId: id,
      fullName: name.trim(),
      email: email.toLowerCase().trim(),
      mobile,
      city,
      skills: [],
      education: '',
      experience: '',
      resumeFilename: '',
      profilePhotoUrl: '',
      updatedAt: new Date().toISOString()
    })
  }

  // Dispatch Invitation & Welcome Email if email service is active
  let emailDispatched = false
  if (sendInviteEmail && isEmailConfigured()) {
    const reqHost = getRequestHeader(event, 'host') || 'hireready-drab-nine.vercel.app'
    const reqProtocol = reqHost.includes('localhost') ? 'http' : 'https'
    const setupUrl = `${reqProtocol}://${reqHost}/auth/forgot-password?email=${encodeURIComponent(newUser.email)}`
    const loginUrl = `${reqProtocol}://${reqHost}/auth/sign-in`

    const html = generateUserInvitationEmailHtml({
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      temporaryPassword: temporaryPassword || undefined,
      setupUrl,
      loginUrl
    })

    const roleName = role === 'admin' ? 'Super Admin' : role === 'officer' ? 'Placement Officer' : role === 'employer' ? 'Hiring Partner' : 'Candidate'

    const emailResult = await sendEmail({
      to: newUser.email,
      subject: `[HireReady] Welcome to HireReady - Your ${roleName} Account is Ready`,
      html
    })
    emailDispatched = emailResult.success
  }

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    emailSent: emailDispatched,
    createdAt: newUser.createdAt
  }
})
