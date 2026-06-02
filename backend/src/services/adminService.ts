import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { AppError } from '../middlewares/errorHandler'
import { sendWelcomeEmail } from '../utils/email'
import { forgotPassword } from './authService'

function randomTemp() { return crypto.randomBytes(5).toString('hex') }
function tempUsername() { return `user_${crypto.randomBytes(4).toString('hex')}` }

export async function listUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true, username: true, email: true,
      role: true, emailVerified: true, unitValue: true,
      accessExpiresAt: true, mustChangePassword: true, createdAt: true,
      bets: { select: { result: true, amountWagered: true, payout: true, source: true, date: true } },
      bankrollEntries: { select: { amount: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return users.map(u => {
    const settled     = u.bets.filter(b => b.result === 'won' || b.result === 'lost' || b.result === 'cashout')
    const won         = u.bets.filter(b => b.result === 'won')
    const wagered     = settled.reduce((s, b) => s + Number(b.amountWagered), 0)
    const payout      = settled.reduce((s, b) => s + Number(b.payout), 0)
    const netProfit   = payout - wagered
    const dates       = u.bets.map(b => new Date(b.date).getTime())
    const lastBetDate = dates.length ? new Date(Math.max(...dates)).toISOString() : null
    const bankroll    = u.bankrollEntries.reduce((s, e) => {
      if (e.type === 'initial' || e.type === 'deposit') return s + Number(e.amount)
      if (e.type === 'withdrawal') return s - Number(e.amount)
      return s
    }, 0) + netProfit

    return {
      id: u.id, username: u.username, email: u.email,
      role: u.role, emailVerified: u.emailVerified, unitValue: Number(u.unitValue),
      accessExpiresAt: u.accessExpiresAt, mustChangePassword: u.mustChangePassword, createdAt: u.createdAt,
      stats: {
        totalBets: u.bets.length, wonBets: won.length, settledBets: settled.length,
        netProfit: Math.round(netProfit * 100) / 100,
        totalWagered: Math.round(wagered * 100) / 100,
        bankrollBalance: Math.round(bankroll * 100) / 100,
        lastBetDate, aiCount: u.bets.filter(b => b.source === 'ai_extract').length,
      },
    }
  })
}

export async function updateUser(userId: number, data: {
  role?: string; accessExpiresAt?: string | null
}) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND')

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.role && { role: data.role as any }),
      ...(data.accessExpiresAt !== undefined && {
        accessExpiresAt: data.accessExpiresAt ? new Date(data.accessExpiresAt) : null,
      }),
    },
    select: { id: true, username: true, email: true, role: true, accessExpiresAt: true },
  })
}

export async function createUser(email: string, role: string, accessExpiresAt?: string) {
  const byEmail = await prisma.user.findUnique({ where: { email } })
  if (byEmail) throw new AppError('Email já cadastrado', 409, 'EMAIL_TAKEN', 'email')

  const tempPassword = randomTemp()
  const passwordHash = await bcrypt.hash(tempPassword, 12)
  let username = tempUsername()
  // ensure unique
  while (await prisma.user.findUnique({ where: { username } })) {
    username = tempUsername()
  }

  const user = await prisma.user.create({
    data: {
      username, email, passwordHash,
      emailVerified: true,
      role: role as any,
      accessExpiresAt: accessExpiresAt ? new Date(accessExpiresAt) : null,
      mustChangePassword: true,
    },
    select: { id: true, email: true, role: true },
  })

  await prisma.tipster.create({ data: { userId: user.id, name: 'Aposta Própria' } })
  await sendWelcomeEmail(email, tempPassword)
  return { ...user, emailSent: true }
}

export async function sendPasswordReset(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND')
  await forgotPassword(user.email)
  return { message: 'Email de redefinição enviado.' }
}

export async function deleteUser(userId: number, adminId: number) {
  if (userId === adminId) throw new AppError('Não é possível deletar a própria conta', 400, 'CANNOT_DELETE_SELF')
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND')
  await prisma.user.delete({ where: { id: userId } })
  return { message: 'Usuário deletado com sucesso' }
}
