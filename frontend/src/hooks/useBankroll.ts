import { useQuery, useMutation, useQueryClient } from 'react-query'
import { bankrollService } from '../services/bankrollService'

export function useBankroll() {
  return useQuery(['bankroll'], () => bankrollService.get())
}

export function useAddBankroll() {
  const qc = useQueryClient()
  return useMutation(bankrollService.add, {
    onSuccess: () => qc.invalidateQueries(['bankroll']),
  })
}

export function useRemoveBankroll() {
  const qc = useQueryClient()
  return useMutation(bankrollService.remove, {
    onSuccess: () => qc.invalidateQueries(['bankroll']),
  })
}
