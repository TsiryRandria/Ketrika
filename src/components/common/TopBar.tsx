import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KetrikaLogo } from './KetrikaLogo';
import { 
  Settings, 
  Bell, 
  ChevronLeft, 
  Smartphone, 
  Tablet, 
  Monitor, 
  RotateCcw,
  Search,
  Plus,
  Sparkles,
  Bot,
  ExternalLink
} from 'lucide-react';
import { DeviceMode } from '../../types';

interface TopBarProps {
  onOpenQuickCreate?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenQuickCreate }) => {
  const { 
    currentTab, 
    setCurrentTab, 
    unreadNotificationCount, 
    deviceMode, 
    setDeviceMode,
    profile,
    notifications,
    markNotificationRead,
    isEditingNote,
    isProjectDetailOpen,
    isJobDetailOpen
  } = useApp();

  // Hide top header exclusively on note detail, project detail, and job detail screens
  if (
    (currentTab === 'notes' && isEditingNote) || 
    (currentTab === 'projets' && isProjectDetailOpen) ||
    (currentTab === 'emplois' && isJobDetailOpen)
  ) {
    return null;
  }

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const isSubScreen = ['parametres', 'notifications'].includes(currentTab);

  const getScreenTitle = () => {
    switch (currentTab) {
      case 'accueil': return 'Tableau de bord';
      case 'notes': return 'Notes';
      case 'projets': return 'Projets';
      case 'taches': return 'Tâches';
      case 'assistant': return 'Assistant IA';
      case 'emplois': return 'Emplois';
      case 'finances': return 'Finances';
      case 'statistiques': return 'Statistiques';
      case 'parametres': return 'Paramètres';
      case 'notifications': return 'Notifications';
      default: return 'Ketrika';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-emerald-500/20 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        
        {/* Mobile / Screen-Specific Left Affordance */}
        <div className="flex items-center gap-3">
          {isSubScreen ? (
            <button
              onClick={() => setCurrentTab('accueil')}
              className="p-2.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 hover:text-white hover:bg-emerald-900/60 transition-all flex items-center justify-center shrink-0"
              title="Retour à l'accueil"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentTab('parametres')}
              className="p-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/25 text-emerald-300 hover:text-white hover:border-emerald-400/60 transition-all flex items-center justify-center shrink-0 md:hidden"
              title="Paramètres"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          {/* Brand Wordmark & Title */}
          <div 
            onClick={() => setCurrentTab('accueil')} 
            className="cursor-pointer flex items-center gap-3"
          >
            <KetrikaLogo size="sm" showText={false} />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">
                  {currentTab === 'statistiques' ? 'statistique' : 'ketrika'}
                </span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Pro
                </span>
                <button
                  onClick={() => setCurrentTab('parametres')}
                  className="hidden xl:inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 transition-colors cursor-pointer"
                  title="Base de données locale SQLite et persistance hors connexion actives"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>SQLite Hors-ligne</span>
                </button>
              </div>
              <p className="text-xs text-emerald-400/80 -mt-0.5">
                {getScreenTitle()}
              </p>
            </div>
            {/* Mobile center brand */}
            <div className="sm:hidden font-extrabold text-xl text-white tracking-tight">
              {currentTab === 'accueil' ? 'ketrika' : (currentTab === 'statistiques' ? 'statistique' : getScreenTitle())}
            </div>
          </div>
        </div>

        {/* Desktop Global Search & Status */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60" />
            <input
              type="text"
              placeholder="Rechercher une tâche, un projet, une note (⌘K)..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm glass-input placeholder:text-emerald-300/40 focus:ring-1 focus:ring-emerald-400 transition-all"
            />
          </div>
        </div>

        {/* Right Action Zone: Device Mode Selector + Actions + Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Responsive Device Viewport Switcher - Expert feature honoring the user prompt */}
          <div className="hidden md:flex items-center p-1 rounded-xl bg-emerald-950/80 border border-emerald-500/25">
            <button
              onClick={() => setDeviceMode('auto')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                deviceMode === 'auto' 
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)] font-bold' 
                  : 'text-emerald-300/70 hover:text-white'
              }`}
              title="Affichage Adaptatif Automatique (Fluid)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Auto</span>
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                deviceMode === 'mobile' 
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)] font-bold' 
                  : 'text-emerald-300/70 hover:text-white'
              }`}
              title="Aperçu Android Mobile (390px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Android</span>
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                deviceMode === 'tablet' 
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)] font-bold' 
                  : 'text-emerald-300/70 hover:text-white'
              }`}
              title="Aperçu Tablette (820px)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Tablette</span>
            </button>
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                deviceMode === 'desktop' 
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)] font-bold' 
                  : 'text-emerald-300/70 hover:text-white'
              }`}
              title="Aperçu PC Bureau Widescreen (1440px)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">PC</span>
            </button>
          </div>

          {/* Quick Create Button (Desktop/Tablet) */}
          {onOpenQuickCreate && (
            <button
              onClick={onOpenQuickCreate}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs hover:shadow-[0_0_18px_rgba(0,230,118,0.5)] transition-all shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nouveau</span>
            </button>
          )}

          {/* Notification / Settings Action Button */}
          <div className="relative">
            <button
              onClick={() => {
                if (currentTab === 'parametres') {
                  setCurrentTab('accueil');
                } else {
                  if (window.innerWidth < 768) {
                    setCurrentTab('notifications');
                  } else {
                    setShowNotifDropdown(!showNotifDropdown);
                  }
                }
              }}
              className={`relative p-2.5 rounded-2xl transition-all flex items-center justify-center shrink-0 ${
                currentTab === 'parametres'
                  ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-emerald-950/60 border border-emerald-500/25 text-emerald-300 hover:text-white hover:border-emerald-400/60'
              }`}
              title={currentTab === 'parametres' ? 'Paramètres (Actif - cliquer pour fermer)' : 'Notifications'}
            >
              {currentTab === 'parametres' ? (
                <Settings className="w-5 h-5 text-emerald-300" />
              ) : (
                <>
                  <Bell className="w-5 h-5" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow-[0_0_10px_#f43f5e] animate-pulse">
                      {unreadNotificationCount}
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Desktop Notifications Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel rounded-2xl p-4 shadow-2xl border border-emerald-500/30 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Notifications</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {unreadNotificationCount} non lues
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      setCurrentTab('notifications');
                      setShowNotifDropdown(false);
                    }}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    Voir tout <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="divide-y divide-emerald-500/10 max-h-72 overflow-y-auto no-scrollbar py-1">
                  {notifications.slice(0, 4).map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`py-2.5 px-2 rounded-xl transition-colors cursor-pointer flex items-start gap-3 hover:bg-emerald-500/10 ${
                        !n.isRead ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full mt-2 shrink-0 bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                        <p className="text-[11px] text-emerald-200/70 line-clamp-1">{n.description}</p>
                        <p className="text-[10px] text-emerald-400/60 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar (Direct access to Settings) */}
          <button
            onClick={() => setCurrentTab('parametres')}
            className="flex items-center gap-2 p-1 pl-1 pr-2 rounded-2xl bg-emerald-950/60 border border-emerald-500/25 hover:border-emerald-400/60 transition-all shrink-0"
            title="Profil & Paramètres"
          >
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-8 h-8 rounded-xl object-cover border border-emerald-400/40"
            />
            <div className="hidden lg:block text-left pr-1">
              <p className="text-xs font-bold text-white leading-tight truncate max-w-[100px]">{profile.name}</p>
              <p className="text-[10px] text-amber-300 font-medium">★ Premium</p>
            </div>
          </button>

        </div>
      </div>
    </header>
  );
};
