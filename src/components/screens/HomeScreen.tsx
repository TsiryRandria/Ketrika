import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  Folder, 
  ChevronRight,
  Layers,
  BarChart3
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const { 
    setCurrentTab, 
    projects, 
    tasks 
  } = useApp();

  const pendingTasksCount = tasks.filter(t => !t.completed).length;
  const primaryProject = projects[0];

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 md:pb-8 animate-in fade-in duration-200">
      
      {/* 1. Today's Overview Card (Matching page_2_9d4bcb56.png) */}
      <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 relative overflow-hidden">
        {/* Subtle glow highlight */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header: Date */}
        <div className="flex items-center gap-2 text-emerald-300 mb-4">
          <Calendar className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-semibold leading-tight">
              Aujourd'hui
            </p>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Mar. 22 avr. 2025
            </h2>
          </div>
        </div>

        {/* Content Split: Radial Gauge + Tasks Counter + Action CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          
          {/* Progress Circular Gauge */}
          <div 
            onClick={() => setCurrentTab('statistiques')}
            className="flex items-center gap-4 cursor-pointer group"
            title="Consulter les statistiques"
          >
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="rgba(6, 78, 59, 0.6)"
                  strokeWidth="9"
                  fill="transparent"
                />
                {/* Active Emerald Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#00e676"
                  strokeWidth="9"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - 0.67)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="drop-shadow-[0_0_8px_rgba(0,230,118,0.7)]"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold text-white leading-none">67%</span>
                <span className="text-[10px] text-emerald-300 font-medium mt-0.5 leading-tight">
                  de la journée
                </span>
              </div>
            </div>

            <div className="h-14 w-[1px] bg-emerald-500/20 hidden sm:block" />

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {pendingTasksCount}
                </span>
                <span className="text-xs text-emerald-300/80">tâches restantes</span>
              </div>
              <p className="text-xs text-emerald-200/70 mt-0.5">
                tâches à effectuer aujourd'hui
              </p>
            </div>
          </div>

          {/* Action CTA Pills */}
          <div className="flex flex-wrap items-center sm:justify-end gap-2">
            <button
              onClick={() => setCurrentTab('statistiques')}
              className="px-4 py-2.5 rounded-full glass-panel-subtle text-emerald-300 hover:text-white hover:border-emerald-400/50 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Statistiques</span>
            </button>
            <button
              onClick={() => setCurrentTab('taches')}
              className="px-5 py-2.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 hover:text-white hover:bg-emerald-500/40 font-semibold text-xs transition-all flex items-center justify-center gap-2 group shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <span>Voir les tâches</span>
              <ArrowRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </section>

      {/* 2. Project Spotlight Card (Matching page_2_9d4bcb56.png) */}
      {primaryProject && (
        <section 
          onClick={() => setCurrentTab('projets')}
          className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 cursor-pointer hover:border-emerald-400/60 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-emerald-300">
              <Folder className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Projet en cours</span>
            </div>
            <div className="p-1.5 rounded-full bg-emerald-950/60 text-emerald-300 group-hover:translate-x-1 transition-transform">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Project Image Thumbnail */}
            <div className="relative w-full sm:w-36 h-28 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-emerald-500/30">
              <img
                src={primaryProject.image || '/assets/aistudio/page_2_9d4bcb56.png'}
                alt={primaryProject.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
            </div>

            {/* Project Description & Progress */}
            <div className="flex-1 w-full">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {primaryProject.title}
                  </h3>
                  <p className="text-xs text-emerald-200/70 mt-1 line-clamp-2">
                    {primaryProject.description}
                  </p>
                </div>
                <span className="text-lg font-extrabold text-emerald-300 shrink-0">
                  {primaryProject.progress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 w-full bg-emerald-950/80 rounded-full h-2.5 overflow-hidden border border-emerald-500/20">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                  style={{ width: `${primaryProject.progress}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      )}



      {/* 4. Progression des projets (Matching bottom card in page 2) */}
      <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">
              Progression des projets
            </h3>
          </div>
          <span className="text-xs text-emerald-400/80 font-semibold">
            {projects.length} projets
          </span>
        </div>

        <div className="space-y-4">
          {projects.slice(0, 3).map((proj, idx) => {
            const dotColors = ['bg-emerald-400', 'bg-cyan-400', 'bg-purple-400'];
            const barColors = [
              'bg-gradient-to-r from-emerald-400 to-teal-300',
              'bg-gradient-to-r from-cyan-400 to-blue-400',
              'bg-gradient-to-r from-purple-400 to-pink-400'
            ];

            return (
              <div 
                key={proj.id} 
                onClick={() => setCurrentTab('projets')}
                className="cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]} shadow-[0_0_6px_currentColor]`} />
                    <span className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      {proj.title}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-200">{proj.progress}%</span>
                </div>
                <div className="w-full bg-emerald-950/80 rounded-full h-2 overflow-hidden border border-emerald-500/15">
                  <div
                    className={`${barColors[idx % barColors.length]} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${proj.progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};
