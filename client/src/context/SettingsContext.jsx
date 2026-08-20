import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', label: 'USD ($)', locale: 'en-US' },
  PHP: { code: 'PHP', symbol: '₱', label: 'PHP (₱)', locale: 'en-PH' },
  EUR: { code: 'EUR', symbol: '€', label: 'EUR (€)', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', label: 'GBP (£)', locale: 'en-GB' },
}

const DEFAULT_SETTINGS = {
  notifications: {
    savingsReminders: true,
    partnerActivity: true,
    achievementUnlocks: true,
    aiTips: false,
  },
  appearance: {
    soundEffects: true,
    volume: 70,
    currency: 'USD',
    soundPack: 'classic',
  },
}

const STORAGE_KEY = 'coupleSave_settings'

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      return {
        ...DEFAULT_SETTINGS,
        ...saved,
        notifications: { ...DEFAULT_SETTINGS.notifications, ...saved.notifications },
        appearance: { ...DEFAULT_SETTINGS.appearance, ...saved.appearance },
      }
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS }
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const updateSetting = useCallback((section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }))
  }, [])

  const updateSettings = useCallback((updater) => {
    setSettings(updater)
  }, [])

  const currency = useMemo(() => {
    return CURRENCIES[settings.appearance.currency] || CURRENCIES.USD
  }, [settings.appearance.currency])

  const formatCurrency = useCallback((amount, { showSymbol = true } = {}) => {
    const num = Number(amount) || 0
    const formatted = num.toLocaleString(currency.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return showSymbol ? `${currency.symbol}${formatted}` : formatted
  }, [currency])

  const value = useMemo(() => ({
    settings,
    updateSetting,
    updateSettings,
    currency,
    formatCurrency,
    CURRENCIES,
  }), [settings, updateSetting, updateSettings, currency, formatCurrency])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}