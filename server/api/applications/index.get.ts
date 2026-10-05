import { connectDB } from '~~/server/utils/db'
import { ApplicationModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const query = getQuery(event)
  const filter: Record<string, any> = {}

  if (query.candidateId) {
    filter.candidateId = query.candidateId
  }
  if (query.jobId) {
    filter.jobId = query.jobId
  }
  if (query.status) {
    filter.status = query.status
  }

  const applications = await ApplicationModel.find(filter).sort({ createdAt: -1 }).lean()
  return applications
})
