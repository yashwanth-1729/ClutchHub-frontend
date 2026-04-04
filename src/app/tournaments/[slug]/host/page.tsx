'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { credentialsApi, pointsApi, orgHostApi, userApi } from '@/lib/api';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function HostPanelPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Tournament + teams data
  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Credentials panel
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [credMsg, setCredMsg] = useState('');
  const [credLoading, setCredLoading] = useState(false);

  // Points panel
  const [pointsMode, setPointsMode] = useState<'simple' | 'detailed'>('simple');
  const [matchNumber, setMatchNumber] = useState(1);
  const [pointsData, setPointsData] = useState<Record<string, { kills: number; placement: number; totalPoints: number }>>({});
  const [pointsMsg, setPointsMsg] = useState('');
  const [pointsLoading, setPointsLoading] = useState(false);

  // Host assignment
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [hostMsg, setHostMsg] = useState('');

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) { router.push('/auth'); return; }
    loadData();
  }, [isAuthenticated, slug]);

  const loadData = async () => {
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [tRes, teamsRes] = await Promise.all([
        axios.get(`${API}/tournaments/${slug}`, { headers }),
        axios.get(`${API}/tournaments/${slug}`, { headers }),
      ]);
      const t = tRes.data?.data;
      setTournament(t);

      if (t?.id) {
        const teamsR = await axios.get(`${API}/teams`, { params: { tournamentId: t.id }, headers }).catch(() => ({ data: { data: [] } }));
        const confirmedTeams = (teamsR.data?.data || []);
        setTeams(confirmedTeams);

        // Initialize points data
        const init: Record<string, any> = {};
        confirmedTeams.forEach((team: any) => {
          init[team.id] = { kills: 0, placement: 1, totalPoints: 0 };
        });
        setPointsData(init);

        // Load current hosts
        const hostsRes = await orgHostApi.list(t.id).catch(() => ({ data: { data: [] } }));
        setHosts(hostsRes.data?.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Gate: only ORGANIZER who created this tournament or ORG_HOST assigned to it
  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'SUPER_ADMIN';
  const isHostRole = user?.role === 'ORG_HOST';
  const canAccess = isOrganizer || isHostRole;

  const handlePushCredentials = async () => {
    if (!roomId.trim() || !roomPassword.trim()) { setCredMsg('⚠ Enter both Room ID and Password'); return; }
    setCredLoading(true);
    setCredMsg('');
    try {
      await credentialsApi.push(tournament.id, roomId.trim(), roomPassword.trim());
      setCredMsg('✓ Room credentials pushed to all players!');
    } catch (e: any) {
      setCredMsg(`⚠ ${e.response?.data?.message || 'Failed to push credentials'}`);
    }
    setCredLoading(false);
  };

  const handleSubmitPoints = async () => {
    setPointsLoading(true);
    setPointsMsg('');
    let errors = 0;
    for (const team of teams) {
      const d = pointsData[team.id];
      if (!d) continue;
      try {
        if (pointsMode === 'simple') {
          await pointsApi.submitSimple(tournament.id, team.id, matchNumber, d.totalPoints);
        } else {
          await pointsApi.submitDetailed(tournament.id, team.id, matchNumber, d.kills, d.placement);
        }
      } catch {
        errors++;
      }
    }
    setPointsMsg(errors === 0 ? `✓ Match ${matchNumber} points saved! Leaderboard updated.` : `⚠ ${errors} team(s) failed to save.`);
    setPointsLoading(false);
  };

  const handleSearchHosts = async () => {
    if (!searchQ.trim()) return;
    try {
      const res = await userApi.search(searchQ);
      setSearchResults(res.data?.data || []);
    } catch {}
  };

  const handleAssignHost = async (userId: string) => {
    setHostMsg('');
    try {
      await orgHostApi.assign(tournament.id, userId);
      setHostMsg('✓ Host assigned!');
      const hostsRes = await orgHostApi.list(tournament.id);
      setHosts(hostsRes.data?.data || []);
      setSearchResults([]);
      setSearchQ('');
    } catch (e: any) {
      setHostMsg(`⚠ ${e.response?.data?.message || 'Failed to assign host'}`);
    }
  };

  const handleRemoveHost = async (hostId: string) => {
    try {
      await orgHostApi.remove(hostId);
      setHosts(prev => prev.filter(h => h.id !== hostId));
    } catch {}
  };

  if (!mounted) return null;

  if (!canAccess) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', opacity: 0.2 }}>◈</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--red)', letterSpacing: '0.1em' }}>ACCESS DENIED</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)' }}>Host panel is for organizers and assigned hosts only.</div>
        <button onClick={() => router.push(`/tournaments/${slug}`)} style={{ background: 'transparent', border: '1px solid var(--orange)', color: 'var(--orange)', padding: '0.5rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', cursor: 'pointer', borderRadius: '4px' }}>← BACK</button>
      </div>
    );
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '2px solid var(--border)', borderTopColor: 'var(--orange)', borderRightColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  const sectionStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1rem', position: 'relative' as const, overflow: 'hidden' as const };
  const labelStyle = { fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: '0.75rem', display: 'block' as const };
  const inputStyle = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.65rem 0.75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', animation: mounted ? 'pageEnter 0.4s ease forwards' : 'none' }}>
      {/* Header */}
      <div style={{ background: 'rgba(3,3,8,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '1rem', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => router.push(`/tournaments/${slug}`)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text-dim)', width: '32px', height: '32px', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>‹</button>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800, color: 'var(--orange)', letterSpacing: '0.05em' }}>{tournament?.name || 'HOST PANEL'}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>⚙ HOST CONTROL</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '1rem' }}>

        {/* ── ROOM CREDENTIALS ── */}
        <div style={sectionStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--orange), transparent)' }} />
          <span style={labelStyle}>// PUSH ROOM CREDENTIALS</span>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', display: 'block', marginBottom: '0.3rem' }}>ROOM ID</label>
            <input style={inputStyle} value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="e.g. 8472910" />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', display: 'block', marginBottom: '0.3rem' }}>ROOM PASSWORD</label>
            <input style={inputStyle} value={roomPassword} onChange={e => setRoomPassword(e.target.value)} placeholder="e.g. FF2024" />
          </div>
          <button onClick={handlePushCredentials} disabled={credLoading} style={{ width: '100%', padding: '0.75rem', background: credLoading ? 'rgba(255,107,43,0.3)' : 'linear-gradient(135deg, var(--orange), #cc4400)', border: 'none', color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', cursor: credLoading ? 'not-allowed' : 'pointer', borderRadius: '4px', boxShadow: credLoading ? 'none' : '0 0 15px var(--orange-glow)' }}>
            {credLoading ? 'PUSHING...' : '📡 PUSH TO ALL PLAYERS'}
          </button>
          {credMsg && <div style={{ marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: credMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', textAlign: 'center' }}>{credMsg}</div>}
        </div>

        {/* ── MATCH POINTS ── */}
        <div style={sectionStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)' }} />
          <span style={labelStyle}>// MATCH POINTS ENTRY</span>

          {/* Match number + mode toggle */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', display: 'block', marginBottom: '0.3rem' }}>MATCH #</label>
              <input type="number" min={1} value={matchNumber} onChange={e => setMatchNumber(Number(e.target.value))} style={{ ...inputStyle, width: '80px' }} />
            </div>
            <div style={{ display: 'flex', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
              {(['simple', 'detailed'] as const).map(m => (
                <button key={m} onClick={() => setPointsMode(m)} style={{ padding: '0.5rem 0.75rem', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, background: pointsMode === m ? 'var(--orange)' : 'transparent', color: pointsMode === m ? '#fff' : 'var(--text-dim)', transition: 'all 0.2s' }}>{m}</button>
              ))}
            </div>
          </div>

          {/* Teams table */}
          {teams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)' }}>No registered teams yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: pointsMode === 'simple' ? '1fr 100px' : '1fr 70px 70px', gap: '0.5rem', padding: '0 0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>TEAM</span>
                {pointsMode === 'simple' ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textAlign: 'center' }}>TOTAL PTS</span>
                ) : (
                  <>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textAlign: 'center' }}>KILLS</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textAlign: 'center' }}>PLACE</span>
                  </>
                )}
              </div>
              {teams.map(team => {
                const d = pointsData[team.id] || { kills: 0, placement: 1, totalPoints: 0 };
                return (
                  <div key={team.id} style={{ display: 'grid', gridTemplateColumns: pointsMode === 'simple' ? '1fr 100px' : '1fr 70px 70px', gap: '0.5rem', alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.5rem' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name || team.teamName}</span>
                    {pointsMode === 'simple' ? (
                      <input type="number" min={0} value={d.totalPoints} onChange={e => setPointsData(prev => ({ ...prev, [team.id]: { ...prev[team.id], totalPoints: Number(e.target.value) } }))} style={{ ...inputStyle, padding: '0.4rem 0.5rem', textAlign: 'center', width: '100%' }} />
                    ) : (
                      <>
                        <input type="number" min={0} value={d.kills} onChange={e => setPointsData(prev => ({ ...prev, [team.id]: { ...prev[team.id], kills: Number(e.target.value) } }))} style={{ ...inputStyle, padding: '0.4rem 0.5rem', textAlign: 'center', width: '100%' }} />
                        <input type="number" min={1} max={25} value={d.placement} onChange={e => setPointsData(prev => ({ ...prev, [team.id]: { ...prev[team.id], placement: Number(e.target.value) } }))} style={{ ...inputStyle, padding: '0.4rem 0.5rem', textAlign: 'center', width: '100%' }} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={handleSubmitPoints} disabled={pointsLoading || teams.length === 0} style={{ width: '100%', padding: '0.75rem', background: (pointsLoading || teams.length === 0) ? 'rgba(0,245,255,0.15)' : 'linear-gradient(135deg, #006688, #00a0cc)', border: 'none', color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', cursor: (pointsLoading || teams.length === 0) ? 'not-allowed' : 'pointer', borderRadius: '4px', boxShadow: pointsLoading ? 'none' : '0 0 15px rgba(0,245,255,0.2)' }}>
            {pointsLoading ? 'SAVING...' : `✓ SUBMIT MATCH ${matchNumber} POINTS`}
          </button>
          {pointsMsg && <div style={{ marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: pointsMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', textAlign: 'center' }}>{pointsMsg}</div>}
        </div>

        {/* ── HOST ASSIGNMENT (Organizer only) ── */}
        {isOrganizer && (
          <div style={sectionStyle}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--magenta, #ff00aa), transparent)' }} />
            <span style={labelStyle}>// MANAGE HOSTS</span>

            {/* Current hosts */}
            {hosts.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>ASSIGNED HOSTS</div>
                {hosts.map(h => (
                  <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '0.4rem' }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{h.displayName || h.username}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', marginLeft: '0.5rem' }}>@{h.username}</span>
                    </div>
                    <button onClick={() => handleRemoveHost(h.id)} style={{ background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', padding: '0.25rem 0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', cursor: 'pointer', borderRadius: '4px' }}>REMOVE</button>
                  </div>
                ))}
              </div>
            )}

            {/* Search + assign */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input style={{ ...inputStyle, flex: 1 }} value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search username..." onKeyDown={e => e.key === 'Enter' && handleSearchHosts()} />
              <button onClick={handleSearchHosts} style={{ padding: '0 1rem', background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', cursor: 'pointer', borderRadius: '4px', whiteSpace: 'nowrap' }}>SEARCH</button>
            </div>
            {searchResults.length > 0 && (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                {searchResults.map((u: any) => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--text)' }}>{u.displayName || u.username}</span>
                    <button onClick={() => handleAssignHost(u.id)} style={{ background: 'var(--orange)', border: 'none', color: '#fff', padding: '0.25rem 0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', cursor: 'pointer', borderRadius: '4px' }}>ASSIGN</button>
                  </div>
                ))}
              </div>
            )}
            {hostMsg && <div style={{ marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: hostMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', textAlign: 'center' }}>{hostMsg}</div>}
          </div>
        )}

      </div>
    </div>
  );
}
