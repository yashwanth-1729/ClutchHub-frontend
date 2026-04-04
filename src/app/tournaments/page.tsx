'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Plus, Search, Trophy } from 'lucide-react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  OPEN:      { label: 'Open',     cls: 'badge-green' },
  FULL:      { label: 'Full',     cls: 'badge-amber' },
  ONGOING:   { label: 'Live',     cls: 'badge-red'   },
  COMPLETED: { label: 'Ended',    cls: 'badge-gray'  },
  CANCELLED: { label: 'Cancelled',cls: 'badge-gray'  },
  DRAFT:     { label: 'Draft',    cls: 'badge-gray'  },
  UPCOMING:  { label: 'Upcoming', cls: 'badge-blue'  },
};

function TCard({ t }: { t: any }) {
  const router = useRouter();
  const bd = STATUS_BADGE[t.status] ?? { label: t.status, cls: 'badge-gray' };
  const filled = Math.round(((t.registeredTeams ?? 0) / (t.maxTeams ?? 1)) * 100);
  const isLive = t.status === 'ONGOING';

  return (
    <div className="t-card" onClick={() => router.push(`/tournaments/${t.slug}`)}>
      <div className="t-card-banner">
        {t.bannerUrl
          ? <img src={t.bannerUrl} alt={t.name} />
          : <Trophy size={36} color="rgba(251,54,64,0.25)" />
        }
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <span className={`badge ${bd.cls}`}>
            {isLive && <span className="live-dot" style={{ width: 5, height: 5 }} />}
            {bd.label}
          </span>
        </div>
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <span className="badge badge-gray">{t.format}</span>
        </div>
      </div>
      <div className="t-card-body">
        <div>
          <div className="t-card-name">{t.name}</div>
          <div className="t-card-org">{t.organizerName || 'ClutchHub'}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Prize Pool</div>
            <div className="t-card-prize">
              {t.prizePool > 0 ? `₹${t.prizePool.toLocaleString('en-IN')}` : 'Free'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Entry</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: t.entryFee > 0 ? 'var(--amber)' : 'var(--green)' }}>
              {t.entryFee > 0 ? `₹${t.entryFee}` : 'Free'}
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 5 }}>
            <span>{t.registeredTeams ?? 0} / {t.maxTeams} teams</span>
            <span>{filled}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${filled}%` }} />
          </div>
        </div>

        <div className="t-card-meta">
          {t.scheduledAt && (
            <div className="t-card-meta-item">
              <label>Date</label>
              <span>{new Date(t.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const FILTERS = [
  { key: 'ALL',       label: 'All' },
  { key: 'OPEN',      label: 'Open' },
  { key: 'ONGOING',   label: 'Live' },
  { key: 'UPCOMING',  label: 'Upcoming' },
  { key: 'COMPLETED', label: 'Ended' },
];

export default function TournamentsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const canCreate = user?.role === 'ORGANIZER' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    setLoading(true);
    const url = filter === 'ALL'
      ? `${API}/tournaments?size=60`
      : `${API}/tournaments?size=60&status=${filter}`;
    axios.get(url)
      .then(r => setTournaments(r.data?.data?.content || []))
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const displayed = search
    ? tournaments.filter(t => t.name?.toLowerCase().includes(search.toLowerCase()))
    : tournaments;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Tournaments</h1>
          <p className="page-sub">{tournaments.length} battles available</p>
        </div>
        {isAuthenticated && canCreate && (
          <button className="btn btn-primary btn-sm" onClick={() => router.push('/tournaments/create')}>
            <Plus size={15} /> Create
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
        <input
          className="input"
          style={{ paddingLeft: '2.5rem' }}
          placeholder="Search tournaments…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="filter-chips" style={{ marginBottom: '1.5rem' }}>
        {FILTERS.map(f => (
          <button key={f.key} className={`chip${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <div className="empty-title">No tournaments found</div>
          <div className="empty-sub">Try a different filter or check back later.</div>
        </div>
      ) : (
        <div className="t-grid stagger">
          {displayed.map(t => <TCard key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}
