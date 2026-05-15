import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { sendVerificationEmail } from '../utils/email'

const JWT_SECRET  = process.env.JWT_SECRET  || 'dev_secret_change_in_production'
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d'

function generateToken(userId: number, email: string) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES } as any)
}

function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex')
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function register(username: string, email: string, password: string) {
  const existingEmail    = await prisma.user.findUnique({ where: { email } })
  if (existingEmail)    throw { status: 409, message: 'Email já cadastrado' }

  const existingUsername = await prisma.user.findUnique({ where: { username } })
  if (existingUsername) throw { status: 409, message: 'Nome de usuário já em uso' }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { username, email, passwordHash },
    select: { id: true, username: true, email: true },
  })

  const token = randomHex()
  await prisma.emailToken.create({
    data: {
      userId:    user.id,
      token,
      type:      'verify_email',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  await sendVerificationEmail(email, username, token)
  return { message: 'Conta criada! Verifique seu email para ativar.' }
}

// ─── Verify Email ─────────────────────────────────────────────────────────────

export async function verifyEmail(token: string) {
  const record = await prisma.emailToken.findUnique({ where: { token } })

  if (!record || record.type !== 'verify_email') {
    throw { status: 400, message: 'Token inválido' }
  }

  // Token already used — check if user is already verified
  if (record.used) {
    const user = await prisma.user.findUnique({ where: { id: record.userId } })
    if (user?.emailVerified) {
      return { message: 'Email já confirmado! Faça login para continuar.', alreadyVerified: true }
    }
    throw { status: 400, message: 'Token inválido' }
  }

  if (record.expiresAt < new Date()) {
    throw { status: 400, message: 'Token expirado' }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data:  { emailVerified: true },
    }),
    prisma.emailToken.update({
      where: { id: record.id },
      data:  { used: true },
    }),
  ])

  return { message: 'Email confirmado com sucesso!' }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(emailOrUsername: string, password: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
    },
  })

  if (!user) throw { status: 401, message: 'Credenciais inválidas' }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid)  throw { status: 401, message: 'Credenciais inválidas' }

  if (!user.emailVerified) {
    throw { status: 403, message: 'Confirme seu email antes de entrar' }
  }

  const token = generateToken(user.id, user.email)
  return {
    token,
    user: {
      id:        user.id,
      username:  user.username,
      email:     user.email,
      unitValue: Number(user.unitValue),
    },
  }
}

// ─── Me ───────────────────────────────────────────────────────────────────────

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, username: true, email: true, unitValue: true, createdAt: true },
  })
  if (!user) throw { status: 404, message: 'Usuário não encontrado' }
  return { ...user, unitValue: Number(user.unitValue) }
}

// ─── Update unit value ────────────────────────────────────────────────────────

export async function updateUnitValue(userId: number, unitValue: number) {
  const user = await prisma.user.update({
    where:  { id: userId },
    data:   { unitValue },
    select: { unitValue: true },
  })
  return { unitValue: Number(user.unitValue) }
}

// ─── Resend verification ──────────────────────────────────────────────────────

export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.emailVerified) {
    return { message: 'Se o email existir e não estiver verificado, um novo link foi enviado.' }
  }

  await prisma.emailToken.updateMany({
    where: { userId: user.id, type: 'verify_email', used: false },
    data:  { used: true },
  })

  const token = randomHex()
  await prisma.emailToken.create({
    data: {
      userId:    user.id,
      token,
      type:      'verify_email',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  await sendVerificationEmail(email, user.username, token)
  return { message: 'Se o email existir e não estiver verificado, um novo link foi enviado.' }
}
