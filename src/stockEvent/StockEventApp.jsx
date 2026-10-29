import React, { useEffect, useMemo, useState } from 'react'
import { analyze, generateHistory } from './engine'
import { createSimulatedFeed } from './feed'
import './dashboard.css'

const fmt = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

export default function StockEventApp({ feed, history }) {
  const hist = useMemo(() => history ?? generateHistory(), [history])
  const activeFeed = useMemo(() => feed ?? createSimulatedFeed(), [feed])
  const [loading, setLoading] = useState(true)
  const [watchlist, setWatchlist] = useState(['PLTR', 'NVDA', 'ABC'])
  const [symbolInput, setSymbolInput] = useState('')
  const [events, setEvents] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  useEffect(
    () =>
      activeFeed.subscribe((msg) => {
        if (msg.type === 'ready') return setLoading(false)
        if (msg.type !== 'news') return
        setEvents((prev) =>
          [{ ...msg.event, analysis: analyze(hist, msg.event.headline, msg.event) }, ...prev].slice(0, 50),
        )
      }),
    [activeFeed, hist],
  )

  const visible = events.filter((e) => watchlist.includes(e.symbol))
  const selected = visible.find((e) => e.id === selectedId) ?? visible[0]

  const addSymbol = (e) => {
    e.preventDefault()
    const s = symbolInput.trim().toUpperCase()
    if (s && !watchlist.includes(s)) setWatchlist([...watchlist, s])
    setSymbolInput('')
  }

  if (loading) return <p data-testid="loading" className="sd-empty">Loading...</p>

  const cls = (n) => (n >= 0 ? 'up' : 'down')
  const pos = (v) => `${Math.max(0, Math.min(100, ((v + 10) / 20) * 100))}%`
  const a = selected?.analysis

  return (
    <main className="sd" data-testid="stock-app">
      <header className="sd-head">
        <div>
          <h1>Stock Event AI</h1>
          <span className="sd-note">Decision support only. No automatic trading. Simulated data.</span>
        </div>
        <span className="sd-live">LIVE</span>
      </header>
      <div className="sd-grid">
        <aside>
          <section className="sd-card">
            <h2>Watchlist</h2>
            <form className="sd-form" onSubmit={addSymbol}>
              <input
                data-testid="symbol-input"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
                placeholder="Add symbol"
              />
              <button type="submit" data-testid="add-symbol">Add</button>
            </form>
            <ul className="sd-chips" data-testid="watchlist">
              {watchlist.map((s) => (
                <li key={s} className="sd-chip">
                  {s}
                  <button data-testid={`remove-${s}`} aria-label={`Remove ${s}`} onClick={() => setWatchlist(watchlist.filter((x) => x !== s))}>
                    x
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="sd-card">
            <h2>Live breaking events</h2>
            {visible.length === 0 && <p className="sd-empty" data-testid="no-events">Waiting for news on your watchlist...</p>}
            <ul data-testid="event-list">
              {visible.map((e) => (
                <li key={e.id}>
                  <button
                    className={`sd-event${selected?.id === e.id ? ' active' : ''}`}
                    data-testid={`event-${e.id}`}
                    onClick={() => setSelectedId(e.id)}
                  >
                    <span className="row">
                      <span className="sym">{e.symbol} <span className={cls(e.gapPct)}>{fmt(e.gapPct)}</span></span>
                      <span className={`sd-badge ${e.analysis.sentiment}`}>{e.analysis.sentiment} {e.analysis.score}</span>
                    </span>
                    <span className="meta">{e.at.toLocaleTimeString()} - {e.headline}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
        <section className="sd-card" data-testid="event-detail-wrap">
          {!selected ? (
            <p className="sd-empty">Select an event to see how similar past events played out.</p>
          ) : (
            <div data-testid="event-detail">
              <div className="sd-detail-head">
                <div>
                  <h3>{selected.symbol} <span className={`sd-badge ${a.sentiment}`}>{a.type.replace('_', ' ')}</span></h3>
                  <p className="sd-headline">{selected.headline}</p>
                </div>
              </div>
              <div className="sd-stats">
                <div className="sd-stat">
                  <div className="l">AI score</div>
                  <div className="v" data-testid="score">{a.score}</div>
                  <div className="sd-scorebar"><i style={{ width: `${a.score * 10}%` }} /></div>
                </div>
                <div className="sd-stat"><div className="l">Gap</div><div className={`v ${cls(selected.gapPct)}`}>{fmt(selected.gapPct)}</div></div>
                <div className="sd-stat"><div className="l">RVOL</div><div className="v">{selected.rvol}x</div></div>
                <div className="sd-stat"><div className="l">Matches</div><div className="v">N={a.stats.n}</div></div>
                <div className="sd-stat"><div className="l">Fade rate</div><div className="v" data-testid="fade-rate">{Math.round(a.stats.fadeRate * 100)}%</div></div>
              </div>
              <table data-testid="horizons">
                <thead><tr><th>Horizon</th><th>Median</th><th>25-75%</th><th>Range (-10% to +10%)</th></tr></thead>
                <tbody>
                  {a.stats.horizons.map((h) => (
                    <tr key={h.minutes} data-testid={`horizon-${h.minutes}`}>
                      <td>{h.minutes} min</td>
                      <td className={cls(h.median)}>{fmt(h.median)}</td>
                      <td>{fmt(h.p25)} to {fmt(h.p75)}</td>
                      <td>
                        <div className="sd-range">
                          <i style={{ left: pos(h.p25), width: `calc(${pos(h.p75)} - ${pos(h.p25)})` }} />
                          <b style={{ left: pos(h.median) }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="sd-stats" style={{ marginTop: 14 }}>
                <div className="sd-stat"><div className="l">Max move</div><div className="v up">{fmt(a.stats.maxMove)}</div></div>
                <div className="sd-stat"><div className="l">Max drawdown</div><div className="v down">{fmt(a.stats.maxDrawdown)}</div></div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
