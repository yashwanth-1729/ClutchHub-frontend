'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { User, Gamepad2, AlertCircle, Check, Loader2 } from 'lucide-react';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [form, setForm] = useState({ username: '', gameUid: '', displayName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim()) { setError('Username is required'); return; }
    if (!form.gameUid.trim()) { setError('Free Fire UID is required'); return; }
    setLoading(true); setError('');
    try {
      await authApi.completeProfile(form);
      setUser({ username: form.username, displayName: form.displayName, profileComplete: true });
      router.replace('/tournaments');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', zIndex: 1 }}>
      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.4s ease forwards' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--red-dim)', border: '2px solid rgba(251,54,64,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <User size={24} color="var(--red)" />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>Set Up Your Profile</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>Choose a username and link your Free Fire account.</p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: '2rem', backdropFilter: 'blur(24px)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="input-label">Display Name</label>
              <input className="input" placeholder="Your name" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
            </div>
            <div>
              <label className="input-label">Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="clutch_king" value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '_') }))} required />
              </div>
            </div>
            <div>
              <label className="input-label">Free Fire UID</label>
              <div style={{ position: 'relative' }}>
                <Gamepad2 size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="123456789" value={form.gameUid}
                  onChange={e => setForm(f => ({ ...f, gameUid: e.target.value }))} required />
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 0.875rem', background: 'var(--red-dim)', border: '1px solid rgba(251,54,64,0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', color: 'var(--red)' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: '0.5rem' }} disabled={loading}>
              {loading
                ? <><Loader2 size={18} style={{ animation: 'spin 0.75s linear infinite' }} /> Saving…</>
                : <><Check size={18} /> Complete Profile</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
