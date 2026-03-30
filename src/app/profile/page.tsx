'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const GAME_ROLES = ['SNIPER', 'RUSHER', 'NADER', 'ASSAULTER', 'SECONDARY RUSHER', 'SUPPORT'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, setAuth, accessToken } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({
    username: '', gameUid: '', gender: '', gameRole: '', bio: '',
  });

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) { router.push('/auth'); return; }
    loadProfile();
  }, [isAuthenticated]);

  const loadProfile = async () => {
    try {
      const res = await axios.get(`${API}/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = res.data?.data;
      setProfile(data);
      setForm({
        username: data.username || '',
        gameUid: data.gameUid || '',
        gender: data.gender || '',
        gameRole: data.gameRole || '',
        bio: data.bio || '',
      });
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.put(`${API}/profile`, form, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.data?.data) {
        setProfile(res.data.data);
        setSuccess('Profile updated!');
        setEditing(false);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to update');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/auth');
  };

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  if (!user) return null;

  const roleColors: Record<string, string> = {
    SNIPER: 'var(--cyan)', RUSHER: 'var(--red)', NADER: 'var(--magenta)',
    ASSAULTER: 'var(--orange)', 'SECONDARY RUSHER': 'var(--gold)', SUPPORT: 'var(--green)',
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '100px', animation: mounted ? 'pageEnter 0.4s ease forwards' : 'none' }}>
      {/* Header */}
      <div style={{ background: 'rgba(3,3,8,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '1rem', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--orange)', letterSpacing: '0.1em', textShadow: '0 0 15px var(--orange-glow)' }}>PROFILE</h1>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>YOUR ACCOUNT</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!editing && (
              <button onClick={() => setEditing(true)} style={{
                background: 'rgba(0,245,255,0.1)', border: '1px solid var(--cyan)',
                color: 'var(--cyan)', padding: '0.4rem 0.8rem',
                fontFamily: 'var(--font-mono)', fontSize: '0.65rem', cursor: 'pointer',
                borderRadius: '4px', letterSpacing: '0.1em',
              }}>EDIT</button>
            )}
            <button onClick={handleLogout} style={{
              background: 'rgba(255,34,68,0.1)', border: '1px solid var(--red)',
              color: 'var(--red)', padding: '0.4rem 0.8rem',
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem', cursor: 'pointer',
              borderRadius: '4px', letterSpacing: '0.1em',
            }}>OUT</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Avatar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '2rem 1.5rem', marginBottom: '1rem',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--orange), var(--cyan), var(--orange), transparent)', backgroundSize: '200% 100%', animation: 'navLine 3s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,43,0.06) 0%, transparent 60%)', animation: 'bgShift 6s ease-in-out infinite alternate' }} />

          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--orange), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2rem', fontWeight: 700, boxShadow: '0 0 30px var(--orange-glow)', position: 'relative', zIndex: 1 }}>
            {(profile?.displayName || user.displayName)?.[0]?.toUpperCase() || '?'}
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '0.05em', position: 'relative', zIndex: 1, marginBottom: '0.5rem' }}>
            {profile?.displayName || user.displayName || 'AGENT'}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', background: 'rgba(255,107,43,0.15)', border: '1px solid var(--orange)', color: 'var(--orange)', padding: '0.2rem 0.6rem', borderRadius: '2px' }}>
              {profile?.role || user.role || 'PLAYER'}
            </span>
            {profile?.gameRole && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', background: `${roleColors[profile.gameRole] || 'var(--cyan)'}22`, border: `1px solid ${roleColors[profile.gameRole] || 'var(--cyan)'}`, color: roleColors[profile.gameRole] || 'var(--cyan)', padding: '0.2rem 0.6rem', borderRadius: '2px' }}>
                {profile.gameRole}
              </span>
            )}
            {profile?.gender && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', background: 'rgba(136,136,170,0.1)', border: '1px solid var(--border2)', color: 'var(--text-dim)', padding: '0.2rem 0.6rem', borderRadius: '2px' }}>
                {profile.gender}
              </span>
            )}
          </div>

          {profile?.bio && (
            <p style={{ marginTop: '0.75rem', color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.5, position: 'relative', zIndex: 1 }}>{profile.bio}</p>
          )}
        </div>

        {/* Edit form or Info display */}
        {editing ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--cyan)', borderRadius: '8px', padding: '1.5rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: '1.25rem' }}>// EDIT PROFILE</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'USERNAME', key: 'username', type: 'text', placeholder: 'Your username' },
                { label: 'FREE FIRE UID', key: 'gameUid', type: 'text', placeholder: 'Your game UID' },
                { label: 'BIO', key: 'bio', type: 'text', placeholder: 'Short bio...' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '0.15em', display: 'block', marginBottom: '0.35rem' }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={{
                      width: '100%', background: 'rgba(0,0,0,0.5)',
                      border: '1px solid var(--border2)', borderBottom: '1px solid var(--orange)',
                      color: 'var(--text)', padding: '0.7rem 0.875rem',
                      fontFamily: 'var(--font-body)', fontSize: '0.95rem',
                      outline: 'none', borderRadius: '4px 4px 0 0',
                    }}
                  />
                </div>
              ))}

              {/* Gender selector */}
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '0.15em', display: 'block', marginBottom: '0.35rem' }}>GENDER</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {GENDERS.map(g => (
                    <button key={g} onClick={() => update('gender', g)} style={{
                      padding: '0.4rem 0.9rem', border: `1px solid ${form.gender === g ? 'var(--orange)' : 'var(--border2)'}`,
                      background: form.gender === g ? 'rgba(255,107,43,0.15)' : 'transparent',
                      color: form.gender === g ? 'var(--orange)' : 'var(--text-dim)',
                      fontFamily: 'var(--font-mono)', fontSize: '0.65rem', cursor: 'pointer',
                      borderRadius: '4px', letterSpacing: '0.1em', transition: 'all 0.2s',
                    }}>{g}</button>
                  ))}
                </div>
              </div>

              {/* Game role selector */}
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '0.15em', display: 'block', marginBottom: '0.35rem' }}>GAME ROLE</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {GAME_ROLES.map(r => (
                    <button key={r} onClick={() => update('gameRole', r)} style={{
                      padding: '0.4rem 0.75rem',
                      border: `1px solid ${form.gameRole === r ? (roleColors[r] || 'var(--orange)') : 'var(--border2)'}`,
                      background: form.gameRole === r ? `${roleColors[r] || 'var(--orange)'}22` : 'transparent',
                      color: form.gameRole === r ? (roleColors[r] || 'var(--orange)') : 'var(--text-dim)',
                      fontFamily: 'var(--font-mono)', fontSize: '0.6rem', cursor: 'pointer',
                      borderRadius: '4px', letterSpacing: '0.05em', transition: 'all 0.2s',
                    }}>{r}</button>
                  ))}
                </div>
              </div>
            </div>

            {error && <div style={{ marginTop: '1rem', padding: '0.6rem', background: 'rgba(255,34,68,0.1)', border: '1px solid var(--red)', borderRadius: '4px', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>⚠ {error}</div>}
            {success && <div style={{ marginTop: '1rem', padding: '0.6rem', background: 'rgba(0,255,136,0.1)', border: '1px solid var(--green)', borderRadius: '4px', color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>✓ {success}</div>}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => { setEditing(false); setError(''); }} style={{
                flex: 1, padding: '0.75rem', background: 'transparent',
                border: '1px solid var(--border2)', color: 'var(--text-dim)',
                fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700,
                letterSpacing: '0.1em', cursor: 'pointer', borderRadius: '4px',
              }}>CANCEL</button>
              <button onClick={handleSave} disabled={saving} style={{
                flex: 2, padding: '0.75rem',
                background: saving ? 'rgba(255,107,43,0.3)' : 'linear-gradient(135deg, var(--orange), #cc4400)',
                color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700,
                letterSpacing: '0.1em', borderRadius: '4px',
                boxShadow: saving ? 'none' : '0 0 20px var(--orange-glow)',
              }}>
                {saving ? 'SAVING...' : '✓ SAVE CHANGES'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: '1rem' }}>// AGENT DATA</div>
            {[
              { label: 'EMAIL', value: profile?.email || user.email || '—' },
              { label: 'USERNAME', value: profile?.username || '—' },
              { label: 'GAME UID', value: profile?.gameUid || '—' },
              { label: 'GENDER', value: profile?.gender || '—' },
              { label: 'GAME ROLE', value: profile?.gameRole || '—' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--text)', fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action menu */}
        {!editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>// ACTIONS</div>
            {[
              { icon: '◈', label: 'MY TOURNAMENTS', action: () => router.push('/my-teams'), color: 'var(--orange)' },
              { icon: '⚡', label: 'CREATE TOURNAMENT', action: () => router.push('/tournaments/create'), color: 'var(--cyan)' },
              { icon: '✉', label: 'MESSAGES', action: () => router.push('/search'), color: 'var(--magenta)' },
            ].map((item, i) => (
              <button key={i} onClick={item.action} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '6px', padding: '1rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                cursor: 'pointer', transition: 'all 0.3s', textAlign: 'left', width: '100%',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = item.color; el.style.transform = 'translateX(4px)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.transform = 'translateX(0)'; }}
              >
                <span style={{ fontSize: '1.1rem', color: item.color, textShadow: `0 0 10px ${item.color}` }}>{item.icon}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.1em' }}>{item.label}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-dim)' }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

