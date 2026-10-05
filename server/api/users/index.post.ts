import { connectDB } from '~~/server/utils/db'
import { UserModel, CandidateProfileModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)
  const { name, email, role = 'candidate', mobile = '', city = '', password = 'demo_password' } = body

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
    name,
    email: email.toLowerCase().trim(),
    role,
    passwordHash: 'demo_hash',
    createdAt: new Date().toISOString()
  })

  // If role is candidate (student), automatically create their profile record
  if (role === 'candidate') {
    await CandidateProfileModel.create({
      userId: id,
      fullName: name,
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

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    createdAt: newUser.createdAt
  }
})
