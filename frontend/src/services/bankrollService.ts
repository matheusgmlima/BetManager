import { api } from './api'

export interface BankrollEntry {
  id: number
  amount: number
  type: 'initial' | 'deposit' | 'withdrawal'
  note: string | null
  date: string
  createdAt: string
}

export interface BankrollData {
  data: BankrollEntry[]
  balance: number
}

export const bankrollService = {
  get: () =>
    api.get<BankrollData>('/api/bankroll').then(r => r.data),

  add: (payload: { amount: number; type: 'initial' | 'deposit' | 'withdrawal'; note?: string; date?: string }) =>
    api.post<{ data: BankrollEntry }>('/api/bankroll', payload).then(r => r.data.data),

  remove: (id: number) =>
    api.delete(`/api/bankroll/${id}`).then(r => r.data),
}
