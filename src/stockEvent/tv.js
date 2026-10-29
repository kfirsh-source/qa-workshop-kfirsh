import { buildScanBody, parseRows } from './scanner'

const SCAN_URL = 'https://scanner.tradingview.com/america/scan'
// Browsers can't call the news host directly (no CORS). Dev uses the Vite proxy;
// a deployed site needs VITE_NEWS_URL pointing at a proxy, otherwise news stays empty.
const NEWS_URL = import.meta.env?.VITE_NEWS_URL ?? (import.meta.env?.DEV ? '/tv-news/news-flow/v2/news' : null)

// Unofficial TradingView endpoints (no key). They can change or rate-limit without notice.
export async function fetchBoard(board, limit = 25) {
  const res = await fetch(SCAN_URL, {
    method: 'POST',
    // text/plain avoids a CORS preflight, which the scanner rejects
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(buildScanBody(board, limit)),
  })
  if (!res.ok) throw new Error(`Scanner returned ${res.status}`)
  return parseRows(await res.json(), board)
}

export async function fetchNews(tvSymbol, max = 4) {
  if (!NEWS_URL) return []
  const qs = `filter=lang:en&filter=symbol:${encodeURIComponent(tvSymbol)}&client=landing&streaming=false`
  const res = await fetch(`${NEWS_URL}?${qs}`)
  if (!res.ok) return []
  const json = await res.json()
  return (json.items ?? []).slice(0, max).map((i) => ({
    id: i.id,
    title: i.title,
    at: new Date(i.published * 1000),
    source: i.provider?.name ?? '',
    url: i.storyPath ? `https://www.tradingview.com${i.storyPath}` : null,
  }))
}
