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
        if (res.data.data.profileComplete) router.replace('/tournaments');
        else router.replace('/auth/complete-profile');
      } catch {
        router.replace('/auth');
      }
    };
    handle();
  }, [router, setAuth]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center animate-fade-up">
        <div className="w-12 h-12 border-2 border-[#ff6b2b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#888]">Signing you in...</p>
      </div>
    </main>
  );
}
