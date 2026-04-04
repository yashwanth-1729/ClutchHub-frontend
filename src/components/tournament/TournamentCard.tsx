import { Tournament } from '@/types';
import Link from 'next/link';

const statusBadge: Record<string, string> = {
  OPEN: 'badge-open',
  FULL: 'badge-full',
  ONGOING: 'badge-ongoing',
  COMPLETED: 'badge-completed',
  DRAFT: 'badge-draft',
};

export function TournamentCard({ t }: { t: Tournament }) {
  const filled = Math.round((t.registeredTeams / t.maxTeams) * 100);
  const date = new Date(t.scheduledAt);

  return (
    <Link href={`/tournaments/${t.slug}`}>
      <div className="ch-card overflow-hidden hover:border-[#ff6b2b44] transition-all duration-200 active:scale-[0.98]">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-br from-[#1a1a25] to-[#0d0d15] relative flex items-center justify-center">
          {t.bannerUrl ? (
            <img src={t.bannerUrl} alt={t.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl opacity-30">🔥</span>
          )}
          <div className="absolute top-3 right-3">
            <span className={`badge ${statusBadge[t.status] || 'badge-draft'}`}>{t.status}</span>
          </div>
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
            <span className="text-xs text-[#f5c842] font-syne font-bold">{t.format}</span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-syne font-bold text-base leading-tight mb-1 line-clamp-1">{t.name}</h3>
          <p className="text-[#666] text-xs mb-3">{t.organizerName || 'ClutchHub'}</p>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-[#666] mb-1">
              <span>{t.registeredTeams}/{t.maxTeams} teams</span>
              <span>{filled}%</span>
            </div>
            <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ff6b2b] rounded-full transition-all"
                style={{ width: `${filled}%` }}
              />
            </div>
          </div>

          {/* Info row */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#666]">Prize Pool</div>
              <div className="font-syne font-bold text-[#f5c842]">
                {t.prizePool > 0 ? `₹${t.prizePool.toLocaleString()}` : 'TBD'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#666]">Entry</div>
              <div className="font-syne font-bold text-[#ff6b2b]">
                {t.entryFee > 0 ? `₹${t.entryFee}` : 'Free'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#666]">Date</div>
              <div className="text-sm font-medium">
                {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
