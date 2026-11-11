import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NotificationItem } from '../../types';
import { 
  Bell, 
  Settings, 
  Check, 
  Trash2, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Folder, 
  Users, 
  DollarSign, 
  Cpu, 
  AlertTriangle, 
  ChevronRight
} from 'lucide-react';

export const NotificationsScreen: React.FC = () => {
  const { 
    notifications, 
    unreadNotificationCount, 
    markNotificationRead, 
    deleteNotification, 
    markAllNotificationsRead, 
    clearAllNotifications, 
    setCurrentTab 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'recents' | 'anterieurs'>('recents');

  const recents = notifications.filter(n => n.isRecent);
  const anterieurs = notifications.filter(n => !n.isRecent);

  const displayedNotifications = activeTab === 'recents' ? recents : anterieurs;

  const getNotificationIcon = (cat: NotificationItem['category']) => {
    switch (cat) {
      case 'task':
        return {
          icon: CheckCircle2,
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      case 'project':
        return {
          icon: Folder,
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
      case 'deadline':
        return {
          icon: Calendar,
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'meeting':
        return {
          icon: Users,
          bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        };
      case 'finance':
        return {
          icon: DollarSign,
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      case 'ai':
        return {
          icon: Cpu,
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
      case 'budget':
        return {
          icon: AlertTriangle,
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      default:
        return {
          icon: Bell,
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200 max-w-4xl mx-auto">
      
      {/* 2. Top Banner Card: Unread Count + Tout marquer comme lu (Matching page 10) */}
      <div className="glass-panel rounded-3xl p-5 border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow-[0_0_8px_#f43f5e]">
                {unreadNotificationCount}
              </span>
            )}
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-white">
              {unreadNotificationCount}
            </span>
            <p className="text-xs text-emerald-200/70">
              notifications non lues
            </p>
          </div>
        </div>

        <button
          onClick={markAllNotificationsRead}
          className="px-5 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.5)] hover:shadow-[0_0_25px_rgba(0,230,118,0.8)] transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Tout marquer comme lu</span>
        </button>
      </div>

      {/* 3. Segmented Filter Tabs: Récents (5), Antérieures (7) (Matching page 10) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setActiveTab('recents')}
          className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeTab === 'recents'
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(0,230,118,0.5)]'
              : 'glass-panel text-emerald-200/70 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Récents ({recents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('anterieurs')}
          className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeTab === 'anterieurs'
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(0,230,118,0.5)]'
              : 'glass-panel text-emerald-200/70 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Antérieures ({anterieurs.length})</span>
        </button>
      </div>

      {/* 4. Notification Items List (Matching page 10 rows with checkmark & trash actions) */}
      <div className="space-y-3">
        {displayedNotifications.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 text-center border border-emerald-500/20">
            <p className="text-sm text-emerald-300/70">Aucune notification dans cette section.</p>
          </div>
        ) : (
          displayedNotifications.map((notif) => {
            const { icon: Icon, bg } = getNotificationIcon(notif.category);

            return (
              <div
                key={notif.id}
                className={`glass-panel rounded-3xl p-4 sm:p-5 border transition-all flex items-center justify-between gap-3 ${
                  !notif.isRead 
                    ? 'border-emerald-400/50 bg-emerald-950/40 shadow-[0_2px_15px_rgba(16,185,129,0.15)]' 
                    : 'border-emerald-500/20 opacity-80'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Category Colored Icon */}
                  <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm sm:text-base leading-tight truncate">
                      {notif.title}
                    </h3>
                    <p className="text-xs text-emerald-200/70 mt-0.5 line-clamp-1">
                      {notif.description}
                    </p>
                    <p className="text-[11px] text-emerald-400/60 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" /> {notif.time}
                    </p>
                  </div>
                </div>

                {/* Right Action Icons: Mark Read & Delete */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => markNotificationRead(notif.id)}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                      notif.isRead
                        ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                        : 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_8px_#10b981]'
                    }`}
                    title="Marquer comme lu"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>

                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Bottom Buttons (Matching page 10: Effacer toutes les notifications & Paramètres des notifications) */}
      <div className="space-y-3 pt-2">
        <button
          onClick={clearAllNotifications}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>Effacer toutes les notifications</span>
        </button>

        <button
          onClick={() => setCurrentTab('parametres')}
          className="w-full py-3.5 rounded-2xl glass-panel border border-emerald-400/40 text-emerald-200 hover:text-white hover:bg-emerald-900/40 font-bold text-xs transition-all flex items-center justify-center gap-2"
        >
          <Settings className="w-4 h-4 text-emerald-400" />
          <span>Paramètres des notifications</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
