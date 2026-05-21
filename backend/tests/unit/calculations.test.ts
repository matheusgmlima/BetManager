import { calculateProfit, calculatePayout, calculateHitRate, calculateRoi, calculateCombinedOdds } from '../../src/utils/calculations'

describe('calculateProfit', () => {
  it('retorna lucro positivo quando ganhou', () => {
    expect(calculateProfit(35.00, 20.00)).toBe(15.00)
  })
  it('retorna lucro negativo quando perdeu', () => {
    expect(calculateProfit(0.00, 20.00)).toBe(-20.00)
  })
  it('retorna zero em aposta void', () => {
    expect(calculateProfit(20.00, 20.00)).toBe(0.00)
  })
})

describe('calculatePayout', () => {
  it('calcula payout corretamente', () => {
    expect(calculatePayout(20.00, 1.75)).toBe(35.00)
  })
  it('odd com casas decimais', () => {
    expect(calculatePayout(28.40, 1.53)).toBe(43.45)
  })
})

describe('calculateHitRate', () => {
  it('calcula hit rate corretamente', () => {
    expect(calculateHitRate(6, 4)).toBe(60.00)
  })
  it('retorna 100 com zero perdas', () => {
    expect(calculateHitRate(5, 0)).toBe(100.00)
  })
  it('retorna null sem apostas', () => {
    expect(calculateHitRate(0, 0)).toBeNull()
  })
})

describe('calculateRoi', () => {
  it('calcula ROI positivo', () => {
    expect(calculateRoi(150, 600)).toBe(25.00)
  })
  it('calcula ROI negativo', () => {
    expect(calculateRoi(-100, 500)).toBe(-20.00)
  })
})

describe('calculateCombinedOdds', () => {
  it('multiplica odds corretamente', () => {
    expect(calculateCombinedOdds([1.5, 2.0, 1.8])).toBe(5.4)
  })
})
