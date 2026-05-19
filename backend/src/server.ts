import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import apiRouter from './routes/index'
import { errorHandler } from './middlewares/errorHandler'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())


app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api', apiRouter)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`BetManager API rodando em http://localhost:${PORT}`)
})

export default app
