export type NavigationTab = 
  | 'bienvenue'
  | 'accueil' 
  | 'notes' 
  | 'projets' 
  | 'taches' 
  | 'assistant' 
  | 'emplois' 
  | 'finances' 
  | 'parametres' 
  | 'notifications';

export type DeviceMode = 'auto' | 'mobile' | 'tablet' | 'desktop';

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  priority: 'Haute' | 'Moyenne' | 'Basse';
  status: 'En cours' | 'À faire' | 'Terminé';
  progress: number; // 0 to 100
  tasks: SubTask[];
  category: string;
  image?: string;
  isArchived?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: 'Rapport' | 'Présentation' | 'Développement' | 'Marketing' | 'Organisation';
  priority: 'Haute' | 'Moyenne' | 'Basse';
  status: 'À faire' | 'En cours' | 'Terminée';
  projectTitle: string;
  dueDate: string;
  dueTime: string;
  createdAt: string;
  completed: boolean;
  isOverdue?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  isFavorite: boolean;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  category: string;
  image?: string;
  checklist?: { text: string; done: boolean }[];
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  contract: 'CDI' | 'Freelance' | 'CDD' | 'Stage';
  workMode: 'À distance' | 'Hybride' | 'Sur site';
  rating: number;
  experience: string;
  description: string;
  isFavorite: boolean;
  logo: string;
  applied?: boolean;
  postedDate: string;
  deadlineDate: string;
}

export interface Transaction {
  id: string;
  title: string;
  type: 'Revenu' | 'Dépense';
  category: string;
  amount: number;
  date: string;
  source: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  category: 'task' | 'project' | 'deadline' | 'meeting' | 'finance' | 'ai' | 'budget';
  time: string;
  isRead: boolean;
  isRecent: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  isPremium: boolean;
  avatarUrl: string;
  documents: { name: string; type: string; size: string; date: string }[];
  notificationsEnabled: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachment?: string;
}
