import { connectDB } from '~~/server/utils/db'
import { UserModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const updated = await UserModel.findOneAndUpdate(
    { id },
    { $set: body },
    { new: true, projection: { passwordHash: 0 } }
  ).lean()

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  return updated
})
