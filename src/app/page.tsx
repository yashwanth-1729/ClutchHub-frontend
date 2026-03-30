'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

function GlitchText({ text, size = '3rem' }: { text: string; size?: string }) {
  return (
    <span className="glitch" data-text={text} style={{
      fontFamily: 'var(--font-display)', fontSize: size, fontWeight: 900,
      letterSpacing: '0.05em', color: 'var(--orange)',
      textShadow: '0 0 20px var(--orange-glow), 0 0 60px rgba(255,107,43,0.15)',
    }}>{text}</span>
  );
}

function FloatingParticles() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {Array.from({ length: 25 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: `${1 + (i % 3)}px`,
          height: `${1 + (i % 3)}px`,
          background: [
            'var(--orange)', 'var(--cyan)', 'var(--gold)', 'var(--magenta)'
          ][i % 4],
          borderRadius: '50%',
          left: `${(i * 4.1) % 100}%`,
          bottom: '-10px',
          opacity: 0.6 + (i % 4) * 0.1,
          boxShadow: `0 0 ${4 + i % 6}px currentColor`,
          animation: `float ${7 + (i % 10)}s linear ${i * 0.3}s infinite`,
          '--drift': `${(i % 7 - 3) * 25}px`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setCounter(c => c + 1), 50);
    const timeout = setTimeout(() => clearInterval(interval), 2000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  const stats = [
    { label: 'ACTIVE PLAYERS', value: '12K+', color: 'var(--orange)' },
    { label: 'TOURNAMENTS', value: '500+', color: 'var(--cyan)' },
    { label: 'PRIZE GIVEN', value: '₹2L+', color: 'var(--gold)' },
  ];

  const features = [
    { icon: '⚡', title: 'INSTANT SQUADS', desc: 'Form your team in seconds' },
    { icon: '🏆', title: 'LIVE LEADERBOARD', desc: 'Real-time battle rankings' },
    { icon: '💰', title: 'CASH PRIZES', desc: 'Win real money every day' },
    { icon: '🎯', title: 'DAILY TOURNEYS', desc: 'New battles every 24h' },
  ];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', position: 'relative' }}>
      <FloatingParticles />

      {/* Hero */}
      <div style={{
        position: 'relative', zIndex: 10, padding: '4rem 1.5rem 2rem',
        textAlign: 'center', maxWidth: '480px', margin: '0 auto',
        animation: mounted ? 'pageEnter 0.6s ease forwards' : 'none',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(255,107,43,0.1)', border: '1px solid rgba(255,107,43,0.3)',
          borderRadius: '20px', padding: '0.3rem 0.9rem', marginBottom: '1.5rem',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--red)', animation: 'livePulse 1.5s infinite' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--orange)', letterSpacing: '0.2em' }}>FREE FIRE ESPORTS PLATFORM</span>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <GlitchText text="CLUTCH" size="clamp(2.5rem, 10vw, 4rem)" />
          <br />
          <GlitchText text="HUB" size="clamp(2.5rem, 10vw, 4rem)" />
        </div>

        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '1.1rem', fontWeight: 500,
          color: 'var(--text-dim)', marginBottom: '2rem', lineHeight: 1.6,
          maxWidth: '320px', margin: '0 auto 2rem',
        }}>
          India's most intense Free Fire tournament platform.
          <span style={{ color: 'var(--cyan)' }}> Compete. Dominate. Clutch.</span>
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
          <button onClick={() => router.push(isAuthenticated ? '/tournaments' : '/auth')} style={{
            background: 'linear-gradient(135deg, var(--orange), #cc4400)',
            color: '#fff', border: 'none', padding: '0.9rem 2rem',
            fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
            borderRadius: '4px', clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
            boxShadow: '0 0 30px var(--orange-glow)',
            transition: 'all 0.3s',
          }}>
            {isAuthenticated ? 'ENTER ARENA →' : 'JOIN FREE →'}
          </button>
          <button onClick={() => router.push('/tournaments')} style={{
            background: 'transparent', color: 'var(--cyan)',
            border: '1px solid var(--cyan)', padding: '0.9rem 2rem',
            fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
            borderRadius: '4px', clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
            boxShadow: '0 0 15px rgba(0,245,255,0.15)',
            transition: 'all 0.3s',
          }}>
            VIEW BATTLES
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '3rem' }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '1rem 0.5rem',
              position: 'relative', overflow: 'hidden',
              animation: mounted ? `pageEnter 0.4s ease ${0.2 + i * 0.1}s both` : 'none',
            }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900,
                color: s.color, textShadow: `0 0 15px ${s.color}`,
              }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '1.25rem 1rem',
              textAlign: 'left', position: 'relative', overflow: 'hidden',
              transition: 'all 0.3s',
              animation: mounted ? `pageEnter 0.4s ease ${0.4 + i * 0.1}s both` : 'none',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--orange)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--orange), transparent)', opacity: 0.5 }} />
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{f.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--orange)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>{f.title}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
