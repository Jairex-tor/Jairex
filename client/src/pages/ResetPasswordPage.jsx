import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import Button from '../components/common/Button';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  if (!token) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="mc-block" style={{ width: '100%', maxWidth: '420px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '12px', color: 'var(--mc-redstone)', marginBottom: '12px' }}>
            Invalid Reset Link
          </div>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: '18px', color: '#AAA', marginBottom: '16px' }}>
            This password reset link is invalid or missing a token.
          </div>
          <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Request New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, password });
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
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔓</div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '12px', color: 'var(--mc-gold)', textShadow: '2px 2px 0 var(--mc-text-shadow)', marginBottom: '8px' }}>
            Reset Password
          </div>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: '18px', color: '#AAA' }}>
            Choose a new password for your account.
          </div>
        </div>

        {message ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'VT323', monospace", fontSize: '20px', color: 'var(--mc-emerald)', marginBottom: '16px' }}>
              {message}
            </div>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Button variant="primary">Go to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#999', marginBottom: '6px' }}>NEW PASSWORD</div>
              <input
                className="mc-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                style={{ width: '100%' }}
                autoFocus
              />
            </div>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#999', marginBottom: '6px' }}>CONFIRM PASSWORD</div>
              <input
                className="mc-input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type password again"
                style={{ width: '100%' }}
              />
            </div>

            {error && (
              <div style={{ fontFamily: "'VT323', monospace", fontSize: '18px', color: 'var(--mc-redstone)' }}>{error}</div>
            )}

            <Button type="submit" variant="primary" fullWidth disabled={submitting}>
              {submitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
