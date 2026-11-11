import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FileText, 
  Folder, 
  Home, 
  CheckCircle2, 
  MoreHorizontal,
  Sparkles,
  Briefcase,
  Wallet,
  BarChart3,
  X
} from 'lucide-react';
import { NavigationTab } from '../../types';

export const BottomNav: React.FC = () => {
  const { currentTab, setCurrentTab, showQuickMenu, setShowQuickMenu } = useApp();

  const navItems = [
    { id: 'notes' as NavigationTab, label: 'Note', icon: FileText },
    { id: 'projets' as NavigationTab, label: 'Projets', icon: Folder },
    { id: 'accueil' as NavigationTab, label: 'Accueil', icon: Home, isCenter: true },
    { id: 'taches' as NavigationTab, label: 'Tâches', icon: CheckCircle2 },
  ];

  const quickMenuItems = [
    { id: 'assistant' as NavigationTab, label: 'Assistant IA', icon: Sparkles },
    { id: 'emplois' as NavigationTab, label: 'Emplois', icon: Briefcase },
    { id: 'finances' as NavigationTab, label: 'Finances', icon: Wallet },
    { id: 'statistiques' as NavigationTab, label: 'Statistiques', icon: BarChart3 },
  ];

  const handleTabClick = (tab: NavigationTab) => {
    setShowQuickMenu(false);
    setCurrentTab(tab);
  };

  const handleMenuClick = () => {
    setShowQuickMenu(prev => !prev);
  };

  const isQuickMenuActive = ['assistant', 'emplois', 'finances', 'statistiques'].includes(currentTab);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-1 pointer-events-none md:hidden">
      
      {/* Floating Quick Action Popup Menu (Matching page_2_9d4bcb56.png) */}
      {showQuickMenu && (
        <div className="pointer-events-auto max-w-sm mx-auto mb-2 px-3 py-2.5 rounded-2xl glass-panel border border-emerald-400/50 shadow-[0_0_30px_rgba(16,185,129,0.35)] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-emerald-500/20 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Raccourcis Ketrika
            </span>
            <button 
              onClick={() => setShowQuickMenu(false)}
              className="text-emerald-400/80 hover:text-white p-0.5 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {quickMenuItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={`${item.id}-${idx}`}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-emerald-500/30 text-white border border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.4)]' 
                      : 'text-emerald-200/80 hover:bg-emerald-800/30 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1 text-emerald-400" />
                  <span className="text-[10px] font-medium leading-tight truncate w-full text-center">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Glassmorphic Navigation Bar */}
      <nav className="pointer-events-auto max-w-md mx-auto glass-panel rounded-3xl px-2 py-1.5 border border-emerald-500/30 shadow-[0_10px_35px_rgba(0,15,10,0.8)] backdrop-blur-2xl">
        <div className="flex items-center justify-around">
          
          {/* Note */}
          <button
            onClick={() => handleTabClick('notes')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
              currentTab === 'notes' ? 'text-white' : 'text-emerald-300/60 hover:text-emerald-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${currentTab === 'notes' ? 'text-emerald-300 neon-glow-green-sm' : ''}`}>
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium mt-0.5">Note</span>
          </button>

          {/* Projets */}
          <button
            onClick={() => handleTabClick('projets')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
              currentTab === 'projets' ? 'text-white' : 'text-emerald-300/60 hover:text-emerald-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${currentTab === 'projets' ? 'text-emerald-300 neon-glow-green-sm' : ''}`}>
              <Folder className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium mt-0.5">Projets</span>
          </button>

          {/* Center: Accueil with Glowing Radiant Halo */}
          <button
            onClick={() => handleTabClick('accueil')}
            className="relative flex flex-col items-center justify-center px-3 group"
          >
            <div className={`w-12 h-12 -mt-3 rounded-full flex items-center justify-center transition-all ${
              currentTab === 'accueil'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-300 text-slate-950 shadow-[0_0_25px_rgba(0,230,118,0.7)] scale-105'
                : 'bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 hover:scale-105'
            }`}>
              <Home className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className={`text-[11px] font-bold mt-0.5 transition-colors ${
              currentTab === 'accueil' ? 'text-emerald-300' : 'text-emerald-300/60'
            }`}>
              Accueil
            </span>
            {currentTab === 'accueil' && (
              <div className="w-6 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_6px_#34d399] mt-0.5" />
            )}
          </button>

          {/* Tâches */}
          <button
            onClick={() => handleTabClick('taches')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
              currentTab === 'taches' ? 'text-white' : 'text-emerald-300/60 hover:text-emerald-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${currentTab === 'taches' ? 'text-emerald-300 neon-glow-green-sm' : ''}`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium mt-0.5">Tâches</span>
          </button>

          {/* Menu / Plus */}
          <button
            onClick={handleMenuClick}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
              showQuickMenu || isQuickMenuActive ? 'text-white' : 'text-emerald-300/60 hover:text-emerald-200'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
              showQuickMenu || isQuickMenuActive
                ? 'bg-emerald-500/40 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300/70'
            }`}>
              <MoreHorizontal className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-medium mt-0.5">Menu</span>
          </button>

        </div>
      </nav>
    </div>
  );
};
