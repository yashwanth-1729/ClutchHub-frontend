'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--orange)' }}>{value}/{max}</span>
      </div>
      <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--orange), var(--gold))',
          borderRadius: '2px', boxShadow: '0 0 6px var(--orange-glow)',
          transition: 'width 1s ease',
        }} />
      </div>
    </div>
  );
}

function TournamentCard({ t, onClick }: { t: any; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const statusColors: Record<string, string> = {
    UPCOMING: 'var(--cyan)', LIVE: 'var(--red)', COMPLETED: 'var(--text-dim)',
  };
  const statusLabels: Record<string, string> = {
    UPCOMING: '◈ UPCOMING', LIVE: '● LIVE', COMPLETED: '◉ ENDED',
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(17,17,40,0.95)' : 'var(--surface)',
        border: `1px solid ${hovered ? 'var(--orange)' : 'var(--border)'}`,
        borderRadius: '8px', padding: '1.25rem', cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 10px 40px rgba(255,107,43,0.2)' : 'none',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: hovered
          ? 'linear-gradient(90deg, var(--orange), var(--gold), var(--orange))'
          : 'linear-gradient(90deg, transparent, var(--border2), transparent)',
        transition: 'all 0.3s',
      }} />

      {/* Corner decoration */}
      {hovered && (
        <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: '20px', height: '20px', borderTop: '2px solid var(--cyan)', borderRight: '2px solid var(--cyan)' }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.1em',
              color: statusColors[t.status] || 'var(--text-dim)',
              animation: t.status === 'LIVE' ? 'livePulse 1.5s infinite' : 'none',
            }}>{statusLabels[t.status] || t.status}</span>
          </div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
            color: hovered ? 'var(--orange)' : 'var(--text)',
            transition: 'color 0.3s', letterSpacing: '0.05em',
          }}>{t.title}</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800,
            background: 'linear-gradient(135deg, var(--gold), var(--orange))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>₹{t.prizePool?.toLocaleString() || '0'}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)' }}>PRIZE POOL</div>
        </div>
      </div>

      <StatBar label="SLOTS" value={t.registeredTeams || 0} max={t.maxTeams || 20} />

      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>ENTRY</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 600 }}>
            {t.entryFee === 0 ? 'FREE' : `₹${t.entryFee}`}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>FORMAT</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--text)', fontWeight: 600 }}>{t.format || 'SQUAD'}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>DATE</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--text)', fontWeight: 600 }}>
            {t.scheduledAt ? new Date(t.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'TBA'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TournamentsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    axios.get(`${API}/tournaments`).then(r => {
      setTournaments(r.data?.data?.content || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filters = ['ALL', 'UPCOMING', 'LIVE', 'COMPLETED'];
  const filtered = filter === 'ALL' ? tournaments : tournaments.filter(t => t.status === filter);

  return (
    <div style={{
      minHeight: '100vh', paddingBottom: '80px',
      animation: mounted ? 'pageEnter 0.4s ease forwards' : 'none',
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(3,3,8,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)', padding: '1rem',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900,
                color: 'var(--orange)', letterSpacing: '0.1em',
                textShadow: '0 0 15px var(--orange-glow)',
              }}>CLUTCHHUB</h1>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>TOURNAMENTS</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {isAuthenticated && (
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'var(--green)', boxShadow: '0 0 8px var(--green)',
                  animation: 'livePulse 2s infinite',
                }} />
              )}
              <button onClick={() => router.push(isAuthenticated ? '/profile' : '/auth')} style={{
                background: 'transparent', border: '1px solid var(--border2)',
                color: 'var(--text-dim)', padding: '0.4rem 0.8rem',
                fontFamily: 'var(--font-mono)', fontSize: '0.65rem', cursor: 'pointer',
                borderRadius: '4px', letterSpacing: '0.1em',
                transition: 'all 0.3s',
              }}>
                {isAuthenticated ? 'PROFILE' : 'LOGIN'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1rem' }}>
        {/* Stats bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem', marginBottom: '1.5rem',
        }}>
          {[
            { label: 'ACTIVE', value: tournaments.filter(t => t.status === 'LIVE').length, color: 'var(--red)' },
            { label: 'UPCOMING', value: tournaments.filter(t => t.status === 'UPCOMING').length, color: 'var(--cyan)' },
            { label: 'TOTAL', value: tournaments.length, color: 'var(--orange)' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '0.75rem', textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, color: s.color, textShadow: `0 0 15px ${s.color}` }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{
          display: 'flex', gap: '0.5rem', marginBottom: '1.25rem',
          overflowX: 'auto', paddingBottom: '4px',
        }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? 'var(--orange)' : 'transparent',
              border: `1px solid ${filter === f ? 'var(--orange)' : 'var(--border2)'}`,
              color: filter === f ? '#fff' : 'var(--text-dim)',
              padding: '0.4rem 0.9rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
              cursor: 'pointer', borderRadius: '4px', letterSpacing: '0.1em',
              whiteSpace: 'nowrap', transition: 'all 0.3s',
              boxShadow: filter === f ? '0 0 12px var(--orange-glow)' : 'none',
            }}>{f}</button>
          ))}
        </div>

        {/* Tournament list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{
              width: '40px', height: '40px',
              border: '2px solid var(--border)', borderTopColor: 'var(--orange)',
              borderRightColor: 'var(--cyan)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', marginBottom: '1rem', opacity: 0.2 }}>◈</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>NO TOURNAMENTS FOUND</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--border2)', marginTop: '0.5rem' }}>Check back later for upcoming battles</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map((t, i) => (
              <div key={t.id} style={{ animation: `pageEnter 0.4s ease ${i * 0.05}s both` }}>
                <TournamentCard t={t} onClick={() => router.push(`/tournaments/${t.slug}`)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
