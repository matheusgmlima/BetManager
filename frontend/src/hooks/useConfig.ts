import { useQuery } from 'react-query'
import { configService } from '../services/configService'

export function useSports() {
  return useQuery(['config', 'sports'], () => configService.getSports())
}

export function useBookmakers() {
  return useQuery(['config', 'bookmakers'], () => configService.getBookmakers())
}
