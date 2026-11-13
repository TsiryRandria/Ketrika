import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import {
  CheckCircle2,
  Calendar as CalendarIcon,
  Search,
  Clock,
  AlertTriangle,
  Flame,
  Flag,
  Plus,
  ArrowUpDown,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Folder,
  Tag,
  List,
  Edit3,
  Trash2,
} from 'lucide-react';

const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const PRIORITY_RANK: Record<Task['priority'], number> = {
  Haute: 0,
  Moyenne: 1,
  Basse: 2,
};

const toInputDate = (val?: string): string => {
  if (!val) return new Date().toISOString().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return new Date().toISOString().split('T')[0];
};

const fromInputDate = (val: string): string => {
  const match = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return val;
};

const parseTaskDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  const frMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (frMatch) {
    const day = Number(frMatch[1]);
    const month = Number(frMatch[2]);
    const year = Number(frMatch[3]);
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      return d;
    }
    return null;
  }

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
};

const toDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getTaskDueTimestamp = (task: Task): number => {
  const d = parseTaskDate(task.dueDate);
  if (!d) return Number.MAX_SAFE_INTEGER;
  const timeMatch = /^(\d{1,2}):(\d{2})/.exec(task.dueTime || '');
  const hours = timeMatch ? Number(timeMatch[1]) : 23;
  const mins = timeMatch ? Number(timeMatch[2]) : 59;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, mins, 0, 0).getTime();
};

