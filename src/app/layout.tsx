import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import BottomNav from '@/components/layout/BottomNav';

export const metadata: Metadata = {
  title: 'ClutchHub - Free Fire Tournaments',
  description: 'Compete. Win. Dominate. The ultimate Free Fire tournament platform.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'ClutchHub' },
};

export const viewport: Viewport = {
  themeColor: '#030308',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <BottomNav />
          <main className="main-content">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
