import { connectDB } from '~~/server/utils/db'
import { UserModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)
  const { email, otp, newPassword } = body

  if (!email || !otp || !newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email, verification code, and new password are required'
    })
  }

  if (newPassword.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password must be at least 6 characters'
    })
  }

  const user = await UserModel.findOne({ email: email.toLowerCase().trim() })

  if (!user || !user.passwordResetOtp || !user.passwordResetExpires) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No active password reset request found for this account'
    })
  }

  // Check if expired
  if (new Date() > new Date(user.passwordResetExpires)) {
    user.passwordResetOtp = null
    user.passwordResetExpires = null
    await user.save()
    throw createError({
      statusCode: 400,
      statusMessage: 'The recovery code has expired. Please request a new one.'
    })
  }

  // Validate OTP code
  if (user.passwordResetOtp.trim() !== otp.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid verification code. Please check and try again.'
    })
  }

  // Update password and clear reset state
  user.passwordHash = newPassword
  user.passwordResetOtp = null
  user.passwordResetExpires = null
  await user.save()

  console.log(`[Security] Password successfully reset for user: ${user.email}`)

  return {
    success: true,
    message: 'Your password has been successfully reset. You can now sign in with your new credentials.'
  }
})
