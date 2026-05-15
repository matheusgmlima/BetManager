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
<body style="margin:0;padding:0;background:#0f0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <table width="520" cellpadding="0" cellspacing="0" border="0"
               style="background:#16161f;border-radius:16px;border:1px solid #2a2a3a;overflow:hidden;max-width:520px;width:100%;">

          <!-- Purple top bar -->
          <tr>
            <td style="background:linear-gradient(135deg,#5b21b6,#7c3aed,#a855f7);height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td align="center" style="padding:36px 40px 28px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center"
                      style="width:52px;height:52px;background:linear-gradient(135deg,#5b21b6,#7c3aed);border-radius:14px;text-align:center;vertical-align:middle;">
                    <span style="font-size:26px;line-height:52px;">&#x1F40D;</span>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-size:22px;font-weight:800;color:#f4f4f8;letter-spacing:-0.5px;">BetManager</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0 40px 36px;">

              <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#f4f4f8;">
                Ol&#xe1;, ${username}! &#x1F44B;
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#9494aa;line-height:1.6;">
                Voc&#xea; est&#xe1; a um clique de ativar sua conta e come&#xe7;ar a gerenciar sua banca com precis&#xe3;o.
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="border-top:1px solid #2a2a3a;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Info box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#1e1e2e;border-radius:12px;border:1px solid #2a2a3a;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:36px;vertical-align:top;padding-top:2px;">
                          <span style="font-size:20px;">&#x1F4E7;</span>
                        </td>
                        <td style="vertical-align:top;padding-left:12px;">
                          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#a78bfa;letter-spacing:0.05em;text-transform:uppercase;">Confirmar conta</p>
                          <p style="margin:0;font-size:13px;color:#9494aa;line-height:1.5;">
                            Clique no bot&#xe3;o abaixo para verificar seu email e ativar sua conta. O link expira em <strong style="color:#f4f4f8;">24 horas</strong>.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${link}"
                       style="display:inline-block;padding:15px 40px;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#ffffff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.01em;">
                      &#x2705;&nbsp;&nbsp;Confirmar meu email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 24px;font-size:12px;color:#5a5a72;text-align:center;line-height:1.5;">
                Bot&#xe3;o n&#xe3;o funciona? Cole este link no seu navegador:<br/>
                <a href="${link}" style="color:#7c3aed;word-break:break-all;text-decoration:none;">${link}</a>
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-top:1px solid #2a2a3a;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Features -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="33%" style="text-align:center;padding:0 8px;">
                    <p style="margin:0 0 4px;font-size:18px;">&#x1F4CA;</p>
                    <p style="margin:0;font-size:11px;color:#5a5a72;font-weight:600;">Dashboard</p>
                  </td>
                  <td width="33%" style="text-align:center;padding:0 8px;">
                    <p style="margin:0 0 4px;font-size:18px;">&#x1F916;</p>
                    <p style="margin:0;font-size:11px;color:#5a5a72;font-weight:600;">Extra&#xe7;&#xe3;o por IA</p>
                  </td>
                  <td width="33%" style="text-align:center;padding:0 8px;">
                    <p style="margin:0 0 4px;font-size:18px;">&#x1F3AF;</p>
                    <p style="margin:0;font-size:11px;color:#5a5a72;font-weight:600;">Metas &amp; Analytics</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f0f14;padding:20px 40px;border-top:1px solid #2a2a3a;">
              <p style="margin:0;font-size:11px;color:#3a3a52;text-align:center;line-height:1.6;">
                Se voc&#xea; n&#xe3;o criou uma conta no BetManager, ignore este email com seguran&#xe7;a.<br/>
                &copy; ${year} BetManager &mdash; Todos os direitos reservados.
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
    subject: '✅ Confirme seu email — BetManager',
    html: buildVerificationEmail(username, link),
  })
}
