'use client';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { path: '/', icon: '⌂', label: 'HOME' },
  { path: '/tournaments', icon: '#', label: 'ARENA' },
  { path: '/my-teams', icon: '@', label: 'SQUAD' },
  { path: '/search', icon: 'M', label: 'COMMS' },
  { path: '/profile', icon: 'P', label: 'PROFILE' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/auth' || pathname === '/auth/callback') return null;

  const isActive = (path: string) =>
    pathname === path || (path !== '/' && pathname.startsWith(path));

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <nav style={{
        display: 'none',
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '220px',
        background: 'rgba(3,3,8,0.97)', backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border)', zIndex: 50,
        flexDirection: 'column', padding: '2rem 0 1.5rem',
      }} className="desktop-sidebar">
        {/* Logo */}
        <div style={{ padding: '0 1.5rem 2rem' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900,
            color: 'var(--orange)', letterSpacing: '0.1em',
            textShadow: '0 0 15px var(--orange-glow)',
          }}>CLUTCH<span style={{ color: 'var(--cyan)' }}>HUB</span></div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.2em', marginTop: '2px' }}>ESPORTS PLATFORM</div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.75rem' }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button key={item.path} onClick={() => router.push(item.path)} style={{
                background: active ? 'rgba(255,107,43,0.1)' : 'transparent',
                border: active ? '1px solid rgba(255,107,43,0.3)' : '1px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '6px',
                transition: 'all 0.3s', width: '100%', textAlign: 'left',
              }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,107,43,0.05)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {active && (
                  <div style={{
                    position: 'absolute', left: 0, top: '25%', bottom: '25%', width: '3px',
                    background: 'var(--orange)', boxShadow: '0 0 8px var(--orange-glow)',
                    borderRadius: '0 2px 2px 0',
                  }} />
                )}
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 900,
                  color: active ? 'var(--orange)' : 'var(--text-dim)',
                  transition: 'color 0.3s',
                }}>{item.icon}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em',
                  color: active ? 'var(--orange)' : 'var(--text-dim)',
                  transition: 'color 0.3s',
                }}>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sidebar bottom decoration */}
        <div style={{ padding: '0 1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>v1.0.0 · FREE FIRE</div>
        </div>
      </nav>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(3,3,8,0.97)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)', zIndex: 50,
        padding: '0.5rem 0 0.75rem',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--orange), var(--cyan), var(--magenta), var(--orange), transparent)',
          backgroundSize: '300% 100%',
          animation: 'navLine 4s linear infinite',
        }} />
        <div style={{
          display: 'flex', maxWidth: '480px', margin: '0 auto',
          justifyContent: 'space-around', alignItems: 'center',
        }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button key={item.path} onClick={() => router.push(item.path)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                padding: '0.4rem 0.5rem', borderRadius: '6px',
                transition: 'all 0.3s', position: 'relative',
              }}>
                {active && (
                  <div style={{
                    position: 'absolute', top: '-1px', left: '20%', right: '20%', height: '2px',
                    background: 'var(--orange)', boxShadow: '0 0 10px var(--orange-glow)',
                    borderRadius: '0 0 2px 2px',
                  }} />
                )}
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.75rem', fontWeight: 900,
                  color: active ? 'var(--orange)' : 'var(--text-dim)',
                  transition: 'all 0.3s',
                  transform: active ? 'scale(1.2)' : 'scale(1)',
                  textShadow: active ? '0 0 10px var(--orange-glow)' : 'none',
                }}>{item.icon}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
                  letterSpacing: '0.1em',
                  color: active ? 'var(--orange)' : 'var(--text-dim)',
                  transition: 'color 0.3s',
                }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
