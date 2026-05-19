import { createContext, useContext, useState, ReactNode } from 'react'

interface UnitContextValue {
  showU:    boolean
  unitVal:  number
  setShowU: (v: boolean) => void
  setUnitVal: (v: number) => void
  /** Format a monetary value respecting the current R$/U mode */
  fmtMoney: (v: number | null | undefined) => string
}

const UnitContext = createContext<UnitContextValue>({
  showU:    false,
  unitVal:  10,
  setShowU: () => {},
  setUnitVal: () => {},
  fmtMoney: (v) => {
    if (v == null) return '—'
    const abs = Math.abs(v)
    return `${v < 0 ? '-' : ''}R$ ${abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  },
})

export function UnitProvider({ children }: { children: ReactNode }) {
  const [showU,   setShowU]   = useState(false)
  const [unitVal, setUnitValState] = useState<number>(() => {
    const s = localStorage.getItem('bet-unit-value')
    return s ? parseFloat(s) || 10 : 10
  })

  const setUnitVal = (v: number) => {
    setUnitValState(v)
    localStorage.setItem('bet-unit-value', String(v))
  }

  const fmtMoney = (v: number | null | undefined): string => {
    if (v == null) return '—'
    if (showU && unitVal > 0) {
      const u    = v / unitVal
      const sign = v < 0 ? '-' : ''
      return `${sign}${Math.abs(u).toFixed(2)}u`
    }
    const abs = Math.abs(v)
    return `${v < 0 ? '-' : ''}R$ ${abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <UnitContext.Provider value={{ showU, unitVal, setShowU, setUnitVal, fmtMoney }}>
      {children}
    </UnitContext.Provider>
  )
}

export function useUnit() {
  return useContext(UnitContext)
}
