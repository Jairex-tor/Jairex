import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'

const SteveSVG = () => (
  <svg
    width="80"
    height="120"
    viewBox="0 0 16 24"
    style={{ imageRendering: 'pixelated', display: 'block' }}
  >
    {/* Hair */}
    <rect x="4" y="0" width="8" height="1" fill="#3F2415" />
    <rect x="3" y="1" width="1" height="3" fill="#3F2415" />
    <rect x="12" y="1" width="1" height="3" fill="#3F2415" />
    <rect x="4" y="1" width="8" height="1" fill="#3F2415" />
    <rect x="4" y="2" width="8" height="1" fill="#3F2415" />

    {/* Face */}
    <rect x="4" y="2" width="8" height="5" fill="#C5956B" />
    <rect x="3" y="3" width="1" height="3" fill="#C5956B" />
    <rect x="12" y="3" width="1" height="3" fill="#C5956B" />

    {/* Eyes */}
    <rect x="5" y="3" width="2" height="2" fill="#FFFFFF" />
    <rect x="9" y="3" width="2" height="2" fill="#FFFFFF" />
    <rect x="6" y="4" width="1" height="1" fill="#4A3728" />
    <rect x="10" y="4" width="1" height="1" fill="#4A3728" />

    {/* Mouth */}
    <rect x="6" y="6" width="4" height="1" fill="#8B6D5A" />

    {/* Blue shirt */}
    <rect x="3" y="7" width="10" height="6" fill="#00A2E8" />
    <rect x="2" y="8" width="1" height="4" fill="#00A2E8" />
    <rect x="13" y="8" width="1" height="4" fill="#00A2E8" />

    {/* Arms (skin) */}
    <rect x="2" y="8" width="1" height="3" fill="#C5956B" />
    <rect x="13" y="8" width="1" height="3" fill="#C5956B" />
    <rect x="1" y="10" width="1" height="2" fill="#C5956B" />
    <rect x="14" y="10" width="1" height="2" fill="#C5956B" />

    {/* Pants */}
    <rect x="3" y="13" width="4" height="5" fill="#3F3F50" />
    <rect x="9" y="13" width="4" height="5" fill="#3F3F50" />

    {/* Shoes */}
    <rect x="3" y="18" width="4" height="1" fill="#553322" />
    <rect x="9" y="18" width="4" height="1" fill="#553322" />
  </svg>
)

const AlexSVG = () => (
  <svg
    width="80"
    height="120"
    viewBox="0 0 16 24"
    style={{ imageRendering: 'pixelated', display: 'block' }}
  >
    {/* Hair top */}
    <rect x="3" y="0" width="10" height="1" fill="#C47A2B" />
    <rect x="3" y="1" width="10" height="1" fill="#C47A2B" />

    {/* Face */}
    <rect x="4" y="2" width="8" height="5" fill="#D4A574" />

    {/* Hair sides (long) */}
    <rect x="3" y="1" width="1" height="6" fill="#C47A2B" />
    <rect x="12" y="1" width="1" height="6" fill="#C47A2B" />
    <rect x="2" y="5" width="1" height="4" fill="#C47A2B" />
    <rect x="13" y="5" width="1" height="4" fill="#C47A2B" />

    {/* Eyes */}
    <rect x="5" y="3" width="2" height="2" fill="#FFFFFF" />
    <rect x="9" y="3" width="2" height="2" fill="#FFFFFF" />
    <rect x="6" y="4" width="1" height="1" fill="#4A3728" />
    <rect x="10" y="4" width="1" height="1" fill="#4A3728" />

    {/* Mouth */}
    <rect x="6" y="6" width="4" height="1" fill="#B0877A" />

    {/* Green shirt */}
    <rect x="3" y="7" width="10" height="6" fill="#5D8C2E" />
    <rect x="2" y="8" width="1" height="4" fill="#5D8C2E" />
    <rect x="13" y="8" width="1" height="4" fill="#5D8C2E" />

    {/* Arms (skin) */}
    <rect x="2" y="8" width="1" height="3" fill="#D4A574" />
    <rect x="13" y="8" width="1" height="3" fill="#D4A574" />
    <rect x="1" y="10" width="1" height="2" fill="#D4A574" />
    <rect x="14" y="10" width="1" height="2" fill="#D4A574" />

    {/* Hair continues down shirt */}
    <rect x="2" y="8" width="1" height="2" fill="#C47A2B" />
    <rect x="13" y="8" width="1" height="2" fill="#C47A2B" />

    {/* Pants */}
    <rect x="3" y="13" width="4" height="5" fill="#5D4E37" />
    <rect x="9" y="13" width="4" height="5" fill="#5D4E37" />

    {/* Shoes */}
    <rect x="3" y="18" width="4" height="1" fill="#444444" />
    <rect x="9" y="18" width="4" height="1" fill="#444444" />
  </svg>
)

