import { connectDB } from '~~/server/utils/db'
import { AssessmentQuestionModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const id = getRouterParam(event, 'id')
  const result = await AssessmentQuestionModel.deleteOne({ id })

  return { success: result.deletedCount > 0 }
})
