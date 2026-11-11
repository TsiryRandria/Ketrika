import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  NavigationTab, 
  DeviceMode, 
  Project, 
  Task, 
  Note, 
  Job, 
  Transaction, 
  NotificationItem, 
  UserProfile, 
  ChatMessage 
} from '../types';
import { 
  initialProjects, 
  initialTasks, 
  initialNotes, 
  initialJobs, 
  initialTransactions, 
  initialNotifications, 
  initialProfile, 
  initialChatMessages 
} from '../data/initialData';
import confetti from 'canvas-confetti';
import { sqliteService } from '../services/sqliteService';

interface AppContextType {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  showQuickMenu: boolean;
  setShowQuickMenu: (show: boolean | ((prev: boolean) => boolean)) => void;
  balanceVisible: boolean;
  setBalanceVisible: (visible: boolean | ((prev: boolean) => boolean)) => void;
  
  // SQLite & Offline Storage Status
  isDbReady: boolean;
  exportSqliteDb: () => void;
  importSqliteDb: (file: File) => Promise<boolean>;
  getDbStats: () => {
    isReady: boolean;
    isHealthy: boolean;
    projectsCount: number;
    tasksCount: number;
    notesCount: number;
    transactionsCount: number;
    jobsCount: number;
    notificationsCount: number;
    chatMessagesCount: number;
    sizeInKb: number;
    engine: string;
    storage: string;
  };

