import { connectDB } from '~~/server/utils/db'
import { GigModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const updatedGig = await GigModel.findOneAndUpdate(
    { id },
    { $set: body },
    { new: true }
  ).lean()

  if (!updatedGig) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Gig not found'
    })
  }

  return updatedGig
})
