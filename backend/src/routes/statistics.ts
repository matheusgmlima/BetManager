import { Router } from 'express'
import * as ctrl from '../controllers/statisticsController'

const router = Router()
router.get('/sports',     ctrl.bySport)
router.get('/bookmakers', ctrl.byBookmaker)
router.get('/bet-types',  ctrl.byBetType)
router.get('/monthly',    ctrl.monthly)

export default router
