import { api } from './api'
import { BetCreateInput, BetFilters, PaginatedBets, Bet, AiExtractionResponse } from '../types/bet.types'

export const betsService = {
  list: (filters: BetFilters = {}) =>
    api.get<PaginatedBets>('/api/bets', { params: filters }).then((r) => r.data),

  getById: (id: number) =>
    api.get<{ data: Bet }>(`/api/bets/${id}`).then((r) => r.data.data),

  create: (data: BetCreateInput) =>
    api.post<{ data: Bet }>('/api/bets', data).then((r) => r.data.data),

  createBatch: (bets: BetCreateInput[]) =>
    api.post<{ created: number; bets: Bet[] }>('/api/bets/batch', { bets }).then((r) => r.data),

  update: (id: number, data: Partial<BetCreateInput>) =>
    api.put<{ data: Bet }>(`/api/bets/${id}`, data).then((r) => r.data.data),

  updateResult: (id: number, result: string, payout: number) =>
    api.patch<{ data: Bet }>(`/api/bets/${id}/result`, { result, payout }).then((r) => r.data.data),

  delete: (id: number) =>
    api.delete(`/api/bets/${id}`).then((r) => r.data),

  extractFromImage: (file: File, model: 'haiku' | 'sonnet' = 'haiku') => {
    const form = new FormData()
    form.append('file', file)
    form.append('model', model)
    return api.post<AiExtractionResponse>('/api/ai/extract', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }).then((r) => r.data)
  },

  confirmExtraction: (extractionId: number, confirmedCount: number) =>
    api.post('/api/ai/confirm', { extractionId, confirmedCount }).then((r) => r.data),
}