  // Projects
  projects: Project[];
  isProjectDetailOpen: boolean;
  setIsProjectDetailOpen: (val: boolean) => void;
  addProject: (proj: Omit<Project, 'id'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  toggleSubTask: (projectId: string, subTaskId: string) => void;
  
  // Tasks
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  toggleTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  
  // Notes
  notes: Note[];
  isEditingNote: boolean;
  setIsEditingNote: (val: boolean) => void;
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  toggleFavoriteNote: (id: string) => void;
  
  // Jobs
  jobs: Job[];
  isJobDetailOpen: boolean;
  setIsJobDetailOpen: (val: boolean) => void;
  toggleFavoriteJob: (id: string) => void;
  applyToJob: (id: string) => void;
  
  // Finances
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  totalRevenue: number;
  totalExpense: number;
  currentBalance: number;
  
  // Notifications
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearAllNotifications: () => void;
  
  // Profile
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  addDocument: (doc: { name: string; type: string; size: string; date: string }) => void;
  
  // Assistant IA
  chatMessages: ChatMessage[];
  isGeneratingAI: boolean;
  sendChatMessage: (text: string, attachment?: string) => Promise<void>;
  clearChat: () => void;
  
  // Backup / Reset
  exportData: () => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'ketrika_app_state_v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('bienvenue');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('auto');
  const [showQuickMenu, setShowQuickMenu] = useState<boolean>(false);
  const [balanceVisible, setBalanceVisible] = useState<boolean>(true);
  const [isDbReady, setIsDbReady] = useState<boolean>(false);

  // Core entities with immediate local fallback state
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_projects`);
      return saved ? JSON.parse(saved) : initialProjects;
    } catch {
      return initialProjects;
    }
  });
  const [isProjectDetailOpen, setIsProjectDetailOpen] = useState<boolean>(false);

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_tasks`);
      return saved ? JSON.parse(saved) : initialTasks;
    } catch {
      return initialTasks;
    }
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_notes`);
      return saved ? JSON.parse(saved) : initialNotes;
    } catch {
      return initialNotes;
    }
  });
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);

  const [jobs, setJobs] = useState<Job[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_jobs`);
      return saved ? JSON.parse(saved) : initialJobs;
    } catch {
      return initialJobs;
    }
  });
  const [isJobDetailOpen, setIsJobDetailOpen] = useState<boolean>(false);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_transactions`);
      if (saved) {
        const parsed: Transaction[] = JSON.parse(saved);
        if (parsed.length > 0 && Math.abs(parsed[0].amount) < 10000) {
          return initialTransactions;
        }
        return parsed;
      }
      return initialTransactions;
    } catch {
      return initialTransactions;
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_notifications`);
      return saved ? JSON.parse(saved) : initialNotifications;
    } catch {
      return initialNotifications;
    }
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_profile`);
      return saved ? JSON.parse(saved) : initialProfile;
    } catch {
      return initialProfile;
    }
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_chat`);
      return saved ? JSON.parse(saved) : initialChatMessages;
    } catch {
      return initialChatMessages;
    }
  });

  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);

  // Initialize SQLite database, safely migrate localStorage and populate live state
  useEffect(() => {
    let isMounted = true;

    const bootstrapDatabase = async () => {
      try {
        await sqliteService.init();

        if (isMounted) {
          const loadedProjects = sqliteService.getProjects();
          const loadedTasks = sqliteService.getTasks();
          const loadedNotes = sqliteService.getNotes();
          const loadedJobs = sqliteService.getJobs();
          const loadedTransactions = sqliteService.getTransactions();
          const loadedNotifications = sqliteService.getNotifications();
          const loadedProfile = sqliteService.getProfile();
          const loadedChat = sqliteService.getChatMessages();

          if (loadedProjects && loadedProjects.length > 0) setProjects(loadedProjects);
          if (loadedTasks && loadedTasks.length > 0) setTasks(loadedTasks);
          if (loadedNotes && loadedNotes.length > 0) setNotes(loadedNotes);
          if (loadedJobs && loadedJobs.length > 0) setJobs(loadedJobs);
          if (loadedTransactions && loadedTransactions.length > 0) setTransactions(loadedTransactions);
          if (loadedNotifications && loadedNotifications.length > 0) setNotifications(loadedNotifications);
          if (loadedProfile) setProfile(loadedProfile);
          if (loadedChat && loadedChat.length > 0) setChatMessages(loadedChat);

          setIsDbReady(true);
        }
      } catch (err) {
        console.warn('[Ketrika SQLite] SQLite bootstrap notice:', err);
        if (isMounted) setIsDbReady(true);
      }
    };

    bootstrapDatabase();

    return () => {
      isMounted = false;
    };
  }, []);

  // Dual-sync to localStorage as a safety replica
  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_projects`, JSON.stringify(projects));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_tasks`, JSON.stringify(tasks));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_notes`, JSON.stringify(notes));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_jobs`, JSON.stringify(jobs));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_transactions`, JSON.stringify(transactions));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_notifications`, JSON.stringify(notifications));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_profile`, JSON.stringify(profile));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_chat`, JSON.stringify(chatMessages));
    } catch {
      // ignore storage errors
    }
  }, [projects, tasks, notes, jobs, transactions, notifications, profile, chatMessages]);

  // Project handlers
  const addProject = (proj: Omit<Project, 'id'>) => {
    const newProj: Project = {
      ...proj,
      id: `proj-${Date.now()}`,
    };
    setProjects(prev => [newProj, ...prev]);
    sqliteService.saveProject(newProj);

    addNotificationItem({
      title: 'Nouveau projet',
      description: `Le projet "${newProj.title}" a été créé avec succès.`,
      category: 'project',
      time: "À l'instant",
    });
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      const target = updated.find(p => p.id === id);
      if (target) sqliteService.saveProject(target);
      return updated;
    });
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    sqliteService.deleteProject(id);
  };

  const toggleSubTask = (projectId: string, subTaskId: string) => {
    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== projectId) return proj;
        const updatedTasks = proj.tasks.map(t => t.id === subTaskId ? { ...t, completed: !t.completed } : t);
        const doneCount = updatedTasks.filter(t => t.completed).length;
        const newProgress = Math.round((doneCount / updatedTasks.length) * 100);
        const modProj: Project = {
          ...proj,
          tasks: updatedTasks,
          progress: newProgress,
          status: newProgress === 100 ? 'Terminé' : (newProgress > 0 ? 'En cours' : 'À faire')
        };
        sqliteService.saveProject(modProj);
        return modProj;
      });
      return updated;
    });
  };

  // Task handlers
  const addTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('fr-FR'),
    };
    setTasks(prev => [newTask, ...prev]);
    sqliteService.saveTask(newTask);

    addNotificationItem({
      title: 'Nouvelle tâche ajoutée',
      description: `Tâche "${newTask.title}" programmée pour ${newTask.dueDate}.`,
      category: 'task',
      time: "À l'instant",
    });
  };

  const toggleTask = (taskId: string) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          const nextState = !t.completed;
          if (nextState) {
            try {
              confetti({
                particleCount: 40,
                spread: 60,
                origin: { y: 0.8 },
                colors: ['#00e676', '#10b981', '#34d399', '#ffffff']
              });
            } catch {
              // non-fatal
            }
          }
          const modTask: Task = {
            ...t,
            completed: nextState,
            status: nextState ? 'Terminée' : 'À faire'
          };
          sqliteService.saveTask(modTask);
          return modTask;
        }
        return t;
      });
      return updated;
    });
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    sqliteService.deleteTask(taskId);
  };

  // Note handlers
  const addNote = (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toLocaleDateString('fr-FR');
    const newNote: Note = {
      ...note,
      id: `note-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    setNotes(prev => [newNote, ...prev]);
    sqliteService.saveNote(newNote);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    const now = new Date().toLocaleDateString('fr-FR');
    setNotes(prev => {
      const updated = prev.map(n => {
        if (n.id === id) {
          const mod = { ...n, ...updates, updatedAt: now };
          sqliteService.saveNote(mod);
          return mod;
        }
        return n;
      });
      return updated;
    });
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    sqliteService.deleteNote(id);
  };

  const togglePinNote = (id: string) => {
    setNotes(prev => {
      const updated = prev.map(n => {
        if (n.id === id) {
          const mod = { ...n, isPinned: !n.isPinned };
          sqliteService.saveNote(mod);
          return mod;
        }
        return n;
      });
      return updated;
    });
  };

  const toggleFavoriteNote = (id: string) => {
    setNotes(prev => {
      const updated = prev.map(n => {
        if (n.id === id) {
          const mod = { ...n, isFavorite: !n.isFavorite };
          sqliteService.saveNote(mod);
          return mod;
        }
        return n;
      });
      return updated;
    });
  };

  // Job handlers
  const toggleFavoriteJob = (id: string) => {
    setJobs(prev => {
      const updated = prev.map(j => {
        if (j.id === id) {
          const mod = { ...j, isFavorite: !j.isFavorite };
          sqliteService.saveJob(mod);
          return mod;
        }
        return j;
      });
      return updated;
    });
  };

  const applyToJob = (id: string) => {
    setJobs(prev => {
      const updated = prev.map(j => {
        if (j.id === id) {
          const mod = { ...j, applied: true };
          sqliteService.saveJob(mod);
          return mod;
        }
        return j;
      });
      return updated;
    });
    const targetJob = jobs.find(j => j.id === id);
    if (targetJob) {
      addNotificationItem({
        title: 'Candidature envoyée',
        description: `Votre candidature pour le poste de ${targetJob.title} chez ${targetJob.company} a été transmise.`,
        category: 'task',
        time: "À l'instant",
      });
    }
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00e676', '#06b6d4', '#fbbf24']
      });
    } catch {
      // non-fatal
    }
  };

  // Finance handlers
  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tr-${Date.now()}`,
    };
    setTransactions(prev => [newTx, ...prev]);
    sqliteService.saveTransaction(newTx);

    addNotificationItem({
      title: tx.type === 'Revenu' ? 'Revenu enregistré' : 'Dépense enregistrée',
      description: `${tx.title} : ${tx.amount > 0 ? '+' : ''}${tx.amount.toLocaleString('fr-FR')} Ar`,
      category: 'finance',
      time: "À l'instant",
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    sqliteService.deleteTransaction(id);
  };

  const totalRevenue = transactions
    .filter(t => t.type === 'Revenu' || t.amount > 0)
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'Dépense' || t.amount < 0)
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  const currentBalance = totalRevenue - totalExpense;

  // Notification handlers
  const addNotificationItem = (item: Omit<NotificationItem, 'id' | 'isRead' | 'isRecent'>) => {
    const newNotif: NotificationItem = {
      ...item,
      id: `notif-${Date.now()}`,
      isRead: false,
      isRecent: true,
    };
    setNotifications(prev => [newNotif, ...prev]);
    sqliteService.saveNotification(newNotif);
  };

  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  const markNotificationRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => {
        if (n.id === id) {
          const mod = { ...n, isRead: true };
          sqliteService.saveNotification(mod);
          return mod;
        }
        return n;
      });
      return updated;
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    sqliteService.deleteNotification(id);
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => {
        const mod = { ...n, isRead: true };
        sqliteService.saveNotification(mod);
        return mod;
      });
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    sqliteService.clearNotifications();
  };

  // Profile handlers
  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const mod = { ...prev, ...updates };
      sqliteService.saveProfile(mod);
      return mod;
    });
  };

  const addDocument = (doc: { name: string; type: string; size: string; date: string }) => {
    setProfile(prev => {
      const mod = { ...prev, documents: [...prev.documents, doc] };
      sqliteService.saveProfile(mod);
      return mod;
    });
  };

  // Assistant Chat handler with smart contextual answering & SQLite logs
  const sendChatMessage = async (text: string, attachment?: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      attachment,
    };

    setChatMessages(prev => [...prev, userMsg]);
    sqliteService.saveChatMessage(userMsg);
    setIsGeneratingAI(true);

    try {
      const systemContext = `
Tu es Ketrika IA, l'assistant intelligent intégré dans l'application de productivité Ketrika.
Tu assistes ${profile.name} (${profile.email}, basée à ${profile.address}).
L'utilisateur a actuellement ${projects.length} projets (dont "${projects[0]?.title || 'Ketrika'}" à ${projects[0]?.progress || 70}%).
Il a ${tasks.length} tâches dont ${tasks.filter(t => !t.completed).length} en attente.
Son solde financier actuel est de ${currentBalance.toLocaleString('fr-FR')} Ar.
Réponds toujours en français, de façon élégante, concise, proactive, bienveillante et orientée productivité.
      `;

      let replyText = '';

      try {
        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, context: systemContext }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.reply) {
            replyText = data.reply;
          }
        }
      } catch {
        // Fall back to local contextual answers if server is unreachable
      }

      if (!replyText) {
        await new Promise(r => setTimeout(r, 400));
        const lower = text.toLowerCase();
        
        if (lower.includes('idée') || lower.includes('projet')) {
          replyText = `Voici d'excellentes idées pour booster vos projets :\n• **Ketrika v2** : Déployez le module IA avec commandes vocales en direct.\n• **Automatisation** : Créez des règles automatiques pour catégoriser vos dépenses dès réception.\n• **Export Rapport** : Générez automatiquement un bilan hebdomadaire pour votre équipe.`;
        } else if (lower.includes('tâche') || lower.includes('organiser')) {
          const pending = tasks.filter(t => !t.completed);
          replyText = `Vous avez actuellement **${pending.length} tâches** en attente. Ma recommandation pour aujourd'hui :\n1. **${pending[0]?.title || 'Tâche prioritaire'}** (priorité ${pending[0]?.priority || 'Haute'})\n2. Consacrez 45 minutes en mode focus sans distraction pour la finaliser !\nVoulez-vous que j'ajoute un rappel ?`;
        } else if (lower.includes('finance') || lower.includes('budget') || lower.includes('argent') || lower.includes('solde')) {
          replyText = `Votre solde actuel est de **${currentBalance.toLocaleString('fr-FR')} Ar**. Vos revenus s'élèvent à ${totalRevenue.toLocaleString('fr-FR')} Ar contre ${totalExpense.toLocaleString('fr-FR')} Ar de dépenses. Vous êtes bien parti pour atteindre votre objectif d'épargne !`;
        } else if (lower.includes('bonjour') || lower.includes('salut') || lower.includes('coucou')) {
          replyText = `Bonjour ${profile.name} ! Ravi de vous retrouver sur Ketrika. Tout est synchronisé avec SQLite hors connexion. De quoi souhaitez-vous vous occuper aujourd'hui : vos projets, vos tâches ou votre bilan financier ?`;
        } else {
          replyText = `C'est noté ! Tout est sauvegardé dans votre base SQLite locale. Je peux vous aider à planifier cette action dans votre calendrier, créer une sous-tâche pour le projet **${projects[0]?.title || 'Ketrika'}**, ou analyser vos métriques. Que préférez-vous faire ?`;
        }
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages(prev => [...prev, assistantMsg]);
      sqliteService.saveChatMessage(assistantMsg);
    } catch {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: "Ketrika est 100% opérationnel en mode local hors connexion avec la base SQLite. Vos données sont persistées.",
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, errorMsg]);
      sqliteService.saveChatMessage(errorMsg);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const clearChat = () => {
    setChatMessages([initialChatMessages[0]]);
    sqliteService.clearChatMessages();
  };

  // SQLite Binary Export (.db file for Android / backups)
  const exportSqliteDb = () => {
    const bytes = sqliteService.exportSqliteBinary();
    if (!bytes) {
      alert("La base SQLite est en cours d'initialisation.");
      return;
    }
    const blob = new Blob([bytes as any], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ketrika_sqlite_android_${new Date().toISOString().split('T')[0]}.db`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // SQLite Binary Import
  const importSqliteDb = async (file: File): Promise<boolean> => {
    try {
      const buffer = await file.arrayBuffer();
      const success = await sqliteService.importSqliteBinary(new Uint8Array(buffer));
      if (success) {
        setProjects(sqliteService.getProjects());
        setTasks(sqliteService.getTasks());
        setNotes(sqliteService.getNotes());
        setJobs(sqliteService.getJobs());
        setTransactions(sqliteService.getTransactions());
        setNotifications(sqliteService.getNotifications());
        setProfile(sqliteService.getProfile());
        setChatMessages(sqliteService.getChatMessages());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const getDbStats = () => {
    return sqliteService.getDatabaseStats();
  };

  const exportData = () => {
    const fullBackup = {
      projects,
      tasks,
      notes,
      jobs,
      transactions,
      notifications,
      profile,
      chatMessages,
      dbStats: sqliteService.getDatabaseStats(),
      exportedAt: new Date().toISOString(),
      app: 'Ketrika v1.2.0 (SQLite Offline)'
    };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ketrika-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAllData = async () => {
    await sqliteService.resetDatabase();
    localStorage.clear();
    setProjects(initialProjects);
    setTasks(initialTasks);
    setNotes(initialNotes);
    setJobs(initialJobs);
    setTransactions(initialTransactions);
    setNotifications(initialNotifications);
    setProfile(initialProfile);
    setChatMessages(initialChatMessages);
  };

  return (
    <AppContext.Provider value={{
      currentTab,
      setCurrentTab,
      deviceMode,
      setDeviceMode,
      showQuickMenu,
      setShowQuickMenu,
      balanceVisible,
      setBalanceVisible,
      isDbReady,
      exportSqliteDb,
      importSqliteDb,
      getDbStats,
      projects,
      isProjectDetailOpen,
      setIsProjectDetailOpen,
      addProject,
      updateProject,
      deleteProject,
      toggleSubTask,
      tasks,
      addTask,
      toggleTask,
      deleteTask,
      notes,
      isEditingNote,
      setIsEditingNote,
      addNote,
      updateNote,
      deleteNote,
      togglePinNote,
      toggleFavoriteNote,
      jobs,
      isJobDetailOpen,
      setIsJobDetailOpen,
      toggleFavoriteJob,
      applyToJob,
      transactions,
      addTransaction,
      deleteTransaction,
      totalRevenue,
      totalExpense,
      currentBalance,
      notifications,
      unreadNotificationCount,
      markNotificationRead,
      deleteNotification,
      markAllNotificationsRead,
      clearAllNotifications,
      profile,
      updateProfile,
      addDocument,
      chatMessages,
      isGeneratingAI,
      sendChatMessage,
      clearChat,
      exportData,
      resetAllData,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