const features = [
  {
    icon: '🐷',
    title: 'Piggy Bank',
    desc: 'Set goals, track savings, watch your piggy grow!',
  },
  {
    icon: '📱',
    title: 'Share Moments',
    desc: 'Post updates, photos, and celebrate together',
  },
  {
    icon: '💬',
    title: 'Chat & Connect',
    desc: 'Message your partner and get AI savings tips',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      {/* Hero Section */}
      <div className="landing__hero">
        {/* Ground */}
        <div style={groundStyle}>
          <div style={grassStyle} />
          <div style={dirtStyle} />
        </div>

        {/* Steve */}
        <div style={charLeftStyle}>
          <SteveSVG />
        </div>

        {/* Alex */}
        <div style={charRightStyle}>
          <AlexSVG />
        </div>

        {/* Title between characters */}
        <div style={titleAreaStyle}>
          <h1 className="landing__logo">Jairex</h1>
          <p style={taglineStyle}>Save Together, Build Together</p>
        </div>

        <div className="landing__hero-actions">
          <Button
            variant="gold"
            size="lg"
            onClick={() => navigate('/register')}
          >
            Start Your Journey
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/login')}
          >
            I Have a Code
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="landing__features">
        {features.map((f) => (
          <div key={f.title} className="landing__feature">
            <div className="landing__feature-icon">{f.icon}</div>
            <div className="landing__feature-title">{f.title}</div>
            <div className="landing__feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="landing__cta">
        <div className="landing__cta-title">
          Ready to Start Saving?
        </div>
        <p className="landing__cta-desc">
          Build your savings empire together, one block at a time.
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={() => navigate('/register')}
        >
          Create Your World
        </Button>
      </div>

      {/* Footer */}
      <footer style={footerStyle}>
        <p>Built with ❤️ and blocks</p>
        <p style={{ marginTop: '4px', opacity: 0.6 }}>© 2026 Jairex</p>
      </footer>
    </div>
  )
}

const groundStyle = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '80px',
  zIndex: 0,
}

const grassStyle = {
  height: '16px',
  background:
    'linear-gradient(90deg, #5D8C2E 0%, #7EC850 25%, #5D8C2E 50%, #7EC850 75%, #5D8C2E 100%)',
  boxShadow: 'inset 0 -4px 0 #4A7024',
}

const dirtStyle = {
  height: '64px',
  background:
    'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.06) 4px, rgba(0,0,0,0.06) 5px)',
  backgroundColor: '#8B6914',
}

const charLeftStyle = {
  position: 'absolute',
  bottom: '80px',
  left: '10%',
  zIndex: 2,
  animation: 'float 3s ease-in-out infinite',
}

const charRightStyle = {
  position: 'absolute',
  bottom: '80px',
  right: '10%',
  zIndex: 2,
  animation: 'float 3s ease-in-out infinite 1s',
}

const titleAreaStyle = {
  position: 'relative',
  zIndex: 3,
  marginBottom: '24px',
}

const taglineStyle = {
  fontFamily: "'VT323', monospace",
  fontSize: '24px',
  color: '#FFFFFF',
  textShadow: '2px 2px 0 #3F3F3F',
  marginTop: '8px',
}

const footerStyle = {
  padding: '24px',
  textAlign: 'center',
  fontFamily: "'VT323', monospace",
  fontSize: '20px',
  color: '#888',
  borderTop: '4px solid #5A5A5A',
  backgroundColor: '#1B1029',
}
