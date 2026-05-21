import { Router } from 'express'
import * as ctrl from '../controllers/dashboardController'

const router = Router()
router.get('/', ctrl.getDashboard)

export default router
