import { api } from './api'
import { Sport, Bookmaker } from '../types/bet.types'

export const configService = {
  getSports: () =>
    api.get<{ data: Sport[] }>('/api/config/sports').then((r) => r.data.data),

  getBookmakers: () =>
    api.get<{ data: Bookmaker[] }>('/api/config/bookmakers').then((r) => r.data.data),

  createSport: (data: { name: string; icon?: string }) =>
    api.post<{ data: Sport }>('/api/config/sports', data).then((r) => r.data.data),

  createBookmaker: (data: { name: string; color: string }) =>
    api.post<{ data: Bookmaker }>('/api/config/bookmakers', data).then((r) => r.data.data),

  toggleSport: (id: number) =>
    api.patch(`/api/config/sports/${id}/toggle`).then((r) => r.data),

  toggleBookmaker: (id: number) =>
    api.patch(`/api/config/bookmakers/${id}/toggle`).then((r) => r.data),
}
