'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [form, setForm] = useState({ username: '', gameUid: '', displayName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.completeProfile(form);
      setUser({ username: form.username, displayName: form.displayName, profileComplete: true });
      router.replace('/tournaments');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎮</div>
          <h2 className="font-syne font-bold text-2xl mb-1">Set up your profile</h2>
          <p className="text-[#666] text-sm">Choose your username and link your Free Fire account</p>
        </div>

        <div className="ch-card p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-[#888] mb-2 block uppercase tracking-wider">Display Name</label>
              <input
                className="ch-input"
                placeholder="Your name"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#888] mb-2 block uppercase tracking-wider">Username</label>
              <input
                className="ch-input"
                placeholder="clutch_king"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                required
              />
            </div>
            <div>
              <label className="text-xs text-[#888] mb-2 block uppercase tracking-wider">Free Fire UID</label>
              <input
                className="ch-input"
                placeholder="123456789"
                value={form.gameUid}
                onChange={(e) => setForm({ ...form, gameUid: e.target.value })}
                required
              />
            </div>
            {error && <p className="text-[#ef4444] text-sm">{error}</p>}
            <button type="submit" className="ch-btn ch-btn-primary w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Complete Profile →'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
