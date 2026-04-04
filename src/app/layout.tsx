import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import Nav from '@/components/layout/BottomNav';

export const metadata: Metadata = {
  title: 'ClutchHub — Free Fire Tournaments',
  description: 'Compete. Win. Dominate. India\'s premier Free Fire tournament platform.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'ClutchHub' },
};

export const viewport: Viewport = {
  themeColor: '#000F08',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Animated background orbs */}
        <div className="bg-orbs" aria-hidden="true">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>
        <Providers>
          <Nav />
          <main className="app-main">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
