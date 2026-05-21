import { api } from './api'
import { Sport, Bookmaker, BettingProfile, Tipster } from '../types/bet.types'

export const configService = {
  // ── Sports ──────────────────────────────────────────────────────────────────
  getSports: () =>
    api.get<{ data: Sport[] }>('/api/config/sports').then((r) => r.data.data),

  createSport: (data: { name: string; icon?: string | null }) =>
    api.post<{ data: Sport }>('/api/config/sports', data).then((r) => r.data.data),

  updateSport: (id: number, data: { name?: string; icon?: string | null }) =>
    api.put<{ data: Sport }>(`/api/config/sports/${id}`, data).then((r) => r.data.data),

  toggleSport: (id: number) =>
    api.patch(`/api/config/sports/${id}/toggle`).then((r) => r.data),

  // ── Bookmakers ───────────────────────────────────────────────────────────────
  getBookmakers: () =>
    api.get<{ data: Bookmaker[] }>('/api/config/bookmakers').then((r) => r.data.data),

  createBookmaker: (data: { name: string; color: string }) =>
    api.post<{ data: Bookmaker }>('/api/config/bookmakers', data).then((r) => r.data.data),

  updateBookmaker: (id: number, data: { name?: string; color?: string }) =>
    api.put<{ data: Bookmaker }>(`/api/config/bookmakers/${id}`, data).then((r) => r.data.data),

  toggleBookmaker: (id: number) =>
    api.patch(`/api/config/bookmakers/${id}/toggle`).then((r) => r.data),

  // ── Profiles ─────────────────────────────────────────────────────────────────
  getProfiles: () =>
    api.get<{ data: BettingProfile[] }>('/api/config/profiles').then((r) => r.data.data),

  createProfile: (data: { name: string }) =>
    api.post<{ data: BettingProfile }>('/api/config/profiles', data).then((r) => r.data.data),

  updateProfile: (id: number, data: { name?: string }) =>
    api.put<{ data: BettingProfile }>(`/api/config/profiles/${id}`, data).then((r) => r.data.data),

  toggleProfile: (id: number) =>
    api.patch(`/api/config/profiles/${id}/toggle`).then((r) => r.data),

  // ── Tipsters ─────────────────────────────────────────────────────────────────
  getTipsters: () =>
    api.get<{ data: Tipster[] }>('/api/config/tipsters').then((r) => r.data.data),

  createTipster: (data: { name: string }) =>
    api.post<{ data: Tipster }>('/api/config/tipsters', data).then((r) => r.data.data),

  updateTipster: (id: number, data: { name?: string }) =>
    api.put<{ data: Tipster }>(`/api/config/tipsters/${id}`, data).then((r) => r.data.data),

  toggleTipster: (id: number) =>
    api.patch(`/api/config/tipsters/${id}/toggle`).then((r) => r.data),

  deleteTipster: (id: number) =>
    api.delete(`/api/config/tipsters/${id}`).then((r) => r.data),
}
