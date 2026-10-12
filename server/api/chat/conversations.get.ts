import { connectDB } from '~~/server/utils/db'
import { ConversationModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const query = getQuery(event)
  const role = query.role as string | undefined
  const userId = query.userId as string | undefined
  const email = (query.email as string | undefined)?.toLowerCase().trim()

  const filter: Record<string, any> = {}

  if (role === 'admin' || role === 'all' || !role) {
    // Return all conversations for admin or general sync
  } else if (role === 'candidate' && userId) {
    const orConditions: any[] = [
      { candidateId: userId },
      { candidateId: 'cand-seed-1' },
      { candidateId: 'demo-candidate' },
      { isSupportChat: true }
    ]
    if (email) {
      orConditions.push({ candidateEmail: new RegExp(`^${email}$`, 'i') })
    }
    filter.$or = orConditions
  } else if (role === 'employer' && userId) {
    filter.$or = [
      { employerId: userId },
      { employerId: 'emp-lead' },
      { employerId: 'emp-demo' },
      { isSupportChat: false }
    ]
  }

  const conversations = await ConversationModel.find(filter)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean()

  return conversations
})
