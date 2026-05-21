import { useQuery, useMutation, useQueryClient } from 'react-query'
import { configService } from '../services/configService'

// ── Sports ───────────────────────────────────────────────────────────────────

export function useSports() {
  return useQuery(['config', 'sports'], () => configService.getSports())
}

export function useCreateSport() {
  const qc = useQueryClient()
  return useMutation(configService.createSport, {
    onSuccess: () => qc.invalidateQueries(['config', 'sports']),
  })
}

export function useUpdateSport() {
  const qc = useQueryClient()
  return useMutation(
    ({ id, data }: { id: number; data: { name?: string; icon?: string | null } }) =>
      configService.updateSport(id, data),
    { onSuccess: () => qc.invalidateQueries(['config', 'sports']) },
  )
}

export function useToggleSport() {
  const qc = useQueryClient()
  return useMutation(configService.toggleSport, {
    onSuccess: () => qc.invalidateQueries(['config', 'sports']),
  })
}

// ── Bookmakers ───────────────────────────────────────────────────────────────

export function useBookmakers() {
  return useQuery(['config', 'bookmakers'], () => configService.getBookmakers())
}

export function useCreateBookmaker() {
  const qc = useQueryClient()
  return useMutation(configService.createBookmaker, {
    onSuccess: () => qc.invalidateQueries(['config', 'bookmakers']),
  })
}

export function useUpdateBookmaker() {
  const qc = useQueryClient()
  return useMutation(
    ({ id, data }: { id: number; data: { name?: string; color?: string } }) =>
      configService.updateBookmaker(id, data),
    { onSuccess: () => qc.invalidateQueries(['config', 'bookmakers']) },
  )
}

export function useToggleBookmaker() {
  const qc = useQueryClient()
  return useMutation(configService.toggleBookmaker, {
    onSuccess: () => qc.invalidateQueries(['config', 'bookmakers']),
  })
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export function useProfiles() {
  return useQuery(['config', 'profiles'], () => configService.getProfiles())
}

export function useCreateProfile() {
  const qc = useQueryClient()
  return useMutation(configService.createProfile, {
    onSuccess: () => qc.invalidateQueries(['config', 'profiles']),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation(
    ({ id, data }: { id: number; data: { name?: string } }) =>
      configService.updateProfile(id, data),
    { onSuccess: () => qc.invalidateQueries(['config', 'profiles']) },
  )
}

export function useToggleProfile() {
  const qc = useQueryClient()
  return useMutation(configService.toggleProfile, {
    onSuccess: () => qc.invalidateQueries(['config', 'profiles']),
  })
}

// ── Tipsters ──────────────────────────────────────────────────────────────────

export function useTipsters() {
  return useQuery(['config', 'tipsters'], () => configService.getTipsters())
}

export function useCreateTipster() {
  const qc = useQueryClient()
  return useMutation(configService.createTipster, {
    onSuccess: () => qc.invalidateQueries(['config', 'tipsters']),
  })
}

export function useUpdateTipster() {
  const qc = useQueryClient()
  return useMutation(
    ({ id, data }: { id: number; data: { name?: string } }) =>
      configService.updateTipster(id, data),
    { onSuccess: () => qc.invalidateQueries(['config', 'tipsters']) },
  )
}

export function useToggleTipster() {
  const qc = useQueryClient()
  return useMutation(configService.toggleTipster, {
    onSuccess: () => qc.invalidateQueries(['config', 'tipsters']),
  })
}

export function useDeleteTipster() {
  const qc = useQueryClient()
  return useMutation(configService.deleteTipster, {
    onSuccess: () => qc.invalidateQueries(['config', 'tipsters']),
  })
}
