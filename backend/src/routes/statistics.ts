import { Router } from 'express'
import * as ctrl from '../controllers/statisticsController'

const router = Router()
router.get('/sports',     ctrl.bySport)
router.get('/bookmakers', ctrl.byBookmaker)
router.get('/tipsters/detail', ctrl.tipsterDetail)
router.get('/tipsters',        ctrl.byTipster)
router.get('/profiles/detail', ctrl.profileDetail)
router.get('/profiles',        ctrl.byProfile)
router.get('/bet-types',  ctrl.byBetType)
router.get('/monthly',    ctrl.monthly)
router.get('/heatmap',    ctrl.heatmap)

export default router
