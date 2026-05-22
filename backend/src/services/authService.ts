import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/errorHandler'
import { sendVerificationEmail, sendResetPasswordEmail } from '../utils/email'

const JWT_SECRET  = process.env.JWT_SECRET  || 'dev_secret_change_in_production'
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d'

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'dev_secret_change_in_production') {
  throw new Error('JWT_SECRET nao definido em producao!')
}

function generateToken(userId: number, email: string) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES } as any)
}

function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex')
}

// Register

export async function register(username: string, email: string, password: string) {
  const existingEmail = await prisma.user.findUnique({ where: { email } })
  if (existingEmail) throw new AppError('Email ja cadastrado', 409, 'EMAIL_TAKEN', 'email')

  const existingUsername = await prisma.user.findUnique({ where: { username } })
  if (existingUsername) throw new AppError('Nome de usuario ja em uso', 409, 'USERNAME_TAKEN', 'username')

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

  await prisma.tipster.create({ data: { userId: user.id, name: 'Aposta Propria' } })

  await sendVerificationEmail(email, username, token)
  return { message: 'Conta criada! Verifique seu email para ativar.' }
}

// Verify Email

export async function verifyEmail(token: string) {
  const record = await prisma.emailToken.findUnique({ where: { token } })

  if (!record || record.type !== 'verify_email') {
    throw new AppError('Token invalido', 400, 'INVALID_TOKEN')
  }

  if (record.used) {
    const user = await prisma.user.findUnique({ where: { id: record.userId } })
    if (user?.emailVerified) {
      return { message: 'Email ja confirmado! Faca login para continuar.', alreadyVerified: true }
    }
    throw new AppError('Token invalido', 400, 'INVALID_TOKEN')
  }

  if (record.expiresAt < new Date()) {
    throw new AppError('Token expirado', 400, 'TOKEN_EXPIRED')
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

// Login

export async function login(emailOrUsername: string, password: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
    },
  })

  if (!user) throw new AppError('Credenciais invalidas', 401, 'INVALID_CREDENTIALS')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new AppError('Credenciais invalidas', 401, 'INVALID_CREDENTIALS')

  if (!user.emailVerified) {
    throw new AppError('Confirme seu email antes de entrar', 403, 'EMAIL_NOT_VERIFIED')
  }

  const token = generateToken(user.id, user.email)
  return {
    token,
    user: {
      id:                 user.id,
      username:           user.username,
      email:              user.email,
      unitValue:          Number(user.unitValue),
      role:               user.role,
      accessExpiresAt:    user.accessExpiresAt,
      mustChangePassword: user.mustChangePassword,
    },
  }
}

// Me

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, username: true, email: true, unitValue: true, createdAt: true, role: true, accessExpiresAt: true, mustChangePassword: true },
  })
  if (!user) throw new AppError('Usuario nao encontrado', 404, 'USER_NOT_FOUND')
  return { ...user, unitValue: Number(user.unitValue) }
}

// Update unit value

export async function updateUnitValue(userId: number, unitValue: number) {
  const user = await prisma.user.update({
    where:  { id: userId },
    data:   { unitValue },
    select: { unitValue: true },
  })
  return { unitValue: Number(user.unitValue) }
}

// Resend verification

export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.emailVerified) {
    return { message: 'Se o email existir e nao estiver verificado, um novo link foi enviado.' }
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
  return { message: 'Se o email existir e nao estiver verificado, um novo link foi enviado.' }
}

// Forgot Password

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.emailVerified) {
    return { message: 'Se o email existir, um link de redefinicao foi enviado.' }
  }

  await prisma.emailToken.updateMany({
    where: { userId: user.id, type: 'reset_password', used: false },
    data:  { used: true },
  })

  const token = randomHex()
  await prisma.emailToken.create({
    data: {
      userId:    user.id,
      token,
      type:      'reset_password',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  })

  await sendResetPasswordEmail(email, user.username, token)
  return { message: 'Se o email existir, um link de redefinicao foi enviado.' }
}

// Setup Account (first login)

export async function setupAccount(userId: number, username: string, newPassword: string) {
  if (!username || username.length < 3) {
    throw new AppError('Username deve ter pelo menos 3 caracteres', 400, 'INVALID_USERNAME', 'username')
  }
  if (newPassword.length < 8) {
    throw new AppError('A senha deve ter pelo menos 8 caracteres', 400, 'WEAK_PASSWORD', 'password')
  }
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing && existing.id !== userId) {
    throw new AppError('Nome de usuário já em uso', 409, 'USERNAME_TAKEN', 'username')
  }
  const passwordHash = await bcrypt.hash(newPassword, 12)
  const user = await prisma.user.update({
    where: { id: userId },
    data: { username, passwordHash, mustChangePassword: false },
    select: { id: true, username: true, email: true, unitValue: true, role: true, accessExpiresAt: true, mustChangePassword: true },
  })
  return { ...user, unitValue: Number(user.unitValue) }
}

// Reset Password

export async function resetPassword(token: string, newPassword: string) {
  const record = await prisma.emailToken.findUnique({ where: { token } })

  if (!record || record.type !== 'reset_password' || record.used) {
    throw new AppError('Token invalido', 400, 'INVALID_TOKEN')
  }

  if (record.expiresAt < new Date()) {
    throw new AppError('Token expirado', 400, 'TOKEN_EXPIRED')
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data:  { passwordHash },
    }),
    prisma.emailToken.update({
      where: { id: record.id },
      data:  { used: true },
    }),
  ])

  return { message: 'Senha redefinida com sucesso! Faca login para continuar.' }
}