const getISOWeekNumber = (date: Date): number => {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  return Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export const TasksScreen: React.FC = () => {
  const {
    tasks,
    toggleTask,
    addTask,
    updateTask,
    deleteTask,
    projects,
    setIsEditingTask,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Toutes' | 'À faire' | 'En cours' | 'Terminées'>('Toutes');
  const [quickFilter, setQuickFilter] = useState<'all' | 'today' | 'upcoming' | 'overdue'>('all');
  const [viewMode, setViewMode] = useState<'liste' | 'calendrier'>('liste');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');

  // Quick Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<Task['category']>('Développement');
  const [newPriority, setNewPriority] = useState<Task['priority']>('Haute');
  const [newProjectTitle, setNewProjectTitle] = useState(projects[0]?.title || 'Ketrika App');
  const [newDueDate, setNewDueDate] = useState(() => toInputDate());
  const [newDueTime, setNewDueTime] = useState('14:00');

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    const hasCurrentMonthTask = tasks.some((t) => {
      const d = parseTaskDate(t.dueDate);
      return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    if (hasCurrentMonthTask) {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    const parsed = tasks
      .map((t) => parseTaskDate(t.dueDate))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime());
    if (parsed.length > 0) {
      return new Date(parsed[0].getFullYear(), parsed[0].getMonth(), 1);
    }
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const now = new Date();
    const todayStr = toDateKey(now);
    const hasTodayTask = tasks.some((t) => {
      const d = parseTaskDate(t.dueDate);
      return d && toDateKey(d) === todayStr;
    });
    if (hasTodayTask) return todayStr;
    const parsed = tasks
      .map((t) => parseTaskDate(t.dueDate))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime());
    return parsed.length > 0 ? toDateKey(parsed[0]) : todayStr;
  });

  // Edit Task Full-Screen View State
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editPriority, setEditPriority] = useState<Task['priority']>('Haute');
  const [editStatus, setEditStatus] = useState<Task['status']>('À faire');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');

  useEffect(() => {
    setIsEditingTask(Boolean(editingTask));
    return () => {
      setIsEditingTask(false);
    };
  }, [editingTask, setIsEditingTask]);

  useEffect(() => {
    if (projects.length > 0 && !projects.some((p) => p.title === newProjectTitle)) {
      setNewProjectTitle(projects[0].title);
    }
  }, [projects, newProjectTitle]);

  const todayBounds = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return { todayStart, tomorrowStart, todayKey: toDateKey(todayStart) };
  }, []);

  const isTaskOverdue = (t: Task): boolean => {
    if (t.completed) return false;
    const d = parseTaskDate(t.dueDate);
    if (d) return d.getTime() < todayBounds.todayStart.getTime();
    return Boolean(t.isOverdue);
  };

  const isTaskToday = (t: Task): boolean => {
    if (t.completed) return false;
    const d = parseTaskDate(t.dueDate);
    if (!d) return false;
    return d.getTime() >= todayBounds.todayStart.getTime() && d.getTime() < todayBounds.tomorrowStart.getTime();
  };

  const isTaskUpcoming = (t: Task): boolean => {
    if (t.completed) return false;
    const d = parseTaskDate(t.dueDate);
    if (!d) return false;
    return d.getTime() >= todayBounds.tomorrowStart.getTime();
  };

  // Real Dynamic Counters
  const todayCount = useMemo(() => tasks.filter(isTaskToday).length, [tasks, todayBounds]);
  const upcomingCount = useMemo(() => tasks.filter(isTaskUpcoming).length, [tasks, todayBounds]);
  const overdueCount = useMemo(() => tasks.filter(isTaskOverdue).length, [tasks, todayBounds]);
  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const inProgressCount = useMemo(() => tasks.filter((t) => !t.completed && t.status === 'En cours').length, [tasks]);
  const todoCount = useMemo(() => tasks.filter((t) => !t.completed && t.status === 'À faire').length, [tasks]);

  const openAddModal = (preselectedIsoDate?: string) => {
    setNewTitle('');
    setNewDesc('');
    setNewCategory('Développement');
    setNewPriority('Haute');
    setNewProjectTitle(projects[0]?.title || 'Ketrika App');
    setNewDueDate(preselectedIsoDate || toInputDate());
    setNewDueTime('14:00');
    setShowAddModal(true);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const normalizedIso = toInputDate(newDueDate);
    const formattedDueDate = fromInputDate(normalizedIso);
    const dueDateObj = parseTaskDate(formattedDueDate);

    addTask({
      title: newTitle.trim(),
      description: newDesc.trim() || 'Action prioritaire pour atteindre les jalons.',
      category: newCategory,
      priority: newPriority,
      status: 'À faire',
      projectTitle: newProjectTitle || 'Général',
      startDate: new Date().toLocaleDateString('fr-FR'),
      dueDate: formattedDueDate,
      dueTime: newDueTime || '14:00',
      completed: false,
      isOverdue: dueDateObj ? dueDateObj.getTime() < todayBounds.todayStart.getTime() : false,
    });

    if (dueDateObj) {
      setCalendarMonth(new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), 1));
      setSelectedDateKey(toDateKey(dueDateObj));
    }

    setNewTitle('');
    setNewDesc('');
    setShowAddModal(false);
  };

  const openEditModal = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditStartDate(toInputDate(task.startDate || task.createdAt));
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditDueDate(toInputDate(task.dueDate));
    setEditDueTime(task.dueTime);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    const formattedDue = fromInputDate(editDueDate);
    const dueDateObj = parseTaskDate(formattedDue);
    const completed = editStatus === 'Terminée';

    updateTask(editingTask.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      startDate: fromInputDate(editStartDate),
      priority: editPriority,
      status: editStatus,
      completed,
      dueDate: formattedDue,
      dueTime: editDueTime,
      isOverdue: !completed && dueDateObj ? dueDateObj.getTime() < todayBounds.todayStart.getTime() : false,
    });
    setEditingTask(null);
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

  // Real Filter & Sort tasks
  const filteredTasks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const filtered = tasks.filter((t) => {
      const matchesSearch =
        !query ||
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.projectTitle.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (quickFilter === 'today') return isTaskToday(t);
      if (quickFilter === 'upcoming') return isTaskUpcoming(t);
      if (quickFilter === 'overdue') return isTaskOverdue(t);

      if (activeTab === 'Toutes') return true;
      if (activeTab === 'À faire') return !t.completed && t.status !== 'En cours';
      if (activeTab === 'En cours') return !t.completed && t.status === 'En cours';
      if (activeTab === 'Terminées') return t.completed;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'priority') {
        const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (diff !== 0) return diff;
        const dateDiff = getTaskDueTimestamp(a) - getTaskDueTimestamp(b);
        if (dateDiff !== 0) return dateDiff;
        return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
      }

      if (sortBy === 'title') {
        const titleDiff = a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
        if (titleDiff !== 0) return titleDiff;
        return getTaskDueTimestamp(a) - getTaskDueTimestamp(b);
      }

      // dueDate (default)
      const dateDiff = getTaskDueTimestamp(a) - getTaskDueTimestamp(b);
      if (dateDiff !== 0) return dateDiff;
      const prioDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (prioDiff !== 0) return prioDiff;
      return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
    });
  }, [tasks, searchQuery, activeTab, quickFilter, sortBy, todayBounds]);

  // Calendar computed data
  const calendarData = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const tasksByDate = new Map<string, Task[]>();
    for (const task of filteredTasks) {
      const parsed = parseTaskDate(task.dueDate);
      if (!parsed) continue;
      const key = toDateKey(parsed);
      const list = tasksByDate.get(key) || [];
      list.push(task);
      tasksByDate.set(key, list);
    }

    const selectedDateObj = parseTaskDate(selectedDateKey);
    const weekRefDate =
      selectedDateObj &&
      selectedDateObj.getFullYear() === year &&
      selectedDateObj.getMonth() === month
        ? selectedDateObj
        : firstDay;

    return {
      year,
      month,
      monthLabel: `${MONTH_NAMES[month]} ${year}`,
      weekNumber: getISOWeekNumber(weekRefDate),
      leadingEmptyDays,
      daysInMonth,
      tasksByDate,
    };
  }, [calendarMonth, filteredTasks, selectedDateKey]);

  const selectedDayTasks = useMemo(() => {
    return calendarData.tasksByDate.get(selectedDateKey) || [];
  }, [calendarData, selectedDateKey]);

  const availableProjectTitles = useMemo(() => {
    const set = new Set<string>(projects.map((p) => p.title).filter(Boolean));
    if (newProjectTitle) set.add(newProjectTitle);
    set.add('Général');
    return Array.from(set);
  }, [projects, newProjectTitle]);

  // ==========================================
  // DEDICATED FULL-SCREEN EDIT TASK VIEW
  // ==========================================
  if (editingTask) {
    return (
      <div className="w-full min-h-[calc(100vh-110px)] flex flex-col max-w-4xl mx-auto px-2 sm:px-6 pt-2 pb-36 md:pb-16 animate-in fade-in duration-150">
        {/* Top Row: Back button on the left & Delete button on the right */}
        <div className="flex items-center justify-between pb-4">
          <button
            type="button"
            onClick={() => setEditingTask(null)}
            className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 hover:text-white hover:border-emerald-400 hover:bg-emerald-900/60 transition-all flex items-center justify-center shrink-0 group select-none shadow-[0_0_15px_rgba(0,230,118,0.15)] cursor-pointer"
            title="Retour aux tâches"
            aria-label="Retour aux tâches"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform text-emerald-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              deleteTask(editingTask.id);
              setEditingTask(null);
            }}
            className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 hover:text-rose-100 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Supprimer cette tâche"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Supprimer</span>
          </button>
        </div>

        <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col gap-6">
          {/* Titre de la tâche */}
          <input
            type="text"
            required
            autoFocus
            placeholder="Titre de la tâche *"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full text-2xl sm:text-4xl font-extrabold text-white placeholder:text-emerald-400/25 bg-transparent border-0 border-b-2 border-emerald-500/25 focus:border-emerald-400 outline-none pb-3 transition-colors tracking-tight"
          />

          {/* Priorité & Statut compacts */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center p-1 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 gap-1">
              {(['Haute', 'Moyenne', 'Basse'] as const).map((p) => {
                const isSelected = editPriority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEditPriority(p)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? p === 'Haute'
                          ? 'bg-rose-500 text-white shadow-[0_0_14px_rgba(244,63,94,0.55)]'
                          : p === 'Moyenne'
                          ? 'bg-amber-400 text-slate-950 shadow-[0_0_14px_rgba(251,191,36,0.55)]'
                          : 'bg-emerald-400 text-slate-950 shadow-[0_0_14px_rgba(52,211,153,0.55)]'
                        : 'text-emerald-200/70 hover:text-white hover:bg-emerald-900/40'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isSelected
                        ? p === 'Haute' ? 'bg-white' : 'bg-slate-950'
                        : p === 'Haute' ? 'bg-rose-400' : p === 'Moyenne' ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>

            <div className="inline-flex items-center p-1 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 gap-1">
              {(['À faire', 'En cours', 'Terminée'] as const).map((s) => {
                const isSelected = editStatus === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditStatus(s)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(0,230,118,0.45)]'
                        : 'text-emerald-200/70 hover:text-white hover:bg-emerald-900/40'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date de début, Date d'échéance & Heure */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400/80">
                <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                Date de début
              </span>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/25 text-white text-sm focus:border-emerald-400 focus:outline-none transition-colors [color-scheme:dark]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400/80">
                <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                Date d'échéance
              </span>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/25 text-white text-sm focus:border-emerald-400 focus:outline-none transition-colors [color-scheme:dark]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400/80">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Heure
              </span>
              <input
                type="time"
                value={editDueTime}
                onChange={(e) => setEditDueTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/25 text-white text-sm focus:border-emerald-400 focus:outline-none transition-colors [color-scheme:dark]"
              />
            </label>
          </div>

          {/* Champ Description agrandi au maximum, sans aucun div ni bordure autour */}
          <textarea
            rows={14}
            placeholder="Rédigez librement les détails, étapes et remarques de la tâche..."
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            aria-label="Description de la tâche"
            className="w-full flex-1 min-h-[38vh] sm:min-h-[44vh] bg-transparent border-0 outline-none focus:ring-0 p-0 text-base sm:text-lg text-emerald-50 placeholder:text-emerald-300/30 resize-none leading-relaxed"
          />

          {/* Boutons d'action toujours visibles au-dessus de la barre de navigation */}
          <div className="sticky bottom-[84px] md:bottom-6 z-30 pt-2 pointer-events-auto">
            <div className="w-full glass-panel rounded-2xl p-3 sm:p-3.5 border border-emerald-400/50 shadow-[0_12px_40px_rgba(0,18,12,0.85)] backdrop-blur-2xl flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-5 py-3 rounded-xl glass-panel-subtle text-emerald-200 hover:text-white text-xs sm:text-sm font-bold transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!editTitle.trim()}
                className="flex-1 sm:flex-initial px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-[0_0_25px_rgba(0,230,118,0.5)] hover:shadow-[0_0_35px_rgba(0,230,118,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200">

      {/* 1. Top Header: Sorter + Add Task Icon + View Mode Switcher */}
      <div className="flex items-center justify-end gap-2 sm:gap-2.5">
        {/* Sorter Selector directly to the left of the Add Task icon */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/25 text-xs text-emerald-300/80 shadow-sm">
          <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="hidden sm:inline text-[11px] text-emerald-300/70">Trier par :</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'title')}
            className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pr-1"
          >
            <option value="dueDate" className="bg-emerald-950 text-white">Date limite</option>
            <option value="priority" className="bg-emerald-950 text-white">Priorité</option>
            <option value="title" className="bg-emerald-950 text-white">Nom</option>
          </select>
        </div>

        {/* Bouton icône Ajouter une tâche */}
        <button
          onClick={() => openAddModal()}
          className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold hover:shadow-[0_0_18px_rgba(0,230,118,0.55)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
          title="Ajouter une tâche"
          aria-label="Ajouter une tâche"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
        </button>

        {/* View Mode Switcher */}
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

      {/* 3. Metric Indicator Pills (Dynamic from real tasks) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Aujourd'hui */}
        <div
          onClick={() => {
            setActiveTab('Toutes');
            setQuickFilter((prev) => (prev === 'today' ? 'all' : 'today'));
          }}
          className={`glass-panel rounded-2xl p-3 sm:p-4 border flex items-center gap-3 cursor-pointer transition-all ${
            quickFilter === 'today'
              ? 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'border-emerald-500/25 hover:border-emerald-400/50'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-white">{todayCount}</span>
            <p className="text-[11px] text-emerald-200/70 leading-tight">Aujourd'hui</p>
          </div>
        </div>

        {/* À venir */}
        <div
          onClick={() => {
            setActiveTab('Toutes');
            setQuickFilter((prev) => (prev === 'upcoming' ? 'all' : 'upcoming'));
          }}
          className={`glass-panel rounded-2xl p-3 sm:p-4 border flex items-center gap-3 cursor-pointer transition-all ${
            quickFilter === 'upcoming'
              ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'border-emerald-500/25 hover:border-emerald-400/50'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-white">{upcomingCount}</span>
            <p className="text-[11px] text-emerald-200/70 leading-tight">À venir</p>
          </div>
        </div>

        {/* En retard (Alert glow in red neon) */}
        <div
          onClick={() => {
            setActiveTab('Toutes');
            setQuickFilter((prev) => (prev === 'overdue' ? 'all' : 'overdue'));
          }}
          className={`glass-panel rounded-2xl p-3 sm:p-4 border shadow-[0_0_15px_rgba(244,63,94,0.25)] flex items-center gap-3 cursor-pointer transition-all ${
            quickFilter === 'overdue'
              ? 'border-rose-400'
              : 'border-rose-500/40 hover:border-rose-400'
          }`}
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
          onClick={() => {
            setQuickFilter('all');
            setActiveTab('Terminées');
          }}
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

      {/* 4. Segmented Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'Toutes', label: `Toutes (${tasks.length})` },
          { id: 'À faire', label: `À faire (${todoCount})` },
          { id: 'En cours', label: `En cours (${inProgressCount})` },
          { id: 'Terminées', label: `Terminées (${completedCount})` },
        ].map((tab) => {
          const isActive = quickFilter === 'all' && activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setQuickFilter('all');
                setActiveTab(tab.id as 'Toutes' | 'À faire' | 'En cours' | 'Terminées');
              }}
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
        {quickFilter !== 'all' && (
          <button
            onClick={() => setQuickFilter('all')}
            className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold whitespace-nowrap flex items-center gap-1"
          >
            <span>
              Filtre : {quickFilter === 'today' ? "Aujourd'hui" : quickFilter === 'upcoming' ? 'À venir' : 'En retard'}
            </span>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Main Task List or Calendar View */}
      {viewMode === 'liste' ? (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="glass-panel rounded-3xl p-8 text-center border border-emerald-500/20">
              <p className="text-sm text-emerald-300/70">Aucune tâche trouvée pour cette vue.</p>
              <button
                onClick={() => openAddModal()}
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
                {/* Radio Checkbox */}
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

                  {/* Metadata line: Due Date, Time & Linked Project */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-400/70 mt-3 pt-2 border-t border-emerald-500/15">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3 text-emerald-400" /> Échéance : {task.dueDate || task.createdAt}
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

                {/* Action Icons: Modifier & Supprimer */}
                <div
                  className="flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => openEditModal(task, e)}
                    className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/25 text-emerald-300 hover:text-white hover:border-emerald-400/60 hover:bg-emerald-500/20 transition-all cursor-pointer"
                    title="Modifier la tâche"
                    aria-label="Modifier la tâche"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(task.id);
                    }}
                    className="p-2 rounded-xl bg-emerald-950/60 border border-rose-500/25 text-rose-400/80 hover:text-rose-200 hover:border-rose-400/60 hover:bg-rose-500/20 transition-all cursor-pointer"
                    title="Supprimer la tâche"
                    aria-label="Supprimer la tâche"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Vue Calendrier (Dynamique & Interactive) */
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl p-4 sm:p-6 border border-emerald-500/30">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-emerald-500/20">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-400" />
                {calendarData.monthLabel} · Calendrier des échéances
              </h3>

              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-semibold hidden sm:inline">
                  Semaine {calendarData.weekNumber}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    setSelectedDateKey(todayBounds.todayKey);
                  }}
                  className="px-2.5 py-1 rounded-xl glass-panel-subtle text-emerald-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Aujourd'hui
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(new Date(calendarData.year, calendarData.month - 1, 1))
                  }
                  className="p-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/25 text-emerald-300 hover:text-white hover:border-emerald-400/50 cursor-pointer"
                  aria-label="Mois précédent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(new Date(calendarData.year, calendarData.month + 1, 1))
                  }
                  className="p-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/25 text-emerald-300 hover:text-white hover:border-emerald-400/50 cursor-pointer"
                  aria-label="Mois suivant"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                <span key={d} className="font-bold text-emerald-400/80 py-1 uppercase text-[11px]">
                  {d}
                </span>
              ))}

              {/* Leading empty cells for weekday alignment */}
              {Array.from({ length: calendarData.leadingEmptyDays }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[64px] sm:min-h-[76px]" />
              ))}

              {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
                const day = i + 1;
                const cellDate = new Date(calendarData.year, calendarData.month, day, 0, 0, 0, 0);
                const cellKey = toDateKey(cellDate);
                const dayTasks = calendarData.tasksByDate.get(cellKey) || [];
                const isToday = cellKey === todayBounds.todayKey;
                const isSelected = cellKey === selectedDateKey;
                const hasOverdue = dayTasks.some(isTaskOverdue);
                const hasHigh = dayTasks.some((t) => !t.completed && t.priority === 'Haute');

                return (
                  <button
                    key={cellKey}
                    type="button"
                    onClick={() => setSelectedDateKey(cellKey)}
                    className={`p-2 rounded-2xl border transition-all text-left min-h-[64px] sm:min-h-[76px] flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/30 border-emerald-400 text-white font-bold shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                        : isToday
                        ? 'bg-emerald-500/15 border-emerald-400/60 text-white font-bold'
                        : 'glass-panel-subtle border-emerald-500/15 text-emerald-200/80 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs">{day}</span>
                      {dayTasks.length > 0 && (
                        <span
                          className={`text-[10px] px-1.5 rounded-full font-bold ${
                            hasOverdue || hasHigh
                              ? 'bg-rose-500/30 text-rose-200'
                              : 'bg-emerald-500/30 text-emerald-200'
                          }`}
                        >
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    {dayTasks.length > 0 && (
                      <div className="w-full space-y-0.5 mt-1">
                        <p className="hidden sm:block text-[10px] truncate text-emerald-100/90 font-medium">
                          {dayTasks[0].title}
                        </p>
                        <div className="flex items-center justify-end gap-1">
                          {dayTasks.slice(0, 3).map((dt) => (
                            <span
                              key={dt.id}
                              className={`w-1.5 h-1.5 rounded-full ${
                                dt.completed
                                  ? 'bg-emerald-400/50'
                                  : dt.priority === 'Haute'
                                  ? 'bg-rose-400 shadow-[0_0_5px_#fb7185]'
                                  : dt.priority === 'Moyenne'
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Task Details Panel */}
          <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-400" />
                Tâches du {fromInputDate(selectedDateKey)} ({selectedDayTasks.length})
              </h4>
              <button
                type="button"
                onClick={() => openAddModal(selectedDateKey)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:text-white hover:bg-emerald-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </button>
            </div>

            {selectedDayTasks.length === 0 ? (
              <p className="text-xs text-emerald-300/60 py-2">
                Aucune tâche prévue pour cette date.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDayTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/20 hover:border-emerald-400/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          task.completed
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-emerald-400/60 bg-emerald-950/60'
                        }`}
                      >
                        {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${task.completed ? 'line-through text-emerald-300/60' : 'text-white'}`}>
                          {task.title}
                        </p>
                        <p className="text-[11px] text-emerald-300/70 truncate">
                          {task.dueTime} · {task.projectTitle} · {task.priority}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => openEditModal(task, e)}
                        className="p-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/25 text-emerald-300 hover:text-white cursor-pointer"
                        title="Modifier la tâche"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 rounded-xl bg-emerald-950/60 border border-rose-500/25 text-rose-400/80 hover:text-rose-200 cursor-pointer"
                        title="Supprimer la tâche"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                    onChange={(e) => setNewCategory(e.target.value as Task['category'])}
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
                    onChange={(e) => setNewPriority(e.target.value as Task['priority'])}
                    className="w-full px-3 py-2.5 rounded-2xl glass-input text-sm bg-emerald-950"
                  >
                    <option value="Haute">Haute</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Basse">Basse</option>
                  </select>
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
                  {availableProjectTitles.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Heure
                  </label>
                  <input
                    type="time"
                    value={newDueTime}
                    onChange={(e) => setNewDueTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm [color-scheme:dark]"
                  />
                </div>
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
