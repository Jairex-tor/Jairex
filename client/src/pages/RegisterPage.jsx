import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'
import Input from '../components/common/Input'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match!')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await register(username, email, password)
      setRegistered(true)
    } catch (err) {
      setError(
        err.response?.data?.message || 'Registration failed. Try again!'
      )
    } finally {
      setLoading(false)
    }
  }

  if (registered) {
    return (
      <div className="auth">
        <div className="auth__container">
          <div className="auth__card">
            <div className="auth__header">
              <span className="auth__icon">🎉</span>
              <h1 className="auth__title">World Created!</h1>
              <p className="auth__subtitle">
                Now connect with your partner
              </p>
            </div>

            <div style={pairSectionStyle}>
              <p style={pairIntroStyle}>
                How would you like to connect?
              </p>

              <Button
                variant="gold"
                fullWidth
                size="lg"
                onClick={() => navigate('/piggybank')}
                style={{ marginBottom: '12px' }}
              >
                🔗 Create a Couple
              </Button>
              <p style={pairHintStyle}>
                Generate an invite code to share with your partner
              </p>

              <div style={dividerStyle}>
                <div style={dividerLineStyle} />
                <span style={dividerTextStyle}>OR</span>
                <div style={dividerLineStyle} />
              </div>

              <Button
                variant="secondary"
                fullWidth
                size="lg"
                onClick={() => navigate('/piggybank')}
              >
                🤝 Join a Couple
              </Button>
              <p style={pairHintStyle}>
                Enter your partner's invite code
              </p>
            </div>

            <div className="auth__footer">
              Skip for now?{' '}
              <Link to="/piggybank">Go to Piggy Bank</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth">
      <div className="auth__container">
        <div className="auth__card">
          <div className="auth__header">
            <span className="auth__icon">🔨</span>
            <h1 className="auth__title">Create Your World</h1>
            <p className="auth__subtitle">
              Start your savings adventure
            </p>
          </div>

          {error && <div className="auth__error">{error}</div>}

          <form className="auth__form" onSubmit={handleSubmit}>
            <Input
              label="Username"
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="PixelCrafter"
              icon="👤"
              disabled={loading}
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@minecraft.com"
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

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              icon="🔒"
              disabled={loading}
            />

            <div className="auth__submit">
              <Button
                type="submit"
                variant="gold"
                fullWidth
                size="lg"
                disabled={loading}
              >
                {loading ? 'Crafting...' : 'Create Account'}
              </Button>
            </div>
          </form>

          <div className="auth__footer">
            Already have an account?{' '}
            <Link to="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const pairSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const pairIntroStyle = {
  fontFamily: "'VT323', monospace",
  fontSize: '22px',
  color: '#CCC',
  textAlign: 'center',
  marginBottom: '4px',
}

const pairHintStyle = {
  fontFamily: "'VT323', monospace",
  fontSize: '18px',
  color: '#888',
  textAlign: 'center',
  marginTop: '-4px',
}

const dividerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  margin: '8px 0',
}

const dividerLineStyle = {
  flex: 1,
  height: '3px',
  backgroundColor: '#333',
  borderTop: '1px solid #555',
}

const dividerTextStyle = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: '8px',
  color: '#888',
}
