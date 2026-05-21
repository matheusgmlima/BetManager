import { Router } from 'express'
import * as ctrl from '../controllers/aiController'
import { upload } from '../middlewares/upload'

const router = Router()
router.post('/extract', upload.single('file'), ctrl.extract)
router.post('/confirm', ctrl.confirm)

export default router
