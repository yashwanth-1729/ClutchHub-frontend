'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { tournamentApi } from '@/lib/api';
import { Trophy, Zap, Users, Shield, ArrowRight, ChevronRight } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState({ total: 0, live: 0 });

  useEffect(() => {
    tournamentApi.list(0, 1).then(r => {
      const total = r.data?.data?.totalElements ?? 0;
      setStats(s => ({ ...s, total }));
    }).catch(() => {});
    tournamentApi.list(0, 1, 'ONGOING').then(r => {
      const live = r.data?.data?.totalElements ?? 0;
      setStats(s => ({ ...s, live }));
    }).catch(() => {});
  }, []);

  const features = [
    { icon: Zap,     title: 'Instant Registration', desc: 'Register your squad in seconds and jump straight into the action.' },
    { icon: Trophy,  title: 'Live Leaderboards',    desc: 'Real-time rankings update as the match progresses.' },
    { icon: Users,   title: 'Squad Management',     desc: 'Build your team, track stats, and coordinate with ease.' },
    { icon: Shield,  title: 'Verified Organizers',  desc: 'Every tournament is run by a verified organizer.' },
  ];

  return (
    <div className="page-wrapper">
      {/* ── Hero ── */}
      <section style={{ textAlign: 'center', padding: '3rem 1rem 4rem', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--red-dim)', border: '1px solid rgba(251,54,64,0.25)', borderRadius: 100, padding: '0.3rem 0.875rem', marginBottom: '1.5rem' }}>
          <span className="live-dot" />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--red)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {stats.live > 0 ? `${stats.live} Live Now` : 'Free Fire Esports'}
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(2.4rem, 7vw, 4.5rem)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--text)', marginBottom: '1.25rem' }}>
          Compete.<br />
          <span style={{ color: 'var(--red)' }}>Win Big.</span><br />
          Clutch.
        </h1>

        <p style={{ fontSize: '1.05rem', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '2rem', maxWidth: 420, margin: '0 auto 2rem' }}>
          India's premier Free Fire tournament platform. Find tournaments, build your squad, and rise through the ranks.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => router.push(isAuthenticated ? '/tournaments' : '/auth')}
          >
            {isAuthenticated ? 'Browse Tournaments' : 'Get Started Free'}
            <ArrowRight size={18} />
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => router.push('/tournaments')}>
            View Live Matches
          </button>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '3rem', maxWidth: 640, margin: '0 auto 3rem' }}>
        {[
          { label: 'Total Tournaments', value: stats.total || '—' },
          { label: 'Live Now',           value: stats.live  || '—' },
          { label: 'Active Players',     value: '12K+' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ textAlign: 'center', animation: `fadeUp 0.3s ease ${0.1 + i * 0.08}s both` }}>
            <div className="stat-number">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section style={{ maxWidth: 860, margin: '0 auto 3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Everything you need to compete
          </h2>
          <p style={{ color: 'var(--text-2)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Built for Free Fire players and organizers.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }} className="stagger">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Icon size={20} color="var(--red)" />
              </div>
              <div style={{ fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.95rem' }}>{title}</div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ maxWidth: 860, margin: '0 auto' }}>
        <div className="card" style={{ padding: '2.5rem 2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(251,54,64,0.08) 0%, rgba(0,15,8,0) 100%)', borderColor: 'var(--border-hi)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Ready to prove yourself?
          </h2>
          <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Join thousands of Free Fire players competing every day.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => router.push(isAuthenticated ? '/tournaments' : '/auth')}
          >
            {isAuthenticated ? 'Find a Tournament' : 'Create Free Account'}
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
