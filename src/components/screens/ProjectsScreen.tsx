import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Project } from '../../types';
import { 
  Folder, 
  Plus, 
  Search, 
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
  Tag,
  ArrowLeft,
  Sparkles,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

export const ProjectsScreen: React.FC = () => {
  const { 
    projects, 
    addProject, 
    updateProject, 
    deleteProject, 
    toggleSubTask,
    setIsProjectDetailOpen
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'Tous' | 'En cours' | 'Terminés'>('Tous');
  
  // Selected project for full-page dedicated view
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newSubTaskText, setNewSubTaskText] = useState('');

  // Sync project detail / create open state with app context so TopBar is hidden exclusively
  useEffect(() => {
    setIsProjectDetailOpen(Boolean(selectedProjectId || showCreateModal));
    return () => {
      setIsProjectDetailOpen(false);
    };
  }, [selectedProjectId, showCreateModal, setIsProjectDetailOpen]);

  // New Project Form state (Category field completely removed, logo upload added)
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'Haute' | 'Moyenne' | 'Basse'>('Haute');
  const [newStartDate, setNewStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState(() => new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]);
  const [newImage, setNewImage] = useState<string>('/assets/images/project_code.jpg');
  const [isCustomLogo, setIsCustomLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Project Form state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'Haute' | 'Moyenne' | 'Basse'>('Haute');
  const [editCategory, setEditCategory] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const inProgressCount = projects.filter(p => p.status === 'En cours').length;
  const completedCount = projects.filter(p => p.status === 'Terminé').length;

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterTab === 'Tous') return true;
    if (filterTab === 'En cours') return p.status === 'En cours' || p.status === 'À faire';
    if (filterTab === 'Terminés') return p.status === 'Terminé';
    return true;
  });

  // Currently active project in detail view
  const activeProject = projects.find(p => p.id === selectedProjectId);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setNewImage(reader.result);
        setIsCustomLogo(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addProject({
      title: newTitle.trim(),
      description: newDesc.trim() || 'Projet stratégique géré sur Ketrika.',
      startDate: newStartDate,
      endDate: newEndDate,
      priority: newPriority,
      status: 'En cours',
      progress: 0,
      category: 'Général',
      image: newImage || '/assets/images/project_code.jpg',
      tasks: [
        { id: `sub-${Date.now()}-1`, text: 'Définir les exigences et jalons', completed: false },
        { id: `sub-${Date.now()}-2`, text: 'Exécution et suivi technique', completed: false },
        { id: `sub-${Date.now()}-3`, text: 'Contrôle qualité et tests', completed: false },
        { id: `sub-${Date.now()}-4`, text: 'Livraison client et bilan', completed: false },
      ]
    });

    setNewTitle('');
    setNewDesc('');
    setNewImage('/assets/images/project_code.jpg');
    setIsCustomLogo(false);
    setShowCreateModal(false);
  };

  const openEditModal = (proj: Project) => {
    setEditTitle(proj.title);
    setEditDesc(proj.description);
    setEditPriority(proj.priority);
    setEditCategory(proj.category);
    setEditStartDate(proj.startDate);
    setEditEndDate(proj.endDate);
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !editTitle.trim()) return;

    updateProject(activeProject.id, {
      title: editTitle,
      description: editDesc,
      priority: editPriority,
      category: editCategory,
      startDate: editStartDate,
      endDate: editEndDate,
    });
    setShowEditModal(false);
  };

  const handleAddSubTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newSubTaskText.trim()) return;

    const newTask = {
      id: `sub-${Date.now()}`,
      text: newSubTaskText.trim(),
      completed: false,
    };
    const updatedTasks = [...activeProject.tasks, newTask];
    const completedTasksCount = updatedTasks.filter(t => t.completed).length;
    const progress = Math.round((completedTasksCount / updatedTasks.length) * 100);

    updateProject(activeProject.id, {
      tasks: updatedTasks,
      progress,
    });
    setNewSubTaskText('');
  };

  const handleDeleteSubTask = (subTaskId: string) => {
    if (!activeProject) return;
    const updatedTasks = activeProject.tasks.filter(t => t.id !== subTaskId);
    const completedTasksCount = updatedTasks.filter(t => t.completed).length;
    const progress = updatedTasks.length > 0 
      ? Math.round((completedTasksCount / updatedTasks.length) * 100) 
      : 0;

    updateProject(activeProject.id, {
      tasks: updatedTasks,
      progress,
    });
  };

  // ==========================================
  // DEDICATED FULL-PAGE PROJECT DETAIL VIEW
  // ==========================================
  if (activeProject) {
    const completedSubCount = activeProject.tasks.filter(t => t.completed).length;

    return (
      <div className="flex flex-col min-h-[calc(100vh-140px)] max-w-5xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in duration-150 space-y-6">
        
        {/* Top Header: Return Button on left + Action controls on right */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-500/15">
          <button
            type="button"
            onClick={() => setSelectedProjectId(null)}
            className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/25 text-emerald-300 hover:text-white hover:border-emerald-400/60 transition-all flex items-center justify-center shrink-0 group select-none"
            title="Retour à la liste des projets"
            aria-label="Retour à la liste des projets"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform text-emerald-400" />
            <span></span>
          </button>

          <div className="flex items-center gap-2">
            {/* Toggle Status (Rouvrir / Terminer) */}
            <button
              type="button"
              onClick={() => {
                const nextStatus = activeProject.status === 'Terminé' ? 'En cours' : 'Terminé';
                const nextProgress = activeProject.status === 'Terminé' ? 70 : 100;
                updateProject(activeProject.id, {
                  status: nextStatus,
                  progress: nextProgress
                });
              }}
              className="px-3.5 py-2 rounded-xl glass-panel-subtle text-emerald-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Archive className="w-4 h-4 text-emerald-400" />
              <span>{activeProject.status === 'Terminé' ? 'Rouvrir le projet' : 'Marquer comme terminé'}</span>
            </button>

            {/* Edit Project */}
            <button
              type="button"
              onClick={() => openEditModal(activeProject)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Modifier le projet"
            >
              <Edit3 className="w-4 h-4" />
              <span>Modifier</span>
            </button>

            {/* Delete Project */}
            <button
              type="button"
              onClick={() => {
                deleteProject(activeProject.id);
                setSelectedProjectId(null);
              }}
              className="p-2 rounded-xl text-rose-400/80 hover:text-rose-200 hover:bg-rose-500/15 transition-colors"
              title="Supprimer ce projet"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Project Hero Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/30 relative overflow-hidden shadow-xl">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            
            {/* Cover Image */}
            <div className="w-full md:w-56 h-48 sm:h-52 rounded-2xl overflow-hidden shrink-0 border border-emerald-500/30 relative shadow-md">
              <img
                src={activeProject.image || '/assets/images/project_code.jpg'}
                alt={activeProject.title}
                className="w-full h-full object-cover"
              />
              <span className={`absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full border shadow-lg backdrop-blur-md ${getStatusBadge(activeProject.status)}`}>
                {activeProject.status}
              </span>
            </div>

            {/* Project Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                  {activeProject.category}
                </span>
                <span className={`text-xs font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/20 ${getPriorityColor(activeProject.priority)}`}>
                  <Flag className="w-3.5 h-3.5 fill-current" />
                  Priorité {activeProject.priority}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {activeProject.title}
              </h1>

              <p className="text-sm sm:text-base text-emerald-100/80 mt-3 leading-relaxed">
                {activeProject.description}
              </p>

              {/* Timeline dates metadata */}
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-emerald-300/80 mt-5 pt-4 border-t border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>Début : <strong>{activeProject.startDate}</strong></span>
                </div>
                <span className="text-emerald-500/30" aria-hidden="true">•</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Échéance : <strong>{activeProject.endDate}</strong></span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Key Metrics & Progress Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel rounded-2xl p-5 border border-emerald-500/25">
            <span className="text-xs text-emerald-200/70 font-medium">Progression globale</span>
            <div className="flex items-baseline justify-between mt-1 mb-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">{activeProject.progress}%</span>
              <span className="text-xs text-emerald-400 font-bold">
                {completedSubCount} / {activeProject.tasks.length} tâches
              </span>
            </div>
            <div className="w-full bg-emerald-950/80 rounded-full h-2.5 overflow-hidden border border-emerald-500/20">
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_#10b981]"
                style={{ width: `${activeProject.progress}%` }}
              />
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-emerald-500/25">
            <span className="text-xs text-emerald-200/70 font-medium">Tâches en attente</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {activeProject.tasks.length - completedSubCount}
              </span>
              <span className="text-xs text-emerald-300/70">restantes</span>
            </div>
            <p className="text-xs text-emerald-400/70 mt-2">
              {completedSubCount === activeProject.tasks.length && activeProject.tasks.length > 0 
                ? 'Toutes les tâches sont terminées !' 
                : 'Poursuivez les jalons clés ci-dessous'}
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-emerald-500/25">
            <span className="text-xs text-emerald-200/70 font-medium">Statut & Exécution</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg sm:text-xl font-bold text-white">{activeProject.status}</span>
            </div>
            <p className="text-xs text-emerald-400/70 mt-2">
              Catégorie : <strong>{activeProject.category}</strong>
            </p>
          </div>
        </div>

        {/* Linked Tasks and Milestones Section */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-emerald-500/30 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Tâches et jalons du projet</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 ml-1">
                {completedSubCount}/{activeProject.tasks.length}
              </span>
            </h2>
          </div>

          {/* Quick Add SubTask Input */}
          <form onSubmit={handleAddSubTask} className="flex gap-2">
            <input
              type="text"
              placeholder="Ajouter une tâche ou un jalon à ce projet..."
              value={newSubTaskText}
              onChange={(e) => setNewSubTaskText(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-2xl glass-input text-sm placeholder:text-emerald-300/40 focus:ring-1 focus:ring-emerald-400"
            />
            <button
              type="submit"
              disabled={!newSubTaskText.trim()}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs hover:shadow-[0_0_18px_rgba(0,230,118,0.5)] transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Ajouter</span>
            </button>
          </form>

          {/* Subtasks List */}
          <div className="space-y-2.5 pt-2">
            {activeProject.tasks.length === 0 ? (
              <p className="text-sm text-emerald-300/60 py-4 text-center">
                Aucune tâche associée. Ajoutez votre premier jalon ci-dessus.
              </p>
            ) : (
              activeProject.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    task.completed 
                      ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300/80' 
                      : 'glass-panel-subtle border-emerald-500/35 text-white hover:border-emerald-400/60'
                  }`}
                >
                  <div
                    onClick={() => toggleSubTask(activeProject.id, task.id)}
                    className="flex items-center gap-3.5 flex-1 cursor-pointer select-none"
                  >
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_8px_#34d399]'
                        : 'border-emerald-400/60 bg-emerald-950/60'
                    }`}>
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className={`text-sm font-medium ${task.completed ? 'line-through text-emerald-400/60' : 'text-emerald-50'}`}>
                      {task.text}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteSubTask(task.id)}
                    className="p-1 text-emerald-500/40 hover:text-rose-400 transition-colors ml-2"
                    title="Supprimer cette tâche"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Edit Project Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-emerald-400" />
                  Modifier le projet
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-emerald-400/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Nom du projet *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                      Priorité
                    </label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-2xl glass-input text-sm bg-emerald-950 text-white"
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
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
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
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                      Échéance
                    </label>
                    <input
                      type="text"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-emerald-500/20 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-xl glass-panel-subtle text-emerald-300 text-xs font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.5)]"
                  >
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ==========================================
  // DEDICATED FULL-PAGE CREATE PROJECT VIEW
  // Occupies full available width & height, no boxed frame, only Back button top-left
  // ==========================================
  if (showCreateModal) {
    return (
      <div className="w-full min-h-[calc(100vh-100px)] flex flex-col justify-between max-w-4xl mx-auto px-2 sm:px-6 py-4 animate-in fade-in duration-200">
        <form onSubmit={handleCreateProject} className="flex-1 flex flex-col justify-between space-y-8">
          
          {/* Top Row: ONLY Back Button in the top-left */}
          <div className="flex items-center pb-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setNewTitle('');
                setNewDesc('');
              }}
              className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 hover:text-white hover:border-emerald-400 hover:bg-emerald-900/60 transition-all flex items-center justify-center shrink-0 group select-none shadow-[0_0_15px_rgba(0,230,118,0.15)] cursor-pointer"
              title="Retour aux projets"
              aria-label="Retour aux projets"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform text-emerald-400" />
            </button>
          </div>

          {/* Form Content directly on the canvas without excessive outer framing */}
          <div className="space-y-8 flex-1">
            
            {/* Visual & Logo Section: Add or import project logo */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-emerald-500/20">
              {/* Logo / Cover Preview */}
              <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shrink-0 border-2 border-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.3)] bg-emerald-950/80">
                <img
                  src={newImage}
                  alt="Logo du projet"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-emerald-300 transition-opacity p-2 text-center cursor-pointer"
                  title="Changer le logo"
                >
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">Changer</span>
                </button>
              </div>

              {/* Logo actions & Presets */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:text-white hover:bg-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>{isCustomLogo ? 'Remplacer le logo importé' : 'Importer un logo'}</span>
                  </button>

                  {isCustomLogo && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewImage('/assets/images/project_code.jpg');
                        setIsCustomLogo(false);
                      }}
                      className="px-3 py-2 rounded-xl text-emerald-400/60 hover:text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>

                {/* Preset suggestions */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
                  <span className="text-[11px] text-emerald-400/60 font-medium shrink-0">
                    Ou choisir un thème :
                  </span>
                  {[
                    { label: 'Code & Tech', url: '/assets/images/project_code.jpg' },
                    { label: 'Architecture', url: '/assets/images/project_architecture.jpg' },
                    { label: 'Écologie', url: '/assets/images/project_eco.jpg' },
                    { label: 'Cloud & Mobile', url: '/assets/images/project_tech.jpg' },
                  ].map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => {
                        setNewImage(preset.url);
                        setIsCustomLogo(false);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                        newImage === preset.url && !isCustomLogo
                          ? 'bg-emerald-400 text-slate-950 font-bold shadow-[0_0_10px_#34d399]'
                          : 'bg-emerald-950/50 text-emerald-300/80 hover:text-white border border-emerald-500/20'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Field: Nom du projet */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-emerald-400/80">
                Nom du projet *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex : Refonte Plateforme Ketrika"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full text-2xl sm:text-4xl font-extrabold text-white placeholder:text-emerald-400/25 bg-transparent border-b-2 border-emerald-500/25 focus:border-emerald-400 outline-none pb-3 transition-colors tracking-tight"
              />
            </div>

            {/* Field: Description */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-emerald-400/80">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Décrivez les objectifs clés, les livrables attendus et l'impact..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full text-base sm:text-lg text-emerald-100 placeholder:text-emerald-400/25 bg-transparent border-b border-emerald-500/20 focus:border-emerald-400 outline-none py-3 resize-none transition-colors leading-relaxed"
              />
            </div>

            {/* Field: Priorité */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-widest text-emerald-400/80">
                Priorité
              </label>
              <div className="flex flex-wrap gap-3">
                {(['Haute', 'Moyenne', 'Basse'] as const).map((p) => {
                  const isSelected = newPriority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? p === 'Haute'
                            ? 'bg-rose-500/25 text-rose-300 border border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                            : p === 'Moyenne'
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                            : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-200/60 hover:text-white hover:border-emerald-500/40'
                      }`}
                    >
                      <Flag className={`w-3.5 h-3.5 ${p === 'Haute' ? 'text-rose-400' : p === 'Moyenne' ? 'text-amber-400' : 'text-emerald-400'}`} />
                      <span>Priorité {p}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fields: Date de début & Échéance (Harmonious 2-column grid directly in the page) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-emerald-400/80 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  Date de début
                </label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/25 text-white text-sm focus:border-emerald-400 focus:outline-none transition-colors [color-scheme:dark]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-emerald-400/80 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Échéance
                </label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/25 text-white text-sm focus:border-emerald-400 focus:outline-none transition-colors [color-scheme:dark]"
                />
              </div>
            </div>

          </div>

          {/* Bottom Action Area */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-emerald-500/15">
            <p className="text-xs text-emerald-400/60 text-center sm:text-left">
              Sauvegarde instantanée dans votre base locale SQLite hors connexion.
            </p>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-sm shadow-[0_0_25px_rgba(0,230,118,0.4)] hover:shadow-[0_0_35px_rgba(0,230,118,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>Créer le projet</span>
            </button>
          </div>

        </form>
      </div>
    );
  }

  // ==========================================
  // MAIN PROJECTS LIST VIEW (GRID)
  // ==========================================
  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200">
      
      {/* Search Bar with Add Project Icon on the left */}
      <div className="flex items-center gap-3">
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
      </div>

      {/* Filter Segmented Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {(['Tous', 'En cours', 'Terminés'] as const).map((tab) => {
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

      {/* Stat Summary Counters */}
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

      {/* Full-Width Grid of Project Cards */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center border border-emerald-500/20">
            <Folder className="w-10 h-10 text-emerald-400/50 mx-auto mb-3" />
            <p className="text-base font-bold text-white">Aucun projet trouvé</p>
            <p className="text-xs text-emerald-300/70 mt-1">Créez un nouveau projet pour commencer à suivre votre avancement.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              Nouveau projet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredProjects.map((proj) => {
              const completedSubCount = proj.tasks.filter(t => t.completed).length;

              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProjectId(proj.id)}
                  className="glass-panel rounded-3xl p-5 border border-emerald-500/30 hover:border-emerald-400/70 transition-all cursor-pointer relative group hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] flex flex-col justify-between"
                >
                  <div>
                    {/* Project Card Image Banner */}
                    <div className="w-full h-36 rounded-2xl overflow-hidden shrink-0 border border-emerald-500/30 relative mb-4">
                      <img
                        src={proj.image || '/assets/images/project_architecture.jpg'}
                        alt={proj.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className={`absolute top-2.5 left-2.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-md backdrop-blur-md ${getStatusBadge(proj.status)}`}>
                        {proj.status}
                      </span>
                    </div>

                    {/* Category & Title */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold text-emerald-400/90 uppercase tracking-wider">
                        {proj.category}
                      </span>
                      <span className={`flex items-center gap-1 text-[11px] font-bold ${getPriorityColor(proj.priority)}`}>
                        <Flag className="w-3 h-3 fill-current" /> {proj.priority}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-lg group-hover:text-emerald-300 transition-colors line-clamp-1">
                      {proj.title}
                    </h3>

                    <p className="text-xs text-emerald-200/70 mt-1.5 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>
                  </div>

                  {/* Dates & Progress */}
                  <div className="mt-4 pt-3 border-t border-emerald-500/20">
                    <div className="flex items-center justify-between text-[11px] text-emerald-300/80 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-400" /> {proj.startDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" /> {proj.endDate}
                      </span>
                    </div>

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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
