import { connectDB } from '~~/server/utils/db'
import { GigModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const query = getQuery(event)
  const filter: Record<string, any> = {}

  if (query.status) {
    filter.status = query.status
  }
  if (query.category) {
    filter.category = query.category
  }
  if (query.city) {
    filter.city = new RegExp(String(query.city), 'i')
  }
  if (query.postedBy) {
    filter.postedBy = query.postedBy
  }

  const gigs = await GigModel.find(filter).sort({ createdAt: -1 }).lean()
  return gigs
})
