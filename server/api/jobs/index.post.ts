import { connectDB } from '~~/server/utils/db'
import { JobModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)

  if (!body.title || !body.company) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title and Company are required'
    })
  }

  const id = body.id || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36)

  const newJob = await JobModel.create({
    ...body,
    id,
    createdAt: new Date().toISOString()
  })

  return newJob
})
