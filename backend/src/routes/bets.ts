import { Router } from 'express'
import * as ctrl from '../controllers/betsController'
import { validate } from '../middlewares/validateRequest'
import { createBetSchema, updateBetSchema, resultUpdateSchema, batchBetSchema, betFiltersSchema } from '../validators/betSchema'

const router = Router()

router.get('/',    validate(betFiltersSchema, 'query'), ctrl.list)
router.get('/:id', ctrl.getById)
router.post('/',   validate(createBetSchema), ctrl.create)
router.post('/batch', validate(batchBetSchema), ctrl.createBatch)
router.put('/:id', validate(updateBetSchema), ctrl.update)
router.patch('/:id/result', validate(resultUpdateSchema), ctrl.updateResult)
router.delete('/:id', ctrl.remove)

export default router
