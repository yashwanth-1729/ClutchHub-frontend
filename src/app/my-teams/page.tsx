'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function MyTeamsPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [tab, setTab] = useState<'joined' | 'created'>('joined');
  const [joined, setJoined] = useState<any[]>([]);
  const [created, setCreated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) { router.push('/auth'); return; }
    const headers = { Authorization: `Bearer ${accessToken}` };
    Promise.all([
      axios.get(`${API}/tournaments/joined`, { headers }),
      axios.get(`${API}/tournaments/mine`, { headers }),
    ]).then(([j, c]) => {
      setJoined(j.data?.data || []);
      setCreated(c.data?.data?.content || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated]);

  const statusColors: Record<string, string> = {
    UPCOMING: 'var(--cyan)', LIVE: 'var(--red)', COMPLETED: 'var(--text-dim)',
    ONGOING: 'var(--red)', OPEN: 'var(--green)',
  };

  const TCard = ({ t }: { t: any }) => (
    <div onClick={() => router.push(`/tournaments/${t.slug}`)} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '8px', padding: '1.25rem', cursor: 'pointer',
      transition: 'all 0.3s', position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--orange)'; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 30px rgba(255,107,43,0.15)'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--orange), transparent)', opacity: 0.5 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: statusColors[t.status] || 'var(--text-dim)', letterSpacing: '0.1em' }}>
            {t.status === 'LIVE' || t.status === 'ONGOING' ? '● LIVE' : t.status === 'UPCOMING' ? '◈ UPCOMING' : '◉ ENDED'}
          </span>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', marginTop: '2px', letterSpacing: '0.05em' }}>{t.name}</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--gold), var(--orange))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ₹{t.prizePool?.toLocaleString() || '0'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>ENTRY</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 600 }}>{t.entryFee === 0 ? 'FREE' : `₹${t.entryFee}`}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>FORMAT</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: 'var(--text)', fontWeight: 600 }}>{t.format}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>TEAMS</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: 'var(--text)', fontWeight: 600 }}>{t.registeredTeams}/{t.maxTeams}</div>
        </div>
        {t.scheduledAt && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>DATE</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: 'var(--text)', fontWeight: 600 }}>
              {new Date(t.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const current = tab === 'joined' ? joined : created;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', animation: mounted ? 'pageEnter 0.4s ease forwards' : 'none' }}>
      {/* Header */}
      <div style={{ background: 'rgba(3,3,8,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '1rem', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--orange)', letterSpacing: '0.1em', textShadow: '0 0 15px var(--orange-glow)' }}>MY BATTLES</h1>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>SQUAD DASHBOARD</div>
        </div>
      </div>

      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '1rem' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'JOINED', value: joined.length, color: 'var(--cyan)' },
            { label: 'CREATED', value: created.length, color: 'var(--orange)' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, color: s.color, textShadow: `0 0 15px ${s.color}` }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px', marginBottom: '1.25rem' }}>
          {(['joined', 'created'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '0.6rem', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: '4px',
              background: tab === t ? 'var(--orange)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-dim)',
              boxShadow: tab === t ? '0 0 12px var(--orange-glow)' : 'none',
              transition: 'all 0.3s',
            }}>{t === 'joined' ? '⚡ JOINED' : '◈ CREATED'}</button>
          ))}
        </div>

        {/* Create button */}
        {tab === 'created' && (
          <button onClick={() => router.push('/tournaments/create')} style={{
            width: '100%', padding: '0.875rem', marginBottom: '1rem',
            background: 'linear-gradient(135deg, var(--orange), #cc4400)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700,
            letterSpacing: '0.15em', borderRadius: '4px',
            clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
            boxShadow: '0 0 20px var(--orange-glow)',
          }}>+ CREATE NEW BATTLE</button>
        )}

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ width: '40px', height: '40px', border: '2px solid var(--border)', borderTopColor: 'var(--orange)', borderRightColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : current.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', opacity: 0.2, marginBottom: '0.75rem' }}>◈</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
              {tab === 'joined' ? 'NO BATTLES JOINED YET' : 'NO BATTLES CREATED YET'}
            </div>
            <button onClick={() => router.push(tab === 'joined' ? '/tournaments' : '/tournaments/create')} style={{
              marginTop: '1rem', background: 'transparent', border: '1px solid var(--orange)',
              color: 'var(--orange)', padding: '0.5rem 1.5rem',
              fontFamily: 'var(--font-mono)', fontSize: '0.7rem', cursor: 'pointer',
              borderRadius: '4px', letterSpacing: '0.1em',
            }}>
              {tab === 'joined' ? 'FIND BATTLES →' : 'CREATE BATTLE →'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {current.map((t, i) => (
              <div key={t.id || i} style={{ animation: `pageEnter 0.4s ease ${i * 0.05}s both` }}>
                <TCard t={t} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
