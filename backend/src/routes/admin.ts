import { Router } from 'express'
import * as adminController from '../controllers/adminController'
import { requireAdmin } from '../middlewares/requireAdmin'

const router = Router()
router.use(requireAdmin)

router.get   ('/users',                   adminController.listUsers)
router.post  ('/users',                   adminController.createUser)
router.patch ('/users/:id',               adminController.updateUser)
router.post  ('/users/:id/send-reset',    adminController.sendPasswordReset)
router.delete('/users/:id',               adminController.deleteUser)

export default router
