import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  Calendar, 
  Folder, 
  Layers, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target, 
  Award, 
  Sparkles,
  PieChart,
  Activity,
  Zap,
  ChevronRight
} from 'lucide-react';

export const StatisticsScreen: React.FC = () => {
  const { 
    tasks, 
    projects, 
    totalRevenue, 
    totalExpense, 
    currentBalance,
    setCurrentTab 
  } = useApp();

  const [period, setPeriod] = useState<'Jour' | 'Semaine' | 'Mois' | 'Année'>('Mois');

  // Dynamic calculations based on tasks state
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const inProgressTasks = tasks.filter(t => !t.completed && (t.status === 'En cours' || t.status === 'À faire')).length;
  const overdueTasks = tasks.filter(t => t.isOverdue || (!t.completed && t.dueDate === '14/04/2025')).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Projects calculations
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'Terminé' || p.progress === 100).length;
  const averageProjectProgress = totalProjects > 0
    ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / totalProjects)
    : 0;

  // Time spent per period (realistic estimates)
  const timeSpentConfig = {
    Jour: { hours: 7, minutes: 45, label: 'aujourd’hui', change: '+12%', avgDaily: '7h 45m' },
    Semaine: { hours: 38, minutes: 20, label: 'cette semaine', change: '+15.4%', avgDaily: '7h 40m' },
    Mois: { hours: 164, minutes: 30, label: 'ce mois-ci', change: '+18.2%', avgDaily: '7h 28m' },
    Année: { hours: 1840, minutes: 0, label: 'cette année', change: '+24.0%', avgDaily: '7h 35m' },
  };

  const currentTime = timeSpentConfig[period];

  // Productivity chart data per period
  const chartDataConfig = {
    Jour: {
      labels: ['08h', '10h', '12h', '14h', '16h', '18h', '20h'],
      completed: [1, 2, 1, 3, 4, 2, 1],
      target: [2, 2, 2, 2, 2, 2, 1],
      max: 5,
    },
    Semaine: {
      labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      completed: [4, 6, 5, 8, 7, 3, 2],
      target: [5, 5, 5, 5, 5, 2, 2],
      max: 10,
    },
    Mois: {
      labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
      completed: [18, 24, 21, 29],
      target: [20, 20, 20, 20],
      max: 35,
    },
    Année: {
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
      completed: [45, 52, 60, 58, 65, 72, 68, 55, 78, 85, 90, 88],
      target: [50, 50, 55, 55, 60, 60, 65, 65, 70, 70, 75, 75],
      max: 100,
    },
  };

  const activeChart = chartDataConfig[period];

  // Category time distribution
  const categories = [
    { name: 'Développement', percentage: 42, color: 'bg-emerald-400', stroke: '#34d399', hours: '69h' },
    { name: 'Design & Maquettes', percentage: 26, color: 'bg-cyan-400', stroke: '#22d3ee', hours: '43h' },
    { name: 'Organisation & Suivi', percentage: 18, color: 'bg-amber-400', stroke: '#fbbf24', hours: '29h' },
    { name: 'Marketing & Échange', percentage: 14, color: 'bg-purple-400', stroke: '#c084fc', hours: '23h' },
  ];

  // Financial delta
  const netSavings = totalRevenue - totalExpense;
  const savingsRate = totalRevenue > 0 ? Math.round((netSavings / totalRevenue) * 100) : 0;

  // Goals reached
  const goals = [
    { title: 'Refonte modulaire Ketrika v1', category: 'Développement', achieved: true, date: 'Avril 2025' },
    { title: 'Objectif d’épargne 2 000 000 Ar', category: 'Finances', achieved: true, date: 'Mars 2025' },
    { title: 'Taux de réalisation > 70%', category: 'Productivité', achieved: completionRate >= 70, date: 'En cours' },
    { title: 'Certification Cloud Google', category: 'Formation', achieved: true, date: 'Février 2025' },
  ];

  return (
    <div className="space-y-6 pb-28 md:pb-12 animate-in fade-in duration-200">
      
      {/* Filtre par période (Jour, Semaine, Mois, Année) */}
      <div className="flex items-center justify-end">
        <div className="flex items-center p-1 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 shadow-inner">
          {(['Jour', 'Semaine', 'Mois', 'Année'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                period === p
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(0,230,118,0.5)] font-bold'
                  : 'text-emerald-300/70 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Résumé général de l'activité */}
      <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Résumé général de l'activité · {period}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              Excellente dynamique opérationnelle avec un taux de complétion de {completionRate}%
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed">
              Vous avez complété <strong className="text-white">{completedTasks} tâches</strong> sur {totalTasks}, 
              avec <strong className="text-white">{currentTime.hours}h {currentTime.minutes}m</strong> de travail effectif. 
              Vos finances affichent une marge bénéficiaire nette saine de <strong className="text-emerald-300">{netSavings.toLocaleString('fr-FR')} Ar</strong> ({savingsRate}% du revenu global).
            </p>
          </div>

          {/* Quick Snapshot Badges */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/25 text-xs text-emerald-300">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Rythme : <strong className="text-white">Optimal</strong></span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/25 text-xs text-emerald-300">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Vélocité : <strong className="text-white">+18.4%</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* 4 to 8: TÂCHES KPI GRID (Nombre total, terminées, en cours, en retard, taux de réalisation) */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* 4. Nombre total de tâches */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30">
          <div className="flex items-center justify-between text-emerald-300/80 text-xs font-semibold mb-2">
            <span>Total des tâches</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
              {totalTasks}
            </span>
            <span className="text-[11px] font-bold text-emerald-400">100%</span>
          </div>
          <p className="text-[11px] text-emerald-300/60 mt-1">toutes catégories</p>
        </div>

        {/* 5. Nombre de tâches terminées */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30">
          <div className="flex items-center justify-between text-emerald-300/80 text-xs font-semibold mb-2">
            <span>Tâches terminées</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">
              {completedTasks}
            </span>
            <span className="text-[11px] font-bold text-emerald-400">↑ +14%</span>
          </div>
          <p className="text-[11px] text-emerald-300/60 mt-1">validées avec succès</p>
        </div>

        {/* 6. Nombre de tâches en cours */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30">
          <div className="flex items-center justify-between text-emerald-300/80 text-xs font-semibold mb-2">
            <span>Tâches en cours</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-cyan-300 tabular-nums">
              {inProgressTasks}
            </span>
            <span className="text-[11px] font-bold text-cyan-400">Actives</span>
          </div>
          <p className="text-[11px] text-emerald-300/60 mt-1">à compléter</p>
        </div>

        {/* 7. Nombre de tâches en retard */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30">
          <div className="flex items-center justify-between text-emerald-300/80 text-xs font-semibold mb-2">
            <span>Tâches en retard</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-rose-400 tabular-nums">
              {overdueTasks}
            </span>
            <span className="text-[11px] font-bold text-rose-400">Prioritaire</span>
          </div>
          <p className="text-[11px] text-emerald-300/60 mt-1">échéance dépassée</p>
        </div>

        {/* 8. Taux de réalisation des tâches (%) */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-emerald-300/80 text-xs font-semibold mb-2">
            <span>Taux de réalisation</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
              {completionRate}%
            </span>
            <span className="text-[11px] font-bold text-emerald-400">Objectif 70%</span>
          </div>
          <div className="w-full bg-emerald-950/80 rounded-full h-1.5 mt-2 overflow-hidden border border-emerald-500/20">
            <div 
              className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_#34d399]"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

      </section>

      {/* 9 & 10: GRAPHIQUE DE PRODUCTIVITÉ & ÉVOLUTION DE LA PRODUCTIVITÉ */}
      <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-base">
                9. Graphique de productivité · {period}
              </h3>
            </div>
            {/* 10. Évolution de la productivité */}
            <p className="text-xs text-emerald-300/70 mt-0.5">
              <strong>10. Évolution de la productivité :</strong> Progression de <span className="text-emerald-400 font-bold">+18.4%</span> avec un pic de rendement le jeudi et en milieu de matinée (10h-12h).
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              Tâches réalisées
            </span>
            <span className="flex items-center gap-1.5 text-emerald-300/60">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              Cible moyenne
            </span>
          </div>
        </div>

        {/* Custom SVG Bar & Trend Chart */}
        <div className="w-full h-64 pt-2">
          <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-emerald-500/20 pb-2">
            {activeChart.labels.map((lbl, idx) => {
              const val = activeChart.completed[idx];
              const tgt = activeChart.target[idx];
              const max = activeChart.max;
              const heightPct = Math.min(100, Math.round((val / max) * 100));
              const tgtHeightPct = Math.min(100, Math.round((tgt / max) * 100));

              return (
                <div key={lbl} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full relative">
                    
                    {/* Tooltip on hover */}
                    <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-emerald-500/40 rounded-lg px-2 py-1 text-[10px] text-white whitespace-nowrap pointer-events-none z-20 shadow-lg">
                      {val} terminées / {tgt} visées
                    </div>

                    {/* Actual Completed Bar */}
                    <div 
                      className="w-full max-w-[28px] bg-gradient-to-t from-emerald-500 to-teal-300 rounded-t-lg transition-all duration-500 hover:brightness-110 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      style={{ height: `${heightPct}%` }}
                    />
                    
                    {/* Target Outline Bar */}
                    <div 
                      className="w-full max-w-[28px] border border-dashed border-emerald-400/40 rounded-t-lg bg-emerald-950/20"
                      style={{ height: `${tgtHeightPct}%` }}
                    />
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-300/80 mt-2 truncate max-w-full">
                    {lbl}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-emerald-300/70 pt-3">
            <span>Échelle : 0 à {activeChart.max} unités</span>
            <span className="font-semibold text-emerald-400">Moyenne : {(activeChart.completed.reduce((a,b)=>a+b,0)/activeChart.completed.length).toFixed(1)} tâches / intervalle</span>
          </div>
        </div>
      </section>

      {/* 2-Column Split: PROJETS & TEMPS D'ACTIVITÉ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: 11, 12, 13 (Projets créés, terminés, progression) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  11-13. Projets & Progression
                </h3>
              </div>
              <button 
                onClick={() => setCurrentTab('projets')}
                className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
              >
                Gérer les projets <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 11 & 12 Project KPIs */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/25">
                <p className="text-[11px] text-emerald-300/70 font-medium">11. Projets créés</p>
                <p className="text-xl sm:text-2xl font-black text-white mt-1 tabular-nums">
                  {totalProjects}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/25">
                <p className="text-[11px] text-emerald-300/70 font-medium">12. Projets terminés</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 tabular-nums">
                  {completedProjects}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/25">
                <p className="text-[11px] text-emerald-300/70 font-medium">Avancement global</p>
                <p className="text-xl sm:text-2xl font-black text-cyan-300 mt-1 tabular-nums">
                  {averageProjectProgress}%
                </p>
              </div>
            </div>

            {/* 13. Progression des projets */}
            <div className="space-y-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                13. Progression détaillée par projet
              </p>
              {projects.map((proj) => {
                const completedSubs = proj.tasks ? proj.tasks.filter(t => t.completed).length : 0;
                const totalSubs = proj.tasks ? proj.tasks.length : 0;

                return (
                  <div 
                    key={proj.id}
                    className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 hover:border-emerald-400/40 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div>
                        <span className="font-bold text-white text-sm">{proj.title}</span>
                        <span className="text-[11px] text-emerald-300/70 ml-2">
                          {proj.category} · {completedSubs}/{totalSubs} jalons
                        </span>
                      </div>
                      <span className="font-extrabold text-emerald-400 tabular-nums">
                        {proj.progress}%
                      </span>
                    </div>

                    <div className="w-full bg-emerald-950/80 rounded-full h-2 overflow-hidden border border-emerald-500/20">
                      <div 
                        className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_#34d399]"
                        style={{ width: `${proj.progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* 16, 17, 18: FINANCES DANS LES STATISTIQUES (Total des revenus, Total des dépenses, Évolution financière) */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  16-18. Évolution financière (en Ariary)
                </h3>
              </div>
              <button 
                onClick={() => setCurrentTab('finances')}
                className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
              >
                Page Finances <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {/* 16. Total des revenus */}
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30">
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span>16. Total revenus</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-white mt-1 tabular-nums">
                  {totalRevenue.toLocaleString('fr-FR')} Ar
                </p>
                <span className="text-[10px] text-emerald-400 font-bold">↑ +8.3% ce mois</span>
              </div>

              {/* 17. Total des dépenses */}
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30">
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                  <ArrowDownRight className="w-4 h-4 text-rose-400" />
                  <span>17. Total dépenses</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-white mt-1 tabular-nums">
                  {totalExpense.toLocaleString('fr-FR')} Ar
                </p>
                <span className="text-[10px] text-rose-400 font-bold">Maîtrisées</span>
              </div>

              {/* 18. Évolution financière */}
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30">
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>18. Solde net</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-emerald-400 mt-1 tabular-nums">
                  {netSavings.toLocaleString('fr-FR')} Ar
                </p>
                <span className="text-[10px] text-cyan-300 font-bold">Épargne {savingsRate}%</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-200/80 leading-relaxed">
              <strong>18. Analyse de l'évolution financière :</strong> Les flux de trésorerie présentent un excédent structurel très favorable. Le ratio des dépenses sur les revenus se situe sous le seuil d'alerte des 15%.
            </div>
          </div>

        </div>

        {/* Right Column: 14, 15, 19, 20 (Temps, Répartition, Comparaison, Objectifs) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 14 & 15: Temps consacré & Répartition du temps par catégorie */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  14-15. Temps & Répartition
                </h3>
              </div>
              <span className="text-xs text-emerald-300/70 font-semibold">{currentTime.label}</span>
            </div>

            {/* 14. Temps consacré aux activités */}
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/25 mb-4">
              <p className="text-xs text-emerald-300/80 font-medium">14. Temps total consacré aux activités</p>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                  {currentTime.hours}h {currentTime.minutes}m
                </span>
                <span className="text-xs font-bold text-emerald-400">{currentTime.change}</span>
              </div>
              <p className="text-[11px] text-emerald-300/60 mt-1">
                Moyenne journalière : <strong className="text-white">{currentTime.avgDaily}</strong>
              </p>
            </div>

            {/* 15. Répartition du temps par catégorie */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-3 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-emerald-400" />
                15. Répartition du temps par catégorie
              </p>

              <div className="space-y-2.5">
                {categories.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-100 font-medium flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                        {cat.name}
                      </span>
                      <span className="font-bold text-white tabular-nums">
                        {cat.hours} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-emerald-950/80 rounded-full h-1.5 overflow-hidden border border-emerald-500/15">
                      <div 
                        className={`${cat.color} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 19. Comparaison des performances par période */}
          <div className="glass-panel rounded-3xl p-5 border border-emerald-500/30">
            <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              19. Comparaison des performances
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Tâches finalisées</p>
                  <p className="text-[11px] text-emerald-300/70">{period} en cours vs précédent</p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-emerald-400 text-sm">+22%</span>
                  <p className="text-[10px] text-emerald-200/60">+3 tâches</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Heures de travail productif</p>
                  <p className="text-[11px] text-emerald-300/70">Focus en hausse</p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-cyan-300 text-sm">+15.4%</span>
                  <p className="text-[10px] text-emerald-200/60">+5h 10m</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Économies nettes</p>
                  <p className="text-[11px] text-emerald-300/70">Flux de trésorerie</p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-emerald-400 text-sm">+180 000 Ar</span>
                  <p className="text-[10px] text-emerald-200/60">Dépenses réduites</p>
                </div>
              </div>
            </div>
          </div>

          {/* 20. Objectifs atteints */}
          <div className="glass-panel rounded-3xl p-5 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                20. Objectifs atteints
              </h3>
              <span className="text-xs font-bold text-emerald-400">3 sur 4</span>
            </div>

            <div className="space-y-2.5">
              {goals.map((g, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      g.achieved 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{g.title}</p>
                      <p className="text-[10px] text-emerald-300/60">{g.category} · {g.date}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold ${g.achieved ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {g.achieved ? 'Atteint' : 'En cours'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* 21. Résumé des performances */}
      <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">
            21. Résumé des performances & Recommandations stratégiques
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/25 space-y-1.5">
            <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px]">Points forts</span>
            <p className="text-white font-semibold">Excellente vélocité sur les projets clés</p>
            <p className="text-emerald-200/70 leading-relaxed">
              Le projet principal "Ketrika" avance à 72% conformément au calendrier initial. La productivité est concentrée sur les livrables à forte valeur ajoutée.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/25 space-y-1.5">
            <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px]">Point d'attention</span>
            <p className="text-white font-semibold">{overdueTasks} tâche(s) en retard identifiée(s)</p>
            <p className="text-emerald-200/70 leading-relaxed">
              Allouez un créneau de 45 minutes demain matin pour clôturer "Finaliser le rapport mensuel" et rétablir un score de ponctualité de 100%.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/25 space-y-1.5">
            <span className="font-bold text-cyan-300 uppercase tracking-wider text-[10px]">Projection financière</span>
            <p className="text-white font-semibold">Capacité d'épargne renforcée</p>
            <p className="text-emerald-200/70 leading-relaxed">
              Avec un excédent de {netSavings.toLocaleString('fr-FR')} Ar, vous pouvez sereinement atteindre le cap de 5 000 000 Ar d'épargne d'ici le prochain trimestre.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};
