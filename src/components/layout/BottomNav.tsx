'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Users, MessageSquare, User } from 'lucide-react';

const NAV = [
  { path: '/',           icon: Home,          label: 'Home' },
  { path: '/tournaments',icon: Trophy,        label: 'Arena' },
  { path: '/my-teams',   icon: Users,         label: 'Squad' },
  { path: '/search',     icon: MessageSquare,  label: 'Messages' },
  { path: '/profile',    icon: User,           label: 'Profile' },
];

function active(pathname: string, path: string) {
  return path === '/' ? pathname === '/' : pathname.startsWith(path);
}

export default function Nav() {
  const pathname = usePathname();
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
            <Link
              key={path}
              href={path}
              prefetch={true}
              className={`sidebar-item${active(pathname, path) ? ' active' : ''}`}
            >
              <Icon size={18} className="sidebar-item-icon" />
              {label}
            </Link>
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
            <Link
              key={path}
              href={path}
              prefetch={true}
              className={`nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="nav-item-label">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
