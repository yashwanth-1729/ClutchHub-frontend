'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const handle = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth'); return; }
      try {
        const res = await authApi.login(session.access_token);
        setAuth(res.data.data);
        router.replace(res.data.data.profileComplete ? '/tournaments' : '/auth/complete-profile');
      } catch { router.replace('/auth'); }
    };
    handle();
  }, [router, setAuth]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
      <div style={{ textAlign: 'center', animation: 'fadeUp 0.3s ease forwards' }}>
        <div className="spinner" style={{ margin: '0 auto 1.25rem' }} />
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>Signing you in…</p>
      </div>
    </div>
  );
}
