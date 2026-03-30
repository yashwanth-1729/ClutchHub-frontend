'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

function ParticleField() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 3 === 0 ? '3px' : '2px',
          height: i % 3 === 0 ? '3px' : '2px',
          background: i % 2 === 0 ? 'var(--orange)' : 'var(--cyan)',
          borderRadius: '50%',
          left: `${(i * 5.3) % 100}%`,
          bottom: '-10px',
          boxShadow: i % 2 === 0 ? '0 0 6px var(--orange)' : '0 0 6px var(--cyan)',
          animation: `float ${6 + (i % 8)}s linear ${i * 0.4}s infinite`,
          '--drift': `${(i % 5 - 2) * 30}px`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [gameUid, setGameUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError('Incorrect email or password. New here? Sign up.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseIdToken: data.session?.access_token }),
      });
      const json = await res.json();
      if (res.ok) { setAuth(json.data); router.push('/tournaments'); }
      else setError(json.message || 'Login failed');
    } catch { setError('Could not connect to server'); }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!username.trim()) { setError('Username required'); return; }
    if (!gameUid.trim()) { setError('Free Fire UID required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) {
      if (err.message.includes('already registered')) {
        setError('Email already registered. Log in instead.');
        setMode('login');
      } else setError(err.message);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseToken: data.session?.access_token, username, gameUid }),
      });
      const json = await res.json();
      if (res.ok) { setAuth(json.data); router.push('/tournaments'); }
      else setError(json.message || 'Registration failed');
    } catch { setError('Could not connect to server'); }
    setLoading(false);
  };

  const fields = [
    { type: 'email', placeholder: 'EMAIL ADDRESS', value: email, onChange: setEmail },
    { type: 'password', placeholder: 'PASSWORD', value: password, onChange: setPassword },
    ...(mode === 'signup' ? [
      { type: 'text', placeholder: 'USERNAME', value: username, onChange: setUsername },
      { type: 'text', placeholder: 'FREE FIRE UID', value: gameUid, onChange: setGameUid },
    ] : [])
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '1rem', position: 'relative',
    }}>
      <ParticleField />
      <div style={{
        position: 'fixed', top: '10%', left: '5%', width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(255,107,43,0.08) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        animation: 'bgShift 8s ease-in-out infinite alternate',
      }} />
      <div style={{
        position: 'fixed', bottom: '10%', right: '5%', width: '250px', height: '250px',
        background: 'radial-gradient(circle, rgba(0,245,255,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        animation: 'bgShift 10s ease-in-out infinite alternate-reverse',
      }} />

      <div style={{
        width: '100%', maxWidth: '420px', position: 'relative', zIndex: 10,
        animation: mounted ? 'pageEnter 0.5s ease forwards' : 'none',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 className="glitch" data-text="CLUTCHHUB" style={{
            fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 900,
            letterSpacing: '0.05em', color: 'var(--orange)',
            textShadow: '0 0 20px var(--orange-glow), 0 0 60px rgba(255,107,43,0.2)',
          }}>CLUTCHHUB</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, var(--cyan))' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '0.3em' }}>FREE FIRE ESPORTS</span>
            <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, var(--cyan), transparent)' }} />
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(13,13,26,0.92)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '2rem', backdropFilter: 'blur(20px)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Corner decorations */}
          <div style={{ position: 'absolute', top: '-1px', left: '-1px', width: '16px', height: '16px', borderTop: '2px solid var(--orange)', borderLeft: '2px solid var(--orange)' }} />
          <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: '16px', height: '16px', borderTop: '2px solid var(--orange)', borderRight: '2px solid var(--orange)' }} />
          <div style={{ position: 'absolute', bottom: '-1px', left: '-1px', width: '16px', height: '16px', borderBottom: '2px solid var(--cyan)', borderLeft: '2px solid var(--cyan)' }} />
          <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '16px', height: '16px', borderBottom: '2px solid var(--cyan)', borderRight: '2px solid var(--cyan)' }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--orange), var(--cyan), var(--orange), transparent)',
            backgroundSize: '200% 100%', animation: 'navLine 2s linear infinite',
          }} />

          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '4px',
            padding: '3px', marginBottom: '1.75rem', border: '1px solid var(--border)',
          }}>
            {(['login', 'signup'] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
                flex: 1, padding: '0.6rem', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                borderRadius: '3px', transition: 'all 0.3s',
                background: mode === m ? 'linear-gradient(135deg, var(--orange), #cc4400)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-dim)',
                boxShadow: mode === m ? '0 0 15px var(--orange-glow)' : 'none',
              }}>
                {m === 'login' ? '[ LOGIN ]' : '[ SIGN UP ]'}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {fields.map((field, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--orange)', opacity: 0.6,
                }}>{'>'}</span>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={field.value}
                  onChange={e => field.onChange(e.target.value)}
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.5)',
                    border: '1px solid var(--border2)', borderBottom: '1px solid var(--orange)',
                    color: 'var(--text)', padding: '0.75rem 1rem 0.75rem 1.75rem',
                    fontFamily: 'var(--font-body)', fontSize: '0.95rem', outline: 'none',
                    borderRadius: '4px 4px 0 0', letterSpacing: '0.05em', transition: 'all 0.3s',
                  }}
                  onFocus={e => { e.target.style.borderBottomColor = 'var(--cyan)'; e.target.style.boxShadow = '0 4px 15px rgba(0,245,255,0.1)'; }}
                  onBlur={e => { e.target.style.borderBottomColor = 'var(--orange)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem',
              background: 'rgba(255,34,68,0.1)', border: '1px solid var(--red)',
              borderRadius: '4px', color: 'var(--red)',
              fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
            }}>⚠ {error}</div>
          )}

          {/* Submit */}
          <button onClick={mode === 'login' ? handleLogin : handleSignup} disabled={loading} style={{
            width: '100%', marginTop: '1.5rem', padding: '0.9rem',
            background: loading ? 'rgba(255,107,43,0.3)' : 'linear-gradient(135deg, var(--orange), #cc4400)',
            color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            borderRadius: '4px', transition: 'all 0.3s',
            clipPath: 'polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)',
            boxShadow: loading ? 'none' : '0 0 25px var(--orange-glow)',
          }}>
            {loading ? 'PROCESSING...' : mode === 'login' ? '// ENTER THE HUB' : '// JOIN THE BATTLE'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            {mode === 'login'
              ? <>No account? <span onClick={() => setMode('signup')} style={{ color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>SIGN UP</span></>
              : <>Already in? <span onClick={() => setMode('login')} style={{ color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>LOGIN</span></>
            }
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
          COMPETE. DOMINATE. CLUTCH.
        </p>
      </div>
    </div>
  );
}


