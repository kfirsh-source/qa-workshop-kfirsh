import React, { useCallback, useEffect, useState } from 'react'
import { BOARDS, breakoutScore, fmtCap, fmtVol, isCandidate } from './scanner'
import { fetchBoard, fetchNews } from './tv'
import { classifyNews } from './engine'
import './dashboard.css'

const REFRESH_MS = 30000

export default function GainersBoard({ loadBoard = fetchBoard, loadNews = fetchNews, refreshMs = REFRESH_MS }) {
  const [boardId, setBoardId] = useState('premarket')
  const [rows, setRows] = useState([])
  const [news, setNews] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updated, setUpdated] = useState(null)
  const [selected, setSelected] = useState(null)
  const board = BOARDS.find((b) => b.id === boardId)

  const load = useCallback(
    async (initial) => {
      if (initial) setLoading(true)
      try {
        const data = await loadBoard(board)
        setRows(data)
        setError(null)
        setUpdated(new Date())
        const entries = await Promise.all(
          data.slice(0, 12).map(async (r) => [r.symbol, await loadNews(r.tvSymbol).catch(() => [])]),
        )
        setNews((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
      } catch (e) {
        setError(e.message || 'Could not load data')
      } finally {
        setLoading(false)
      }
    },
    [board, loadBoard, loadNews],
  )

  useEffect(() => {
    load(true)
    const t = setInterval(() => load(false), refreshMs)
    return () => clearInterval(t)
  }, [load, refreshMs])

  const scored = rows.map((r) => ({ ...r, ...breakoutScore(r, news[r.symbol] ?? []) }))
  const candidates = scored.filter(isCandidate).sort((a, b) => b.score - a.score)
  const active = scored.find((r) => r.symbol === selected) ?? scored[0]
  const activeNews = active ? news[active.symbol] ?? [] : []

  return (
    <section className="sd" data-testid="gainers-board">
      <header className="sd-head">
        <div>
          <h1>Nasdaq Gainers</h1>
          <span className="sd-note">Data from TradingView, refreshed every {Math.round(refreshMs / 1000)}s. Not financial advice.</span>
        </div>
        <span className="sd-live" data-testid="updated">
          {updated ? `Updated ${updated.toLocaleTimeString()}` : 'LIVE'}
        </span>
      </header>

      <div className="sd-tabs" role="tablist">
        {BOARDS.map((b) => (
          <button
            key={b.id}
            role="tab"
            aria-selected={b.id === boardId}
            className={b.id === boardId ? 'active' : ''}
            data-testid={`tab-${b.id}`}
            onClick={() => { setBoardId(b.id); setSelected(null); setRows([]) }}
          >
            {b.label}
          </button>
        ))}
        <button data-testid="refresh" onClick={() => load(true)}>Refresh</button>
      </div>

      {loading ? (
        <p data-testid="board-loading" className="sd-empty">Loading...</p>
      ) : error ? (
        <p data-testid="board-error" className="sd-empty">
          {error}. <button data-testid="retry" onClick={() => load(true)}>Retry</button>
        </p>
      ) : (
        <>
          <section className="sd-card" data-testid="candidates">
            <h2>Poised to break out (strong tape + bullish news)</h2>
            {candidates.length === 0 ? (
              <p className="sd-empty" data-testid="no-candidates">No stock meets the breakout criteria right now.</p>
            ) : (
              <ul className="sd-cand">
                {candidates.slice(0, 5).map((c) => {
                  const h = (news[c.symbol] ?? []).find((n) => classifyNews(n.title).sentiment === 'Bullish')
                  return (
                    <li key={c.symbol}>
                      <button className="sd-event" data-testid={`cand-${c.symbol}`} onClick={() => setSelected(c.symbol)}>
                        <span className="row">
                          <span className="sym">{c.symbol} <span className="up">+{c.changePct.toFixed(1)}%</span></span>
                          <span className="sd-badge Bullish">Score {c.score}</span>
                        </span>
                        <span className="meta">{h?.title}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <div className="sd-grid sd-board-grid">
            <section className="sd-card">
              <h2>{board.label}</h2>
              {rows.length === 0 ? (
                <p className="sd-empty" data-testid="no-rows">No Nasdaq stocks are trading in this session right now.</p>
              ) : (
                <table data-testid="board-table">
                  <thead>
                    <tr><th>Symbol</th><th>Price</th><th>Change</th><th>Vol</th><th>RVOL</th><th>Cap</th><th>Score</th></tr>
                  </thead>
                  <tbody>
                    {scored.map((r) => (
                      <tr key={r.symbol} className={r.symbol === active?.symbol ? 'row-active' : ''}>
                        <td>
                          <button className="link" data-testid={`row-${r.symbol}`} onClick={() => setSelected(r.symbol)}>
                            {r.symbol}
                          </button>
                        </td>
                        <td>${r.price?.toFixed(2)}</td>
                        <td className="up">+{r.changePct.toFixed(1)}%</td>
                        <td>{fmtVol(r.volume)}</td>
                        <td>{r.rvol ? `${r.rvol.toFixed(1)}x` : '-'}</td>
                        <td>{fmtCap(r.marketCap)}</td>
                        <td>{r.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <section className="sd-card" data-testid="news-panel">
              <h2>{active ? `${active.symbol} news` : 'News'}</h2>
              {active && <p className="sd-headline">{active.name}</p>}
              {activeNews.length === 0 ? (
                <p className="sd-empty">No recent headlines.</p>
              ) : (
                <ul className="sd-news">
                  {activeNews.map((n) => {
                    const c = classifyNews(n.title)
                    return (
                      <li key={n.id}>
                        <span className={`sd-badge ${c.sentiment}`}>{c.sentiment}</span>{' '}
                        {n.url ? <a href={n.url} target="_blank" rel="noreferrer" data-testid={`news-${n.id}`}>{n.title}</a> : n.title}
                        <div className="sd-note">{n.source} - {n.at.toLocaleString()}</div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  )
}
