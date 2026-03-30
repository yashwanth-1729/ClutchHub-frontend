'use client';
import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { LeaderboardEntry } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://66.85.185.109/ws';

export function useLeaderboard(tournamentId: string) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!tournamentId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${WS_URL}/ws-clutchhub`),
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/leaderboard/${tournamentId}`, (msg) => {
          try {
            setLeaderboard(JSON.parse(msg.body));
          } catch {}
        });
      },
      onDisconnect: () => setConnected(false),
      reconnectDelay: 3000,
    });

    client.activate();
    clientRef.current = client;

    return () => { client.deactivate(); };
  }, [tournamentId]);

  return { leaderboard, connected };
}
