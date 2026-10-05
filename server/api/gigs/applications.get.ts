import { connectDB } from '~~/server/utils/db'
import { GigApplicationModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const query = getQuery(event)
  const filter: Record<string, any> = {}

  if (query.gigId) {
    filter.gigId = query.gigId
  }
  if (query.candidateId) {
    filter.candidateId = query.candidateId
  }
  if (query.status) {
    filter.status = query.status
  }

  const applications = await GigApplicationModel.find(filter).sort({ appliedAt: -1 }).lean()
  return applications
})
