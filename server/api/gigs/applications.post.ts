import { connectDB } from '~~/server/utils/db'
import { GigModel, GigApplicationModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)

  if (!body.gigId || !body.candidateId || !body.candidateName || !body.candidateEmail) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Gig ID, Candidate ID, Name, and Email are required'
    })
  }

  const gig = await GigModel.findOne({ id: body.gigId }).lean()
  if (!gig) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Gig not found'
    })
  }

  const existing = await GigApplicationModel.findOne({
    gigId: body.gigId,
    candidateId: body.candidateId
  }).lean()

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'You have already applied for this shift'
    })
  }

  const id = `gig-app-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`

  const newApp = await GigApplicationModel.create({
    id,
    gigId: body.gigId,
    candidateId: body.candidateId,
    candidateName: body.candidateName,
    candidateEmail: body.candidateEmail,
    candidateMobile: body.candidateMobile || '',
    upiId: body.upiId || '',
    college: body.college || '',
    status: 'applied',
    payoutAmount: gig.dailyPay || body.payoutAmount || 0,
    payoutStatus: 'escrowed',
    appliedAt: new Date().toISOString()
  })

  return newApp
})
