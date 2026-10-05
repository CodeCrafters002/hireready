import { connectDB } from '~~/server/utils/db'
import { UserModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const query = getQuery(event)
  const filter: Record<string, any> = {
    email: {
      $nin: [
        'admin@hireready.demo',
        'rahul@demo.com',
        'ananya@demo.com',
        'vikram@demo.com',
        'employer@brightstack.demo'
      ]
    }
  }

  if (query.role) {
    filter.role = query.role
  }

  const users = await UserModel.find(filter, { passwordHash: 0 }).sort({ createdAt: -1 }).lean()
  return users
})
