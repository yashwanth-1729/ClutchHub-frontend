'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getCredentials } from '@/lib/data';

/**
 * Live room credentials via Supabase Realtime. Visible only to registered team
 * leaders and tournament managers (enforced by RLS on room_credentials).
 */
export function useRoomCredentials(tournamentId?: string) {
  const [credentials, setCredentials] = useState<{ roomId: string; roomPassword: string } | null>(null);
  const idRef = useRef(tournamentId);
  idRef.current = tournamentId;

  const refetch = useCallback(async () => {
    const id = idRef.current;
    if (!id) return;
    try { setCredentials(await getCredentials(id)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    refetch();

    const channel = supabase
      .channel(`creds:${tournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_credentials', filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          const row: any = payload.new;
          if (row && (row.room_id || row.room_password)) {
            setCredentials({ roomId: row.room_id, roomPassword: row.room_password });
          } else {
            refetch();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId, refetch]);

  return credentials;
}
