import { connectDB } from '~~/server/utils/db'
import { JobModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const updated = await JobModel.findOneAndUpdate(
    { id },
    { $set: body },
    { new: true }
  ).lean()

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Job not found'
    })
  }

  return updated
})
