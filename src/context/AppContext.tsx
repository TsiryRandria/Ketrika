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

interface AppContextType {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  showQuickMenu: boolean;
  setShowQuickMenu: (show: boolean | ((prev: boolean) => boolean)) => void;
  balanceVisible: boolean;
  setBalanceVisible: (visible: boolean | ((prev: boolean) => boolean)) => void;
  
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

  // Core entities
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_projects`);
    return saved ? JSON.parse(saved) : initialProjects;
  });
  const [isProjectDetailOpen, setIsProjectDetailOpen] = useState<boolean>(false);

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_tasks`);
    return saved ? JSON.parse(saved) : initialTasks;
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_notes`);
    return saved ? JSON.parse(saved) : initialNotes;
  });
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);

  const [jobs, setJobs] = useState<Job[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_jobs`);
    return saved ? JSON.parse(saved) : initialJobs;
  });
  const [isJobDetailOpen, setIsJobDetailOpen] = useState<boolean>(false);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_transactions`);
    if (saved) {
      try {
        const parsed: Transaction[] = JSON.parse(saved);
        // Automatically migrate to new Ariary denominations if stored data had old Euro values
        if (parsed.length > 0 && Math.abs(parsed[0].amount) < 10000) {
          return initialTransactions;
        }
        return parsed;
      } catch {
        return initialTransactions;
      }
    }
    return initialTransactions;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_notifications`);
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_profile`);
    return saved ? JSON.parse(saved) : initialProfile;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_chat`);
    return saved ? JSON.parse(saved) : initialChatMessages;
  });

  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);

  // Sync to localStorage
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
    // Also notify
    addNotificationItem({
      title: 'Nouveau projet',
      description: `Le projet "${newProj.title}" a été créé avec succès.`,
      category: 'project',
      time: "À l'instant",
    });
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const toggleSubTask = (projectId: string, subTaskId: string) => {
    setProjects(prev => prev.map(proj => {
      if (proj.id !== projectId) return proj;
      const updatedTasks = proj.tasks.map(t => t.id === subTaskId ? { ...t, completed: !t.completed } : t);
      const doneCount = updatedTasks.filter(t => t.completed).length;
      const newProgress = Math.round((doneCount / updatedTasks.length) * 100);
      return {
        ...proj,
        tasks: updatedTasks,
        progress: newProgress,
        status: newProgress === 100 ? 'Terminé' : (newProgress > 0 ? 'En cours' : 'À faire')
      };
    }));
  };

  // Task handlers
  const addTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('fr-FR'),
    };
    setTasks(prev => [newTask, ...prev]);
    addNotificationItem({
      title: 'Nouvelle tâche ajoutée',
      description: `Tâche "${newTask.title}" programmée pour ${newTask.dueDate}.`,
      category: 'task',
      time: "À l'instant",
    });
  };

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => {
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
        return {
          ...t,
          completed: nextState,
          status: nextState ? 'Terminée' : 'À faire'
        };
      }
      return t;
    }));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
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
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    const now = new Date().toLocaleDateString('fr-FR');
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: now } : n));
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const togglePinNote = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };

  const toggleFavoriteNote = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isFavorite: !n.isFavorite } : n));
  };

  // Job handlers
  const toggleFavoriteJob = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, isFavorite: !j.isFavorite } : j));
  };

  const applyToJob = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, applied: true } : j));
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
    addNotificationItem({
      title: tx.type === 'Revenu' ? 'Revenu enregistré' : 'Dépense enregistrée',
      description: `${tx.title} : ${tx.amount > 0 ? '+' : ''}${tx.amount.toLocaleString('fr-FR')} Ar`,
      category: 'finance',
      time: "À l'instant",
    });
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
  };

  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Profile handlers
  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const addDocument = (doc: { name: string; type: string; size: string; date: string }) => {
    setProfile(prev => ({ ...prev, documents: [...prev.documents, doc] }));
  };

  // Assistant Chat handler with smart contextual answering
  const sendChatMessage = async (text: string, attachment?: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      attachment,
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsGeneratingAI(true);

    try {
      // Check if user has Gemini API configured
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
      
      let replyText = '';

      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        
        const systemContext = `
Tu es Ketrika IA, l'assistant intelligent intégré dans l'application de productivité Ketrika.
Tu assistes ${profile.name} (${profile.email}, basée à ${profile.address}).
L'utilisateur a actuellement ${projects.length} projets (dont "${projects[0]?.title || 'Ketrika'}" à ${projects[0]?.progress || 70}%).
Il a ${tasks.length} tâches dont ${tasks.filter(t => !t.completed).length} en attente.
Son solde financier actuel est de ${currentBalance.toLocaleString('fr-FR')} Ar.
Réponds toujours en français, de façon élégante, concise, proactive, bienveillante et orientée productivité.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            { role: 'user', parts: [{ text: `${systemContext}\n\nQuestion de l'utilisateur: ${text}` }] }
          ]
        });

        replyText = response.text || "Je suis à votre disposition pour vous aider dans vos projets Ketrika.";
      } else {
        // Smart realistic contextual responses for fast interaction
        await new Promise(r => setTimeout(r, 600));
        const lower = text.toLowerCase();
        
        if (lower.includes('idée') || lower.includes('projet')) {
          replyText = `Voici d'excellentes idées pour booster vos projets :\n• **Ketrika v2** : Déployez le module IA avec commandes vocales en direct.\n• **Automatisation** : Créez des règles automatiques pour catégoriser vos dépenses dès réception.\n• **Export Rapport** : Générez automatiquement un bilan hebdomadaire pour votre équipe.`;
        } else if (lower.includes('tâche') || lower.includes('organiser')) {
          const pending = tasks.filter(t => !t.completed);
          replyText = `Vous avez actuellement **${pending.length} tâches** en attente. Ma recommandation pour aujourd'hui :\n1. **${pending[0]?.title || 'Tâche prioritaire'}** (priorité ${pending[0]?.priority || 'Haute'})\n2. Consacrez 45 minutes en mode focus sans distraction pour la finaliser !\nVoulez-vous que j'ajoute un rappel ?`;
        } else if (lower.includes('finance') || lower.includes('budget') || lower.includes('argent') || lower.includes('solde')) {
          replyText = `Votre solde actuel est de **${currentBalance.toLocaleString('fr-FR')} Ar**. Vos revenus s'élèvent à ${totalRevenue.toLocaleString('fr-FR')} Ar contre ${totalExpense.toLocaleString('fr-FR')} Ar de dépenses. Vous êtes bien parti pour atteindre votre objectif d'épargne !`;
        } else if (lower.includes('bonjour') || lower.includes('salut') || lower.includes('coucou')) {
          replyText = `Bonjour ${profile.name} ! Ravi de vous retrouver sur Ketrika. Tout est synchronisé. De quoi souhaitez-vous vous occuper aujourd'hui : vos projets, vos tâches ou votre bilan financier ?`;
        } else {
          replyText = `C'est noté ! Je peux vous aider à planifier cette action dans votre calendrier, créer une sous-tâche pour le projet **${projects[0]?.title || 'Ketrika'}**, ou analyser vos métriques. Que préférez-vous faire ?`;
        }
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: "Je suis opérationnel en mode local pour organiser vos tâches et projets. Vos données sont sécurisées.",
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const clearChat = () => {
    setChatMessages([initialChatMessages[0]]);
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
      exportedAt: new Date().toISOString(),
      app: 'Ketrika v1.0.0'
    };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ketrika-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAllData = () => {
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
      resetAllData
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
