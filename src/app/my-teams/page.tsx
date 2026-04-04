'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Plus, Trophy } from 'lucide-react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const STATUS_COLOR: Record<string, string> = {
  ONGOING: 'var(--red)', OPEN: 'var(--green)', UPCOMING: 'var(--blue)',
  COMPLETED: 'var(--text-3)', FULL: 'var(--amber)',
};

function TCard({ t }: { t: any }) {
  const router = useRouter();
  const color = STATUS_COLOR[t.status] || 'var(--text-3)';
  return (
    <div className="card card-hover card-clickable" style={{ padding: '1.25rem' }} onClick={() => router.push(`/tournaments/${t.slug}`)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.875rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', color, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{t.status}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.925rem', lineHeight: 1.3 }}>{t.name}</div>
        </div>
        <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: '1rem', flexShrink: 0 }}>
          {t.prizePool > 0 ? `₹${t.prizePool.toLocaleString('en-IN')}` : 'Free'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Format', value: t.format },
          { label: 'Entry',  value: t.entryFee > 0 ? `₹${t.entryFee}` : 'Free' },
          { label: 'Teams',  value: `${t.registeredTeams ?? 0}/${t.maxTeams}` },
          t.scheduledAt ? { label: 'Date', value: new Date(t.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) } : null,
        ].filter(Boolean).map((item: any) => (
          <div key={item.label}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MyTeamsPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken, user } = useAuthStore();
  const [tab,     setTab]     = useState<'joined' | 'created'>('joined');
  const [joined,  setJoined]  = useState<any[]>([]);
  const [created, setCreated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canCreate = user?.role === 'ORGANIZER' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isAuthenticated) { router.push('/auth'); return; }
    const headers = { Authorization: `Bearer ${accessToken}` };
    Promise.all([
      axios.get(`${API}/tournaments/joined`, { headers }),
      axios.get(`${API}/tournaments/mine`,   { headers }),
    ]).then(([j, c]) => {
      setJoined(j.data?.data || []);
      setCreated(c.data?.data?.content || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;
  const current = tab === 'joined' ? joined : created;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">My Battles</h1>
          <p className="page-sub">Your tournament history</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary btn-sm" onClick={() => router.push('/tournaments/create')}>
            <Plus size={15} /> Create
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Joined',  value: joined.length,  color: 'var(--red)' },
          { label: 'Created', value: created.length, color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ textAlign: 'center' }}>
            <div className="stat-number" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab${tab === 'joined' ? ' active' : ''}`} onClick={() => setTab('joined')}>Joined</button>
        <button className={`tab${tab === 'created' ? ' active' : ''}`} onClick={() => setTab('created')}>Created</button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : current.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <div className="empty-title">{tab === 'joined' ? 'No tournaments joined yet' : 'No tournaments created yet'}</div>
          <div className="empty-sub">{tab === 'joined' ? 'Browse the arena and join a battle.' : 'Create your first tournament.'}</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={() => router.push(tab === 'joined' ? '/tournaments' : '/tournaments/create')}>
            {tab === 'joined' ? 'Browse Arena' : 'Create Tournament'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="stagger">
          {current.map(t => <TCard key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}
