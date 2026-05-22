import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'BetManager <noreply@betmanager.app>'
const APP_URL   = process.env.APP_URL  || 'https://betmanager.app.br'

function createTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  return nodemailer.createTransport({
    host: SMTP_HOST, port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

function card(inner: string): string {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#08080e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td align="center" style="padding:48px 16px;">
    <table width="520" cellpadding="0" cellspacing="0" border="0" style="background:#111120;border-radius:20px;overflow:hidden;max-width:520px;width:100%;">
      <tr><td style="height:3px;background:linear-gradient(90deg,#5b21b6,#7c3aed,#a78bfa);font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 44px 0;">
        <span style="font-size:20px;font-weight:900;color:#ededf5;">Bet</span><span style="font-size:20px;font-weight:900;color:#7c3aed;">Manager</span>
      </td></tr>
      ${inner}
      <tr><td style="padding:24px 44px 32px;">
        <p style="margin:0;font-size:12px;color:#46465e;">&copy; ${year} BetManager</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

function buildVerificationEmail(username: string, link: string): string {
  return card(`
  <tr><td style="padding:28px 44px 0;">
    <p style="margin:0 0 10px;font-size:24px;font-weight:800;color:#ededf5;">Ol&#xe1;, ${username} &#x1f44b;</p>
    <p style="margin:0;font-size:15px;color:#7878a0;line-height:1.7;">Confirme seu email para ativar a conta.</p>
  </td></tr>
  <tr><td style="padding:32px 44px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center">
      <a href="${link}" style="display:inline-block;padding:15px 44px;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;">Confirmar email</a>
    </td></tr></table>
    <p style="margin:20px 0 0;font-size:12px;color:#46465e;text-align:center;">V&#xe1;lido por 24h &nbsp;|&nbsp; <a href="${link}" style="color:#7c3aed;">link direto</a></p>
  </td></tr>`)
}

function buildResetPasswordEmail(username: string, link: string): string {
  return card(`
  <tr><td style="padding:28px 44px 0;">
    <p style="margin:0 0 10px;font-size:24px;font-weight:800;color:#ededf5;">Redefinir senha</p>
    <p style="margin:0;font-size:15px;color:#7878a0;line-height:1.7;">Ol&#xe1;, ${username}. Clique abaixo para criar uma nova senha.<br/>Link v&#xe1;lido por <strong style="color:#ededf5;">1 hora</strong>.</p>
  </td></tr>
  <tr><td style="padding:32px 44px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center">
      <a href="${link}" style="display:inline-block;padding:15px 44px;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;">Redefinir minha senha</a>
    </td></tr></table>
  </td></tr>`)
}

function buildWelcomeEmail(email: string, tempPassword: string): string {
  const link = `${APP_URL}/login`
  return card(`
  <tr><td style="padding:28px 44px 0;">
    <p style="margin:0 0 10px;font-size:24px;font-weight:800;color:#ededf5;">Bem-vindo ao BetManager! &#x1f680;</p>
    <p style="margin:0;font-size:15px;color:#7878a0;line-height:1.7;">Sua conta foi criada. Use as credenciais abaixo para acessar.</p>
  </td></tr>
  <tr><td style="padding:24px 44px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0d0d1a;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#46465e;letter-spacing:0.08em;text-transform:uppercase;">Suas credenciais</p>
        <p style="margin:0 0 4px;font-size:12px;color:#7878a0;">Email</p>
        <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#ededf5;">${email}</p>
        <p style="margin:0 0 4px;font-size:12px;color:#7878a0;">Senha tempor&#xe1;ria</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#f59e0b;letter-spacing:0.12em;">${tempPassword}</p>
      </td></tr>
    </table>
    <p style="margin:12px 0 0;font-size:12px;color:#46465e;text-align:center;">Ap&#xf3;s o primeiro login voc&#xea; escolher&#xe1; seu usu&#xe1;rio e uma nova senha.</p>
  </td></tr>
  <tr><td style="padding:28px 44px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center">
      <a href="${link}" style="display:inline-block;padding:14px 44px;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;">Acessar agora</a>
    </td></tr></table>
  </td></tr>`)
}

export async function sendVerificationEmail(email: string, username: string, token: string) {
  const link = `${APP_URL}/verificar-email?token=${token}`
  const transporter = createTransporter()
  if (!transporter) {
    console.log('\n─── EMAIL VERIFICATION (dev) ────')
    console.log(`To: ${email}  Link: ${link}`)
    return
  }
  await transporter.sendMail({ from: SMTP_FROM, to: email, subject: 'Confirme seu email — BetManager', html: buildVerificationEmail(username, link) })
}

export async function sendResetPasswordEmail(email: string, username: string, token: string) {
  const link = `${APP_URL}/redefinir-senha?token=${token}`
  const transporter = createTransporter()
  if (!transporter) {
    console.log('\n─── PASSWORD RESET (dev) ────')
    console.log(`To: ${email}  Link: ${link}`)
    return
  }
  await transporter.sendMail({ from: SMTP_FROM, to: email, subject: 'Redefinir senha — BetManager', html: buildResetPasswordEmail(username, link) })
}

export async function sendWelcomeEmail(email: string, tempPassword: string) {
  const transporter = createTransporter()
  if (!transporter) {
    console.log('\n─── WELCOME EMAIL (dev) ────')
    console.log(`To: ${email}  TempPass: ${tempPassword}`)
    return
  }
  await transporter.sendMail({ from: SMTP_FROM, to: email, subject: 'Bem-vindo ao BetManager! 🚀', html: buildWelcomeEmail(email, tempPassword) })
}
