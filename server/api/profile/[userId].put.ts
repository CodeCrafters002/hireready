import { connectDB } from '~~/server/utils/db'
import { CandidateProfileModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const userId = getRouterParam(event, 'userId')
  const body = await readBody(event)

  const updated = await CandidateProfileModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...body,
        userId,
        updatedAt: new Date().toISOString()
      }
    },
    { upsert: true, new: true }
  ).lean()

  return updated
})
