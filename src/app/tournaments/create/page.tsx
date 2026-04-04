'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, ArrowRight, Check, AlertCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL;

const STEPS = ['Details', 'Settings', 'Review'];

export default function CreateTournamentPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [step,    setStep]    = useState(1);

  const [form, setForm] = useState({
    title: '', description: '', game: 'FREE_FIRE',
    format: 'SQUAD', maxTeams: 20, entryFee: 0,
    prizePool: 0, scheduledAt: '', rules: '',
  });

  const canCreate = user?.role === 'ORGANIZER' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isAuthenticated) { router.push('/auth'); return; }
  }, [isAuthenticated]);

  const up = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Tournament title is required'); return; }
    if (!form.scheduledAt)  { setError('Schedule date is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: form.title, description: form.description, game: form.game,
          format: form.format, maxTeams: Number(form.maxTeams),
          entryFee: Number(form.entryFee), prizePool: Number(form.prizePool),
          scheduledAt: new Date(form.scheduledAt).toISOString(), rules: form.rules,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create');
      router.push(`/tournaments/${data.data.slug}`);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (!isAuthenticated) return null;

  if (!canCreate) return (
    <div className="page-wrapper">
      <div className="empty-state">
        <AlertCircle size={40} color="var(--red)" style={{ opacity: 0.7, marginBottom: '0.75rem' }} />
        <div className="empty-title">Access Denied</div>
        <div className="empty-sub">Only Organizers can create tournaments.</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }} onClick={() => router.push('/tournaments')}>Back to Arena</button>
      </div>
    </div>
  );

  const inputRow = (label: string, node: React.ReactNode) => (
    <div key={label}>
      <label className="input-label">{label}</label>
      {node}
    </div>
  );

  return (
    <div className="page-wrapper">
      {/* Header */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1.25rem' }} onClick={() => router.push('/tournaments')}>
        <ArrowLeft size={16} /> Back
      </button>
      <div className="page-header">
        <h1 className="page-title">Create Tournament</h1>
        <p className="page-sub">Step {step} of {STEPS.length} — {STEPS[step - 1]}</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: i < STEPS.length - 1 ? '1' : 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: i + 1 < step ? 'var(--green)' : i + 1 === step ? 'var(--red)' : 'var(--surface)', border: `2px solid ${i + 1 < step ? 'var(--green)' : i + 1 === step ? 'var(--red)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: i + 1 <= step ? '#fff' : 'var(--text-3)', flexShrink: 0 }}>
              {i + 1 < step ? <Check size={14} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i + 1 < step ? 'var(--green)' : 'var(--border)' }} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {inputRow('Tournament Name *', <input className="input" placeholder="e.g. Clutch Championship S1" value={form.title} onChange={e => up('title', e.target.value)} />)}
            {inputRow('Description', <textarea className="input" placeholder="Describe your tournament…" value={form.description} onChange={e => up('description', e.target.value)} />)}
            {inputRow('Rules', <textarea className="input" placeholder="Format rules, scoring system, tiebreakers…" value={form.rules} onChange={e => up('rules', e.target.value)} style={{ minHeight: 100 }} />)}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {inputRow('Format', (
              <select className="input" value={form.format} onChange={e => up('format', e.target.value)}>
                <option value="SOLO">Solo</option>
                <option value="DUO">Duo</option>
                <option value="SQUAD">Squad</option>
              </select>
            ))}
            {inputRow('Max Teams', <input className="input" type="number" min={2} max={200} value={form.maxTeams} onChange={e => up('maxTeams', +e.target.value)} />)}
            {inputRow('Entry Fee (₹)', <input className="input" type="number" min={0} value={form.entryFee} onChange={e => up('entryFee', +e.target.value)} placeholder="0 = Free" />)}
            {inputRow('Prize Pool (₹)', <input className="input" type="number" min={0} value={form.prizePool} onChange={e => up('prizePool', +e.target.value)} />)}
            {inputRow('Date & Time *', <input className="input" type="datetime-local" value={form.scheduledAt} onChange={e => up('scheduledAt', e.target.value)} />)}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>{form.title || 'Untitled Tournament'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'Format',    value: form.format },
                { label: 'Max Teams', value: form.maxTeams },
                { label: 'Entry Fee', value: form.entryFee > 0 ? `₹${form.entryFee}` : 'Free' },
                { label: 'Prize Pool',value: form.prizePool > 0 ? `₹${form.prizePool.toLocaleString('en-IN')}` : 'TBD' },
                { label: 'Date',      value: form.scheduledAt ? new Date(form.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set' },
              ].map(i => (
                <div key={i.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{i.label}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{i.value}</div>
                </div>
              ))}
            </div>
            {form.description && <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.7 }}>{form.description}</p>}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'var(--red-dim)', border: '1px solid rgba(251,54,64,0.25)', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--red)' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        {step > 1 && (
          <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
        {step < 3 ? (
          <button className="btn btn-primary" onClick={() => {
            if (step === 1 && !form.title.trim()) { setError('Tournament name is required'); return; }
            setError(''); setStep(s => s + 1);
          }}>
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating…' : <><Check size={16} /> Launch Tournament</>}
          </button>
        )}
      </div>
    </div>
  );
}
