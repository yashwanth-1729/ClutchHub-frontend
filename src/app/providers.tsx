'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { UserRole } from '@/types';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
  }));

  const { setAuth, setReady, logout } = useAuthStore();

  useEffect(() => {
    let active = true;

    const load = async (session: Session | null) => {
      if (!session) {
        if (active) { logout(); setReady(true); }
        return;
      }
      const { data: profile } = await supabase
        .from('users')
        .select('username, display_name, avatar_url, role')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!active) return;
      setAuth({
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: (profile?.role as UserRole) ?? 'PLAYER',
        username: profile?.username ?? undefined,
        displayName: profile?.display_name ?? undefined,
        avatarUrl: profile?.avatar_url ?? undefined,
        profileComplete: !!profile?.username,
      });
      setReady(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => load(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { logout(); setReady(true); return; }
      load(session);
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, [setAuth, setReady, logout]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
