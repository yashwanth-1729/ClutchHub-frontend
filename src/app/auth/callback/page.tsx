'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getMyProfile } from '@/lib/data';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handle = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth'); return; }
      try {
        const profile = await getMyProfile();
        router.replace(profile?.profileComplete ? '/tournaments' : '/auth/complete-profile');
      } catch { router.replace('/tournaments'); }
    };
    handle();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
      <div style={{ textAlign: 'center', animation: 'fadeUp 0.3s ease forwards' }}>
        <div className="spinner" style={{ margin: '0 auto 1.25rem' }} />
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>Signing you in…</p>
      </div>
    </div>
  );
}
