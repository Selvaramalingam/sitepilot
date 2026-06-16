'use client'

import { useState, useEffect } from 'react'

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
}

export function useCurrency() {
  const [currency, setCurrency] = useState('USD')
  const [symbol, setSymbol] = useState('$')

  useEffect(() => {
    const savedCurrency = localStorage.getItem('sitepilot_currency')
    if (savedCurrency && CURRENCY_SYMBOLS[savedCurrency]) {
      setCurrency(savedCurrency)
      setSymbol(CURRENCY_SYMBOLS[savedCurrency])
    }
  }, [])

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) || 0 : value
    const prefix = num < 0 ? '-' : ''
    return `${prefix}${symbol}${Math.abs(num).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  };

  const formatCurrencyNoDecimals = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) || 0 : value
    const prefix = num < 0 ? '-' : ''
    return `${prefix}${symbol}${Math.abs(num).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  };

  return {
    currency,
    symbol,
    formatCurrency,
    formatCurrencyNoDecimals
  }
}
