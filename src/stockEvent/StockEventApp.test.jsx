import React from 'react'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StockEventApp from './StockEventApp'
import { generateHistory } from './engine'

const history = generateHistory(60, 3)
function fakeFeed() {
  let emit
  return { push: (m) => act(() => emit(m)), subscribe: (cb) => ((emit = cb), () => {}) }
}

describe('StockEventApp', () => {
  it('shows Loading... then events for watchlist symbols only', () => {
    const feed = fakeFeed()
    render(<StockEventApp feed={feed} history={history} />)
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading...')
    feed.push({ type: 'ready' })
    feed.push({ type: 'news', event: { id: '1', at: new Date(), symbol: 'PLTR', headline: 'PLTR receives $800M contract', gapPct: 8, rvol: 5 } })
    feed.push({ type: 'news', event: { id: '2', at: new Date(), symbol: 'ZZZ', headline: 'ZZZ FDA approval', gapPct: 8, rvol: 5 } })
    expect(screen.getByTestId('event-1')).toBeInTheDocument()
    expect(screen.queryByTestId('event-2')).toBeNull()
    expect(screen.getByTestId('horizon-60')).toBeInTheDocument()
  })

  it('adds a symbol to the watchlist', () => {
    const feed = fakeFeed()
    render(<StockEventApp feed={feed} history={history} />)
    feed.push({ type: 'ready' })
    fireEvent.change(screen.getByTestId('symbol-input'), { target: { value: 'zzz' } })
    fireEvent.click(screen.getByTestId('add-symbol'))
    expect(screen.getByTestId('remove-ZZZ')).toBeInTheDocument()
  })
})
