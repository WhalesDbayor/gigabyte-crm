'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Lock, Mail, AlertCircle, Shield } from 'lucide-react';

export default function LoginPage() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Invalid credentials.');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      padding: 16,
      background: 'radial-gradient(circle at 50% 50%, rgba(131,195,38,0.08) 0%, var(--bg-primary) 100%)'
    }}>
      <div className="card" style={{
        maxWidth: 400,
        width: '100%',
        padding: '32px 24px',
        backgroundColor: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
        textAlign: 'center'
      }}>
        {/* Brand Logo */}
        <div style={{
          width: 50,
          height: 50,
          backgroundColor: 'var(--accent-color)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: 24,
          margin: '0 auto 16px',
          boxShadow: '0 4px 14px rgba(131,195,38,0.4)'
        }}>
          G
        </div>
        
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Gigabyte CRM</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
          Internal Sales & customer relations command center
        </p>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(255, 59, 48, 0.08)',
            border: '1px solid rgba(255, 59, 48, 0.2)',
            borderRadius: 8,
            padding: 12,
            color: 'var(--color-danger)',
            fontSize: 12,
            textAlign: 'left',
            marginBottom: 20
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ textAlign: 'left', marginBottom: 16 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={14} style={{ color: 'var(--text-secondary)' }} /> Email Address
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. sales@gigabyte.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left', marginBottom: 24 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} style={{ color: 'var(--text-secondary)' }} /> Password
            </label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', gap: 8, boxShadow: '0 4px 14px rgba(131,195,38,0.2)' }}
            disabled={loading}
          >
            <Shield size={16} />
            {loading ? 'Authenticating...' : 'Secure Log In'}
          </button>
        </form>

        <div style={{ marginTop: 24, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 16, fontSize: 11, color: 'var(--text-secondary)', textAlign: 'left' }}>
          <strong>Demo logins:</strong>
          <ul style={{ paddingLeft: 16, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <li>Sales: <code>sales@gigabyte.com</code> / <code>gigabyte123</code></li>
            <li>Manager: <code>manager@gigabyte.com</code> / <code>gigaby*****</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
