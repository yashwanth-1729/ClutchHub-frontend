'use client';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { path: '/', icon: 'H', label: 'HOME' },
  { path: '/tournaments', icon: '#', label: 'ARENA' },
  { path: '/my-teams', icon: '@', label: 'SQUAD' },
  { path: '/search', icon: 'M', label: 'COMMS' },
  { path: '/profile', icon: 'P', label: 'PROFILE' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/auth' || pathname === '/auth/callback') return null;

  return (
    <nav style={{
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
          const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
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
  );
}
