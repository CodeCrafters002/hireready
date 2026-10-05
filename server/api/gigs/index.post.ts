import { connectDB } from '~~/server/utils/db'
import { GigModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)

  if (!body.title || !body.organization || !body.date || !body.dailyPay || !body.openings) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title, organization, date, daily pay, and openings are required'
    })
  }

  const id = body.id || `gig-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`

  const newGig = await GigModel.create({
    ...body,
    id,
    filled: body.filled || 0,
    escrowStatus: body.escrowStatus || 'deposited',
    status: body.status || 'open',
    createdAt: new Date().toISOString()
  })

  return newGig
})
