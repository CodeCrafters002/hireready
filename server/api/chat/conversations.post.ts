import { connectDB } from '~~/server/utils/db'
import { ConversationModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)

  if (!body || !body.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid conversation payload: "id" is required'
    })
  }

  const updated = await ConversationModel.findOneAndUpdate(
    { id: body.id },
    { $set: body },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()

  return updated
})
