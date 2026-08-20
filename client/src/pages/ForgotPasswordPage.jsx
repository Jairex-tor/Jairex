import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Button from '../components/common/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="mc-block" style={{ width: '100%', maxWidth: '420px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔑</div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '12px', color: 'var(--mc-gold)', textShadow: '2px 2px 0 var(--mc-text-shadow)', marginBottom: '8px' }}>
            Forgot Password
          </div>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: '18px', color: '#AAA' }}>
            Enter your email and we'll send you a reset link.
          </div>
        </div>

        {message ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'VT323', monospace", fontSize: '20px', color: 'var(--mc-emerald)', marginBottom: '16px' }}>
              {message}
            </div>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Button variant="primary">Back to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#999', marginBottom: '6px' }}>EMAIL</div>
              <input
                className="mc-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ width: '100%' }}
                autoFocus
              />
            </div>

            {error && (
              <div style={{ fontFamily: "'VT323', monospace", fontSize: '18px', color: 'var(--mc-redstone)' }}>{error}</div>
            )}

            <Button type="submit" variant="primary" fullWidth disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <div style={{ textAlign: 'center', fontFamily: "'VT323', monospace", fontSize: '18px' }}>
              <Link to="/login" style={{ color: 'var(--mc-diamond)', textDecoration: 'none' }}>← Back to Login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
