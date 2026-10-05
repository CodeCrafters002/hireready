import { connectDB } from '~~/server/utils/db'
import { CandidateProfileModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const userId = getRouterParam(event, 'userId')
  const profile = await CandidateProfileModel.findOne({ userId }).lean()

  if (!profile) {
    // Return empty profile shell if none exists yet
    return {
      userId,
      fullName: '',
      email: '',
      mobile: '',
      city: '',
      skills: [],
      education: '',
      experience: '',
      resumeFilename: '',
      profilePhotoUrl: '',
      updatedAt: new Date().toISOString()
    }
  }

  return profile
})
