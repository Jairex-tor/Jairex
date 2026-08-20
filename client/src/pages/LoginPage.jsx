import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'
import Input from '../components/common/Input'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      navigate('/piggybank')
    } catch (err) {
      setError(
        err.response?.data?.message || 'Invalid credentials. Try again!'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth__container">
        <div className="auth__card">
          <div className="auth__header">
            <span className="auth__icon">⛏️</span>
            <h1 className="auth__title">Welcome Back</h1>
            <p className="auth__subtitle">Ready to mine some savings?</p>
          </div>

          {error && <div className="auth__error">{error}</div>}

          <form className="auth__form" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="steve@minecraft.com"
              icon="📧"
              disabled={loading}
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon="🔒"
              disabled={loading}
            />

            <div className="auth__submit">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                disabled={loading}
              >
                {loading ? 'Mining...' : 'Login'}
              </Button>
            </div>
          </form>

          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <Link
              to="/forgot-password"
              style={{
                fontFamily: "'VT323', monospace",
                fontSize: '18px',
                color: 'var(--mc-diamond)',
                textDecoration: 'none',
              }}
            >
              Forgot Password?
            </Link>
          </div>

          <div className="auth__footer">
            New here?{' '}
            <Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
