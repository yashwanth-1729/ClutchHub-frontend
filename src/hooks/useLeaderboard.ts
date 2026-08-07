'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getLeaderboard } from '@/lib/data';
import { LeaderboardEntry } from '@/types';

/**
 * Live leaderboard via Supabase Realtime. Fetches the current standings, then
 * refetches whenever a `points` row for this tournament changes.
 */
export function useLeaderboard(tournamentId?: string) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const idRef = useRef(tournamentId);
  idRef.current = tournamentId;

  const refetch = useCallback(async () => {
    const id = idRef.current;
    if (!id) return;
    try { setLeaderboard(await getLeaderboard(id)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    refetch();

    const channel = supabase
      .channel(`lb:${tournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'points', filter: `tournament_id=eq.${tournamentId}` },
        () => refetch()
      )
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'));

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId, refetch]);

  return { leaderboard, connected, refetch };
}
