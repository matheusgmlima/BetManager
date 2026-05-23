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
    {
      onMutate: async ({ id, result, payout }: { id: number; result: string; payout: number }) => {
        await qc.cancelQueries('bets')
        const snapshots = qc.getQueriesData('bets')
        qc.setQueriesData('bets', (old: any) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map((b: any) =>
              b.id === id ? { ...b, result, payout, profit: payout - b.amountWagered } : b
            ),
          }
        })
        return { snapshots }
      },
      onError: (_e: any, _v: any, ctx: any) => {
        if (ctx && ctx.snapshots) {
          ctx.snapshots.forEach((entry: any) => qc.setQueryData(entry[0], entry[1]))
        }
      },
      onSettled: () => {
        qc.invalidateQueries('bets')
        qc.invalidateQueries('dashboard')
      },
    }
  )
}

export function useDeleteBet() {
  const qc = useQueryClient()
  return useMutation((id: number) => betsService.delete(id), {
    onMutate: async (id: number) => {
      await qc.cancelQueries('bets')
      const snapshots = qc.getQueriesData('bets')
      qc.setQueriesData('bets', (old: any) => {
        if (!old) return old
        return { ...old, data: old.data.filter((b: any) => b.id !== id), total: old.total - 1 }
      })
      return { snapshots }
    },
    onError: (_e: any, _id: any, ctx: any) => {
      if (ctx && ctx.snapshots) {
        ctx.snapshots.forEach((entry: any) => qc.setQueryData(entry[0], entry[1]))
      }
    },
    onSettled: () => {
      qc.invalidateQueries('bets')
      qc.invalidateQueries('dashboard')
    },
  })
}

export function useExtractBets() {
  return useMutation(({ file, model }: { file: File; model?: 'haiku' | 'sonnet' }) =>
    betsService.extractFromImage(file, model)
  )
}
