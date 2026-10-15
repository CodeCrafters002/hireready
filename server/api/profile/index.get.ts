import { connectDB } from '~~/server/utils/db'
import { CandidateProfileModel } from '~~/server/models'

export default defineEventHandler(async () => {
  await connectDB()
  const profiles = await CandidateProfileModel.find().lean()
  return profiles
})
