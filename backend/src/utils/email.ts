import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'BetManager <noreply@betmanager.app>'
const APP_URL   = process.env.APP_URL  || 'http://localhost:5173'

function createTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

export async function sendVerificationEmail(email: string, username: string, token: string) {
  const link = `${APP_URL}/verificar-email?token=${token}`
  const transporter = createTransporter()

  if (!transporter) {
    // Dev fallback — print to console
    console.log('\n─── EMAIL VERIFICATION (dev mode) ──────────────────')
    console.log(`To:    ${email}`)
    console.log(`Link:  ${link}`)
    console.log('────────────────────────────────────────────────────\n')
    return
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Confirme seu email — BetManager',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#7c3aed;margin-bottom:8px">BetManager</h2>
        <p>Olá, <strong>${username}</strong>!</p>
        <p>Confirme seu email clicando no botão abaixo:</p>
        <a href="${link}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
          Confirmar email
        </a>
        <p style="color:#888;font-size:12px">Link válido por 24 horas. Se não foi você, ignore este email.</p>
      </div>
    `,
  })
}
