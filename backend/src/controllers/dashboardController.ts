import { Request, Response, NextFunction } from 'express'
import * as dashboardService from '../services/dashboardService'
import { DashboardPeriod } from '../types/dashboard.types'

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const period = (req.query.period as DashboardPeriod) ?? 'month'
    const data = await dashboardService.getDashboard(period)
    res.json({ data })
  } catch (err) { next(err) }
}
