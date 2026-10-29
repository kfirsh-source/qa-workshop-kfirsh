import { describe, it, expect } from 'vitest'
import { BOARDS, buildScanBody, parseRows, breakoutScore, isCandidate, fmtCap } from './scanner'

const pre = BOARDS[0]

describe('scanner', () => {
  it('builds a Nasdaq-only body sorted by the board change column', () => {
    const b = buildScanBody(pre)
    expect(b.filter[0]).toMatchObject({ right: 'NASDAQ' })
    expect(b.sort).toEqual({ sortBy: 'premarket_change', sortOrder: 'desc' })
  })

  it('parses rows using the board change and volume columns', () => {
    const d = ['ABC', 'ABC Inc', 5, 1, 22.5, null, 10, 90000, null, 4, 1e8]
    const [r] = parseRows({ data: [{ s: 'NASDAQ:ABC', d }] }, pre)
    expect(r).toMatchObject({ symbol: 'ABC', changePct: 22.5, volume: 90000, rvol: 4, tvSymbol: 'NASDAQ:ABC' })
  })

  it('parseRows tolerates an empty payload', () => {
    expect(parseRows({}, pre)).toEqual([])
  })

  it('scores bullish news higher than none and flags candidates', () => {
    const row = { changePct: 25, rvol: 6, marketCap: 1e8 }
    const none = breakoutScore(row, [])
    const bull = breakoutScore(row, [{ title: 'ABC announces FDA approval' }])
    expect(bull.score).toBeGreaterThan(none.score)
    expect(isCandidate(bull)).toBe(true)
    expect(isCandidate(none)).toBe(false)
  })

  it('bearish news blocks candidacy', () => {
    const row = { changePct: 25, rvol: 6, marketCap: 1e8 }
    expect(isCandidate(breakoutScore(row, [{ title: 'ABC announces public offering' }]))).toBe(false)
  })

  it('formats market cap', () => {
    expect(fmtCap(2.5e9)).toBe('$2.5B')
    expect(fmtCap(0)).toBe('-')
  })
})
