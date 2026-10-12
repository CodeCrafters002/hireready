import { connectDB } from '~~/server/utils/db'
import { ChatMessageModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const query = getQuery(event)
  const conversationId = query.conversationId as string | undefined

  const filter: Record<string, any> = {}
  if (conversationId) {
    filter.conversationId = conversationId
  }

  const messages = await ChatMessageModel.find(filter)
    .sort({ createdAt: 1 })
    .lean()

  return messages
})
