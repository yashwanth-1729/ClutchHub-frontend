'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { updateProfile, getMyProfile } from '@/lib/data';
import { Mail, Lock, User, Gamepad2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [gameUid, setGameUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const routeAfterAuth = async () => {
    const profile = await getMyProfile();
    router.push(profile?.profileComplete ? '/tournaments' : '/auth/complete-profile');
  };

  const handleLogin = async () => {
    setLoading(true); setError(''); setNotice('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError('Incorrect email or password.'); setLoading(false); return; }
    try { await routeAfterAuth(); }
    catch { router.push('/tournaments'); }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!username.trim()) { setError('Username is required'); return; }
    if (!gameUid.trim()) { setError('Free Fire UID is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError(''); setNotice('');

    // Pre-check username availability for a clean message (DB uniqueness is the backstop).
    const { data: taken } = await supabase.from('public_profiles').select('id').eq('username', username.trim()).maybeSingle();
    if (taken) { setError('Username already taken'); setLoading(false); return; }

    const { data, error: err } = await supabase.auth.signUp({
      email, password, options: { data: { display_name: username.trim() } },
    });
    if (err) {
      if (err.message.toLowerCase().includes('already') || err.message.toLowerCase().includes('registered')) {
        setError('Email already registered.'); setMode('login');
      } else setError(err.message);
      setLoading(false); return;
    }

    if (data.session) {
      // Session available immediately → set the username + UID, then continue.
      try {
        await updateProfile({ username: username.trim(), gameUid: gameUid.trim(), displayName: username.trim() });
        router.push('/tournaments');
      } catch (e: any) {
        setError(e?.message || 'Could not finish sign up');
      }
    } else {
      // Email confirmation is enabled on this project.
      setNotice('Account created! Check your email to confirm, then log in.');
      setMode('login');
    }
    setLoading(false);
  };

  const submit = mode === 'login' ? handleLogin : handleSignup;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', zIndex: 1 }}>
      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.4s ease forwards' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Clutch<span style={{ color: 'var(--red)' }}>Hub</span>
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.4rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Free Fire Esports Platform
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2rem', backdropFilter: 'blur(24px)' }}>
          {/* Tabs */}
          <div className="tab-bar" style={{ marginBottom: '1.75rem' }}>
            <button className={`tab${mode === 'login' ? ' active' : ''}`} onClick={() => { setMode('login'); setError(''); setNotice(''); }}>Log In</button>
            <button className={`tab${mode === 'signup' ? ' active' : ''}`} onClick={() => { setMode('signup'); setError(''); setNotice(''); }}>Sign Up</button>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label className="input-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                <input className="input" style={{ paddingLeft: '2.5rem' }} type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                <input className="input" style={{ paddingLeft: '2.5rem' }} type="password" placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'} value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && mode === 'login') submit(); }} />
              </div>
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label className="input-label">Username</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                    <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="your_username" value={username} onChange={e => setUsername(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="input-label">Free Fire UID</label>
                  <div style={{ position: 'relative' }}>
                    <Gamepad2 size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                    <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="123456789" value={gameUid} onChange={e => setGameUid(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Error / notice */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', padding: '0.7rem 0.875rem', background: 'var(--red-dim)', border: '1px solid rgba(251,54,64,0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', color: 'var(--red)' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}
          {notice && (
            <div style={{ marginTop: '1rem', padding: '0.7rem 0.875rem', background: 'var(--green-dim)', border: '1px solid rgba(0,232,117,0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', color: 'var(--green)' }}>
              {notice}
            </div>
          )}

          {/* Submit */}
          <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: '1.5rem' }} onClick={submit} disabled={loading}>
            {loading
              ? <><Loader2 size={18} style={{ animation: 'spin 0.75s linear infinite' }} /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
              : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={18} /></>
            }
          </button>

          {/* Toggle */}
          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-2)' }}>
            {mode === 'login'
              ? <>New here? <span onClick={() => { setMode('signup'); setError(''); setNotice(''); }} style={{ color: 'var(--red)', cursor: 'pointer', fontWeight: 600 }}>Create an account</span></>
              : <>Already have one? <span onClick={() => { setMode('login'); setError(''); setNotice(''); }} style={{ color: 'var(--red)', cursor: 'pointer', fontWeight: 600 }}>Sign in</span></>
            }
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.72rem', color: 'var(--text-3)', letterSpacing: '0.06em' }}>
          Compete · Win · Clutch
        </p>
      </div>
    </div>
  );
}
