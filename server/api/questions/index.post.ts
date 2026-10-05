import { connectDB } from '~~/server/utils/db'
import { AssessmentQuestionModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)

  if (!body.question || !body.options || body.correctIndex === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question text, options array, and correctIndex are required'
    })
  }

  const id = body.id || 'q-' + Date.now().toString(36)

  const newQuestion = await AssessmentQuestionModel.create({
    id,
    question: body.question,
    options: body.options,
    correctIndex: Number(body.correctIndex),
    enabled: body.enabled !== false,
    category: body.category || 'General',
    jobId: body.jobId || null,
    createdAt: new Date().toISOString()
  })

  return newQuestion
})
