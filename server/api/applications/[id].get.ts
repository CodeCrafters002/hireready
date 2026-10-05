import { connectDB } from '~~/server/utils/db'
import { ApplicationModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const id = getRouterParam(event, 'id')
  const application = await ApplicationModel.findOne({ id }).lean()

  if (!application) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Application not found'
    })
  }

  return application
})
