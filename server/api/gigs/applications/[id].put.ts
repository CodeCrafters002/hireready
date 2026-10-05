import { connectDB } from '~~/server/utils/db'
import { GigModel, GigApplicationModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const existingApp = await GigApplicationModel.findOne({ id }).lean()
  if (!existingApp) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Gig application not found'
    })
  }

  const updates: Record<string, any> = { ...body }

  if (body.status === 'checked_in' && !existingApp.checkedInAt) {
    updates.checkedInAt = new Date().toISOString()
  }
  if (body.status === 'completed' && !existingApp.completedAt) {
    updates.completedAt = new Date().toISOString()
    updates.payoutStatus = 'approved'
  }
  if (body.status === 'paid') {
    updates.payoutStatus = 'paid'
  }

  const updatedApp = await GigApplicationModel.findOneAndUpdate(
    { id },
    { $set: updates },
    { new: true }
  ).lean()

  // If newly accepted, increment gig filled count
  if (body.status === 'accepted' && existingApp.status !== 'accepted') {
    await GigModel.findOneAndUpdate(
      { id: existingApp.gigId },
      { $inc: { filled: 1 } }
    )
  }

  return updatedApp
})
