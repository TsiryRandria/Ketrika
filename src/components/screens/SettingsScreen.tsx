import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Settings, 
  Crown, 
  Camera, 
  Phone, 
  Mail, 
  MapPin, 
  Edit3, 
  GraduationCap, 
  FileText, 
  Plus, 
  Bell, 
  Database, 
  Download, 
  RotateCcw, 
  Info, 
  Heart, 
  ChevronRight, 
  X, 
  Check, 
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { KetrikaLogo } from '../common/KetrikaLogo';

export const SettingsScreen: React.FC = () => {
  const { 
    profile, 
    updateProfile, 
    addDocument, 
    exportData, 
    resetAllData,
    setCurrentTab 
  } = useApp();

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Profile Edit fields
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [address, setAddress] = useState(profile.address);

  // New Doc fields
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Certificat professionnel');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, email, phone, address });
    setShowEditProfileModal(false);
  };

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;
    addDocument({
      name: docName.endsWith('.pdf') ? docName : `${docName}.pdf`,
      type: docType,
      size: '1.2 Mo',
      date: new Date().toLocaleDateString('fr-FR'),
    });
    setDocName('');
    setShowAddDocModal(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200 max-w-4xl mx-auto">
      
      {/* 2. User Profile Card (Jasmine Castillo - Matching page 9) */}
      <div className="glass-panel rounded-3xl p-5 border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.2)] flex items-center justify-between group">
        <div className="flex items-center gap-4">
          
          {/* Avatar with Camera badge */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full p-1 border-2 border-emerald-400/80 shadow-[0_0_15px_#10b981] overflow-hidden">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <button
              onClick={() => {
                const newUrl = prompt("URL de la nouvelle photo de profil :", profile.avatarUrl);
                if (newUrl) updateProfile({ avatarUrl: newUrl });
              }}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-cyan-500 text-slate-950 border-2 border-slate-950 shadow-[0_0_8px_#06b6d4] hover:scale-110 transition-transform"
              title="Changer de photo"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          <div>
            {/* Utilisateur Premium Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/30 to-amber-400/10 text-amber-300 border border-amber-400/50 text-[11px] font-bold shadow-[0_0_10px_rgba(245,158,11,0.3)] mb-1.5">
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>Utilisateur Premium</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {profile.name}
            </h2>
            <p className="text-xs text-emerald-300/80 flex items-center gap-1 mt-0.5">
              <Mail className="w-3 h-3 text-emerald-400" /> {profile.email}
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowEditProfileModal(true)}
          className="p-2 text-emerald-400/70 hover:text-white group-hover:translate-x-1 transition-transform"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* 3. Informations personnelles (Matching page 9) */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
        <div>
          <h3 className="font-bold text-white text-base">Informations personnelles</h3>
          <p className="text-xs text-emerald-200/70 mt-0.5">Gérez vos informations de base</p>
        </div>

        <div className="space-y-3 pt-2 text-xs text-emerald-100">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
            <span className="flex items-center gap-2 text-emerald-300/80">
              <Phone className="w-4 h-4 text-emerald-400" /> Téléphone
            </span>
            <span className="font-bold text-white tracking-wide">{profile.phone}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
            <span className="flex items-center gap-2 text-emerald-300/80">
              <Mail className="w-4 h-4 text-emerald-400" /> Email
            </span>
            <span className="font-bold text-white">{profile.email}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
            <span className="flex items-center gap-2 text-emerald-300/80">
              <MapPin className="w-4 h-4 text-emerald-400" /> Adresse
            </span>
            <span className="font-bold text-white">{profile.address}</span>
          </div>
        </div>

        <button
          onClick={() => setShowEditProfileModal(true)}
          className="w-full py-3 rounded-2xl bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 hover:text-white hover:bg-emerald-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
        >
          <Edit3 className="w-4 h-4 text-emerald-300" />
          <span>Modifier mes informations</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      {/* 4. Mes formations & Certificats (Matching page 9) */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Mes formations &amp; Certificats</h3>
            <p className="text-xs text-emerald-200/70 mt-0.5">Ajoutez vos diplômes, formations ou CV</p>
          </div>
          <GraduationCap className="w-5 h-5 text-emerald-400" />
        </div>

        {/* Document Badges Strip */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {profile.documents.map((doc, idx) => (
            <div
              key={idx}
              onClick={() => alert(`Document : ${doc.name} (${doc.type}) - ${doc.size}`)}
              className="px-3.5 py-2 rounded-2xl glass-panel-subtle border border-emerald-500/30 hover:border-emerald-400 text-xs font-semibold text-emerald-200 flex items-center gap-2 cursor-pointer transition-all"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>{doc.name}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowAddDocModal(true)}
          className="w-full py-2.5 rounded-2xl glass-panel-subtle border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Ajouter un document</span>
        </button>
      </div>

      {/* 5. Notifications Switch (Matching page 9) */}
      <div className="glass-panel rounded-3xl p-5 border border-emerald-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Notifications</h3>
            <p className="text-xs text-emerald-200/70">Recevoir les alertes et rappels</p>
          </div>
        </div>

        {/* Custom Glowing Toggle Switch */}
        <button
          onClick={() => updateProfile({ notificationsEnabled: !profile.notificationsEnabled })}
          className={`w-14 h-8 rounded-full p-1 transition-all ${
            profile.notificationsEnabled 
              ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' 
              : 'bg-emerald-950 border border-emerald-500/30'
          }`}
        >
          <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
            profile.notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* 6. Gestion des données (Matching page 9) */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-bold text-white text-sm">Gestion des données</h3>
            <p className="text-xs text-emerald-200/70">Sauvegardez ou restaurez vos données</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={exportData}
            className="py-3 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:text-white hover:bg-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>Sauvegarder les données</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Voulez-vous réinitialiser toutes les données vers les paramètres de démonstration ?')) {
                resetAllData();
              }
            }}
            className="py-3 px-4 rounded-2xl glass-panel-subtle border border-emerald-500/30 text-emerald-200 hover:text-white hover:bg-emerald-900/40 text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4 text-emerald-300" />
            <span>Restaurer les données</span>
          </button>
        </div>
      </div>

      {/* 7. À propos de Ketrika (Matching page 9 bottom) */}
      <div 
        onClick={() => setShowAboutModal(true)}
        className="glass-panel rounded-3xl p-5 border border-emerald-500/30 flex items-center justify-between cursor-pointer hover:border-emerald-400/60 transition-all group"
      >
        <div className="flex items-center gap-3.5">
          <KetrikaLogo size="sm" showText={false} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">Ketrika</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                Version 1.0.0
              </span>
            </div>
            <p className="text-xs text-emerald-200/70 mt-0.5 flex items-center gap-1">
              <span>Votre assistant de gestion intelligent</span>
              <Heart className="w-3 h-3 text-emerald-400 fill-current inline" />
            </p>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-emerald-400/70 group-hover:translate-x-1 transition-transform" />
      </div>

      {/* Modal: Modifier mes informations */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                Modifier mes informations
              </h3>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="text-emerald-400/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Adresse email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Téléphone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Adresse & Ville
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>

              <div className="pt-3 border-t border-emerald-500/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
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

      {/* Modal: Ajouter un document */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Ajouter une formation ou certificat
              </h3>
              <button
                onClick={() => setShowAddDocModal(false)}
                className="text-emerald-400/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDoc} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Nom du document
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Diplôme Master IA.pdf"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Type de qualification
                </label>
                <input
                  type="text"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>

              <div className="pt-3 border-t border-emerald-500/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 rounded-xl glass-panel-subtle text-emerald-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.5)]"
                >
                  Ajouter à mon dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: À propos */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl relative text-center">
            <KetrikaLogo size="lg" className="justify-center mb-3" />
            <h3 className="text-xl font-extrabold text-white">Ketrika Suite v1.0.0</h3>
            <p className="text-xs text-emerald-300 font-semibold mt-1">Conçu pour Android, Tablette &amp; PC</p>
            <p className="text-xs text-emerald-200/80 mt-3 leading-relaxed">
              Ketrika combine la gestion de projets avancée, le suivi des tâches quotidiennes, le pilotage financier, la prise de notes multimédia, la recherche d'emplois tech et un assistant IA conversationnel propulsé par Gemini.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAboutModal(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_12px_rgba(0,230,118,0.4)]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
