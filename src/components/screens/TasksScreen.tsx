import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import { 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  Search, 
  SlidersHorizontal, 
  Clock, 
  AlertTriangle, 
  Flame, 
  Flag, 
  Plus, 
  ArrowUpDown, 
  ChevronRight, 
  Check, 
  X, 
  Folder, 
  Briefcase, 
  Tag,
  LayoutGrid,
  List,
  Sparkles
} from 'lucide-react';

export const TasksScreen: React.FC = () => {
  const { 
    tasks, 
    toggleTask, 
    addTask, 
    deleteTask, 
    projects 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Toutes' | 'À faire' | 'En cours' | 'Terminées'>('Toutes');
  const [viewMode, setViewMode] = useState<'liste' | 'calendrier' | 'kanban'>('liste');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');

  // Quick Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<Task['category']>('Développement');
  const [newPriority, setNewPriority] = useState<Task['priority']>('Haute');
  const [newProjectTitle, setNewProjectTitle] = useState(projects[0]?.title || 'Ketrika App');
  const [newDueDate, setNewDueDate] = useState('24/04/2025');
  const [newDueTime, setNewDueTime] = useState('14:00');

  // Counters
  const overdueCount = tasks.filter(t => !t.completed && t.isOverdue).length;
  const completedCount = tasks.filter(t => t.completed).length;
  const inProgressCount = tasks.filter(t => !t.completed && t.status === 'En cours').length;
  const todoCount = tasks.filter(t => !t.completed && t.status === 'À faire').length;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addTask({
      title: newTitle,
      description: newDesc || 'Action prioritaire pour atteindre les jalons.',
      category: newCategory,
      priority: newPriority,
      status: 'À faire',
      projectTitle: newProjectTitle,
      dueDate: newDueDate,
      dueTime: newDueTime,
      completed: false,
    });

    setNewTitle('');
    setNewDesc('');
    setShowAddModal(false);
  };

  const getPriorityBadge = (priority: Task['priority']) => {
    switch (priority) {
      case 'Haute':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold shadow-[0_0_8px_rgba(244,63,94,0.3)]">
            <Flame className="w-3 h-3 fill-current" /> Haute
          </span>
        );
      case 'Moyenne':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
            <Flag className="w-3 h-3 fill-current" /> Moyenne
          </span>
        );
      case 'Basse':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
            <Flag className="w-3 h-3 fill-current" /> Basse
          </span>
        );
    }
  };

  const getCategoryBadge = (category: Task['category']) => {
    return (
      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 text-[11px] font-medium">
        <Tag className="w-2.5 h-2.5 text-cyan-400" /> {category}
      </span>
    );
  };

  // Filter & Sort tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.projectTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === 'Toutes') return true;
    if (activeTab === 'À faire') return !t.completed && t.status !== 'En cours';
    if (activeTab === 'En cours') return !t.completed && t.status === 'En cours';
    if (activeTab === 'Terminées') return t.completed;
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200">
      
      {/* 1. View Mode Switcher (Liste / Calendrier) */}
      <div className="flex items-center justify-end">
        <div className="flex items-center p-1 rounded-2xl bg-emerald-950/70 border border-emerald-500/25">
          <button
            onClick={() => setViewMode('liste')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'liste'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(0,230,118,0.5)] font-bold'
                : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vue liste</span>
          </button>
          <button
            onClick={() => setViewMode('calendrier')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'calendrier'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(0,230,118,0.5)] font-bold'
                : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Vue calendrier</span>
          </button>
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/70" />
          <input
            type="text"
            placeholder="Rechercher une tâche..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm focus:ring-1 focus:ring-emerald-400 transition-all placeholder:text-emerald-300/40"
          />
        </div>
      </div>

      {/* 3. Metric Indicator Pills (Matching page 5 top strip) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Aujourd'hui */}
        <div 
          onClick={() => setActiveTab('À faire')}
          className="glass-panel rounded-2xl p-3 sm:p-4 border border-emerald-500/25 flex items-center gap-3 cursor-pointer hover:border-emerald-400/50 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-white">4</span>
            <p className="text-[11px] text-emerald-200/70 leading-tight">Aujourd'hui</p>
          </div>
        </div>

        {/* À venir */}
        <div 
          onClick={() => setActiveTab('En cours')}
          className="glass-panel rounded-2xl p-3 sm:p-4 border border-emerald-500/25 flex items-center gap-3 cursor-pointer hover:border-emerald-400/50 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-white">3</span>
            <p className="text-[11px] text-emerald-200/70 leading-tight">À venir</p>
          </div>
        </div>

        {/* En retard (Alert glow in red neon) */}
        <div 
          onClick={() => setActiveTab('À faire')}
          className="glass-panel rounded-2xl p-3 sm:p-4 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)] flex items-center gap-3 cursor-pointer hover:border-rose-400 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-rose-400">{overdueCount}</span>
            <p className="text-[11px] text-rose-300/80 leading-tight">En retard</p>
          </div>
        </div>

        {/* Terminées (Check circle in green neon) */}
        <div 
          onClick={() => setActiveTab('Terminées')}
          className="glass-panel rounded-2xl p-3 sm:p-4 border border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center gap-3 cursor-pointer hover:border-emerald-300 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/25 text-emerald-300 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-300">{completedCount}</span>
            <p className="text-[11px] text-emerald-200/70 leading-tight">Terminées</p>
          </div>
        </div>
      </div>

      {/* 4. Segmented Status Filter Tabs (Matching page 5: Toutes 16, À faire 5, En cours 7, Terminées 8) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'Toutes', label: `Toutes (${tasks.length})` },
          { id: 'À faire', label: `À faire (${todoCount})` },
          { id: 'En cours', label: `En cours (${inProgressCount})` },
          { id: 'Terminées', label: `Terminées (${completedCount})` },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(0,230,118,0.5)] font-bold'
                  : 'glass-panel-subtle text-emerald-200/70 hover:text-white hover:bg-emerald-900/40'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Task List or Calendar View */}
      {viewMode === 'liste' ? (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="glass-panel rounded-3xl p-8 text-center border border-emerald-500/20">
              <p className="text-sm text-emerald-300/70">Aucune tâche trouvée pour cette vue.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-3 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                Créer une tâche
              </button>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`glass-panel rounded-3xl p-4 sm:p-5 border cursor-pointer transition-all flex items-start gap-3.5 relative group ${
                  task.completed
                    ? 'border-emerald-500/20 bg-emerald-950/30 opacity-75'
                    : 'border-emerald-500/35 hover:border-emerald-400/60 shadow-[0_4px_20px_rgba(0,20,15,0.4)]'
                }`}
              >
                {/* Radio Checkbox (Matching page 5) */}
                <div 
                  className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    task.completed 
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_10px_#10b981]' 
                      : 'border-emerald-400/60 bg-emerald-950/60 group-hover:border-emerald-300'
                  }`}
                >
                  {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className={`font-bold text-base transition-colors ${
                      task.completed ? 'text-emerald-300/70 line-through' : 'text-white group-hover:text-emerald-300'
                    }`}>
                      {task.title}
                    </h3>

                    {/* Badges strip: Priority + Category */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {task.completed ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                          ✓ Terminée
                        </span>
                      ) : (
                        getPriorityBadge(task.priority)
                      )}
                      {getCategoryBadge(task.category)}
                    </div>
                  </div>

                  <p className="text-xs text-emerald-200/70 mt-1 line-clamp-2">
                    {task.description}
                  </p>

                  {/* Metadata line: Date, Time & Linked Project */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-400/70 mt-3 pt-2 border-t border-emerald-500/15">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3 text-emerald-400" /> Créé le : {task.createdAt}
                    </span>
                    <span>|</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" /> {task.dueTime}
                    </span>
                    <span>|</span>
                    <span className="flex items-center gap-1 text-emerald-300 font-medium">
                      <Folder className="w-3 h-3 text-emerald-400" /> Projet : {task.projectTitle}
                    </span>
                  </div>
                </div>

                {/* Right Arrow */}
                <div className="self-center hidden sm:block p-1 text-emerald-400/60 group-hover:translate-x-1 transition-transform">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Vue Calendrier (Interactive) */
        <div className="glass-panel rounded-3xl p-6 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/20">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-emerald-400" />
              Avril 2025 · Calendrier des échéances
            </h3>
            <span className="text-xs text-emerald-400 font-semibold">Semaine 17</span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <span key={d} className="font-bold text-emerald-400/80 py-1 uppercase">{d}</span>
            ))}

            {Array.from({ length: 30 }).map((_, i) => {
              const day = i + 1;
              const isToday = day === 22;
              const hasTask = [11, 12, 13, 14, 20, 22, 25, 30].includes(day);

              return (
                <div
                  key={day}
                  className={`p-2.5 rounded-2xl border transition-all text-left min-h-[64px] flex flex-col justify-between ${
                    isToday
                      ? 'bg-emerald-500/30 border-emerald-400 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : 'glass-panel-subtle border-emerald-500/15 text-emerald-200/80 hover:border-emerald-500/40'
                  }`}
                >
                  <span className="text-xs">{day}</span>
                  {hasTask && (
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] self-end" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Bottom Action: + Ajouter une tâche (Matching page 5) */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full p-4 rounded-3xl glass-panel border border-emerald-400/50 hover:border-emerald-300 hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all flex items-center justify-between group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-[0_0_12px_#10b981]">
            <Plus className="w-5 h-5 stroke-[3]" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
              Ajouter une tâche
            </h4>
            <p className="text-xs text-emerald-200/70">Créer une nouvelle tâche...</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-emerald-300 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* 6. Sorter and Filter Selectors (Matching page 5 footer) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-emerald-300/80">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-emerald-400" />
          <span>Trier par :</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-emerald-950/80 border border-emerald-500/30 rounded-xl px-2.5 py-1 text-white font-medium focus:outline-none"
          >
            <option value="dueDate">Date limite</option>
            <option value="priority">Priorité</option>
            <option value="title">Nom alphabétique</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
          <span>Filtrer par : Toutes</span>
        </div>
      </div>

      {/* Modal: Ajouter une tâche */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Nouvelle tâche
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-emerald-400/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Titre de la tâche *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Finaliser la synthèse trimestrielle"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Détails complémentaires..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-2xl glass-input text-sm bg-emerald-950"
                  >
                    <option value="Rapport">Rapport</option>
                    <option value="Présentation">Présentation</option>
                    <option value="Développement">Développement</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Organisation">Organisation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Priorité
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-2xl glass-input text-sm bg-emerald-950"
                  >
                    <option value="Haute">Haute</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Basse">Basse</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Date d'échéance
                  </label>
                  <input
                    type="text"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Heure
                  </label>
                  <input
                    type="text"
                    value={newDueTime}
                    onChange={(e) => setNewDueTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Projet associé
                </label>
                <select
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl glass-input text-sm bg-emerald-950"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.title}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-emerald-500/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl glass-panel-subtle text-emerald-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.5)]"
                >
                  Créer la tâche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
