import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TopBar } from './components/common/TopBar';
import { BottomNav } from './components/common/BottomNav';
import { DesktopSidebar } from './components/common/DesktopSidebar';
import { BackgroundWaves } from './components/common/BackgroundWaves';
import { WelcomeScreen } from './components/screens/WelcomeScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { NotesScreen } from './components/screens/NotesScreen';
import { ProjectsScreen } from './components/screens/ProjectsScreen';
import { TasksScreen } from './components/screens/TasksScreen';
import { AssistantScreen } from './components/screens/AssistantScreen';
import { JobsScreen } from './components/screens/JobsScreen';
import { FinancesScreen } from './components/screens/FinancesScreen';
import { StatisticsScreen } from './components/screens/StatisticsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { 
  Plus, 
  X, 
  CheckCircle2, 
  Folder, 
  FileText, 
  Wallet,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentTab, setCurrentTab, deviceMode, setDeviceMode } = useApp();
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  // If on Welcome screen, render the exact page_1 design
  if (currentTab === 'bienvenue') {
    return <WelcomeScreen />;
  }

  const renderCurrentScreen = () => {
    switch (currentTab) {
      case 'accueil': return <HomeScreen />;
      case 'notes': return <NotesScreen />;
      case 'projets': return <ProjectsScreen />;
      case 'taches': return <TasksScreen />;
      case 'assistant': return <AssistantScreen />;
      case 'emplois': return <JobsScreen />;
      case 'finances': return <FinancesScreen />;
      case 'statistiques': return <StatisticsScreen />;
      case 'parametres': return <SettingsScreen />;
      case 'notifications': return <NotificationsScreen />;
      default: return <HomeScreen />;
    }
  };

  // Wrapper layout based on deviceMode ('auto', 'mobile', 'tablet', 'desktop')
  return (
    <div className="min-h-screen text-[#eafff5] relative overflow-x-hidden selection:bg-emerald-500 selection:text-slate-950">
      <BackgroundWaves />

      {/* DEVICE SIMULATION VIEW: Mobile Android Frame */}
      {deviceMode === 'mobile' && (
        <div className="py-6 px-4 flex flex-col items-center justify-center min-h-screen relative z-10">
          <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-xs text-emerald-300">
            <Smartphone className="w-3.5 h-3.5" />
            <span className="font-semibold">Mode Android Mobile Réactif</span>
            <button
              onClick={() => setDeviceMode('auto')}
              className="ml-2 text-white hover:underline text-[11px]"
            >
              (Quitter l'aperçu)
            </button>
          </div>

          {/* Android Phone Mockup Frame */}
          <div className="w-full max-w-[420px] h-[890px] rounded-[44px] bg-[#002419] p-3 shadow-[0_0_60px_rgba(0,230,118,0.35)] border-[4px] border-emerald-500/60 relative flex flex-col overflow-hidden">
            
            {/* Android Notch / Speaker / Camera */}
            <div className="w-full h-6 flex items-center justify-between px-6 pt-1 text-[11px] text-emerald-300 font-bold shrink-0 select-none">
              <span>09:41</span>
              <div className="w-16 h-4 bg-emerald-950/80 rounded-full border border-emerald-500/30" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* Inner Phone Screen with exact forest green background from page_2 */}
            <div className="flex-1 w-full bg-gradient-to-b from-[#015437] via-[#01412b] to-[#012d1e] rounded-[34px] overflow-y-auto no-scrollbar relative flex flex-col border border-emerald-500/30">
              <TopBar onOpenQuickCreate={() => setShowQuickCreate(true)} />
              <main className={`flex-1 flex flex-col min-h-0 ${currentTab === 'assistant' ? 'p-0' : 'p-4'}`}>
                {renderCurrentScreen()}
              </main>
              <BottomNav />
            </div>

            {/* Android Navigation Bar Bar */}
            <div className="w-32 h-1 bg-emerald-400/50 rounded-full self-center my-1.5" />
          </div>
        </div>
      )}

      {/* DEVICE SIMULATION VIEW: Tablet Frame */}
      {deviceMode === 'tablet' && (
        <div className="py-6 px-4 flex flex-col items-center justify-center min-h-screen relative z-10">
          <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-xs text-emerald-300">
            <Tablet className="w-3.5 h-3.5" />
            <span className="font-semibold">Mode Tablette Réactif (iPad / Galaxy Tab)</span>
            <button
              onClick={() => setDeviceMode('auto')}
              className="ml-2 text-white hover:underline text-[11px]"
            >
              (Quitter l'aperçu)
            </button>
          </div>

          <div className="w-full max-w-[820px] h-[920px] rounded-[36px] bg-[#002419] p-4 shadow-[0_0_60px_rgba(0,230,118,0.35)] border-[4px] border-emerald-500/60 relative flex flex-col overflow-hidden">
            <div className="flex-1 w-full bg-gradient-to-b from-[#015437] via-[#01412b] to-[#012d1e] rounded-[28px] overflow-y-auto no-scrollbar relative flex flex-col border border-emerald-500/30">
              <TopBar onOpenQuickCreate={() => setShowQuickCreate(true)} />
              <div className="flex-1 flex overflow-hidden">
                <DesktopSidebar />
                <main className={`flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar ${currentTab === 'assistant' ? 'p-0' : 'p-6'}`}>
                  {renderCurrentScreen()}
                </main>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL RESPONSIVE & DESKTOP (PC) WIDESCREEN VIEW */}
      {(deviceMode === 'auto' || deviceMode === 'desktop') && (
        <div className="relative z-10 flex min-h-screen w-full">
          
          {/* Desktop/Tablet Sidebar (Hidden on small mobile screens in auto mode) */}
          <div className="hidden md:block">
            <DesktopSidebar />
          </div>

          {/* Main Application Column */}
          <div className="flex-1 flex flex-col min-w-0 min-h-screen">
            <TopBar onOpenQuickCreate={() => setShowQuickCreate(true)} />

            <main
              className={
                currentTab === 'assistant'
                  ? 'flex-1 w-full flex flex-col min-h-0'
                  : 'flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8'
              }
            >
              {renderCurrentScreen()}
            </main>

            {/* Mobile Bottom Navigation (Only visible on small viewports in auto mode) */}
            <div className="md:hidden">
              <BottomNav />
            </div>
          </div>

        </div>
      )}

      {/* Quick Create Floating Modal */}
      {showQuickCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm glass-panel rounded-3xl p-5 border border-emerald-400/50 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <h3 className="font-bold text-white text-base">Action rapide Ketrika</h3>
              <button 
                onClick={() => setShowQuickCreate(false)}
                className="text-emerald-400/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => {
                  setShowQuickCreate(false);
                  setCurrentTab('taches');
                }}
                className="p-3.5 rounded-2xl glass-panel-subtle border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-900/40 text-left transition-all group flex flex-col gap-2"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-xs">Nouvelle Tâche</span>
              </button>

              <button
                onClick={() => {
                  setShowQuickCreate(false);
                  setCurrentTab('projets');
                }}
                className="p-3.5 rounded-2xl glass-panel-subtle border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-900/40 text-left transition-all group flex flex-col gap-2"
              >
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                  <Folder className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-xs">Nouveau Projet</span>
              </button>

              <button
                onClick={() => {
                  setShowQuickCreate(false);
                  setCurrentTab('notes');
                }}
                className="p-3.5 rounded-2xl glass-panel-subtle border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-900/40 text-left transition-all group flex flex-col gap-2"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-xs">Nouvelle Note</span>
              </button>

              <button
                onClick={() => {
                  setShowQuickCreate(false);
                  setCurrentTab('finances');
                }}
                className="p-3.5 rounded-2xl glass-panel-subtle border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-900/40 text-left transition-all group flex flex-col gap-2"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-xs">Transaction</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
