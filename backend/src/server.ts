import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3000

// Middlewares
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// TODO: Rotas serão adicionadas aqui nas próximas fases
// app.use('/api/bets', betsRouter)
// app.use('/api/dashboard', dashboardRouter)
// app.use('/api/stats', statsRouter)
// app.use('/api/goals', goalsRouter)
// app.use('/api/ai', aiRouter)
// app.use('/api/config', configRouter)

app.listen(PORT, () => {
  console.log(`BetManager API rodando em http://localhost:${PORT}`)
})

export default app
