import { connectDB } from '~~/server/utils/db'
import { UserModel, CandidateProfileModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)
  const { email, name, role = 'candidate', mobile = '', city = '', skills = [] } = body

  if (!email || !name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and name are required'
    })
  }

  const existing = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean()
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'An account with this email already exists'
    })
  }

  const id = 'user-' + Date.now().toString(36)
  // Security: Public registration can NEVER grant admin or officer privileges
  const safeRole = role === 'employer' ? 'employer' : 'candidate'

  const newUser = await UserModel.create({
    id,
    email: email.toLowerCase().trim(),
    name,
    role: safeRole,
    passwordHash: 'demo_hash',
    createdAt: new Date().toISOString()
  })

  // Create initial profile for candidate
  if (safeRole === 'candidate') {
    await CandidateProfileModel.create({
      userId: id,
      fullName: name,
      email: email.toLowerCase().trim(),
      mobile,
      city,
      skills: Array.isArray(skills) ? skills : [],
      updatedAt: new Date().toISOString()
    })
  }

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    createdAt: newUser.createdAt
  }
})
