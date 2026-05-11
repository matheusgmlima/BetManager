import { Router } from 'express'
import betsRouter from './bets'
import dashboardRouter from './dashboard'
import statsRouter from './statistics'
import goalsRouter from './goals'
import aiRouter from './ai'
import configRouter from './config'

const router = Router()

router.use('/bets', betsRouter)
router.use('/dashboard', dashboardRouter)
router.use('/stats', statsRouter)
router.use('/goals', goalsRouter)
router.use('/ai', aiRouter)
router.use('/config', configRouter)

export default router
