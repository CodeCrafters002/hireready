import { connectDB } from '~~/server/utils/db'
import { JobModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const id = getRouterParam(event, 'id')
  const job = await JobModel.findOne({ id }).lean()

  if (!job) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Job not found'
    })
  }

  return job
})
