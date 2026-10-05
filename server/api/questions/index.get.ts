import { connectDB } from '~~/server/utils/db'
import { AssessmentQuestionModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const query = getQuery(event)
  const filter: Record<string, any> = { enabled: true }

  if (query.jobId) {
    // If jobId provided, fetch questions for that specific job OR global fallback questions
    const specificQuestions = await AssessmentQuestionModel.find({
      jobId: query.jobId,
      enabled: true
    }).lean()

    if (specificQuestions.length > 0) {
      return specificQuestions
    }

    // Fallback to global questions if not enough job-specific questions
    return await AssessmentQuestionModel.find({
      jobId: null,
      enabled: true
    }).lean()
  }

  // Admin view or all questions
  const allFilter: Record<string, any> = {}
  if (query.all !== 'true') {
    allFilter.enabled = true
  }

  const questions = await AssessmentQuestionModel.find(allFilter).lean()
  return questions
})
