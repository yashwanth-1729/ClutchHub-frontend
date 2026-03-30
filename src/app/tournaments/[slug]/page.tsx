'use client';
import { useQuery } from '@tanstack/react-query';
import { tournamentApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Tournament, ApiResponse, LeaderboardEntry } from '@/types';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TournamentDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'leaderboard' | 'rules'>('info');
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState('');

  useEffect(() => { setMounted(true); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['tournament', slug],
    queryFn: async () => {
      const res = await tournamentApi.get(slug);
      return res.data as ApiResponse<Tournament>;
    },
  });

  const { data: lbData } = useQuery({
    queryKey: ['leaderboard', data?.data?.id],
    queryFn: async () => {
      const res = await tournamentApi.leaderboard(data!.data!.id);
      return res.data as ApiResponse<LeaderboardEntry[]>;
    },
    enabled: !!data?.data?.id,
    refetchInterval: 10000,
  });

  const tournament = data?.data;
  const entries = lbData?.data || [];

  const statusColors: Record<string, string> = {
    UPCOMING: 'var(--cyan)', LIVE: 'var(--red)', COMPLETED: 'var(--text-dim)',
  };

  const handleJoin = async () => {
    if (!isAuthenticated) { router.push('/auth'); return; }
    setJoining(true);
    setJoinMsg('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ tournamentId: tournament?.id, name: `${user?.displayName}'s Team` }),
      });
      const json = await res.json();
      if (res.ok) setJoinMsg('✓ Successfully registered!');
      else setJoinMsg(`⚠ ${json.message || 'Failed to join'}`);
    } catch { setJoinMsg('⚠ Could not connect to server'); }
    setJoining(false);
  };

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '48px', height: '48px', border: '2px solid var(--border)', borderTopColor: 'var(--orange)', borderRightColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!tournament) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', opacity: 0.2 }}>◈</div>
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>TOURNAMENT NOT FOUND</div>
      <button onClick={() => router.push('/tournaments')} style={{ background: 'var(--orange)', color: '#fff', border: 'none', padding: '0.5rem 1.5rem', fontFamily: 'var(--font-display)', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '4px' }}>← BACK TO ARENA</button>
    </div>
  );

  const slotsUsed = tournament.registeredTeams || 0;
  const slotsTotal = tournament.maxTeams || 20;
  const slotsPct = Math.min(100, (slotsUsed / slotsTotal) * 100);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', animation: mounted ? 'pageEnter 0.4s ease forwards' : 'none' }}>
      {/* Header */}
      <div style={{ background: 'rgba(3,3,8,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '1rem', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => router.push('/tournaments')} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text-dim)', width: '32px', height: '32px', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>‹</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800, color: 'var(--orange)', letterSpacing: '0.05em', textShadow: '0 0 10px var(--orange-glow)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tournament.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: statusColors[(tournament.status as string)] || 'var(--text-dim)', animation: (tournament.status as string) === 'LIVE' ? 'livePulse 1.5s infinite' : 'none' }}>
                {(tournament.status as string) === 'LIVE' ? '● LIVE' : (tournament.status as string) === 'UPCOMING' ? '◈ UPCOMING' : '◉ ENDED'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)' }}>BY {tournament.organizerName}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1rem' }}>
        {/* Prize/Stats banner */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, var(--orange), var(--gold), var(--orange))', backgroundSize: '200% 100%', animation: 'navLine 2s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,43,0.05) 0%, transparent 60%)' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--gold), var(--orange))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ₹{tournament.prizePool?.toLocaleString() || '0'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>PRIZE POOL</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, color: 'var(--cyan)', textShadow: '0 0 15px var(--cyan-glow)' }}>
                {tournament.entryFee === 0 ? 'FREE' : `₹${tournament.entryFee}`}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>ENTRY FEE</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, color: 'var(--orange)', textShadow: '0 0 15px var(--orange-glow)' }}>{tournament.format}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>FORMAT</div>
            </div>
          </div>

          {/* Slots bar */}
          <div style={{ marginTop: '1rem', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>SLOTS FILLED</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: slotsPct >= 90 ? 'var(--red)' : 'var(--orange)' }}>{slotsUsed}/{slotsTotal}</span>
            </div>
            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: `${slotsPct}%`, background: slotsPct >= 90 ? 'linear-gradient(90deg, var(--orange), var(--red))' : 'linear-gradient(90deg, var(--orange), var(--gold))', borderRadius: '2px', boxShadow: '0 0 8px var(--orange-glow)', transition: 'width 1s ease' }} />
            </div>
          </div>

          {/* Date */}
          {tournament.scheduledAt && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', zIndex: 1 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>📅</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text)' }}>
                {new Date(tournament.scheduledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Join button */}
        {(tournament.status as string) === 'UPCOMING' && (
          <div style={{ marginBottom: '1rem' }}>
            <button onClick={handleJoin} disabled={joining} style={{
              width: '100%', padding: '0.9rem',
              background: joining ? 'rgba(255,107,43,0.3)' : 'linear-gradient(135deg, var(--orange), #cc4400)',
              color: '#fff', border: 'none', cursor: joining ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700,
              letterSpacing: '0.15em', borderRadius: '4px',
              clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
              boxShadow: joining ? 'none' : '0 0 25px var(--orange-glow)',
              transition: 'all 0.3s',
            }}>
              {joining ? 'REGISTERING...' : '⚡ JOIN BATTLE'}
            </button>
            {joinMsg && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: joinMsg.startsWith('✓') ? 'rgba(0,255,136,0.1)' : 'rgba(255,34,68,0.1)', border: `1px solid ${joinMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)'}`, borderRadius: '4px', color: joinMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', textAlign: 'center' }}>
                {joinMsg}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px', marginBottom: '1rem' }}>
          {(['info', 'leaderboard', 'rules'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '0.5rem', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: '4px',
              background: activeTab === tab ? 'var(--orange)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text-dim)',
              boxShadow: activeTab === tab ? '0 0 12px var(--orange-glow)' : 'none',
              transition: 'all 0.3s',
            }}>{tab}</button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'info' && (
          <div style={{ animation: 'pageEnter 0.3s ease forwards' }}>
            {tournament.description && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', marginBottom: '0.75rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>// ABOUT</div>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', lineHeight: 1.6 }}>{tournament.description}</p>
              </div>
            )}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>// BATTLE INFO</div>
              {[
                { label: 'GAME', value: tournament.game?.replace('_', ' ') || 'FREE FIRE' },
                { label: 'FORMAT', value: tournament.format },
                { label: 'MAX TEAMS', value: tournament.maxTeams?.toString() },
                { label: 'ORGANIZER', value: tournament.organizerName },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{item.label}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div style={{ animation: 'pageEnter 0.3s ease forwards' }}>
            {entries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', opacity: 0.2, marginBottom: '0.75rem' }}>◈</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>NO SCORES YET</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--border2)', marginTop: '0.5rem' }}>Leaderboard updates live during battle</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {entries.map((entry: any, i: number) => (
                  <div key={i} style={{
                    background: 'var(--surface)', border: `1px solid ${i === 0 ? 'rgba(245,200,66,0.3)' : i === 1 ? 'rgba(192,192,192,0.2)' : i === 2 ? 'rgba(205,127,50,0.2)' : 'var(--border)'}`,
                    borderRadius: '6px', padding: '0.875rem 1rem',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    transition: 'all 0.3s',
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, minWidth: '28px', textAlign: 'center', color: i === 0 ? 'var(--gold)' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text-dim)', textShadow: i < 3 ? `0 0 10px currentColor` : 'none' }}>#{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{entry.teamName}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{entry.kills || 0} KILLS</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--orange)', textShadow: '0 0 10px var(--orange-glow)' }}>{entry.totalPoints || 0}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'rules' && (
          <div style={{ animation: 'pageEnter 0.3s ease forwards', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>// RULES & REGULATIONS</div>
            {tournament.rules ? (
              <pre style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-dim)', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{tournament.rules}</pre>
            ) : (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>No rules specified yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


