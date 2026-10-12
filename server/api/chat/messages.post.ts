import { connectDB } from '~~/server/utils/db'
import { ChatMessageModel, ConversationModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)

  if (!body || !body.id || !body.conversationId || !body.text) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid message payload: id, conversationId, and text are required'
    })
  }

  const message = await ChatMessageModel.findOneAndUpdate(
    { id: body.id },
    { $set: body },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()

  // Update parent conversation
  const unreadUpdate: Record<string, number> = {}
  if (body.senderRole === 'candidate') {
    unreadUpdate.unreadEmployerCount = 1
    unreadUpdate.unreadAdminCount = 1
  } else if (body.senderRole === 'employer') {
    unreadUpdate.unreadCandidateCount = 1
    unreadUpdate.unreadAdminCount = 1
  } else if (body.senderRole === 'admin') {
    unreadUpdate.unreadCandidateCount = 1
  }

  await ConversationModel.updateOne(
    { id: body.conversationId },
    {
      $set: {
        lastMessageText: body.text,
        lastMessageAt: body.createdAt || new Date().toISOString(),
        updatedAt: body.createdAt || new Date().toISOString()
      },
      $inc: unreadUpdate
    }
  ).catch(err => {
    console.warn('[MongoDB Chat] Warning updating conversation stats:', err)
  })

  return message
})
