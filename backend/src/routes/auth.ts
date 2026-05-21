import { Router } from 'express'
import * as authController from '../controllers/authController'
import { authenticate } from '../middlewares/authenticate'

const router = Router()

router.post('/register',            authController.register)
router.get ('/verify-email',        authController.verifyEmail)
router.post('/login',               authController.login)
router.post('/resend-verification', authController.resendVerification)
router.post('/forgot-password',     authController.forgotPassword)
router.post('/reset-password',      authController.resetPassword)

// Protected
router.get ('/me',        authenticate, authController.me)
router.patch('/me/unit',  authenticate, authController.updateUnit)

export default router
