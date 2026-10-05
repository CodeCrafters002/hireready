import { connectDB } from '~~/server/utils/db'
import { UserModel } from '~~/server/models'
import { sendEmail, generatePasswordResetEmailHtml, isEmailConfigured } from '~~/server/utils/email'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `${local[0]}*@${domain}`
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}@${domain}`
}

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
      emailSent: true,
      message: 'If an account exists with this email, a recovery verification code has been dispatched to your inbox.'
    }
  }

  // Generate 6-digit OTP and 15-minute expiry
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expires = new Date(Date.now() + 15 * 60 * 1000)

  user.passwordResetOtp = otp
  user.passwordResetExpires = expires
  await user.save()

  console.log(`[Security] Password reset OTP for ${email}: ${otp} (expires ${expires.toISOString()})`)

  // Construct optional direct link
  const reqHost = getRequestHeader(event, 'host') || 'hireready-drab-nine.vercel.app'
  const reqProtocol = reqHost.includes('localhost') ? 'http' : 'https'
  const resetUrl = `${reqProtocol}://${reqHost}/auth/forgot-password?email=${encodeURIComponent(email)}`

  // Send real email if Gmail/SMTP credentials configured
  let emailDispatched = false
  let dispatchError = ''

  if (isEmailConfigured()) {
    const html = generatePasswordResetEmailHtml({
      name: user.name || 'User',
      email: user.email,
      otp,
      resetUrl
    })

    const result = await sendEmail({
      to: user.email,
      subject: `[HireReady] Your Password Reset Code: ${otp}`,
      html
    })

    emailDispatched = result.success
    if (!result.success) {
      dispatchError = result.error || 'Failed to dispatch email'
      console.warn(`[Security] Email dispatch failed for ${email}:`, dispatchError)
    }
  }

  if (emailDispatched) {
    return {
      success: true,
      emailSent: true,
      message: `A 6-digit verification code has been sent directly to ${maskEmail(user.email)}. Please check your Gmail inbox (and Spam folder).`,
      role: user.role
    }
  }

  // Fallback if email credentials not yet added
  return {
    success: true,
    emailSent: false,
    message: isEmailConfigured()
      ? `Email service error: ${dispatchError}. Preview code provided below.`
      : 'Recovery code generated! (Add GMAIL_USER and GMAIL_APP_PASSWORD to send directly to Gmail inbox).',
    previewOtp: otp,
    role: user.role
  }
})
