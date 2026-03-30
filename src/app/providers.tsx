'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
  }));

  const { setAuth, logout, isAuthenticated, accessToken } = useAuthStore();

  useEffect(() => {
    // Restore session on page load
    if (isAuthenticated && accessToken) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetch(process.env.NEXT_PUBLIC_API_URL + '/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firebaseIdToken: session.access_token }),
        }).then(r => r.json()).then(json => {
          if (json.data) setAuth(json.data);
        }).catch(() => {});
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') logout();
    });

    return () => subscription.unsubscribe();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
