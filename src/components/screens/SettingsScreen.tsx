import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ProfileInfoPage } from './ProfileInfoPage';
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
  Upload,
  RotateCcw, 
  Info, 
  Heart, 
  ChevronRight, 
  X, 
  Check, 
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  HardDrive,
  Layers,
  Table
} from 'lucide-react';
import { KetrikaLogo } from '../common/KetrikaLogo';

export const SettingsScreen: React.FC = () => {
  const { 
    profile, 
    updateProfile, 
    addDocument, 
    exportData, 
    resetAllData,
    setCurrentTab,
    isDbReady,
    exportSqliteDb,
    importSqliteDb,
    getDbStats,
    setIsEditingProfileInfo
  } = useApp();

  const [showInfoPage, setShowInfoPage] = useState(false);

  useEffect(() => {
    setIsEditingProfileInfo(showInfoPage);
    return () => {
      setIsEditingProfileInfo(false);
    };
  }, [showInfoPage, setIsEditingProfileInfo]);

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showDbInspector, setShowDbInspector] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

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

  if (showInfoPage) {
    return <ProfileInfoPage onBack={() => setShowInfoPage(false)} />;
  }

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
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {profile.name}
            </h2>
            <p className="text-xs text-emerald-300/80 flex items-center gap-1 mt-0.5">
              <Mail className="w-3 h-3 text-emerald-400" /> {profile.email}
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowInfoPage(true)}
          className="p-2 text-emerald-400/70 hover:text-white group-hover:translate-x-1 transition-transform"
          title="Ouvrir la page Information"
        >
          <ChevronRight className="w-6 h-6" />
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

      {/* 6. Base de données SQLite & Stockage Hors Connexion (Android & Web) */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">Base SQLite & Stockage Hors-Ligne</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  SQLite 3.x Actif
                </span>
              </div>
              <p className="text-xs text-emerald-200/70 mt-0.5">Persistance locale relationnelle pour Android, tablette & PC</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-[11px] text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Hors-ligne</span>
          </div>
        </div>

        {/* SQLite Database Live Stats Summary */}
        {(() => {
          const stats = getDbStats();
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-300/80 uppercase font-semibold block">Projets & Tâches</span>
                <span className="text-base font-extrabold text-white mt-0.5 block">{stats.projectsCount} / {stats.tasksCount}</span>
                <span className="text-[10px] text-emerald-400/70">enregistrés</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-300/80 uppercase font-semibold block">Finances & Notes</span>
                <span className="text-base font-extrabold text-white mt-0.5 block">{stats.transactionsCount} / {stats.notesCount}</span>
                <span className="text-[10px] text-emerald-400/70">lignes SQL</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-300/80 uppercase font-semibold block">Emplois & Logs IA</span>
                <span className="text-base font-extrabold text-white mt-0.5 block">{stats.jobsCount} / {stats.chatMessagesCount}</span>
                <span className="text-[10px] text-emerald-400/70">messages persistés</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-300/80 uppercase font-semibold block">Taille Base .db</span>
                <span className="text-base font-extrabold text-cyan-300 mt-0.5 block">{stats.sizeInKb > 0 ? `${stats.sizeInKb} Ko` : 'En cache'}</span>
                <span className="text-[10px] text-cyan-400/70">IndexedDB sync</span>
              </div>
            </div>
          );
        })()}

        {importStatus && (
          <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-400/50 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Database Management Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Export Native SQLite .db */}
          <button
            onClick={exportSqliteDb}
            className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600/40 to-teal-600/40 border border-emerald-400/60 text-white hover:bg-emerald-500/50 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] group"
          >
            <Database className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
            <span>Exporter la base SQLite (.db)</span>
          </button>

          {/* Import Native SQLite .db */}
          <label className="py-3 px-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 hover:text-white hover:bg-emerald-900/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer group">
            <Upload className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Importer une base SQLite (.db)</span>
            <input
              type="file"
              accept=".db,.sqlite,.sqlite3"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportStatus("Importation et vérification de la base SQLite en cours...");
                const ok = await importSqliteDb(file);
                if (ok) {
                  setImportStatus("Base de données SQLite restaurée avec succès ! Toutes vos données sont prêtes.");
                  setTimeout(() => setImportStatus(null), 4000);
                } else {
                  setImportStatus("Erreur lors de l'importation du fichier SQLite. Format non reconnu.");
                  setTimeout(() => setImportStatus(null), 4000);
                }
              }}
            />
          </label>

          {/* JSON Full Backup */}
          <button
            onClick={exportData}
            className="py-3 px-4 rounded-2xl glass-panel-subtle border border-emerald-500/30 text-emerald-200 hover:text-white hover:bg-emerald-900/40 text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>Sauvegarder en JSON</span>
          </button>

          {/* SQLite Table Inspector */}
          <button
            onClick={() => setShowDbInspector(true)}
            className="py-3 px-4 rounded-2xl glass-panel-subtle border border-emerald-500/30 text-emerald-200 hover:text-white hover:bg-emerald-900/40 text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Table className="w-4 h-4 text-cyan-300" />
            <span>Inspecter les tables SQLite</span>
          </button>
        </div>

        {/* Reset Database Button */}
        <div className="pt-1 border-t border-emerald-500/15 flex justify-end">
          <button
            onClick={() => {
              if (confirm('Voulez-vous réinitialiser la base SQLite vers les données initiales de démonstration ? Une copie de sécurité peut être exportée avant.')) {
                resetAllData();
              }
            }}
            className="text-[11px] text-emerald-400/60 hover:text-rose-400 flex items-center gap-1.5 transition-colors py-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser la base locale</span>
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

      {/* Modal: Inspecteur de base de données SQLite */}
      {showDbInspector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Structure &amp; Tables SQLite</h3>
              </div>
              <button
                onClick={() => setShowDbInspector(false)}
                className="text-emerald-400/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {(() => {
                const stats = getDbStats();
                return (
                  <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/20 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-emerald-300">Moteur SQL :</span>
                      <span className="font-mono font-bold text-white">{stats.engine}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-300">Intégrité PRAGMA :</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {stats.isHealthy ? 'Saine & Vérifiée (quick_check ok)' : 'Vérification...'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-300">Sécurité des écritures :</span>
                      <span className="font-mono text-emerald-200">Transactions atomiques (Rollback auto)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-300">Persistance &amp; Secours :</span>
                      <span className="font-mono text-emerald-200">Double Snapshot + Checksums FNV-1a</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-300">Mode Hors connexion :</span>
                      <span className="text-emerald-400 font-bold">Actif (100% autonome)</span>
                    </div>
                  </div>
                );
              })()}

              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 pt-2">
                Tables relationnelles du schéma Ketrika
              </h4>

              {(() => {
                const stats = getDbStats();
                const tables = [
                  { name: 'projects', desc: 'Projets, jalons, état & sous-tâches', count: stats.projectsCount },
                  { name: 'tasks', desc: 'Tâches quotidiennes, priorités & échéances', count: stats.tasksCount },
                  { name: 'notes', desc: 'Notes de réunion, checklists & favoris', count: stats.notesCount },
                  { name: 'transactions', desc: 'Revenus, dépenses & solde en Ariary', count: stats.transactionsCount },
                  { name: 'jobs', desc: 'Offres d’emploi, candidatures & statuts', count: stats.jobsCount },
                  { name: 'notifications', desc: 'Alertes locales, rappels & bilans', count: stats.notificationsCount },
                  { name: 'user_profile', desc: 'Profil utilisateur, adresse & pièces jointes', count: 1 },
                  { name: 'chat_messages', desc: 'Historique des échanges avec l’IA Ketrika', count: stats.chatMessagesCount },
                  { name: 'meta_info', desc: 'Métadonnées de version & migration', count: 3 }
                ];

                return (
                  <div className="space-y-2">
                    {tables.map(t => (
                      <div key={t.name} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-xs">
                        <div>
                          <span className="font-mono font-bold text-emerald-200">{t.name}</span>
                          <p className="text-[11px] text-emerald-300/70">{t.desc}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 font-mono">
                          {t.count} {t.count > 1 ? 'entrées' : 'entrée'}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="pt-4 border-t border-emerald-500/20 flex justify-end gap-2">
                <button
                  onClick={exportSqliteDb}
                  className="px-4 py-2 rounded-xl bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 hover:text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger .db</span>
                </button>
                <button
                  onClick={() => setShowDbInspector(false)}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_12px_rgba(0,230,118,0.4)]"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
