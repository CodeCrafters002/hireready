import { connectDB } from '~~/server/utils/db'
import { GigModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const id = getRouterParam(event, 'id')

  const gig = await GigModel.findOne({ id }).lean()
  if (!gig) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Gig not found'
    })
  }

  return gig
})
