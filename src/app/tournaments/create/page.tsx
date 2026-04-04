'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function CreateTournamentPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    title: '', description: '', game: 'FREE_FIRE',
    format: 'SQUAD', maxTeams: 20, entryFee: 0,
    prizePool: 0, scheduledAt: '', rules: '',
  });

  const canCreate = user?.role === 'ORGANIZER' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) router.push('/auth');
  }, [isAuthenticated]);

  const update = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Tournament title is required'); return; }
    if (!form.scheduledAt) { setError('Schedule date is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/tournaments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: form.title,
          description: form.description,
          game: form.game,
          format: form.format,
          maxTeams: form.maxTeams,
          entryFee: form.entryFee,
          prizePool: form.prizePool,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          rules: form.rules,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        router.push(`/tournaments/${json.data?.slug || ''}`);
      } else {
        setError(json.message || 'Failed to create tournament');
      }
    } catch { setError('Could not connect to server'); }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', background: 'rgba(0,0,0,0.5)',
    border: '1px solid var(--border2)', borderBottom: '1px solid var(--orange)',
    color: 'var(--text)', padding: '0.75rem 1rem',
    fontFamily: 'var(--font-body)', fontSize: '0.95rem',
    outline: 'none', borderRadius: '4px 4px 0 0',
    transition: 'all 0.3s',
  };

  const labelStyle = {
    fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
    color: 'var(--cyan)', letterSpacing: '0.15em',
    display: 'block', marginBottom: '0.4rem',
  };

  if (mounted && isAuthenticated && !canCreate) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', opacity: 0.2 }}>◈</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: 'var(--red)', letterSpacing: '0.1em' }}>ACCESS DENIED</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textAlign: 'center', maxWidth: '280px' }}>
          Only Organizers can create tournaments. Contact support to upgrade your account.
        </div>
        <button onClick={() => router.push('/tournaments')} style={{ marginTop: '0.5rem', background: 'transparent', border: '1px solid var(--orange)', color: 'var(--orange)', padding: '0.5rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', cursor: 'pointer', borderRadius: '4px', letterSpacing: '0.1em' }}>← BACK TO ARENA</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', animation: mounted ? 'pageEnter 0.4s ease forwards' : 'none' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(3,3,8,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)', padding: '1rem',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.back()} style={{
            background: 'transparent', border: '1px solid var(--border2)',
            color: 'var(--text-dim)', width: '32px', height: '32px',
            borderRadius: '4px', cursor: 'pointer', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>‹</button>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, color: 'var(--orange)', letterSpacing: '0.1em', textShadow: '0 0 15px var(--orange-glow)' }}>CREATE BATTLE</h1>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>TOURNAMENT SETUP</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ height: '3px', borderRadius: '2px', background: s <= step ? 'var(--orange)' : 'var(--border)', boxShadow: s <= step ? '0 0 8px var(--orange-glow)' : 'none', transition: 'all 0.3s' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: s <= step ? 'var(--orange)' : 'var(--text-dim)', letterSpacing: '0.1em' }}>
                {['BASICS', 'SETTINGS', 'REVIEW'][s - 1]}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'pageEnter 0.3s ease forwards' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: '-0.5rem' }}>// BASIC INFO</div>

            <div>
              <label style={labelStyle}>TOURNAMENT TITLE *</label>
              <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. CLUTCH CHAMPIONSHIP S1" style={inputStyle}
                onFocus={e => { e.target.style.borderBottomColor = 'var(--cyan)'; e.target.style.boxShadow = '0 4px 15px rgba(0,245,255,0.1)'; }}
                onBlur={e => { e.target.style.borderBottomColor = 'var(--orange)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label style={labelStyle}>DESCRIPTION</label>
              <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Tell players about this tournament..." rows={3} style={{ ...inputStyle, resize: 'none' }}
                onFocus={e => { e.target.style.borderBottomColor = 'var(--cyan)'; }}
                onBlur={e => { e.target.style.borderBottomColor = 'var(--orange)'; }}
              />
            </div>

            <div>
              <label style={labelStyle}>RULES & INFO</label>
              <textarea value={form.rules} onChange={e => update('rules', e.target.value)} placeholder="Tournament rules, point system, tiebreakers..." rows={4} style={{ ...inputStyle, resize: 'none' }}
                onFocus={e => { e.target.style.borderBottomColor = 'var(--cyan)'; }}
                onBlur={e => { e.target.style.borderBottomColor = 'var(--orange)'; }}
              />
            </div>

            <div>
              <label style={labelStyle}>SCHEDULE DATE & TIME *</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={e => update('scheduledAt', e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={e => { e.target.style.borderBottomColor = 'var(--cyan)'; }}
                onBlur={e => { e.target.style.borderBottomColor = 'var(--orange)'; }}
              />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'pageEnter 0.3s ease forwards' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: '-0.5rem' }}>// BATTLE SETTINGS</div>

            <div>
              <label style={labelStyle}>FORMAT</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {['SOLO', 'DUO', 'SQUAD'].map(f => (
                  <button key={f} onClick={() => update('format', f)} style={{
                    background: form.format === f ? 'rgba(255,107,43,0.2)' : 'var(--surface)',
                    border: `1px solid ${form.format === f ? 'var(--orange)' : 'var(--border)'}`,
                    color: form.format === f ? 'var(--orange)' : 'var(--text-dim)',
                    padding: '0.75rem', fontFamily: 'var(--font-display)', fontSize: '0.75rem',
                    fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', borderRadius: '4px',
                    boxShadow: form.format === f ? '0 0 12px var(--orange-glow)' : 'none',
                    transition: 'all 0.3s',
                  }}>{f}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>MAX TEAMS: {form.maxTeams}</label>
              <input type="range" min={4} max={100} step={2} value={form.maxTeams} onChange={e => update('maxTeams', +e.target.value)}
                style={{ width: '100%', accentColor: 'var(--orange)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                <span>4</span><span>100</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>ENTRY FEE (₹)</label>
                <input type="number" min={0} value={form.entryFee} onChange={e => update('entryFee', +e.target.value)} placeholder="0 = FREE" style={inputStyle}
                  onFocus={e => { e.target.style.borderBottomColor = 'var(--cyan)'; }}
                  onBlur={e => { e.target.style.borderBottomColor = 'var(--orange)'; }}
                />
              </div>
              <div>
                <label style={labelStyle}>PRIZE POOL (₹)</label>
                <input type="number" min={0} value={form.prizePool} onChange={e => update('prizePool', +e.target.value)} placeholder="0" style={inputStyle}
                  onFocus={e => { e.target.style.borderBottomColor = 'var(--cyan)'; }}
                  onBlur={e => { e.target.style.borderBottomColor = 'var(--orange)'; }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Review */}
        {step === 3 && (
          <div style={{ animation: 'pageEnter 0.3s ease forwards' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: '1rem' }}>// REVIEW & LAUNCH</div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--orange), transparent)' }} />

              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--orange)', marginBottom: '1rem', letterSpacing: '0.05em' }}>{form.title}</h3>

              {form.description && <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>{form.description}</p>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'FORMAT', value: form.format },
                  { label: 'MAX TEAMS', value: form.maxTeams.toString() },
                  { label: 'ENTRY FEE', value: form.entryFee === 0 ? 'FREE' : `₹${form.entryFee}` },
                  { label: 'PRIZE POOL', value: `₹${form.prizePool}` },
                  { label: 'DATE', value: form.scheduledAt ? new Date(form.scheduledAt).toLocaleDateString('en-IN') : 'TBA' },
                  { label: 'TIME', value: form.scheduledAt ? new Date(form.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'TBA' },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{item.label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ padding: '0.75rem', background: 'rgba(255,34,68,0.1)', border: '1px solid var(--red)', borderRadius: '4px', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                ⚠ {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, padding: '0.9rem', background: 'transparent',
              border: '1px solid var(--border2)', color: 'var(--text-dim)',
              fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700,
              letterSpacing: '0.1em', cursor: 'pointer', borderRadius: '4px',
              transition: 'all 0.3s',
            }}>‹ BACK</button>
          )}

          {step < 3 ? (
            <button onClick={() => {
              if (step === 1 && !form.title.trim()) { setError('Title is required'); return; }
              setError('');
              setStep(s => s + 1);
            }} style={{
              flex: 2, padding: '0.9rem',
              background: 'linear-gradient(135deg, var(--orange), #cc4400)',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700,
              letterSpacing: '0.15em', borderRadius: '4px',
              clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
              boxShadow: '0 0 25px var(--orange-glow)', transition: 'all 0.3s',
            }}>NEXT ›</button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} style={{
              flex: 2, padding: '0.9rem',
              background: loading ? 'rgba(255,107,43,0.3)' : 'linear-gradient(135deg, var(--orange), #cc4400)',
              color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700,
              letterSpacing: '0.15em', borderRadius: '4px',
              clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
              boxShadow: loading ? 'none' : '0 0 25px var(--orange-glow)',
            }}>
              {loading ? 'LAUNCHING...' : '⚡ LAUNCH BATTLE'}
            </button>
          )}
        </div>

        {error && step < 3 && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,34,68,0.1)', border: '1px solid var(--red)', borderRadius: '4px', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            ⚠ {error}
          </div>
        )}
      </div>
    </div>
  );
}
