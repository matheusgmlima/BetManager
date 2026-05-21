import { useQuery, useMutation, useQueryClient } from 'react-query'
import { betsService } from '../services/betsService'
import { BetFilters, BetCreateInput } from '../types/bet.types'

export function useBets(filters: BetFilters = {}) {
  return useQuery(['bets', filters], () => betsService.list(filters), {
    keepPreviousData: true,
  })
}

export function useBet(id: number) {
  return useQuery(['bet', id], () => betsService.getById(id), { enabled: !!id })
}

export function useCreateBet() {
  const qc = useQueryClient()
  return useMutation((data: BetCreateInput) => betsService.create(data), {
    onSuccess: () => qc.invalidateQueries('bets'),
  })
}

export function useCreateBetsBatch() {
  const qc = useQueryClient()
  return useMutation((bets: BetCreateInput[]) => betsService.createBatch(bets), {
    onSuccess: () => qc.invalidateQueries('bets'),
  })
}

export function useUpdateBet() {
  const qc = useQueryClient()
  return useMutation(
    ({ id, data }: { id: number; data: Partial<BetCreateInput> }) => betsService.update(id, data),
    { onSuccess: () => { qc.invalidateQueries('bets'); qc.invalidateQueries('dashboard') } }
  )
}

export function useUpdateBetResult() {
  const qc = useQueryClient()
  return useMutation(
    ({ id, result, payout }: { id: number; result: string; payout: number }) =>
      betsService.updateResult(id, result, payout),
    { onSuccess: () => { qc.invalidateQueries('bets'); qc.invalidateQueries('dashboard') } }
  )
}

export function useDeleteBet() {
  const qc = useQueryClient()
  return useMutation((id: number) => betsService.delete(id), {
    onSuccess: () => { qc.invalidateQueries('bets'); qc.invalidateQueries('dashboard') },
  })
}

export function useExtractBets() {
  return useMutation(({ file, model }: { file: File; model?: 'haiku' | 'sonnet' }) =>
    betsService.extractFromImage(file, model)
  )
}
