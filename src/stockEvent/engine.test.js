import { describe, it, expect } from 'vitest'
import { classifyNews, analyze, generateHistory, quantile, HORIZONS } from './engine'

describe('classifyNews', () => {
  it('flags FDA approval as bullish', () => {
    expect(classifyNews('ABC announces FDA approval')).toMatchObject({ type: 'FDA_APPROVAL', sentiment: 'Bullish' })
  })
  it('flags offerings as bearish', () => {
    expect(classifyNews('XYZ prices public offering').sentiment).toBe('Bearish')
  })
  it('treats unknown news as neutral', () => {
    expect(classifyNews('CEO attends conference')).toMatchObject({ type: 'OTHER', sentiment: 'Neutral' })
  })
})

describe('analyze', () => {
  const history = generateHistory(100, 1)
  it('is deterministic for a seed', () => {
    expect(generateHistory(5, 7)).toEqual(generateHistory(5, 7))
  })
  it('returns stats for every horizon within score bounds', () => {
    const r = analyze(history, 'PLTR receives $800M government contract', { gapPct: 8, rvol: 5 })
    expect(r.stats.horizons.map((h) => h.minutes)).toEqual(HORIZONS)
    expect(r.score).toBeGreaterThan(0)
    expect(r.score).toBeLessThanOrEqual(10)
    expect(r.stats.n).toBeGreaterThanOrEqual(30)
  })
  it('orders quartiles', () => {
    const r = analyze(history, 'ABC FDA approval', { gapPct: 10, rvol: 4 })
    r.stats.horizons.forEach((h) => {
      expect(h.p25).toBeLessThanOrEqual(h.median)
      expect(h.median).toBeLessThanOrEqual(h.p75)
    })
  })
})

describe('quantile', () => {
  it('interpolates', () => expect(quantile([0, 10], 0.5)).toBe(5))
})
