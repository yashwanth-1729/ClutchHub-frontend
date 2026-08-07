'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { getMyProfile, getAchievements, updateProfile } from '@/lib/data';
import { Edit2, LogOut, Download, Check, X } from 'lucide-react';

const GAME_ROLES = ['SNIPER', 'RUSHER', 'NADER', 'ASSAULTER', 'SECONDARY RUSHER', 'SUPPORT'];
const GENDERS    = ['MALE', 'FEMALE', 'OTHER'];

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, ready, logout, setUser } = useAuthStore();
  const [editing,      setEditing]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [msg,          setMsg]          = useState('');
  const [profile,      setProfile]      = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [form, setForm] = useState({ username: '', gameUid: '', gender: '', gameRole: '', bio: '' });

  useEffect(() => {
    if (ready && !isAuthenticated) { router.push('/auth'); return; }
    if (!isAuthenticated) return;
    getMyProfile().then((p) => {
      setProfile(p);
      setForm({ username: p?.username || '', gameUid: p?.gameUid || '', gender: p?.gender || '', gameRole: p?.gameRole || '', bio: p?.bio || '' });
    }).catch(() => {});
    getAchievements().then((a) => setAchievements(a as any[])).catch(() => {});
  }, [ready, isAuthenticated, router]);

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await updateProfile(form);
      setMsg('Profile saved!');
      setEditing(false);
      setProfile((p: any) => ({ ...p, ...form }));
      if (form.username) setUser({ username: form.username });
    } catch (e: any) { setMsg(e?.message || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/auth');
  };

  if (ready && !isAuthenticated) return null;
  const displayName = profile?.displayName || profile?.username || user?.displayName || 'Player';
  const initials    = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="page-wrapper">
      {/* Profile card */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--red-dim)', border: '2px solid var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--red)' }}>
            {profile?.avatarUrl ? <img src={profile.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" /> : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' }}>{displayName}</h1>
              <span className="badge badge-gray" style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>{profile?.role || user?.role || 'PLAYER'}</span>
            </div>
            {profile?.username && <div style={{ fontSize: '0.825rem', color: 'var(--text-2)', marginTop: '2px' }}>@{profile.username}</div>}
            {profile?.gameUid  && <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>UID: {profile.gameUid}</div>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)}>
              {editing ? <><X size={15} /> Cancel</> : <><Edit2 size={15} /> Edit</>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ color: 'var(--red)' }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem', marginBottom: '0.875rem' }}>
              {[
                { label: 'Username',  key: 'username',  placeholder: 'your_username' },
                { label: 'Free Fire UID', key: 'gameUid', placeholder: '123456789' },
              ].map(f => (
                <div key={f.key}>
                  <label className="input-label">{f.label}</label>
                  <input className="input" placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="input-label">Gender</label>
                <select className="input" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                  <option value="">Select</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Game Role</label>
                <select className="input" value={form.gameRole} onChange={e => setForm(p => ({ ...p, gameRole: e.target.value }))}>
                  <option value="">Select</option>
                  {GAME_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label">Bio</label>
              <textarea className="input" placeholder="Tell us about yourself…" value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} style={{ minHeight: 72 }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : <><Check size={15} /> Save Changes</>}
              </button>
            </div>
            {msg && <div style={{ marginTop: '0.75rem', fontSize: '0.825rem', color: msg.includes('saved') ? 'var(--green)' : 'var(--red)' }}>{msg}</div>}
          </div>
        )}

        {/* Bio display */}
        {!editing && profile?.bio && (
          <p style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.7 }}>{profile.bio}</p>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Tournaments',  value: achievements.length },
          { label: 'Completed',    value: achievements.filter(a => a.tournamentStatus === 'COMPLETED').length },
          { label: 'With Certificate', value: achievements.filter(a => a.certificate).length },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ textAlign: 'center' }}>
            <div className="stat-number">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div>
          <div className="section-hd">
            <div className="section-title">Battle History</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="stagger">
            {achievements.map((a: any) => (
              <div key={a.tournamentId} className="card card-hover" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{a.tournamentName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{a.teamName} · {a.format}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {a.rank && <span style={{ fontSize: '1.25rem' }}>{a.rank === 1 ? '🥇' : a.rank === 2 ? '🥈' : a.rank === 3 ? '🥉' : `#${a.rank}`}</span>}
                    {a.certificate?.pdfUrl && (
                      <a href={a.certificate.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                        <Download size={13} /> Cert
                      </a>
                    )}
                  </div>
                </div>
                {a.teamPoints > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                    {a.teamPoints} pts
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {achievements.length === 0 && (
        <div className="empty-state" style={{ marginTop: '0.5rem' }}>
          <div className="empty-icon">🏆</div>
          <div className="empty-title">No battles yet</div>
          <div className="empty-sub">Join a tournament to start your battle history.</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={() => router.push('/tournaments')}>
            Find Tournaments
          </button>
        </div>
      )}
    </div>
  );
}
