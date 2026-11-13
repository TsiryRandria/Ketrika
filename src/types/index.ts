import type { AttachmentMeta } from '../shared/attachmentLimits';

export type NavigationTab = 
  | 'bienvenue'
  | 'accueil' 
  | 'notes' 
  | 'projets' 
  | 'taches' 
  | 'assistant' 
  | 'emplois' 
  | 'finances' 
  | 'statistiques'
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
  startDate?: string;
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
  appliedCv?: string;
  appliedCoverNote?: string;
  appliedAt?: string;
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

export interface FinanceSettings {
  monthlyBudgetMax: number;
  savingsGoalCurrent: number;
  savingsGoalTarget: number;
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

export interface ProfileExperience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  missions: string;
  achievements: string;
}

export interface ProfileEducation {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  description: string;
}

export interface ProfileSkill {
  id: string;
  name: string;
  category: 'Compétences techniques' | 'Compétences informatiques' | 'Compétences personnelles (Soft Skills)';
  level: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Expert';
}

export interface ProfileLanguage {
  id: string;
  name: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Courant' | 'Natif';
}

export interface ProfileDocument {
  id?: string;
  name: string;
  type: string;
  category?: 'CV' | 'Diplômes' | 'Certificats' | 'Attestations' | 'Lettres de motivation' | 'Autres documents professionnels';
  size: string;
  date: string;
  dataUrl?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  isPremium: boolean;
  avatarUrl: string;
  documents: ProfileDocument[];
  notificationsEnabled: boolean;

  // 1. Informations personnelles complémentaires
  birthDate?: string;
  city?: string;
  country?: string;
  currentStatus?: string;
  bio?: string;

  // 2. Profil professionnel
  professionalProfile?: {
    title: string;
    objective: string;
    sector: string;
    specialties: string;
    desiredWorkType: string;
    availability: string;
  };

  // 3. Expériences professionnelles
  experiences?: ProfileExperience[];

  // 4. Formations et études
  educations?: ProfileEducation[];

  // 5. Compétences
  skills?: ProfileSkill[];

  // 6. Langues
  languages?: ProfileLanguage[];

  // 8. Portfolio et liens professionnels
  portfolioLinks?: {
    github: string;
    linkedin: string;
    portfolio: string;
    website: string;
    projectsSummary: string;
  };

  // 9. Informations complémentaires
  additionalInfo?: {
    interests: string;
    hobbies: string;
    personalQualities: string;
    references: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachment?: string;
  attachmentsMeta?: AttachmentMeta[];
}
