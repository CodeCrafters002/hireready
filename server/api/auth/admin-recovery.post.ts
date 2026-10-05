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

  // Normalize incoming recovery key
  const submittedKey = recoveryKey.trim()
  const envKey = (process.env.ADMIN_RECOVERY_KEY || '').trim().replace(/^["']|["']$/g, '')

  // Set of accepted master keys for emergency recovery
  const validKeys = [
    'HireReady-Admin-Recovery-2026!',
    'HIREREADY_EMERGENCY_RECOVERY_2026_SECURE',
    'HireReady-Admin-Recovery-2026',
    'HIREREADY_EMERGENCY_RECOVERY_2026',
    envKey
  ].filter(Boolean)

  const isKeyValid = validKeys.some(k => k.toLowerCase() === submittedKey.toLowerCase())

  if (!isKeyValid) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid Master Recovery Key. Access denied.'
    })
  }

  const cleanEmail = email.toLowerCase().trim()

  // Security: Master Break-Glass recovery is strictly restricted to the authorized platform owner
  const authorizedEmails = new Set([
    'codecrafters002@gmail.com',
    (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim()
  ].filter(Boolean))

  if (!authorizedEmails.has(cleanEmail)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Master recovery is locked to the platform owner.'
    })
  }

  let user = await UserModel.findOne({ email: cleanEmail })

  if (!user) {
    // If account doesn't exist, create it as Super Admin
    user = new UserModel({
      id: `user-admin-${Date.now()}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0] || 'Super Admin',
      role: 'admin',
      passwordHash: newPassword,
      recoveryKeyUsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    })
    await user.save()
  } else {
    // If account exists, promote to Super Admin and set password
    user.role = 'admin'
    user.passwordHash = newPassword
    user.passwordResetOtp = null
    user.passwordResetExpires = null
    user.recoveryKeyUsedAt = new Date().toISOString()
    await user.save()
  }

  console.log(`[Security Alert] Emergency Master Key used. Super Admin access granted to ${user.email} at ${user.recoveryKeyUsedAt}`)

  return {
    success: true,
    message: `Account ${user.email} is now a verified Super Admin! You can now sign in with your new password.`
  }
})
