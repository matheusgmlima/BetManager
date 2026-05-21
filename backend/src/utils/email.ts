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

function buildVerificationEmail(username: string, link: string): string {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirme seu email</title>
</head>
<body style="margin:0;padding:0;background:#08080e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:48px 16px;">

      <table width="520" cellpadding="0" cellspacing="0" border="0"
             style="background:#111120;border-radius:20px;overflow:hidden;max-width:520px;width:100%;">

        <!-- top accent bar -->
        <tr>
          <td style="height:3px;background:linear-gradient(90deg,#5b21b6,#7c3aed,#a78bfa);font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- brand -->
        <tr>
          <td style="padding:36px 44px 0;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;">
                  <span style="font-size:20px;font-weight:900;color:#ededf5;letter-spacing:-0.5px;">Bet</span><span style="font-size:20px;font-weight:900;background:linear-gradient(135deg,#7c3aed,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Manager</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:28px 44px 0;">
            <p style="margin:0 0 10px;font-size:24px;font-weight:800;color:#ededf5;line-height:1.2;">
              Ol&#xe1;, ${username} &#x1F44B;
            </p>
            <p style="margin:0;font-size:15px;color:#7878a0;line-height:1.7;">
              Sua conta no BetManager est&#xe1; quase pronta.<br/>
              S&#xf3; falta confirmar seu email para come&#xe7;ar a gerenciar sua banca.
            </p>
          </td>
        </tr>

        <!-- cta -->
        <tr>
          <td style="padding:32px 44px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${link}"
                     style="display:inline-block;padding:15px 44px;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.02em;">
                    Confirmar meu email
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:20px 0 0;font-size:12px;color:#46465e;text-align:center;line-height:1.6;">
              Link v&#xe1;lido por 24 horas &nbsp;&#xb7;&nbsp; Bot&#xe3;o n&#xe3;o funciona?<br/>
              <a href="${link}" style="color:#7c3aed;word-break:break-all;">${link}</a>
            </p>
          </td>
        </tr>

        <!-- divider -->
        <tr>
          <td style="padding:0 44px;">
            <div style="height:1px;background:#1c1c2e;font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td style="padding:24px 44px;">
            <p style="margin:0;font-size:12px;color:#46465e;line-height:1.7;">
              Se voc&#xea; n&#xe3;o criou esta conta, pode ignorar este email com seguran&#xe7;a.<br/>
              &copy; ${year} BetManager
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

export async function sendVerificationEmail(email: string, username: string, token: string) {
  const link = `${APP_URL}/verificar-email?token=${token}`
  const transporter = createTransporter()

  if (!transporter) {
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
    html: buildVerificationEmail(username, link),
  })
}
