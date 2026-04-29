import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  from?: string
}) {
  if (!process.env.SMTP_USER) {
    console.log('[Email skipped - no SMTP config]', params.subject, '->', params.to)
    return { messageId: 'skipped' }
  }

  return transporter.sendMail({
    from: params.from || process.env.SMTP_FROM || 'TalentBridge Africa <noreply@talentbridge.africa>',
    to: params.to,
    subject: params.subject,
    html: params.html,
  })
}

export function buildEmailHtml(body: string, companyName = 'TalentBridge Africa'): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}
.header{background:#2563EB;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center}
.body{background:#f9fafb;padding:30px;border:1px solid #e5e7eb}
.footer{background:#e5e7eb;padding:15px;text-align:center;font-size:12px;color:#6b7280;border-radius:0 0 8px 8px}
p{margin:0 0 15px}
</style></head>
<body>
<div class="header"><h2>${companyName}</h2></div>
<div class="body">${body.replace(/\n/g, '<br>')}</div>
<div class="footer">This email was sent by ${companyName} HR System. Please do not reply to this automated email.</div>
</body>
</html>`
}
