'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTournament, registerTeam } from '@/lib/data';
import { useAuthStore } from '@/store/authStore';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useRoomCredentials } from '@/hooks/useRoomCredentials';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, Calendar, Users, Zap, Shield, Copy, Settings } from 'lucide-react';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  UPCOMING:  { label: 'Open',      cls: 'badge-green' },
  LIVE:      { label: 'Live',      cls: 'badge-red'   },
  COMPLETED: { label: 'Ended',     cls: 'badge-gray'  },
  CANCELLED: { label: 'Cancelled', cls: 'badge-gray'  },
  DRAFT:     { label: 'Draft',     cls: 'badge-gray'  },
};

export default function TournamentDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [tab,           setTab]           = useState<'info' | 'leaderboard' | 'rules'>('info');
  const [joining,       setJoining]       = useState(false);
  const [joinMsg,       setJoinMsg]       = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [teamName,      setTeamName]      = useState('');

  /* ── Fetch tournament ── */
  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', slug],
    queryFn: () => getTournament(slug),
  });

  const { leaderboard: entries } = useLeaderboard(tournament?.id);
  const roomCredentials = useRoomCredentials(tournament?.id);

  /* ── Join ── */
  const openJoin = () => {
    if (!isAuthenticated) { router.push('/auth'); return; }
    if (tournament?.format === 'SOLO') handleJoin(user?.displayName || 'Solo');
    else setShowJoinModal(true);
  };

  const handleJoin = async (name: string) => {
    if (!tournament) return;
    setJoining(true); setJoinMsg('');
    try {
      await registerTeam(tournament.id, name.trim() || user?.displayName || '');
      setJoinMsg('Registered successfully!');
      setShowJoinModal(false);
      queryClient.invalidateQueries({ queryKey: ['tournament', slug] });
    } catch (e: any) {
      setJoinMsg(e?.message || 'Registration failed.');
    } finally { setJoining(false); }
  };

  const isManager = !!user && !!tournament &&
    (user.id === tournament.organizerId || user.role === 'ORG_HOST' || user.role === 'SUPER_ADMIN');
  const canJoin = tournament?.status === 'UPCOMING'
    && (tournament.registeredTeams ?? 0) < (tournament.maxTeams ?? 0)
    && isAuthenticated;

  if (isLoading) return (
    <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spinner" />
    </div>
  );

  if (!tournament) return (
    <div className="page-wrapper">
      <div className="empty-state">
        <div className="empty-icon">🏆</div>
        <div className="empty-title">Tournament not found</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }} onClick={() => router.push('/tournaments')}>
          Back to Arena
        </button>
      </div>
    </div>
  );

  const bd     = STATUS_BADGE[tournament.status] ?? { label: tournament.status, cls: 'badge-gray' };
  const filled = Math.round(((tournament.registeredTeams ?? 0) / (tournament.maxTeams ?? 1)) * 100);

  return (
    <div className="page-wrapper">
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1.25rem' }} onClick={() => router.push('/tournaments')}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Banner / Hero */}
      <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
        {tournament.bannerUrl ? (
          <div style={{ height: 200, overflow: 'hidden' }}>
            <img src={tournament.bannerUrl} alt={tournament.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{ height: 140, background: 'linear-gradient(135deg, rgba(251,54,64,0.15) 0%, rgba(0,15,8,0) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={48} color="rgba(251,54,64,0.3)" />
          </div>
        )}
        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`badge ${bd.cls}`}>
                  {tournament.status === 'LIVE' && <span className="live-dot" style={{ width: 5, height: 5 }} />}
                  {bd.label}
                </span>
                <span className="badge badge-gray">{tournament.format}</span>
              </div>
              <h1 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.75rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>{tournament.name}</h1>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-2)' }}>by {tournament.organizerName || 'ClutchHub'}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              {isManager && (
                <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/tournaments/${slug}/host`)}>
                  <Settings size={15} /> Host Panel
                </button>
              )}
              {canJoin && (
                <button className="btn btn-primary btn-sm" onClick={openJoin} disabled={joining}>
                  {joining ? 'Joining…' : 'Join Now'}
                </button>
              )}
            </div>
          </div>
          {joinMsg && (
            <div style={{ marginTop: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: 8, background: joinMsg.includes('success') ? 'var(--green-dim)' : 'var(--red-dim)', border: `1px solid ${joinMsg.includes('success') ? 'rgba(0,232,117,0.25)' : 'rgba(251,54,64,0.25)'}`, fontSize: '0.825rem', color: joinMsg.includes('success') ? 'var(--green)' : 'var(--red)' }}>
              {joinMsg}
            </div>
          )}
        </div>
      </div>

      {/* Key stats */}
      <div className="info-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { icon: Trophy,   label: 'Prize Pool',  value: tournament.prizePool > 0 ? `₹${tournament.prizePool.toLocaleString('en-IN')}` : 'TBD',    color: 'var(--green)' },
          { icon: Zap,      label: 'Entry Fee',   value: tournament.entryFee > 0 ? `₹${tournament.entryFee}` : 'Free',                              color: 'var(--amber)' },
          { icon: Users,    label: 'Teams',       value: `${tournament.registeredTeams ?? 0} / ${tournament.maxTeams}`,                             color: 'var(--text)'  },
          { icon: Calendar, label: 'Date',        value: tournament.scheduledAt ? new Date(tournament.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA', color: 'var(--text)' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-hi)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color="var(--text-2)" />
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              <div style={{ fontWeight: 700, color, fontSize: '0.95rem' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Slots progress */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-2)' }}>Registration slots</span>
          <span style={{ fontWeight: 600 }}>{tournament.registeredTeams ?? 0} / {tournament.maxTeams} ({filled}%)</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${filled}%`, background: filled >= 100 ? 'linear-gradient(90deg,var(--amber),#FFD080)' : undefined }} />
        </div>
      </div>

      {/* Room credentials (if pushed) */}
      {roomCredentials && (
        <div className="cred-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Shield size={16} color="var(--green)" />
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--green)' }}>Room Credentials</span>
          </div>
          <div className="cred-row">
            <span className="cred-label">Room ID</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="cred-value">{roomCredentials.roomId}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigator.clipboard.writeText(roomCredentials.roomId)} title="Copy">
                <Copy size={13} />
              </button>
            </div>
          </div>
          <div className="cred-row">
            <span className="cred-label">Password</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="cred-value">{roomCredentials.roomPassword}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigator.clipboard.writeText(roomCredentials.roomPassword)} title="Copy">
                <Copy size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {(['info', 'leaderboard', 'rules'] as const).map(t => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'info' ? 'Info' : t === 'leaderboard' ? 'Leaderboard' : 'Rules'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'info' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          {tournament.description ? (
            <p style={{ color: 'var(--text-2)', lineHeight: 1.75, fontSize: '0.9rem' }}>{tournament.description}</p>
          ) : (
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>No description provided.</p>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {entries.length === 0 ? (
            <div className="empty-state" style={{ border: 'none' }}>
              <div className="empty-icon">📊</div>
              <div className="empty-title">No scores yet</div>
              <div className="empty-sub">Leaderboard will update once the match starts.</div>
            </div>
          ) : (
            <table className="lb-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>Kills</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.teamId} className="lb-row">
                    <td>
                      <span className={i === 0 ? 'lb-rank-1' : i === 1 ? 'lb-rank-2' : i === 2 ? 'lb-rank-3' : ''} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{e.teamName}</td>
                    <td style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{e.totalKills}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{e.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'rules' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          {tournament.rules ? (
            <pre style={{ color: 'var(--text-2)', lineHeight: 1.75, fontSize: '0.875rem', whiteSpace: 'pre-wrap', fontFamily: 'var(--font)' }}>{tournament.rules}</pre>
          ) : (
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>No rules specified.</p>
          )}
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Join Tournament</div>
            <div className="modal-sub">Enter a team name to register.</div>
            <label className="input-label">Team Name</label>
            <input
              className="input"
              placeholder="e.g. Storm Riders"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && teamName.trim()) handleJoin(teamName); }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button className="btn btn-ghost btn-full" onClick={() => setShowJoinModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={() => handleJoin(teamName)} disabled={joining || !teamName.trim()}>
                {joining ? 'Joining…' : 'Confirm Join'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
