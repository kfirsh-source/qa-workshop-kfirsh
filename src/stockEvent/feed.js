const SAMPLE = [
  ['PLTR', 'PLTR receives $800M government contract'],
  ['ABC', 'ABC announces FDA approval for lead therapy'],
  ['NVDA', 'NVDA beats estimates and raises guidance'],
  ['TSLA', 'TSLA announces public offering of 10M shares'],
  ['AMD', 'AMD misses revenue estimates, cuts outlook'],
  ['MSFT', 'MSFT to acquire gaming studio for $2B'],
  ['SMCI', 'SMCI discloses SEC investigation and subpoena'],
  ['AAPL', 'AAPL hosts annual developer event'],
]

// Simulated feed. Implement the same subscribe(cb) -> unsubscribe contract
// with an Alpaca WebSocket (news + trades) for live data.
export function createSimulatedFeed(intervalMs = 3000) {
  return {
    subscribe(cb) {
      let i = 0
      const ready = setTimeout(() => cb({ type: 'ready' }), 600)
      const timer = setInterval(() => {
        const [symbol, headline] = SAMPLE[i++ % SAMPLE.length]
        cb({
          type: 'news',
          event: {
            id: `${Date.now()}-${i}`,
            at: new Date(),
            symbol,
            headline,
            gapPct: Math.round((Math.random() * 24 - 8) * 10) / 10,
            rvol: Math.round((1 + Math.random() * 8) * 10) / 10,
          },
        })
      }, intervalMs)
      return () => {
        clearTimeout(ready)
        clearInterval(timer)
      }
    },
  }
}
