import { connectDB } from '~~/server/utils/db'
import { JobModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const query = getQuery(event)
  const filter: Record<string, any> = {}

  if (query.published !== undefined) {
    filter.published = query.published === 'true'
  }

  const jobs = await JobModel.find(filter).sort({ createdAt: -1 }).lean()
  return jobs
})
