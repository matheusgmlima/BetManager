import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import authRouter       from './auth'
import betsRouter       from './bets'
import dashboardRouter  from './dashboard'
import statsRouter      from './statistics'
import goalsRouter      from './goals'
import aiRouter         from './ai'
import configRouter     from './config'
import bankrollRouter   from './bankroll'

const router = Router()

// Public
router.use('/auth', authRouter)

// Protected
router.use(authenticate)
router.use('/bets',      betsRouter)
router.use('/dashboard', dashboardRouter)
router.use('/stats',     statsRouter)
router.use('/goals',     goalsRouter)
router.use('/ai',        aiRouter)
router.use('/config',    configRouter)
router.use('/bankroll',  bankrollRouter)

export default router
