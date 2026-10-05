import { connectDB } from '~~/server/utils/db'
import { UserModel, CandidateProfileModel, ApplicationModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const id = getRouterParam(event, 'id')

  const result = await UserModel.deleteOne({ id })
  if (result.deletedCount > 0) {
    // Clean up related profile and applications
    await Promise.all([
      CandidateProfileModel.deleteOne({ userId: id }),
      ApplicationModel.deleteMany({ candidateId: id })
    ])
  }

  return { success: result.deletedCount > 0 }
})
