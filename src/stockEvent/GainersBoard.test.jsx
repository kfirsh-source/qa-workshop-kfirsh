import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GainersBoard from './GainersBoard'

const rows = [
  { symbol: 'ABC', tvSymbol: 'NASDAQ:ABC', name: 'ABC Inc', price: 5, changePct: 30, volume: 2e6, rvol: 8, marketCap: 1e8 },
  { symbol: 'XYZ', tvSymbol: 'NASDAQ:XYZ', name: 'XYZ Corp', price: 9, changePct: 12, volume: 1e6, rvol: 2, marketCap: 5e9 },
]
const news = { 'NASDAQ:ABC': [{ id: 'n1', title: 'ABC announces FDA approval', at: new Date(), source: 'Benzinga', url: null }] }

describe('GainersBoard', () => {
  it('shows Loading..., then rows, candidates and news', async () => {
    render(<GainersBoard loadBoard={async () => rows} loadNews={async (s) => news[s] ?? []} refreshMs={1e9} />)
    expect(screen.getByTestId('board-loading')).toHaveTextContent('Loading...')
    await waitFor(() => expect(screen.getByTestId('board-table')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByTestId('cand-ABC')).toBeInTheDocument())
    expect(screen.queryByTestId('cand-XYZ')).toBeNull()
    expect(screen.getByTestId('news-panel')).toHaveTextContent('ABC announces FDA approval')
  })

  it('reloads when switching tabs', async () => {
    const loadBoard = vi.fn(async () => rows)
    render(<GainersBoard loadBoard={loadBoard} loadNews={async () => []} refreshMs={1e9} />)
    await waitFor(() => screen.getByTestId('board-table'))
    fireEvent.click(screen.getByTestId('tab-postmarket'))
    await waitFor(() => expect(loadBoard).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'postmarket' })))
  })

  it('shows an error with retry', async () => {
    render(<GainersBoard loadBoard={async () => { throw new Error('boom') }} loadNews={async () => []} refreshMs={1e9} />)
    await waitFor(() => expect(screen.getByTestId('board-error')).toHaveTextContent('boom'))
    expect(screen.getByTestId('retry')).toBeInTheDocument()
  })
})
