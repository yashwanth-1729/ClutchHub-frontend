'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Trophy, Users, MessageCircle, User } from 'lucide-react';

const NAV = [
  { path: '/',           icon: Home,          label: 'Home' },
  { path: '/tournaments',icon: Trophy,         label: 'Arena' },
  { path: '/my-teams',   icon: Users,          label: 'Squad' },
  { path: '/search',     icon: MessageCircle,  label: 'Comms' },
  { path: '/profile',    icon: User,           label: 'Profile' },
];

function active(pathname: string, path: string) {
  return path === '/' ? pathname === '/' : pathname.startsWith(path);
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname?.startsWith('/auth')) return null;

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-name">Clutch<span>Hub</span></div>
          <div className="sidebar-logo-sub">Free Fire Esports</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ path, icon: Icon, label }) => (
            <button
              key={path}
              className={`sidebar-item${active(pathname, path) ? ' active' : ''}`}
              onClick={() => router.push(path)}
            >
              <Icon size={18} className="sidebar-item-icon" />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            v1.0 · Free Fire
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="bottom-nav">
        {NAV.map(({ path, icon: Icon, label }) => {
          const isActive = active(pathname, path);
          return (
            <button
              key={path}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => router.push(path)}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="nav-item-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
