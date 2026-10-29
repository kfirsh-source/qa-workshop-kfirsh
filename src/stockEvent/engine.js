export const HORIZONS = [5, 15, 30, 60]

const RULES = [
  { type: 'FDA_APPROVAL', sentiment: 'Bullish', weight: 9, re: /fda (approv|clear)|approval from the fda/i },
  { type: 'CONTRACT', sentiment: 'Bullish', weight: 7, re: /contract|awarded|partnership|deal with/i },
  { type: 'EARNINGS_BEAT', sentiment: 'Bullish', weight: 7, re: /beats?|raises? (guidance|outlook)|record revenue/i },
  { type: 'BUYOUT', sentiment: 'Bullish', weight: 9, re: /acquir|buyout|takeover/i },
  { type: 'EARNINGS_MISS', sentiment: 'Bearish', weight: 7, re: /misses?|cuts? (guidance|outlook)|lowers? guidance/i },
  { type: 'OFFERING', sentiment: 'Bearish', weight: 8, re: /offering|dilution|shelf registration/i },
  { type: 'FDA_REJECTION', sentiment: 'Bearish', weight: 9, re: /complete response letter|fda reject|trial (fail|halt)/i },
  { type: 'INVESTIGATION', sentiment: 'Bearish', weight: 6, re: /investigation|subpoena|lawsuit|sec charges/i },
]

// Rule-based classifier. Swap for an LLM call by keeping the same return shape.
export function classifyNews(headline) {
  const hit = RULES.find((r) => r.re.test(headline))
  if (!hit) return { type: 'OTHER', sentiment: 'Neutral', strength: 2 }
  const dollars = headline.match(/\$(\d+(?:\.\d+)?)\s*(m|b)/i)
  let strength = hit.weight
  if (dollars) strength += dollars[2].toLowerCase() === 'b' ? 1 : 0.5
  return { type: hit.type, sentiment: hit.sentiment, strength: Math.min(10, strength) }
}

export function eventScore({ strength }, { gapPct = 0, rvol = 1 } = {}) {
  const momentum = Math.min(2, Math.abs(gapPct) / 10) + Math.min(2, Math.log2(Math.max(rvol, 1)) / 2)
  return Math.round(Math.min(10, strength * 0.7 + momentum * 1.5) * 10) / 10
}

function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DRIFT = {
  FDA_APPROVAL: 3.5, CONTRACT: 2.2, EARNINGS_BEAT: 1.8, BUYOUT: 4,
  EARNINGS_MISS: -2.5, OFFERING: -3, FDA_REJECTION: -5, INVESTIGATION: -1.5, OTHER: 0,
}

// Synthetic history so the demo works offline. Replace with real stored events.
export function generateHistory(perType = 150, seed = 42) {
  const rnd = mulberry32(seed)
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd())
  const out = []
  for (const [type, drift] of Object.entries(DRIFT)) {
    for (let i = 0; i < perType; i++) {
      const gapPct = drift * 2 + gauss() * 4
      const rvol = Math.exp(1 + gauss() * 0.6)
      const returns = {}
      for (const h of HORIZONS) returns[h] = drift * Math.sqrt(h / 60) + gauss() * 2.5 * Math.sqrt(h / 15)
      const peak = Math.max(...Object.values(returns)) + Math.abs(gauss())
      const trough = Math.min(...Object.values(returns)) - Math.abs(gauss())
      out.push({ type, gapPct, rvol, returns, maxMove: peak, maxDrawdown: trough })
    }
  }
  return out
}

export function quantile(sorted, q) {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export function matchEvents(history, { type, gapPct = 0, rvol = 1 }) {
  const pool = history.filter((e) => e.type === type)
  return pool
    .map((e) => ({ e, d: Math.abs(e.gapPct - gapPct) / 10 + Math.abs(Math.log(e.rvol / rvol)) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, Math.max(30, Math.ceil(pool.length * 0.5)))
    .map((x) => x.e)
}

export function summarize(matches, sentiment) {
  const n = matches.length
  const horizons = HORIZONS.map((h) => {
    const s = matches.map((m) => m.returns[h]).sort((a, b) => a - b)
    return { minutes: h, median: quantile(s, 0.5), p25: quantile(s, 0.25), p75: quantile(s, 0.75) }
  })
  const finals = matches.map((m) => m.returns[60])
  const faded = finals.filter((r) => (sentiment === 'Bearish' ? r > 0 : r < 0)).length
  return {
    n,
    horizons,
    fadeRate: n ? faded / n : 0,
    maxMove: n ? Math.max(...matches.map((m) => m.maxMove)) : 0,
    maxDrawdown: n ? Math.min(...matches.map((m) => m.maxDrawdown)) : 0,
  }
}

export function analyze(history, headline, market) {
  const cls = classifyNews(headline)
  const score = eventScore(cls, market)
  const matches = matchEvents(history, { type: cls.type, ...market })
  return { ...cls, score, stats: summarize(matches, cls.sentiment) }
}
