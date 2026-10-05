import { connectDB } from '~~/server/utils/db'
import { ApplicationModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)

  if (!body.jobId || !body.candidateId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'jobId and candidateId are required'
    })
  }

  // Check if candidate already applied for this job
  const existing = await ApplicationModel.findOne({
    jobId: body.jobId,
    candidateId: body.candidateId
  }).lean()

  if (existing) {
    return existing
  }

  const id = body.id || 'app-' + Date.now().toString(36)

  const newApp = await ApplicationModel.create({
    ...body,
    id,
    status: body.status || 'payment_pending',
    paymentAmount: body.paymentAmount ?? 299,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  return newApp
})
