import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoadingScreen from './components/common/LoadingScreen'
import Navbar from './components/common/Navbar'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PiggyBankPage from './pages/PiggyBankPage'
import FYPPage from './pages/FYPPage'
import ChatPage from './pages/ChatPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import WishlistPage from './pages/WishlistPage'
import LeaderboardPage from './pages/LeaderboardPage'
import BudgetPage from './pages/BudgetPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return children
}

const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/reset-password']

export default function App() {
  const { loading, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const [initialLoad, setInitialLoad] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('jairex_sidebarCollapsed') === 'true'
    } catch {
      return false
    }
  })
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('jairex_sidebarCollapsed', String(next))
      } catch { /* ignore */ }
      return next
    })
  }

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setInitialLoad(false), 800)
      return () => clearTimeout(timer)
    }
  }, [loading])

  if (initialLoad) return <LoadingScreen />

  const showNavbar = isAuthenticated && !PUBLIC_ROUTES.includes(location.pathname)

  return (
    <div className="app">
      {showNavbar && (
        <>
          {/* Mobile backdrop */}
          {mobileNavOpen && (
            <div className="app-nav-backdrop" onClick={() => setMobileNavOpen(false)} />
          )}
          <Navbar
            onSignOut={logout}
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
            mobileOpen={mobileNavOpen}
            onCloseMobile={() => setMobileNavOpen(false)}
          />
        </>
      )}
      <main
        className="app-content"
        style={showNavbar ? { marginLeft: sidebarCollapsed ? 72 : 216 } : undefined}
      >
        {showNavbar && (
          <button
            className="app-nav-hamburger"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        )}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/piggybank"
            element={
              <ProtectedRoute>
                <PiggyBankPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fyp"
            element={
              <ProtectedRoute>
                <FYPPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <WishlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/budget"
            element={
              <ProtectedRoute>
                <BudgetPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}