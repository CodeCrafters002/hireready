import { connectDB } from '~~/server/utils/db'
import { ApplicationModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const updated = await ApplicationModel.findOneAndUpdate(
    { id },
    {
      $set: {
        ...body,
        updatedAt: new Date().toISOString()
      }
    },
    { new: true }
  ).lean()

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Application not found'
    })
  }

  return updated
})
