import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Project } from '../../types';
import { 
  Folder, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Play, 
  CheckCircle2, 
  Calendar, 
  Flag, 
  ChevronRight, 
  X, 
  Edit3, 
  Trash2, 
  Archive, 
  Check, 
  Clock, 
  Layers, 
  Tag
} from 'lucide-react';

export const ProjectsScreen: React.FC = () => {
  const { 
    projects, 
    addProject, 
    updateProject, 
    deleteProject, 
    toggleSubTask 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'Tous' | 'En cours' | 'À faire' | 'Terminés'>('Tous');
  
  // Selected project for detail drawer / inspector
  const [selectedProject, setSelectedProject] = useState<Project | null>(projects[0] || null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Project Form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'Haute' | 'Moyenne' | 'Basse'>('Haute');
  const [newCategory, setNewCategory] = useState('Développement');
  const [newStartDate, setNewStartDate] = useState('25/04/2025');
  const [newEndDate, setNewEndDate] = useState('15/05/2025');

  const inProgressCount = projects.filter(p => p.status === 'En cours').length;
  const completedCount = projects.filter(p => p.status === 'Terminé').length;

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterTab === 'Tous') return true;
    if (filterTab === 'En cours') return p.status === 'En cours';
    if (filterTab === 'À faire') return p.status === 'À faire';
    if (filterTab === 'Terminés') return p.status === 'Terminé';
    return true;
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addProject({
      title: newTitle,
      description: newDesc || 'Projet stratégique géré sur Ketrika.',
      startDate: newStartDate,
      endDate: newEndDate,
      priority: newPriority,
      status: 'En cours',
      progress: 0,
      category: newCategory,
      image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
      tasks: [
        { id: `sub-${Date.now()}-1`, text: 'Définir les exigences et jalons', completed: false },
        { id: `sub-${Date.now()}-2`, text: 'Exécution et suivi technique', completed: false },
        { id: `sub-${Date.now()}-3`, text: 'Contrôle qualité et tests', completed: false },
        { id: `sub-${Date.now()}-4`, text: 'Livraison client et bilan', completed: false },
      ]
    });

    setNewTitle('');
    setNewDesc('');
    setShowCreateModal(false);
  };

  const getPriorityColor = (priority: 'Haute' | 'Moyenne' | 'Basse') => {
    switch (priority) {
      case 'Haute': return 'text-rose-400';
      case 'Moyenne': return 'text-amber-400';
      case 'Basse': return 'text-emerald-400';
    }
  };

  const getStatusBadge = (status: 'En cours' | 'À faire' | 'Terminé') => {
    switch (status) {
      case 'En cours':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'À faire':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'Terminé':
        return 'bg-emerald-400 text-slate-950 font-bold';
    }
  };

  // Sync selected project with updated store state
  const activeDetailProject = projects.find(p => p.id === selectedProject?.id) || selectedProject;

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200">
      
      {/* Search & Filter Bar with Add Project Icon on the left */}
      <div className="flex items-center gap-3">
        {/* Add project icon button on the left (icon only) */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold hover:shadow-[0_0_18px_rgba(0,230,118,0.5)] transition-all hover:scale-105 flex items-center justify-center shrink-0"
          title="Ajouter un projet"
          aria-label="Ajouter un projet"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/70" />
          <input
            type="text"
            placeholder="Rechercher un projet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm focus:ring-1 focus:ring-emerald-400 transition-all placeholder:text-emerald-300/40"
          />
        </div>

        <button 
          className="p-2.5 rounded-2xl glass-panel text-emerald-300 hover:text-white hover:border-emerald-400/50 transition-all"
          title="Filtres avancés"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* 3. Filter Segmented Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {(['Tous', 'En cours', 'À faire', 'Terminés'] as const).map((tab) => {
          const isActive = filterTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(0,230,118,0.5)] font-bold'
                  : 'glass-panel-subtle text-emerald-200/70 hover:text-white hover:bg-emerald-900/40'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 4. Stat Summary Counters (Matching page 4) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-emerald-500/30 flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
          <div>
            <p className="text-xs text-emerald-200/70 font-medium">Projets en cours</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">{inProgressCount}</span>
              <span className="text-xs text-emerald-400 font-bold">+1</span>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-emerald-500/30 flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-xs text-emerald-200/70 font-medium">Projets terminés</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">{completedCount}</span>
              <span className="text-xs text-emerald-400 font-bold">+1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Grid: Cards List on Left, Detail Inspector on Right on PC/Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Project Cards List */}
        <div className={`${activeDetailProject ? 'lg:col-span-6 xl:col-span-6' : 'lg:col-span-12'} space-y-4`}>
          {filteredProjects.map((proj) => {
            const isSelected = activeDetailProject?.id === proj.id;
            const completedSubCount = proj.tasks.filter(t => t.completed).length;

            return (
              <div
                key={proj.id}
                onClick={() => setSelectedProject(proj)}
                className={`glass-panel rounded-3xl p-4 sm:p-5 border cursor-pointer transition-all relative group ${
                  isSelected 
                    ? 'border-emerald-400 bg-emerald-900/40 shadow-[0_0_25px_rgba(16,185,129,0.3)]' 
                    : 'border-emerald-500/30 hover:border-emerald-400/60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Project Image */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-emerald-500/30 relative">
                    <img
                      src={proj.image || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80'}
                      alt={proj.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Project Summary */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-white text-base sm:text-lg truncate group-hover:text-emerald-300 transition-colors">
                        {proj.title}
                      </h3>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(proj.status)}`}>
                        {proj.status}
                      </span>
                    </div>

                    <p className="text-xs text-emerald-200/70 mt-1 line-clamp-2">
                      {proj.description}
                    </p>

                    {/* Meta: Dates & Priority */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-300/80 mt-2.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" /> {proj.startDate}
                      </span>
                      <span>|</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" /> {proj.endDate}
                      </span>
                      <span>|</span>
                      <span className={`flex items-center gap-1 font-bold ${getPriorityColor(proj.priority)}`}>
                        <Flag className="w-3.5 h-3.5 fill-current" /> {proj.priority}
                      </span>
                    </div>

                    {/* Progress Bar & Subtasks counter (Matching page 4) */}
                    <div className="mt-3">
                      <div className="w-full bg-emerald-950/80 rounded-full h-2 overflow-hidden border border-emerald-500/20">
                        <div
                          className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_#34d399]"
                          style={{ width: `${proj.progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs mt-2 text-emerald-300/80">
                        <span className="flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {completedSubCount}/{proj.tasks.length} tâches
                        </span>
                        <span className="font-extrabold text-white">{proj.progress}%</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Project Detail Drawer / Inspector (Matching bottom panel of page 4) */}
        {activeDetailProject && (
          <div className="lg:col-span-6 xl:col-span-6">
            <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-400/50 shadow-[0_0_30px_rgba(16,185,129,0.25)] sticky top-20 animate-in fade-in duration-200">
              
              {/* Header with Title & Close */}
              <div className="flex items-start justify-between pb-3 border-b border-emerald-500/20 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-emerald-500/30">
                    <img
                      src={activeDetailProject.image || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80'}
                      alt={activeDetailProject.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base sm:text-lg">
                      {activeDetailProject.title}
                    </h3>
                    <p className="text-xs text-emerald-200/70 line-clamp-1">
                      {activeDetailProject.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedProject(null)}
                  className="p-1 rounded-xl text-emerald-400/80 hover:text-white hover:bg-emerald-900/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status and Deadline Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-center">
                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-400/70 font-semibold">Période</p>
                  <p className="text-xs font-bold text-white mt-0.5">{activeDetailProject.startDate}</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-400/70 font-semibold">Échéance</p>
                  <p className="text-xs font-bold text-white mt-0.5">{activeDetailProject.endDate}</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-400/70 font-semibold">Priorité</p>
                  <p className={`text-xs font-bold mt-0.5 ${getPriorityColor(activeDetailProject.priority)}`}>
                    {activeDetailProject.priority}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-400/70 font-semibold">Statut</p>
                  <p className="text-xs font-bold text-emerald-300 mt-0.5">{activeDetailProject.status}</p>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                  <span className="text-emerald-300">Progression globale</span>
                  <span className="text-white text-sm">{activeDetailProject.progress}%</span>
                </div>
                <div className="w-full bg-emerald-950/80 rounded-full h-2.5 overflow-hidden border border-emerald-500/20">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_#10b981]"
                    style={{ width: `${activeDetailProject.progress}%` }}
                  />
                </div>
              </div>

              {/* Linked Subtasks Checklist (Interactive with instant progress recalculation!) */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Tâches liées ({activeDetailProject.tasks.filter(t => t.completed).length}/{activeDetailProject.tasks.length})
                  </span>
                  <span className="text-xs font-medium text-emerald-400">
                    Catégorie : {activeDetailProject.category}
                  </span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar pr-1">
                  {activeDetailProject.tasks.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => toggleSubTask(activeDetailProject.id, st.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        st.completed 
                          ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300/80' 
                          : 'bg-emerald-900/30 border-emerald-500/40 text-white hover:border-emerald-400'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        st.completed
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_8px_#34d399]'
                          : 'border-emerald-400/60 bg-emerald-950/60'
                      }`}>
                        {st.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className={`text-xs font-medium flex-1 ${st.completed ? 'line-through text-emerald-400/60' : ''}`}>
                        {st.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions Row (Modifier, Supprimer, Archiver from page 4) */}
              <div className="mt-6 pt-4 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => deleteProject(activeDetailProject.id)}
                  className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      updateProject(activeDetailProject.id, {
                        status: activeDetailProject.status === 'Terminé' ? 'En cours' : 'Terminé',
                        progress: activeDetailProject.status === 'Terminé' ? 70 : 100
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl glass-panel-subtle text-emerald-200 hover:text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{activeDetailProject.status === 'Terminé' ? 'Rouvrir' : 'Terminer'}</span>
                  </button>
                  <button
                    onClick={() => {
                      // Toggle edit mode
                      const newT = prompt('Modifier le titre du projet :', activeDetailProject.title);
                      if (newT) updateProject(activeDetailProject.id, { title: newT });
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.5)] flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Modal: Ajouter un projet */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-emerald-400" />
                Nouveau projet Ketrika
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-emerald-400/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Nom du projet *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Application Mobile Ketrika"
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
                  rows={3}
                  placeholder="Objectifs et livrables clés..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Date début
                  </label>
                  <input
                    type="text"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Échéance
                  </label>
                  <input
                    type="text"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-500/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl glass-panel-subtle text-emerald-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.5)]"
                >
                  Créer le projet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
