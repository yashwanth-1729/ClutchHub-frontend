'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  getTournament, getTeamsByTournament, listHosts, pushCredentials,
  submitSimplePoints, submitDetailedPoints, searchUsers, assignHost, removeHost,
  generateCertificates,
} from '@/lib/data';
import { ArrowLeft, Send, Plus, Minus, Users, Trophy, Shield, Search, Check, Trash2, AlertCircle, Award } from 'lucide-react';

export default function HostPanelPage({ params }: { params: { slug: string } }) {
  const { slug }   = params;
  const router     = useRouter();
  const { user, isAuthenticated, ready } = useAuthStore();

  const [tournament,    setTournament]  = useState<any>(null);
  const [teams,         setTeams]       = useState<any[]>([]);
  const [hosts,         setHosts]       = useState<any[]>([]);
  const [loading,       setLoading]     = useState(true);
  const [activeSection, setSection]     = useState<'creds' | 'points' | 'hosts' | 'certs'>('creds');

  // Credentials
  const [roomId,       setRoomId]       = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [credMsg,      setCredMsg]      = useState('');
  const [credSending,  setCredSending]  = useState(false);

  // Points
  const [pointsMode,  setPointsMode]  = useState<'simple' | 'detailed'>('simple');
  const [matchNumber, setMatchNumber] = useState(1);
  const [pointsData,  setPointsData]  = useState<Record<string, { kills: number; placement: number; totalPoints: number }>>({});
  const [pointsMsg,   setPointsMsg]   = useState('');
  const [submittingFor, setSubmittingFor] = useState<string | null>(null);

  // Hosts
  const [hostSearch,   setHostSearch]   = useState('');
  const [hostResults,  setHostResults]  = useState<any[]>([]);
  const [hostMsg,      setHostMsg]      = useState('');

  // Certificates
  const [topN,        setTopN]        = useState(3);
  const [certMsg,     setCertMsg]     = useState('');
  const [certBusy,    setCertBusy]    = useState(false);

  const isOrganizer = !!user && !!tournament && (user.id === tournament.organizerId || user.role === 'SUPER_ADMIN');
  const allowed = !!user && !!tournament &&
    (user.id === tournament.organizerId || user.role === 'ORG_HOST' || user.role === 'SUPER_ADMIN');

  useEffect(() => {
    if (ready && !isAuthenticated) { router.push('/auth'); return; }
    if (!isAuthenticated) return;
    getTournament(slug)
      .then((t) => {
        setTournament(t);
        if (t?.id) {
          getTeamsByTournament(t.id).then(setTeams).catch(() => {});
          const organizer = !!user && (user.id === t.organizerId || user.role === 'SUPER_ADMIN');
          if (organizer) listHosts(t.id).then((h) => setHosts(h as any[])).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, isAuthenticated, slug, router, user]);

  const pushCreds = async () => {
    if (!roomId || !roomPassword || !tournament?.id) return;
    setCredSending(true); setCredMsg('');
    try {
      await pushCredentials(tournament.id, roomId, roomPassword);
      setCredMsg('Credentials broadcast to all players!');
    } catch (e: any) { setCredMsg(e?.message || 'Failed to push credentials.'); }
    finally { setCredSending(false); }
  };

  const submitPoints = async (teamId: string, teamName: string) => {
    const d = pointsData[teamId] ?? { kills: 0, placement: 1, totalPoints: 0 };
    setSubmittingFor(teamId); setPointsMsg('');
    try {
      if (pointsMode === 'simple') {
        await submitSimplePoints(tournament.id, teamId, matchNumber, d.totalPoints);
      } else {
        await submitDetailedPoints(tournament.id, teamId, matchNumber, d.kills, d.placement);
      }
      setPointsMsg(`Points saved for ${teamName}`);
    } catch (e: any) { setPointsMsg(e?.message || 'Failed to save points.'); }
    finally { setSubmittingFor(null); }
  };

  const searchHosts = async (q: string) => {
    setHostSearch(q);
    if (q.trim().length < 2) { setHostResults([]); return; }
    try { setHostResults(await searchUsers(q)); } catch { setHostResults([]); }
  };

  const doAssignHost = async (userId: string) => {
    if (!tournament?.id) return;
    setHostMsg('');
    try {
      await assignHost(tournament.id, userId);
      setHostMsg('Host assigned successfully.');
      listHosts(tournament.id).then((h) => setHosts(h as any[])).catch(() => {});
      setHostSearch(''); setHostResults([]);
    } catch (e: any) { setHostMsg(e?.message || 'Failed to assign host.'); }
  };

  const doRemoveHost = async (id: string) => {
    try {
      await removeHost(id);
      setHosts(h => h.filter(x => x.id !== id));
    } catch { /* ignore */ }
  };

  const genCerts = async () => {
    if (!tournament?.id) return;
    setCertBusy(true); setCertMsg('');
    try {
      const res: any = await generateCertificates(tournament.id, topN);
      setCertMsg(`Generated ${res?.generated ?? 0} certificate(s).`);
    } catch (e: any) { setCertMsg(e?.message || 'Failed to generate certificates.'); }
    finally { setCertBusy(false); }
  };

  if (loading) return (
    <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spinner" />
    </div>
  );

  if (!allowed) return (
    <div className="page-wrapper">
      <div className="empty-state">
        <AlertCircle size={40} color="var(--red)" style={{ marginBottom: '0.75rem', opacity: 0.7 }} />
        <div className="empty-title">Access Denied</div>
        <div className="empty-sub">Host or Organizer access required.</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }} onClick={() => router.back()}>Go Back</button>
      </div>
    </div>
  );

  const sections = [
    { key: 'creds',  label: 'Room Creds', icon: Shield },
    { key: 'points', label: 'Points',     icon: Trophy },
    ...(isOrganizer ? [{ key: 'certs', label: 'Certificates', icon: Award }] : []),
    ...(isOrganizer ? [{ key: 'hosts', label: 'Hosts', icon: Users }] : []),
  ];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1.25rem' }} onClick={() => router.push(`/tournaments/${slug}`)}>
        <ArrowLeft size={16} /> Back to Tournament
      </button>
      <div className="page-header">
        <h1 className="page-title">Host Panel</h1>
        <p className="page-sub">{tournament?.name}</p>
      </div>

      {/* Section tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.75rem' }}>
        {sections.map(({ key, label, icon: Icon }) => (
          <button key={key} className={`tab${activeSection === key ? ' active' : ''}`} onClick={() => setSection(key as any)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Room Credentials ── */}
      {activeSection === 'creds' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Push Room Credentials</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-2)' }}>All registered players will receive these in real time.</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="input-label">Room ID</label>
              <input className="input" placeholder="e.g. 1234567" value={roomId} onChange={e => setRoomId(e.target.value)} />
            </div>
            <div>
              <label className="input-label">Room Password</label>
              <input className="input" placeholder="e.g. clutch2024" value={roomPassword} onChange={e => setRoomPassword(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={pushCreds} disabled={credSending || !roomId || !roomPassword}>
            {credSending ? 'Pushing…' : <><Send size={15} /> Broadcast Credentials</>}
          </button>
          {credMsg && (
            <div style={{ marginTop: '0.875rem', fontSize: '0.825rem', color: credMsg.includes('!') ? 'var(--green)' : 'var(--red)' }}>{credMsg}</div>
          )}
        </div>
      )}

      {/* ── Points Entry ── */}
      {activeSection === 'points' && (
        <div>
          {/* Controls */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label className="input-label">Match #</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setMatchNumber(m => Math.max(1, m - 1))}><Minus size={14} /></button>
                  <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{matchNumber}</span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setMatchNumber(m => m + 1)}><Plus size={14} /></button>
                </div>
              </div>
              <div>
                <label className="input-label">Entry Mode</label>
                <div className="tab-bar" style={{ width: 'auto' }}>
                  <button className={`tab${pointsMode === 'simple' ? ' active' : ''}`} onClick={() => setPointsMode('simple')}>Simple</button>
                  <button className={`tab${pointsMode === 'detailed' ? ' active' : ''}`} onClick={() => setPointsMode('detailed')}>Detailed</button>
                </div>
              </div>
            </div>
          </div>

          {pointsMsg && (
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, background: pointsMsg.includes('Failed') ? 'var(--red-dim)' : 'var(--green-dim)', border: `1px solid ${pointsMsg.includes('Failed') ? 'rgba(251,54,64,0.25)' : 'rgba(0,232,117,0.25)'}`, fontSize: '0.825rem', color: pointsMsg.includes('Failed') ? 'var(--red)' : 'var(--green)', marginBottom: '0.875rem' }}>
              {pointsMsg}
            </div>
          )}

          {teams.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <div className="empty-title">No teams registered</div>
              <div className="empty-sub">Teams will appear here once registered.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {teams.map((team: any) => {
                const d = pointsData[team.id] ?? { kills: 0, placement: 1, totalPoints: 0 };
                const set = (k: string, v: number) => setPointsData(p => ({ ...p, [team.id]: { ...d, [k]: v } }));
                return (
                  <div key={team.id} className="card" style={{ padding: '1.125rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{team.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {pointsMode === 'detailed' ? (
                          <>
                            <div>
                              <label className="input-label" style={{ marginBottom: 2 }}>Kills</label>
                              <input type="number" className="input" style={{ width: 80 }} min={0} value={d.kills} onChange={e => set('kills', +e.target.value)} />
                            </div>
                            <div>
                              <label className="input-label" style={{ marginBottom: 2 }}>Placement</label>
                              <input type="number" className="input" style={{ width: 80 }} min={1} value={d.placement} onChange={e => set('placement', +e.target.value)} />
                            </div>
                          </>
                        ) : (
                          <div>
                            <label className="input-label" style={{ marginBottom: 2 }}>Total Points</label>
                            <input type="number" className="input" style={{ width: 100 }} min={0} value={d.totalPoints} onChange={e => set('totalPoints', +e.target.value)} />
                          </div>
                        )}
                        <div style={{ alignSelf: 'flex-end' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => submitPoints(team.id, team.name)} disabled={submittingFor === team.id}>
                            {submittingFor === team.id ? '…' : <><Check size={14} /> Save</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Certificates ── */}
      {activeSection === 'certs' && isOrganizer && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Generate Certificates</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-2)' }}>Creates a PDF certificate for every player in the top teams. Enter match points first.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <label className="input-label">Top N teams</label>
              <input type="number" className="input" style={{ width: 100 }} min={1} max={25} value={topN} onChange={e => setTopN(Math.max(1, +e.target.value))} />
            </div>
            <button className="btn btn-primary" onClick={genCerts} disabled={certBusy}>
              {certBusy ? 'Generating…' : <><Award size={15} /> Generate</>}
            </button>
          </div>
          {certMsg && (
            <div style={{ marginTop: '0.875rem', fontSize: '0.825rem', color: certMsg.includes('Failed') ? 'var(--red)' : 'var(--green)' }}>{certMsg}</div>
          )}
        </div>
      )}

      {/* ── Manage Hosts ── */}
      {activeSection === 'hosts' && isOrganizer && (
        <div>
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Assign Host</div>
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
              <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search by username…" value={hostSearch} onChange={e => searchHosts(e.target.value)} />
            </div>
            {hostResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {hostResults.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', background: 'var(--surface)', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.displayName || u.username}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>@{u.username} · {u.role}</div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => doAssignHost(u.id)}>
                      <Plus size={14} /> Assign
                    </button>
                  </div>
                ))}
              </div>
            )}
            {hostMsg && <div style={{ marginTop: '0.75rem', fontSize: '0.825rem', color: hostMsg.includes('success') ? 'var(--green)' : 'var(--red)' }}>{hostMsg}</div>}
          </div>

          {/* Current hosts */}
          <div className="section-hd"><div className="section-title">Current Hosts</div></div>
          {hosts.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-title">No hosts assigned</div>
              <div className="empty-sub">Search above to assign a host.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {hosts.map((h: any) => (
                <div key={h.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{h.displayName || h.username}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>@{h.username}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => doRemoveHost(h.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
