import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import api from '../utils/api'
import { useAuth } from './AuthContext'
import { playLevelUp, playAchievement } from '../utils/sounds'

const ACHIEVEMENT_LABELS = {
  first_deposit: { name: 'First Deposit', icon: '🪙', desc: 'Make your first deposit' },
  goal_setter: { name: 'Goal Setter', icon: '🎯', desc: 'Create your first savings goal' },
  hundred_club: { name: '100 Club', icon: '💯', desc: 'Save $100 total' },
  week_warrior: { name: 'Week Warrior', icon: '🔥', desc: '7-day savings streak' },
  piggy_master: { name: 'Piggy Master', icon: '🐷', desc: 'Complete all goals' },
  social_butterfly: { name: 'Social Butterfly', icon: '📱', desc: 'Send 10 posts' },
}

const GamificationContext = createContext(null)

export function GamificationProvider({ children }) {
  const { refreshUser, token } = useAuth()
  const [toasts, setToasts] = useState([])
  const prevRef = useRef(null)

  const pushToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, ...toast }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3600)
  }, [])

  const detect = useCallback((prev, next) => {
    if (!next || !prev) return
    if (next.level > prev.level) {
      playLevelUp()
      pushToast({
        icon: '⭐',
        title: 'LEVEL UP!',
        message: `You reached Level ${next.level}!`,
        gold: true,
      })
    }
    const newAch = (next.achievements || []).filter((a) => !(prev.achievements || []).includes(a))
    newAch.forEach((key) => {
      playAchievement()
      const def = ACHIEVEMENT_LABELS[key]
      pushToast({
        icon: def?.icon || '🏆',
        title: 'Achievement Unlocked!',
        message: def ? `${def.name} — ${def.desc}` : key,
      })
    })
  }, [pushToast])

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/users/profile')
      const p = data.user || data.profile || data
      const snapshot = {
        level: p.level,
        xp: p.xp,
        achievements: p.achievements || [],
      }
      detect(prevRef.current, snapshot)
      prevRef.current = snapshot
      await refreshUser()
      return snapshot
    } catch {
      return null
    }
  }, [detect, refreshUser])

  useEffect(() => {
    if (!token) return
    refresh()
  }, [token, refresh])

  const value = useMemo(() => ({ refresh }), [refresh])

  return (
    <GamificationContext.Provider value={value}>
      {children}

      <div
        style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 12000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="gam-toast"
            style={{
              background: t.gold
                ? 'linear-gradient(180deg, #3A2A0A, #2A1E06)'
                : 'linear-gradient(180deg, #143A2A, #0E2B1F)',
              border: '3px solid #5A5A5A',
              boxShadow: 'inset 2px 2px 0 var(--mc-border-light), inset -2px -2px 0 var(--mc-border-dark), 0 6px 20px rgba(0,0,0,0.5)',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              maxWidth: '90vw',
              animation: 'gamToastIn 0.25s ease-out',
            }}
          >
            <span style={{ fontSize: '26px', lineHeight: 1, filter: 'drop-shadow(0 0 8px rgba(252,219,5,0.4))' }}>
              {t.icon}
            </span>
            <div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '10px',
                  color: t.gold ? '#FCDB05' : '#55FF55',
                  textShadow: '1px 1px 0 rgba(0,0,0,0.6)',
                  marginBottom: '4px',
                }}
              >
                {t.title}
              </div>
              <div
                style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: '18px',
                  color: '#fff',
                  lineHeight: '1.2',
                }}
              >
                {t.message}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes gamToastIn {
          0% { transform: translateY(-16px) scale(0.9); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </GamificationContext.Provider>
  )
}

export function useGamification() {
  const context = useContext(GamificationContext)
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider')
  }
  return context
}