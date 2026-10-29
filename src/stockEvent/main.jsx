import React from 'react'
import { createRoot } from 'react-dom/client'
import GainersBoard from './GainersBoard'
import StockEventApp from './StockEventApp'

createRoot(document.getElementById('root')).render(
  <>
    <GainersBoard />
    <StockEventApp />
  </>,
)
