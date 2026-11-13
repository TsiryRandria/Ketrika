import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UserProfile,
  ProfileExperience,
  ProfileEducation,
  ProfileSkill,
  ProfileLanguage,
  ProfileDocument
} from '../../types';
import {
  ChevronLeft,
  Edit3,
  Save,
  X,
  Camera,
  User,
  Briefcase,
  Building2,
  GraduationCap,
  Cpu,
  Languages,
  FileText,
  Globe,
  Sparkles,
  Plus,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ExternalLink,
  Upload,
  CheckCircle2,
  FolderGit2
} from 'lucide-react';

interface ProfileInfoPageProps {
  onBack: () => void;
}

const SITUATIONS = [
  'Étudiant',
  'Freelance',
  'Employé',
  'Entrepreneur',
  'En recherche d\'emploi',
  'Autre'
];

const SKILL_CATEGORIES: ProfileSkill['category'][] = [
  'Compétences techniques',
  'Compétences informatiques',
  'Compétences personnelles (Soft Skills)'
];

const SKILL_LEVELS: ProfileSkill['level'][] = [
  'Débutant',
  'Intermédiaire',
  'Avancé',
  'Expert'
];

const LANGUAGE_LEVELS: ProfileLanguage['level'][] = [
  'Débutant',
  'Intermédiaire',
  'Avancé',
  'Courant',
  'Natif'
];

const DOCUMENT_CATEGORIES: NonNullable<ProfileDocument['category']>[] = [
  'CV',
  'Diplômes',
  'Certificats',
  'Attestations',
  'Lettres de motivation',
  'Autres documents professionnels'
];

