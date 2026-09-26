'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { login, loginAsync, getUser, fetchUsersCloud } from '../../lib/auth-helpers';
import { requestPasswordReset } from '../../lib/password-reset-helpers';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  
  // Forgot Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNote, setResetNote] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    setMounted(true);
    // Background sync users from Supabase so any newly created user from PC is available
    fetchUsersCloud().catch(() => {});

    // Pre-fill remembered username/email
    try {
      const saved = localStorage.getItem('snap_remember_identifier');
      if (saved) {
        setIdentifier(saved);
        setRememberMe(true);
      }
    } catch (e) {}

    // Only redirect if we haven't already and user is logged in
    if (redirected.current) return;
    const user = getUser();
    if (user) {
      redirected.current = true;
      router.replace(user.role === 'admin' ? '/admin' : '/home');
    }
  }, []); // ← empty deps: only run ONCE on mount, never on router changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(false);
    setErrorMessage('');

    try {
      const res = await loginAsync(identifier, password);
      if (res.user) {
        if (rememberMe) {
          try { localStorage.setItem('snap_remember_identifier', identifier.trim()); } catch (e) {}
        } else {
          try { localStorage.removeItem('snap_remember_identifier'); } catch (e) {}
        }
        redirected.current = true;
        router.replace(res.user.role === 'admin' ? '/admin' : '/home');
      } else {
        setErrorMessage(res.error || 'Incorrect username/email or password.');
        setError(true);
        setLoading(false);
      }
    } catch {
      setErrorMessage('Network or authentication error. Please try again.');
      setError(true);
      setLoading(false);
    }
  };

  const handleSendReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    requestPasswordReset(resetEmail.trim(), resetNote);
    setResetSuccess(true);
    setTimeout(() => {
      setResetSuccess(false);
      setShowResetModal(false);
      setResetEmail('');
      setResetNote('');
    }, 2000);
  };

  if (!mounted) return null;

  return (
    <div style={styles.container}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadein { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-8px); } 40%,80% { transform: translateX(8px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-card { animation: fadein 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .login-card.shake { animation: shake 0.4s ease-in-out; }
        .login-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .login-input:focus { outline: none; border-color: #D4AF37 !important; box-shadow: 0 0 0 3px rgba(212,175,55,0.15); }
        .login-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .login-btn:active { transform: translateY(0); }
        .login-btn { transition: opacity 0.2s, transform 0.15s; }
      `}} />

      <div className={`login-card ${error ? 'shake' : ''}`} style={styles.card}>
        {/* Logo */}
        <div style={styles.logoArea}>
          <img 
            src="/logo.png" 
            alt="Snap Service Logo" 
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              objectFit: 'cover', 
              border: '2px solid #D4AF37', 
              boxShadow: '0 0 25px rgba(212,175,55,0.3)',
              marginBottom: '4px'
            }} 
          />
          <h1 style={styles.title}>Snap Service</h1>
          <p style={styles.subtitle}>Photographer App · Secure Sign In</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form} method="POST">
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username or Email</label>
            <input
              className="login-input"
              type="text"
              name="username"
              id="username"
              placeholder="Username or email (e.g. ahmed or admin)"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={styles.input}
              required
              autoComplete="username"
              autoFocus
            />
          </div>
          <div style={styles.inputGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={styles.label}>Password</label>
              <button 
                type="button" 
                onClick={() => { setResetEmail(identifier); setShowResetModal(true); }}
                style={{ background: 'none', border: 'none', color: '#D4AF37', fontSize: '11px', cursor: 'pointer', padding: 0 }}
              >
                Forgot Password?
              </button>
            </div>
            <input
              className="login-input"
              type="password"
              name="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              autoComplete="current-password"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
            <input 
              type="checkbox" 
              id="rememberMe" 
              checked={rememberMe} 
              onChange={e => setRememberMe(e.target.checked)}
              style={{ accentColor: '#D4AF37', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="rememberMe" style={{ color: '#aaa', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}>
              Remember login username
            </label>
          </div>

          {error && (
            <p style={styles.errorMsg}>{errorMessage || 'Incorrect email or password. Please try again.'}</p>
          )}

          <button
            className="login-btn"
            type="submit"
            style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#12121a',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#D4AF37', fontWeight: 'bold' }}>
              Request Password Reset
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#aaa', lineHeight: '1.4' }}>
              Send a direct password reset notification to the System Administrator.
            </p>

            {resetSuccess ? (
              <div style={{ padding: '15px', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', borderRadius: '8px', color: '#10b981', textAlign: 'center', fontSize: '0.9rem' }}>
                ✓ Reset request sent to Admin successfully!
              </div>
            ) : (
              <form onSubmit={handleSendReset} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>Your Email</label>
                  <input 
                    type="email" 
                    value={resetEmail} 
                    onChange={e => setResetEmail(e.target.value)} 
                    placeholder="your@email.com" 
                    required 
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>Note for Admin (Optional)</label>
                  <textarea 
                    value={resetNote} 
                    onChange={e => setResetNote(e.target.value)} 
                    placeholder="e.g. Please reset my password for shoot..." 
                    rows={2}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowResetModal(false)}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    style={{ background: '#D4AF37', border: 'none', color: '#000', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                  >
                    Send to Admin
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at top, #16131f 0%, #0a0a0f 60%)',
    padding: '20px',
  },
  card: {
    background: 'rgba(20, 18, 30, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '40px 32px 36px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
    border: '1px solid rgba(212,175,55,0.12)',
  },
  logoArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
    gap: '8px',
  },
  logoIcon: {
    width: 64,
    height: 64,
    background: 'rgba(212,175,55,0.08)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
    border: '1px solid rgba(212,175,55,0.15)',
  },
  title: {
    color: '#D4AF37',
    fontSize: '22px',
    fontWeight: '700',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: '#555',
    fontSize: '12px',
    margin: 0,
    letterSpacing: '0.02em',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#888',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  input: {
    padding: '13px 16px',
    borderRadius: '10px',
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: '15px',
    width: '100%',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  button: {
    padding: '14px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
    border: 'none',
    color: '#000',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    marginTop: '4px',
    letterSpacing: '0.02em',
  },
  errorMsg: {
    color: '#f87171',
    fontSize: '13px',
    textAlign: 'center',
    margin: '0',
    background: 'rgba(239,68,68,0.08)',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(239,68,68,0.2)',
  },
};
