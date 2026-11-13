import React, { useState } from 'react';
import { CalendarClock, ChevronDown, Sparkles, Wallet, AlertTriangle, Briefcase } from 'lucide-react';
import type { buildBriefing } from '../../services/assistantService';

type Briefing = ReturnType<typeof buildBriefing>;
const ar = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} Ar`;

export const BriefingCard: React.FC<{ briefing: Briefing; onAsk: (prompt: string) => void; disabled?: boolean }> = ({ briefing: b, onAsk, disabled }) => {
  const [open, setOpen] = useState(true);
  const firstTasks = [...b.overdue, ...b.dueToday].slice(0, 3);

  return (
    <section className="assistant-briefing glass-panel rounded-3xl p-4 border border-emerald-400/30" aria-label="Briefing du jour">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 text-left" aria-expanded={open}>
        <span className="flex items-center gap-2 text-emerald-300">
          <Sparkles className="w-4 h-4 text-emerald-400" aria-hidden />
          <span className="font-bold text-xs uppercase tracking-wider">Briefing du jour</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-emerald-400/70 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile icon={<CalendarClock className="w-3.5 h-3.5" />} label="Aujourd'hui" value={String(b.dueToday.length)} tone="emerald" />
            <Tile icon={<AlertTriangle className="w-3.5 h-3.5" />} label="En retard" value={String(b.overdue.length)} tone={b.overdue.length ? 'rose' : 'emerald'} />
            <Tile icon={<CalendarClock className="w-3.5 h-3.5" />} label="Sous 3 jours" value={String(b.upcoming.length)} tone="cyan" />
            <Tile icon={<Wallet className="w-3.5 h-3.5" />} label="Solde" value={ar(b.balance)} tone="amber" small />
          </div>

          {firstTasks.length > 0 && (
            <ul className="space-y-1">
              {firstTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-[11px] text-white/85">
                  <span className="truncate">• {t.title}</span>
                  <span className={`shrink-0 ${b.overdue.includes(t) ? 'text-rose-300' : 'text-emerald-300/80'}`}>{t.dueDate}</span>
                </li>
              ))}
            </ul>
          )}

          {b.jobs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-cyan-300" aria-hidden />
              {b.jobs.map(({ job }) => (
                <span key={job.id} className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/15 border border-cyan-400/30 text-cyan-100 truncate max-w-[10rem]">{job.title}</span>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => onAsk('Fais-moi mon briefing du jour : priorités, échéances, finances et offres adaptées à mon profil.')}
            className="w-full py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
          >
            Demander mon briefing à Ketrika
          </button>
        </div>
      )}
    </section>
  );
};

const toneClass: Record<string, string> = {
  emerald: 'text-emerald-300 border-emerald-500/25',
  rose: 'text-rose-300 border-rose-400/40',
  cyan: 'text-cyan-300 border-cyan-400/30',
  amber: 'text-amber-300 border-amber-400/30',
};

const Tile: React.FC<{ icon: React.ReactNode; label: string; value: string; tone: string; small?: boolean }> = ({ icon, label, value, tone, small }) => (
  <div className={`rounded-2xl glass-panel-subtle border p-2.5 ${toneClass[tone]}`}>
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-80">{icon}{label}</div>
    <div className={`font-extrabold mt-0.5 ${small ? 'text-sm' : 'text-xl'} text-white`}>{value}</div>
  </div>
);
