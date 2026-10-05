import { connectDB } from '~~/server/utils/db'
import { UserModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)
  const { email, recoveryKey, newPassword } = body

  if (!email || !recoveryKey || !newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email, master recovery key, and new password are required'
    })
  }

  if (newPassword.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: 'New password must be at least 6 characters'
    })
  }

  // Master recovery key configured in Vercel environment variables or local .env
  const masterKey = process.env.ADMIN_RECOVERY_KEY || 'HireReady-Admin-Recovery-2026!'

  if (recoveryKey.trim() !== masterKey.trim()) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid Master Recovery Key. Access denied.'
    })
  }

  const user = await UserModel.findOne({ email: email.toLowerCase().trim() })
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No user account found with this email'
    })
  }

  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Master Break-Glass recovery is only authorized for Administrator accounts'
    })
  }

  // Update password and record recovery audit log
  user.passwordHash = newPassword
  user.passwordResetOtp = null
  user.passwordResetExpires = null
  user.recoveryKeyUsedAt = new Date().toISOString()
  await user.save()

  console.log(`[Security Alert] Emergency Master Key used to recover Admin account: ${user.email} at ${user.recoveryKeyUsedAt}`)

  return {
    success: true,
    message: 'Super Admin account successfully recovered and password updated.'
  }
})
