import { Router } from 'express'
import * as ctrl from '../controllers/goalsController'
import { validate } from '../middlewares/validateRequest'
import { createGoalSchema, updateGoalSchema } from '../validators/goalSchema'

const router = Router()
router.get('/',    ctrl.list)
router.post('/',   validate(createGoalSchema), ctrl.create)
router.put('/:id', validate(updateGoalSchema), ctrl.update)
router.delete('/:id', ctrl.remove)

export default router
