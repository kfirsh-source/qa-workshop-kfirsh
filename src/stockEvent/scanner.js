import { classifyNews } from './engine'

export const BOARDS = [
  { id: 'premarket', label: 'Pre-market gainers', changeKey: 'premarket_change', volumeKey: 'premarket_volume' },
  { id: 'postmarket', label: 'After-hours gainers', changeKey: 'postmarket_change', volumeKey: 'postmarket_volume' },
  { id: 'top', label: 'Top gainers', changeKey: 'change', volumeKey: 'volume' },
]

export const COLUMNS = [
  'name', 'description', 'close', 'change', 'premarket_change', 'postmarket_change',
  'volume', 'premarket_volume', 'postmarket_volume', 'relative_volume_10d_calc', 'market_cap_basic',
]

export function buildScanBody(board, limit = 25) {
  const filter = [
    { left: 'exchange', operation: 'equal', right: 'NASDAQ' },
    { left: 'type', operation: 'equal', right: 'stock' },
    { left: 'close', operation: 'greater', right: 1 },
    { left: board.volumeKey, operation: 'greater', right: board.id === 'top' ? 200000 : 25000 },
  ]
  return {
    filter,
    columns: COLUMNS,
    sort: { sortBy: board.changeKey, sortOrder: 'desc' },
    range: [0, limit],
  }
}

export function parseRows(payload, board) {
  return (payload?.data ?? []).map((r) => {
    const o = Object.fromEntries(COLUMNS.map((c, i) => [c, r.d[i]]))
    return {
      symbol: o.name,
      tvSymbol: r.s,
      name: o.description,
      price: o.close,
      changePct: o[board.changeKey] ?? 0,
      volume: o[board.volumeKey] ?? 0,
      rvol: o.relative_volume_10d_calc ?? 0,
      marketCap: o.market_cap_basic ?? 0,
    }
  })
}

// 0-7 from the tape (move, relative volume, small size) plus up to +/-3 from news.
export function breakoutScore(row, headlines = []) {
  const move = Math.min(3, Math.max(0, row.changePct) / 10)
  const vol = Math.min(2.5, Math.log2(1 + Math.max(0, row.rvol)) / 1.5)
  const size = row.marketCap && row.marketCap < 3e8 ? 1.5 : row.marketCap < 2e9 ? 0.75 : 0
  const news = headlines.map((h) => classifyNews(h.title))
  const best = news.reduce((acc, n) => {
    const signed = n.sentiment === 'Bullish' ? n.strength : n.sentiment === 'Bearish' ? -n.strength : 0
    return Math.abs(signed) > Math.abs(acc) ? signed : acc
  }, 0)
  const score = Math.max(0, Math.min(10, move + vol + size + (best / 10) * 3))
  return { score: Math.round(score * 10) / 10, newsBias: best }
}

export function isCandidate({ score, newsBias }) {
  return score >= 6 && newsBias > 0
}

export function fmtCap(n) {
  if (!n) return '-'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${(n / 1e3).toFixed(0)}K`
}

export function fmtVol(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return String(Math.round(n))
}
