import nodemailer from 'nodemailer'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export function isEmailConfigured(): boolean {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS
  return Boolean(user && pass)
}

export function createEmailTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS

  if (!user || !pass) {
    return null
  }

  // Clean app password (Google App Passwords typically have 4 blocks of 4 chars with spaces: "xxxx xxxx xxxx xxxx")
  const cleanPass = pass.replace(/\s+/g, '').trim()

  if (process.env.GMAIL_USER || user.endsWith('@gmail.com') || user.endsWith('@googlemail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user.trim(),
        pass: cleanPass
      }
    })
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (process.env.SMTP_SECURE === 'true') || (!process.env.SMTP_PORT || process.env.SMTP_PORT === '465'),
    auth: {
      user: user.trim(),
      pass: cleanPass
    }
  })
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transporter = createEmailTransporter()
  if (!transporter) {
    return {
      success: false,
      error: 'Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.'
    }
  }

  const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER || process.env.SMTP_USER
  const fromName = process.env.EMAIL_FROM_NAME || 'HireReady Security'

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>?/gm, '')
    })

    console.log(`[Email] Password reset dispatched to ${options.to} (MessageId: ${info.messageId})`)
    return { success: true, messageId: info.messageId }
  } catch (err: any) {
    console.error(`[Email] Dispatch failure to ${options.to}:`, err.message || err)
    return { success: false, error: err.message || 'Failed to dispatch email' }
  }
}

export function generatePasswordResetEmailHtml(params: { name: string; email: string; otp: string; resetUrl?: string }): string {
  const { name, email, otp, resetUrl } = params

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HireReady Password Reset</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f5f9; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 36px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; text-align: center; margin-bottom: 12px;">
                      <span style="font-size: 24px; color: #ffffff;">🔒</span>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">HireReady Security</h1>
                    <p style="margin: 6px 0 0; color: #e0e7ff; font-size: 13px; font-weight: 400;">Password Reset Verification Code</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #334155;">Hello <strong>${name || 'there'}</strong>,</p>
              
              <p style="margin: 0 0 24px; font-size: 14px; color: #64748b; line-height: 1.6;">
                We received a request to reset the password for your HireReady account (<strong style="color: #0f172a;">${email}</strong>).
                Please use the single-use 6-digit verification code below to authorize this reset:
              </p>

              <!-- OTP Display Box -->
              <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 8px;">
                  Your Verification Code
                </div>
                <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; text-indent: 8px;">
                  ${otp}
                </div>
                <div style="margin-top: 10px; font-size: 12px; color: #94a3b8;">
                  ⏱️ Expires in <strong>15 minutes</strong>
                </div>
              </div>

              ${resetUrl ? `
              <div style="text-align: center; margin: 28px 0 20px;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                  Reset Password Now &rarr;
                </a>
              </div>
              ` : ''}

              <!-- Security Notice -->
              <div style="margin-top: 28px; padding: 14px 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px;">
                <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
                  <strong>Important Security Notice:</strong> If you did not initiate this request, someone may have entered your email address by mistake. Your account remains completely secure, and no changes have been made. Never share this code with anyone.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 36px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                HireReady · Qualification-First Job & Placement Platform<br>
                This is an automated security transmission. Please do not reply directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
