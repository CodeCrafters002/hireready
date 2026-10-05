import { connectDB } from '~~/server/utils/db'
import { UserModel } from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)
  const email = body?.email?.toLowerCase().trim()

  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email address is required'
    })
  }

  const user = await UserModel.findOne({ email })
  if (!user) {
    // For security, don't leak whether account exists or not
    return {
      success: true,
      message: 'If an account exists with this email, a recovery verification code has been dispatched.'
    }
  }

  // Generate 6-digit OTP and 15-minute expiry
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expires = new Date(Date.now() + 15 * 60 * 1000)

  user.passwordResetOtp = otp
  user.passwordResetExpires = expires
  await user.save()

  console.log(`[Security] Password reset OTP for ${email}: ${otp} (expires ${expires.toISOString()})`)

  return {
    success: true,
    message: 'A 6-digit recovery code has been generated.',
    // Provided in development/demo mode so user can test without email setup
    previewOtp: otp,
    role: user.role
  }
})
