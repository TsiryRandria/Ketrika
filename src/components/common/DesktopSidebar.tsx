import React from 'react';
import { useApp } from '../../context/AppContext';
import { KetrikaLogo } from './KetrikaLogo';
import { 
  Home, 
  Folder, 
  CheckCircle2, 
  FileText, 
  Sparkles, 
  Briefcase, 
  Wallet, 
  Bell, 
  Settings, 
  Crown,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { NavigationTab } from '../../types';

export const DesktopSidebar: React.FC = () => {
  const { 
    currentTab, 
    setCurrentTab, 
    projects, 
    tasks, 
    notes, 
    jobs, 
    unreadNotificationCount, 
    profile 
  } = useApp();

  const primaryNav = [
    { id: 'accueil' as NavigationTab, label: 'Tableau de bord', icon: Home },
    { 
      id: 'projets' as NavigationTab, 
      label: 'Projets', 
      icon: Folder, 
      badge: `${projects.length}`,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
    },
    { 
      id: 'taches' as NavigationTab, 
      label: 'Tâches', 
      icon: CheckCircle2, 
      badge: `${tasks.filter(t => !t.completed).length}`,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
    },
    { 
      id: 'notes' as NavigationTab, 
      label: 'Notes & Mémos', 
      icon: FileText, 
      badge: `${notes.length}`,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
    },
  ];

  const toolsNav = [
    { 
      id: 'statistiques' as NavigationTab, 
      label: 'Statistiques', 
      icon: BarChart3, 
      badge: 'KPI',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
    },
    { 
      id: 'assistant' as NavigationTab, 
      label: 'Assistant IA', 
      icon: Sparkles, 
      badge: 'IA',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.4)]' 
    },
    { 
      id: 'emplois' as NavigationTab, 
      label: 'Emplois & Carrière', 
      icon: Briefcase, 
      badge: `${jobs.filter(j => j.isFavorite).length} fav.`,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
    },
    { 
      id: 'finances' as NavigationTab, 
      label: 'Finances & Budget', 
      icon: Wallet, 
      badge: 'Ar',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
    },
  ];

  const systemNav = [
    { 
      id: 'notifications' as NavigationTab, 
      label: 'Notifications', 
      icon: Bell, 
      badge: unreadNotificationCount > 0 ? `${unreadNotificationCount}` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.4)]' 
    },
    { id: 'parametres' as NavigationTab, label: 'Paramètres & Profil', icon: Settings },
    { id: 'bienvenue' as NavigationTab, label: 'Page de bienvenue', icon: Sparkles },
  ];

  return (
    <aside className="w-64 lg:w-72 shrink-0 glass-panel border-r border-emerald-500/20 flex flex-col justify-between p-4 sticky top-0 h-screen overflow-y-auto no-scrollbar">
      <div>
        {/* Brand Header */}
        <div 
          onClick={() => setCurrentTab('accueil')}
          className="cursor-pointer pb-6 pt-2 px-2 border-b border-emerald-500/20 flex items-center justify-between"
        >
          <KetrikaLogo size="md" />
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            v1.0
          </span>
        </div>

        {/* Section 1: Principal */}
        <div className="mt-6">
          <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/60 px-3 mb-2">
            Espace de travail
          </p>
          <div className="space-y-1">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/10 text-white border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : 'text-emerald-200/70 hover:bg-emerald-900/30 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-emerald-400/80'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Outils & Expertise */}
        <div className="mt-6">
          <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/60 px-3 mb-2">
            Intelligence & Hub
          </p>
          <div className="space-y-1">
            {toolsNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/10 text-white border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : 'text-emerald-200/70 hover:bg-emerald-900/30 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-emerald-400/80'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Configuration */}
        <div className="mt-6">
          <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/60 px-3 mb-2">
            Système
          </p>
          <div className="space-y-1">
            {systemNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/10 text-white border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : 'text-emerald-200/70 hover:bg-emerald-900/30 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-emerald-400/80'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Profile Widget */}
      <div className="pt-4 border-t border-emerald-500/20">
        <button
          onClick={() => setCurrentTab('parametres')}
          className="w-full p-2.5 rounded-2xl glass-panel-subtle border border-emerald-500/30 hover:border-emerald-400/60 transition-all flex items-center gap-3 text-left group"
        >
          <div className="relative shrink-0">
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-10 h-10 rounded-xl object-cover border border-emerald-400/40"
            />
            {profile.isPremium && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-[0_0_6px_#f59e0b]">
                <Crown className="w-2.5 h-2.5 fill-current" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
              {profile.name}
            </p>
            <p className="text-[11px] text-emerald-400/70 truncate">{profile.address.split(',')[0]}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-400/60 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </aside>
  );
};