export const ProfileInfoPage: React.FC<ProfileInfoPageProps> = ({ onBack }) => {
  const { profile, updateProfile } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const buildDraft = (src: UserProfile): UserProfile => ({
    ...src,
    birthDate: src.birthDate || '',
    city: src.city || '',
    country: src.country || '',
    currentStatus: src.currentStatus || 'Freelance',
    bio: src.bio || '',
    professionalProfile: {
      title: src.professionalProfile?.title || '',
      objective: src.professionalProfile?.objective || '',
      sector: src.professionalProfile?.sector || '',
      specialties: src.professionalProfile?.specialties || '',
      desiredWorkType: src.professionalProfile?.desiredWorkType || '',
      availability: src.professionalProfile?.availability || ''
    },
    experiences: src.experiences ? src.experiences.map(e => ({ ...e })) : [],
    educations: src.educations ? src.educations.map(e => ({ ...e })) : [],
    skills: src.skills ? src.skills.map(s => ({ ...s })) : [],
    languages: src.languages ? src.languages.map(l => ({ ...l })) : [],
    documents: src.documents ? src.documents.map(d => ({ ...d })) : [],
    portfolioLinks: {
      github: src.portfolioLinks?.github || '',
      linkedin: src.portfolioLinks?.linkedin || '',
      portfolio: src.portfolioLinks?.portfolio || '',
      website: src.portfolioLinks?.website || '',
      projectsSummary: src.portfolioLinks?.projectsSummary || ''
    },
    additionalInfo: {
      interests: src.additionalInfo?.interests || '',
      hobbies: src.additionalInfo?.hobbies || '',
      personalQualities: src.additionalInfo?.personalQualities || '',
      references: src.additionalInfo?.references || ''
    }
  });

  const [draft, setDraft] = useState<UserProfile>(() => buildDraft(profile));

  useEffect(() => {
    if (!isEditing) {
      setDraft(buildDraft(profile));
    }
  }, [profile, isEditing]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateProfile(draft);
    setIsEditing(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleCancel = () => {
    setDraft(buildDraft(profile));
    setIsEditing(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraft(prev => ({ ...prev, avatarUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeLabel = file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo`
      : `${Math.max(1, Math.round(file.size / 1024))} Ko`;
    const reader = new FileReader();
    reader.onload = () => {
      const newDoc: ProfileDocument = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: 'Document importé',
        category: 'Autres documents professionnels',
        size: sizeLabel,
        date: new Date().toLocaleDateString('fr-FR'),
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined
      };
      setDraft(prev => ({ ...prev, documents: [...prev.documents, newDoc] }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Array helpers
  const addExperience = () => {
    const next: ProfileExperience = {
      id: `exp-${Date.now()}`,
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      missions: '',
      achievements: ''
    };
    setDraft(prev => ({ ...prev, experiences: [...(prev.experiences || []), next] }));
  };

  const updateExperience = (id: string, field: keyof ProfileExperience, value: string) => {
    setDraft(prev => ({
      ...prev,
      experiences: (prev.experiences || []).map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeExperience = (id: string) => {
    setDraft(prev => ({
      ...prev,
      experiences: (prev.experiences || []).filter(item => item.id !== id)
    }));
  };

  const addEducation = () => {
    const next: ProfileEducation = {
      id: `edu-${Date.now()}`,
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startYear: '',
      endYear: '',
      description: ''
    };
    setDraft(prev => ({ ...prev, educations: [...(prev.educations || []), next] }));
  };

  const updateEducation = (id: string, field: keyof ProfileEducation, value: string) => {
    setDraft(prev => ({
      ...prev,
      educations: (prev.educations || []).map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeEducation = (id: string) => {
    setDraft(prev => ({
      ...prev,
      educations: (prev.educations || []).filter(item => item.id !== id)
    }));
  };

  const addSkill = () => {
    const next: ProfileSkill = {
      id: `sk-${Date.now()}`,
      name: '',
      category: 'Compétences techniques',
      level: 'Intermédiaire'
    };
    setDraft(prev => ({ ...prev, skills: [...(prev.skills || []), next] }));
  };

  const updateSkill = (id: string, field: keyof ProfileSkill, value: string) => {
    setDraft(prev => ({
      ...prev,
      skills: (prev.skills || []).map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeSkill = (id: string) => {
    setDraft(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(item => item.id !== id)
    }));
  };

  const addLanguage = () => {
    const next: ProfileLanguage = {
      id: `lang-${Date.now()}`,
      name: '',
      level: 'Intermédiaire'
    };
    setDraft(prev => ({ ...prev, languages: [...(prev.languages || []), next] }));
  };

  const updateLanguage = (id: string, field: keyof ProfileLanguage, value: string) => {
    setDraft(prev => ({
      ...prev,
      languages: (prev.languages || []).map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeLanguage = (id: string) => {
    setDraft(prev => ({
      ...prev,
      languages: (prev.languages || []).filter(item => item.id !== id)
    }));
  };

  const addManualDocument = () => {
    const next: ProfileDocument = {
      id: `doc-${Date.now()}`,
      name: '',
      type: '',
      category: 'CV',
      size: '1.0 Mo',
      date: new Date().toLocaleDateString('fr-FR')
    };
    setDraft(prev => ({ ...prev, documents: [...prev.documents, next] }));
  };

  const updateDocument = (idx: number, field: keyof ProfileDocument, value: string) => {
    setDraft(prev => ({
      ...prev,
      documents: prev.documents.map((doc, i) => (i === idx ? { ...doc, [field]: value } : doc))
    }));
  };

  const removeDocument = (idx: number) => {
    setDraft(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== idx)
    }));
  };

  const data = isEditing ? draft : buildDraft(profile);

  const renderSectionHeader = (
    num: number,
    title: string,
    Icon: React.ComponentType<{ className?: string }>
  ) => (
    <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
          {num}. {title}
        </h2>
      </div>
      {!isEditing && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs text-emerald-300/80 hover:text-emerald-200 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-emerald-500/15 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Modifier</span>
        </button>
      )}
    </div>
  );

  const formatExternalUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  return (
    <div className="max-w-4xl mx-auto pb-36 md:pb-16 animate-in fade-in duration-200 space-y-5">
      {/* Top Header with Retour & Modifier/Enregistrer */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-[#013b27]/90 backdrop-blur-xl border-b border-emerald-500/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              onBack();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-200 hover:text-white hover:border-emerald-400/60 transition-all text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Information
            </h1>
            <p className="text-[11px] text-emerald-300/75">
              Dossier complet du profil personnel et professionnel
            </p>
          </div>
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_16px_rgba(0,230,118,0.4)] hover:bg-emerald-400 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Modifier</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSave()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_16px_rgba(0,230,118,0.4)] hover:bg-emerald-400 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Enregistrer</span>
          </button>
        )}
      </div>

      {savedNotice && (
        <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-400/60 text-xs text-emerald-200 flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Toutes vos informations ont été enregistrées dans votre base locale SQLite.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* 1. Informations personnelles */}
        <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-5">
          {renderSectionHeader(1, 'Informations personnelles', User)}

          {/* Photo de profil */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/20">
            <div className="relative w-20 h-20 rounded-full p-1 border-2 border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.4)] shrink-0">
              <img
                src={data.avatarUrl || '/assets/images/avatar_user.jpg'}
                alt={data.name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="text-sm font-bold text-white">Photo de profil</p>
              <p className="text-xs text-emerald-300/80 italic">
                Sary ampiasaina amin'ny mombamomba anao
              </p>
              {isEditing && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:text-white text-xs font-semibold cursor-pointer transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Importer une photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft(prev => ({ ...prev, avatarUrl: '/assets/images/avatar_user.jpg' }))
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-300/80 hover:text-white text-xs font-medium transition-colors"
                  >
                    Réinitialiser
                  </button>
                </div>
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Nom complet
                </span>
                <p className="text-white font-semibold mt-0.5">{data.name || 'Non renseigné'}</p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Date de naissance
                </span>
                <p className="text-white font-medium mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{data.birthDate || 'Non renseignée'}</span>
                </p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Téléphone
                </span>
                <p className="text-white font-medium mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{data.phone || 'Non renseigné'}</span>
                </p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Adresse e-mail
                </span>
                <p className="text-white font-medium mt-0.5 flex items-center gap-1.5 break-all">
                  <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{data.email || 'Non renseigné'}</span>
                </p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Adresse / Ville / Pays
                </span>
                <p className="text-white font-medium mt-0.5 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    {[data.address, data.city, data.country].filter(Boolean).join(', ') || 'Non renseignée'}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Situation actuelle
                </span>
                <span className="inline-block mt-1 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold">
                  {data.currentStatus || 'Non renseignée'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Petite présentation personnelle
                </span>
                <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed mt-1 whitespace-pre-line">
                  {data.bio || 'Aucune présentation renseignée.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  required
                  value={draft.name}
                  onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Date de naissance
                </label>
                <input
                  type="date"
                  value={draft.birthDate || ''}
                  onChange={e => setDraft(prev => ({ ...prev, birthDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Téléphone
                </label>
                <input
                  type="text"
                  value={draft.phone}
                  onChange={e => setDraft(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  required
                  value={draft.email}
                  onChange={e => setDraft(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  placeholder="Quartier, rue, lot..."
                  value={draft.address}
                  onChange={e => setDraft(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    placeholder="Antananarivo"
                    value={draft.city || ''}
                    onChange={e => setDraft(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-2xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Pays
                  </label>
                  <input
                    type="text"
                    placeholder="Madagascar"
                    value={draft.country || ''}
                    onChange={e => setDraft(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-2xl glass-input text-sm"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Situation actuelle
                </label>
                <select
                  value={draft.currentStatus || 'Freelance'}
                  onChange={e => setDraft(prev => ({ ...prev, currentStatus: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm bg-emerald-950/90"
                >
                  {SITUATIONS.map(sit => (
                    <option key={sit} value={sit} className="bg-slate-900 text-white">
                      {sit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Petite présentation personnelle
                </label>
                <textarea
                  rows={3}
                  value={draft.bio || ''}
                  onChange={e => setDraft(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Présentez-vous en quelques phrases..."
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm resize-y"
                />
              </div>
            </div>
          )}
        </section>

        {/* 2. Profil professionnel */}
        <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
          {renderSectionHeader(2, 'Profil professionnel', Briefcase)}

          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Titre professionnel
                </span>
                <p className="text-white font-semibold mt-0.5">
                  {data.professionalProfile?.title || 'Non renseigné'}
                </p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Domaine d'activité
                </span>
                <p className="text-white font-medium mt-0.5">
                  {data.professionalProfile?.sector || 'Non renseigné'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Objectif professionnel
                </span>
                <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed mt-0.5">
                  {data.professionalProfile?.objective || 'Non renseigné'}
                </p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Spécialités
                </span>
                <p className="text-emerald-200 text-xs sm:text-sm mt-0.5">
                  {data.professionalProfile?.specialties || 'Non renseignées'}
                </p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Type de travail recherché
                </span>
                <p className="text-white font-medium mt-0.5">
                  {data.professionalProfile?.desiredWorkType || 'Non renseigné'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Disponibilité professionnelle
                </span>
                <span className="inline-block mt-1 px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-bold">
                  {data.professionalProfile?.availability || 'Non renseignée'}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Titre professionnel
                </label>
                <input
                  type="text"
                  placeholder="ex: Développeur Full Stack"
                  value={draft.professionalProfile?.title || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      professionalProfile: { ...prev.professionalProfile!, title: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Domaine d'activité
                </label>
                <input
                  type="text"
                  value={draft.professionalProfile?.sector || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      professionalProfile: { ...prev.professionalProfile!, sector: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Objectif professionnel
                </label>
                <textarea
                  rows={2}
                  value={draft.professionalProfile?.objective || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      professionalProfile: { ...prev.professionalProfile!, objective: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm resize-y"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Spécialités
                </label>
                <input
                  type="text"
                  value={draft.professionalProfile?.specialties || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      professionalProfile: { ...prev.professionalProfile!, specialties: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Type de travail recherché
                </label>
                <input
                  type="text"
                  placeholder="CDI, Freelance, Télétravail..."
                  value={draft.professionalProfile?.desiredWorkType || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      professionalProfile: { ...prev.professionalProfile!, desiredWorkType: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Disponibilité professionnelle
                </label>
                <input
                  type="text"
                  placeholder="ex: Disponible immédiatement"
                  value={draft.professionalProfile?.availability || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      professionalProfile: { ...prev.professionalProfile!, availability: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
            </div>
          )}
        </section>

        {/* 3. Expériences professionnelles */}
        <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
          {renderSectionHeader(3, 'Expériences professionnelles', Building2)}

          {!isEditing ? (
            <div className="space-y-3">
              {(data.experiences || []).length === 0 ? (
                <p className="text-xs text-emerald-300/70 italic">Aucune expérience enregistrée.</p>
              ) : (
                (data.experiences || []).map(exp => (
                  <div
                    key={exp.id}
                    className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-white">{exp.position || 'Poste'}</h3>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {exp.startDate || '?'} — {exp.endDate || '?'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-cyan-300">{exp.company}</p>
                    {exp.missions && (
                      <p className="text-xs text-emerald-100/90 pt-1">
                        <span className="font-bold text-emerald-300">Missions : </span>
                        {exp.missions}
                      </p>
                    )}
                    {exp.achievements && (
                      <p className="text-xs text-emerald-100/90">
                        <span className="font-bold text-emerald-300">Réalisations : </span>
                        {exp.achievements}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {(draft.experiences || []).map((exp, idx) => (
                <div
                  key={exp.id}
                  className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/25 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">Expérience #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeExperience(exp.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nom de l'entreprise"
                      value={exp.company}
                      onChange={e => updateExperience(exp.id, 'company', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Poste occupé"
                      value={exp.position}
                      onChange={e => updateExperience(exp.id, 'position', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Date de début (ex: 2023-03)"
                      value={exp.startDate}
                      onChange={e => updateExperience(exp.id, 'startDate', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Date de fin (ex: Présent)"
                      value={exp.endDate}
                      onChange={e => updateExperience(exp.id, 'endDate', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Missions réalisées"
                    value={exp.missions}
                    onChange={e => updateExperience(exp.id, 'missions', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm"
                  />
                  <textarea
                    rows={2}
                    placeholder="Réalisations principales"
                    value={exp.achievements}
                    onChange={e => updateExperience(exp.id, 'achievements', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addExperience}
                className="w-full py-2.5 rounded-2xl border border-dashed border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une expérience professionnelle</span>
              </button>
            </div>
          )}
        </section>

        {/* 4. Formations et études */}
        <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
          {renderSectionHeader(4, 'Formations et études', GraduationCap)}

          {!isEditing ? (
            <div className="space-y-3">
              {(data.educations || []).length === 0 ? (
                <p className="text-xs text-emerald-300/70 italic">Aucune formation enregistrée.</p>
              ) : (
                (data.educations || []).map(edu => (
                  <div
                    key={edu.id}
                    className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-white">{edu.degree || 'Diplôme'}</h3>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {edu.startYear || '?'} — {edu.endYear || '?'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-cyan-300">
                      {edu.institution} {edu.fieldOfStudy ? `• ${edu.fieldOfStudy}` : ''}
                    </p>
                    {edu.description && (
                      <p className="text-xs text-emerald-100/85 pt-1">{edu.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {(draft.educations || []).map((edu, idx) => (
                <div
                  key={edu.id}
                  className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/25 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">Formation #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeEducation(edu.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Établissement"
                      value={edu.institution}
                      onChange={e => updateEducation(edu.id, 'institution', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Diplôme"
                      value={edu.degree}
                      onChange={e => updateEducation(edu.id, 'degree', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Domaine d'études"
                      value={edu.fieldOfStudy}
                      onChange={e => updateEducation(edu.id, 'fieldOfStudy', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm sm:col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Année de début (ex: 2019)"
                      value={edu.startYear}
                      onChange={e => updateEducation(edu.id, 'startYear', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Année de fin (ex: 2021)"
                      value={edu.endYear}
                      onChange={e => updateEducation(edu.id, 'endYear', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Description"
                    value={edu.description}
                    onChange={e => updateEducation(edu.id, 'description', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addEducation}
                className="w-full py-2.5 rounded-2xl border border-dashed border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une formation ou étude</span>
              </button>
            </div>
          )}
        </section>

        {/* 5. Compétences */}
        <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
          {renderSectionHeader(5, 'Compétences', Cpu)}

          {!isEditing ? (
            <div className="space-y-4">
              {SKILL_CATEGORIES.map(cat => {
                const items = (data.skills || []).filter(s => s.category === cat);
                return (
                  <div key={cat} className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      {cat}
                    </h3>
                    {items.length === 0 ? (
                      <p className="text-xs text-emerald-300/60 italic">Aucune compétence ajoutée.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {items.map(skill => (
                          <div
                            key={skill.id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs flex items-center gap-2"
                          >
                            <span className="font-bold text-white">{skill.name}</span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              {skill.level}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {(draft.skills || []).map(skill => (
                <div
                  key={skill.id}
                  className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/25 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                >
                  <input
                    type="text"
                    placeholder="Nom de la compétence"
                    value={skill.name}
                    onChange={e => updateSkill(skill.id, 'name', e.target.value)}
                    className="sm:col-span-5 px-3 py-2 rounded-xl glass-input text-xs sm:text-sm"
                  />
                  <select
                    value={skill.category}
                    onChange={e => updateSkill(skill.id, 'category', e.target.value)}
                    className="sm:col-span-4 px-3 py-2 rounded-xl glass-input text-xs bg-emerald-950/90"
                  >
                    {SKILL_CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                  <select
                    value={skill.level}
                    onChange={e => updateSkill(skill.id, 'level', e.target.value)}
                    className="sm:col-span-2 px-3 py-2 rounded-xl glass-input text-xs bg-emerald-950/90"
                  >
                    {SKILL_LEVELS.map(lvl => (
                      <option key={lvl} value={lvl} className="bg-slate-900 text-white">
                        {lvl}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill.id)}
                    className="sm:col-span-1 justify-self-end text-rose-400 hover:text-rose-300 p-1.5"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSkill}
                className="w-full py-2.5 rounded-2xl border border-dashed border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une compétence</span>
              </button>
            </div>
          )}
        </section>

        {/* 6. Langues */}
        <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
          {renderSectionHeader(6, 'Langues', Languages)}

          {!isEditing ? (
            <div className="flex flex-wrap gap-2.5">
              {(data.languages || []).length === 0 ? (
                <p className="text-xs text-emerald-300/70 italic">Aucune langue enregistrée.</p>
              ) : (
                (data.languages || []).map(lang => (
                  <div
                    key={lang.id}
                    className="px-3.5 py-2 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center gap-2.5 text-xs"
                  >
                    <span className="font-bold text-white">{lang.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-[10px] font-bold">
                      {lang.level}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {(draft.languages || []).map(lang => (
                <div
                  key={lang.id}
                  className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/25 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                >
                  <input
                    type="text"
                    placeholder="Langue (ex: Français, Anglais, Malagasy)"
                    value={lang.name}
                    onChange={e => updateLanguage(lang.id, 'name', e.target.value)}
                    className="sm:col-span-7 px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm"
                  />
                  <select
                    value={lang.level}
                    onChange={e => updateLanguage(lang.id, 'level', e.target.value)}
                    className="sm:col-span-4 px-3 py-2 rounded-xl glass-input text-xs bg-emerald-950/90"
                  >
                    {LANGUAGE_LEVELS.map(lvl => (
                      <option key={lvl} value={lvl} className="bg-slate-900 text-white">
                        {lvl}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeLanguage(lang.id)}
                    className="sm:col-span-1 justify-self-end text-rose-400 hover:text-rose-300 p-1.5"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addLanguage}
                className="w-full py-2.5 rounded-2xl border border-dashed border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une langue</span>
              </button>
            </div>
          )}
        </section>

        {/* 7. Certifications et documents */}
        <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
          {renderSectionHeader(7, 'Certifications et documents', FileText)}

          {!isEditing ? (
            <div className="space-y-2.5">
              {data.documents.length === 0 ? (
                <p className="text-xs text-emerald-300/70 italic">Aucun document enregistré.</p>
              ) : (
                data.documents.map((doc, idx) => (
                  <div
                    key={doc.id || `${doc.name}-${idx}`}
                    className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-white truncate">{doc.name}</p>
                        <p className="text-[11px] text-emerald-300/80 truncate">
                          {doc.category || 'Document'} {doc.type ? `• ${doc.type}` : ''} • {doc.size} • {doc.date}
                        </p>
                      </div>
                    </div>
                    {doc.dataUrl && (
                      <a
                        href={doc.dataUrl}
                        download={doc.name}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 hover:text-white text-[11px] font-bold shrink-0"
                      >
                        Ouvrir
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {draft.documents.map((doc, idx) => (
                <div
                  key={doc.id || `${doc.name}-${idx}`}
                  className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/25 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                >
                  <select
                    value={doc.category || 'Autres documents professionnels'}
                    onChange={e => updateDocument(idx, 'category', e.target.value)}
                    className="sm:col-span-4 px-3 py-2 rounded-xl glass-input text-xs bg-emerald-950/90"
                  >
                    {DOCUMENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Nom du fichier (ex: Mon CV.pdf)"
                    value={doc.name}
                    onChange={e => updateDocument(idx, 'name', e.target.value)}
                    className="sm:col-span-4 px-3 py-2 rounded-xl glass-input text-xs sm:text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Description / Titre"
                    value={doc.type}
                    onChange={e => updateDocument(idx, 'type', e.target.value)}
                    className="sm:col-span-3 px-3 py-2 rounded-xl glass-input text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeDocument(idx)}
                    className="sm:col-span-1 justify-self-end text-rose-400 hover:text-rose-300 p-1.5"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={addManualDocument}
                  className="py-2.5 rounded-2xl border border-dashed border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter une entrée</span>
                </button>
                <label className="py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Importer un document (CV, diplôme...)</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleDocumentUpload}
                  />
                </label>
              </div>
            </div>
          )}
        </section>

        {/* 8. Portfolio et liens professionnels */}
        <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
          {renderSectionHeader(8, 'Portfolio et liens professionnels', Globe)}

          {!isEditing ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'GitHub', value: data.portfolioLinks?.github },
                  { label: 'LinkedIn', value: data.portfolioLinks?.linkedin },
                  { label: 'Portfolio personnel', value: data.portfolioLinks?.portfolio },
                  { label: 'Site web', value: data.portfolioLinks?.website }
                ].map(item => (
                  <div
                    key={item.label}
                    className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                        {item.label}
                      </span>
                      <p className="text-xs text-white truncate mt-0.5">
                        {item.value || 'Non renseigné'}
                      </p>
                    </div>
                    {item.value && (
                      <a
                        href={formatExternalUrl(item.value)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:text-white shrink-0"
                        title={`Ouvrir ${item.label}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Projets réalisés</span>
                </span>
                <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 whitespace-pre-line leading-relaxed">
                  {data.portfolioLinks?.projectsSummary || 'Aucun projet renseigné.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  GitHub
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/..."
                  value={draft.portfolioLinks?.github || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      portfolioLinks: { ...prev.portfolioLinks!, github: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  LinkedIn
                </label>
                <input
                  type="text"
                  placeholder="https://linkedin.com/in/..."
                  value={draft.portfolioLinks?.linkedin || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      portfolioLinks: { ...prev.portfolioLinks!, linkedin: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Portfolio personnel
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={draft.portfolioLinks?.portfolio || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      portfolioLinks: { ...prev.portfolioLinks!, portfolio: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Site web
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={draft.portfolioLinks?.website || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      portfolioLinks: { ...prev.portfolioLinks!, website: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Projets réalisés
                </label>
                <textarea
                  rows={4}
                  placeholder="Décrivez vos principaux projets réalisés..."
                  value={draft.portfolioLinks?.projectsSummary || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      portfolioLinks: { ...prev.portfolioLinks!, projectsSummary: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm resize-y"
                />
              </div>
            </div>
          )}
        </section>

        {/* 9. Informations complémentaires */}
        <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
          {renderSectionHeader(9, 'Informations complémentaires', Sparkles)}

          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Centres d'intérêt
                </span>
                <p className="text-emerald-100/90 text-xs sm:text-sm mt-0.5">
                  {data.additionalInfo?.interests || 'Non renseignés'}
                </p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Loisirs
                </span>
                <p className="text-emerald-100/90 text-xs sm:text-sm mt-0.5">
                  {data.additionalInfo?.hobbies || 'Non renseignés'}
                </p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Qualités personnelles
                </span>
                <p className="text-emerald-100/90 text-xs sm:text-sm mt-0.5">
                  {data.additionalInfo?.personalQualities || 'Non renseignées'}
                </p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">
                  Références professionnelles (facultatif)
                </span>
                <p className="text-emerald-100/90 text-xs sm:text-sm mt-0.5">
                  {data.additionalInfo?.references || 'Aucune référence renseignée'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Centres d'intérêt
                </label>
                <textarea
                  rows={2}
                  value={draft.additionalInfo?.interests || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      additionalInfo: { ...prev.additionalInfo!, interests: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Loisirs
                </label>
                <textarea
                  rows={2}
                  value={draft.additionalInfo?.hobbies || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      additionalInfo: { ...prev.additionalInfo!, hobbies: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Qualités personnelles
                </label>
                <textarea
                  rows={2}
                  value={draft.additionalInfo?.personalQualities || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      additionalInfo: { ...prev.additionalInfo!, personalQualities: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Références professionnelles (facultatif)
                </label>
                <textarea
                  rows={2}
                  value={draft.additionalInfo?.references || ''}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      additionalInfo: { ...prev.additionalInfo!, references: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
            </div>
          )}
        </section>

        {/* Sticky action bar above BottomNav in Edit Mode */}
        {isEditing && (
          <div className="sticky bottom-[84px] md:bottom-6 z-30 flex items-center justify-end gap-3 p-3 rounded-2xl glass-panel border border-emerald-400/50 shadow-[0_0_30px_rgba(0,0,0,0.6)]">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl glass-panel-subtle text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Annuler</span>
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-[0_0_18px_rgba(0,230,118,0.5)] flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les modifications</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
