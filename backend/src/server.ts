import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import apiRouter from './routes/index'
import { errorHandler } from './middlewares/errorHandler'

const app  = express()
const PORT = process.env.PORT || 3000
const isProd = process.env.NODE_ENV === 'production'

// ─── Segurança ────────────────────────────────────────────────────────────────
app.use(helmet())
app.set('trust proxy', 1) // nginx está na frente

// CORS — em produção aceita só o domínio real
const allowedOrigins = isProd
  ? ['https://betmanager.app.br', 'https://www.betmanager.app.br']
  : ['http://localhost:5173', 'http://localhost:3000']

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))

// Rate limit geral (600 req / 15min por IP)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Muitas requisições. Tente novamente em alguns minutos.', errorCode: 'RATE_LIMIT' },
}))

// Rate limit restrito para auth (20 req / 15min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.', errorCode: 'AUTH_RATE_LIMIT' },
})

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(compression())
app.use(express.json({ limit: '1mb' }))

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authLimiter)
app.use('/api', apiRouter)
app.use(errorHandler)

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`BetManager API rodando em http://localhost:${PORT} [${isProd ? 'PROD' : 'DEV'}]`)
})

export default app
