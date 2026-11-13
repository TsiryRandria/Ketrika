import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Job } from '../../types';
import { 
  Briefcase, 
  Heart, 
  Search, 
  DollarSign, 
  FileText, 
  Home, 
  Star, 
  Calendar, 
  Clock, 
  Eye, 
  Send, 
  ChevronRight, 
  X, 
  Check, 
  Building2, 
  MapPin, 
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Award,
  Share2,
  CheckCircle2
} from 'lucide-react';

export const JobsScreen: React.FC = () => {
  const { 
    jobs, 
    toggleFavoriteJob, 
    applyToJob, 
    profile,
    setIsJobDetailOpen 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavoriteOnly, setFilterFavoriteOnly] = useState(false);
  const [filterAppliedOnly, setFilterAppliedOnly] = useState(false);
  const topRef = useRef<HTMLDivElement | null>(null);
  
  // Dedicated single-page job detail view
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const getDefaultCvName = () => {
    const cvDoc = profile.documents.find(
      (d) => d.category === 'CV' || d.name.toLowerCase().includes('cv')
    );
    return cvDoc?.name || profile.documents[0]?.name || 'Mon CV.pdf';
  };

  // Application Modal state
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [selectedCv, setSelectedCv] = useState(() => getDefaultCvName());
  const [coverNote, setCoverNote] = useState('');
  const [showAppliedToast, setShowAppliedToast] = useState(false);

  // Sync job detail open state with app context so TopBar is hidden exclusively on detail page
  useEffect(() => {
    setIsJobDetailOpen(Boolean(selectedJobId));
    return () => {
      setIsJobDetailOpen(false);
    };
  }, [selectedJobId, setIsJobDetailOpen]);

  const activeJob = jobs.find(j => j.id === selectedJobId);

  const favoriteJobsCount = jobs.filter(j => j.isFavorite).length;
  const appliedJobsCount = jobs.filter(j => j.applied).length;

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = 
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      j.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filterFavoriteOnly && !j.isFavorite) return false;
    if (filterAppliedOnly && !j.applied) return false;
    return true;
  });

  const openApplyModal = (job: Job) => {
    setSelectedCv(job.appliedCv || getDefaultCvName());
    setCoverNote(job.appliedCoverNote || '');
    setApplyingJob(job);
  };

  const handleConfirmApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob) return;
    applyToJob(applyingJob.id, {
      selectedCv,
      coverNote,
    });
    setApplyingJob(null);
    setShowAppliedToast(true);
    setTimeout(() => setShowAppliedToast(false), 3500);
  };

  const renderCompanyLogo = (company: string, size = 'md') => {
    const dimensions = size === 'lg' ? 'w-16 h-16 rounded-3xl p-3' : 'w-12 h-12 rounded-2xl p-2';
    const textSize = size === 'lg' ? 'text-2xl' : 'text-xl';
    
    return (
      <div className={`${dimensions} bg-slate-900 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-md`}>
        {company === 'Google' && (
          <span className={`${textSize} font-black text-white`}>G</span>
        )}
        {company === 'Microsoft' && (
          <div className="grid grid-cols-2 gap-0.5 w-6 h-6">
            <div className="bg-rose-500 rounded-xs" />
            <div className="bg-emerald-500 rounded-xs" />
            <div className="bg-sky-500 rounded-xs" />
            <div className="bg-amber-500 rounded-xs" />
          </div>
        )}
        {company === 'Meta' && (
          <span className={`${textSize} font-black text-sky-400`}>∞</span >
        )}
        {!['Google', 'Microsoft', 'Meta'].includes(company) && (
          <Building2 className="w-6 h-6 text-emerald-400" />
        )}
      </div>
    );
  };

  // ==========================================
  // DEDICATED SINGLE-PAGE JOB DETAIL VIEW
  // ==========================================
  if (activeJob) {
    return (
      <div className="space-y-6 pb-28 md:pb-12 animate-in fade-in duration-200">
        
        {/* Top Navigation: Return Button on left + Action controls on right */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-500/15">
          <button
            type="button"
            onClick={() => setSelectedJobId(null)}
            className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/25 text-emerald-300 hover:text-white hover:border-emerald-400/60 transition-all flex items-center justify-center shrink-0 group select-none"
            title="Retour à la liste des offres"
            aria-label="Retour à la liste des offres"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform text-emerald-400" />
          </button>

          <div className="flex items-center gap-2">
            {/* Toggle Favorite */}
            <button
              type="button"
              onClick={() => toggleFavoriteJob(activeJob.id)}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                activeJob.isFavorite
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'glass-panel-subtle text-emerald-300/80 hover:text-white border-emerald-500/20'
              }`}
              title={activeJob.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`w-4 h-4 ${activeJob.isFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Postuler Button */}
            {activeJob.applied ? (
              <button
                type="button"
                onClick={() => openApplyModal(activeJob)}
                className="px-4 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:border-emerald-400/70 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all"
                title="Consulter ou modifier votre candidature"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Candidature envoyée</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openApplyModal(activeJob)}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.5)] flex items-center gap-1.5 hover:shadow-[0_0_22px_rgba(0,230,118,0.7)] transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Postuler à cette offre</span>
              </button>
            )}
          </div>
        </div>

        {/* Job Hero Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/30 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
            {renderCompanyLogo(activeJob.company, 'lg')}

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                  {activeJob.company}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                  {activeJob.contract}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                  <Home className="w-3 h-3" /> {activeJob.workMode}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> {activeJob.rating}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {activeJob.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-emerald-200/80 mt-2">
                <span className="flex items-center gap-1 text-emerald-300">
                  <MapPin className="w-4 h-4 text-emerald-400" /> {activeJob.location}
                </span>
                <span className="text-emerald-500/40">•</span>
                <span className="text-emerald-300/80">
                  Expérience requise : <strong className="text-white">{activeJob.experience}</strong>
                </span>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <p className="text-[11px] text-emerald-300/70 font-semibold uppercase tracking-wider">
                Rémunération
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight mt-0.5">
                {activeJob.salary}
              </p>
            </div>
          </div>

          {/* Timeline & Metadata Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-emerald-300/80 mt-6 pt-4 border-t border-emerald-500/20 relative z-10">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Offre publiée le : <strong className="text-white">{activeJob.postedDate}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-rose-300">
              <Clock className="w-4 h-4 text-rose-400" />
              <span>Date limite de candidature : <strong className="text-white">{activeJob.deadlineDate}</strong></span>
            </div>
          </div>
        </div>

        {/* 3 Metric Highlights Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel rounded-2xl p-5 border border-emerald-500/25">
            <span className="text-xs text-emerald-200/70 font-medium">Contrat & Organisation</span>
            <p className="text-base font-extrabold text-white mt-1">
              {activeJob.contract} · {activeJob.workMode}
            </p>
            <p className="text-xs text-emerald-300/70 mt-1">
              Temps plein · 35h à 40h / semaine
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-emerald-500/25">
            <span className="text-xs text-emerald-200/70 font-medium">Package & Avantages</span>
            <p className="text-base font-extrabold text-emerald-400 mt-1">
              {activeJob.salary}
            </p>
            <p className="text-xs text-emerald-300/70 mt-1">
              Mutuelle santé, équipement & primes
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-emerald-500/25">
            <span className="text-xs text-emerald-200/70 font-medium">Statut de la candidature</span>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2.5 h-2.5 rounded-full ${activeJob.applied ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-cyan-400'}`} />
              <p className="text-base font-extrabold text-white">
                {activeJob.applied ? 'Candidature transmise' : 'Poste disponible'}
              </p>
            </div>
            <p className="text-xs text-emerald-300/70 mt-1">
              {activeJob.applied ? 'En attente de retour recruteur' : 'Prêt pour envoi direct'}
            </p>
          </div>
        </div>

        {/* Job Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Description Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Missions principales */}
            <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-emerald-500/30 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                <span>Missions et responsabilités principales</span>
              </h2>

              <p className="text-sm text-emerald-100/90 leading-relaxed">
                {activeJob.description}
              </p>

              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Activités quotidiennes du poste :
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-emerald-200/80">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Conception, architecture et déploiement de fonctionnalités hautement scalables.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Collaboration étroite avec les équipes produit, design UX et ingénierie cloud.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Revue de code, tests automatisés de non-régression et maintien des standards de qualité.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Veille technologique et intégration de modèles d'intelligence artificielle modernes.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Profil recherché */}
            <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-emerald-500/30 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Profil recherché et compétences</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
                  <span className="font-bold text-white block mb-1">Expérience professionnelle</span>
                  <p className="text-emerald-200/70 text-xs">
                    Minimum <strong className="text-emerald-300">{activeJob.experience}</strong> sur un poste similaire, avec des réalisations tangibles en production.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
                  <span className="font-bold text-white block mb-1">Environnement & Modalités</span>
                  <p className="text-emerald-200/70 text-xs">
                    Capacité démontrée à évoluer en mode <strong className="text-emerald-300">{activeJob.workMode}</strong> avec autonomie et rigueur de communication.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block mb-2">
                  Compétences techniques et qualités humaines :
                </span>
                <div className="flex flex-wrap gap-2">
                  {['TypeScript / JavaScript', 'React & Next.js', 'Architecture Microservices', 'CI/CD & DevOps', 'API REST & GraphQL', 'Esprit d’équipe', 'Rigueur méthodologique'].map((skill) => (
                    <span 
                      key={skill}
                      className="px-3 py-1 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-xs text-emerald-200 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Company Info & Fast Apply Card */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* À propos de l'entreprise */}
            <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
              <div className="flex items-center gap-3">
                {renderCompanyLogo(activeJob.company, 'md')}
                <div>
                  <h3 className="font-bold text-white text-base">{activeJob.company}</h3>
                  <p className="text-xs text-emerald-300/80">{activeJob.location}</p>
                </div>
              </div>

              <p className="text-xs text-emerald-200/80 leading-relaxed">
                Leader technologique international favorisant l'innovation ouverte, l'excellence d'ingénierie et l'impact positif à grande échelle.
              </p>

              <div className="space-y-2 pt-2 border-t border-emerald-500/15 text-xs text-emerald-300/80">
                <div className="flex justify-between">
                  <span>Taille de l'entreprise</span>
                  <strong className="text-white">10 000+ collaborateurs</strong>
                </div>
                <div className="flex justify-between">
                  <span>Secteur d'activité</span>
                  <strong className="text-white">High Tech & Logiciel</strong>
                </div>
                <div className="flex justify-between">
                  <span>Note des collaborateurs</span>
                  <strong className="text-amber-300 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-current" /> {activeJob.rating} / 5
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick Action Apply Box */}
            <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Candidature directe</h3>
              </div>

              {activeJob.applied ? (
                <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5 stroke-[3]" />
                  </div>
                  <p className="text-sm font-bold text-white">Candidature enregistrée !</p>
                  <p className="text-xs text-emerald-300/70">
                    Vos documents ({profile.name}, {activeJob.appliedCv || getDefaultCvName()}) sont accessibles aux recruteurs de {activeJob.company}.
                  </p>
                  {activeJob.appliedAt && (
                    <p className="text-[11px] text-emerald-400/80 font-medium">
                      Envoyée le {activeJob.appliedAt}
                    </p>
                  )}
                  {activeJob.appliedCoverNote && (
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-emerald-500/20 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                        Lettre de motivation transmise
                      </p>
                      <p className="text-xs text-emerald-100/90 whitespace-pre-line leading-relaxed">
                        {activeJob.appliedCoverNote}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => openApplyModal(activeJob)}
                    className="w-full py-2 px-3 rounded-xl glass-panel-subtle border border-emerald-500/30 hover:border-emerald-400/60 text-emerald-200 hover:text-white text-xs font-semibold transition-all"
                  >
                    Modifier le CV ou la lettre
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-emerald-200/80 leading-relaxed">
                    Postulez directement avec votre profil et CV enregistré sur Ketrika.
                  </p>
                  <button
                    type="button"
                    onClick={() => openApplyModal(activeJob)}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_18px_rgba(0,230,118,0.5)] hover:shadow-[0_0_25px_rgba(0,230,118,0.8)] transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Postuler maintenant</span>
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-emerald-500/15 flex items-center gap-2 text-[11px] text-emerald-300/70">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Processus sécurisé certifié sans frais ni intermédiaires</span>
              </div>
            </div>

          </div>

        </div>

        {/* Toast Notification */}
        {showAppliedToast && (
          <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_25px_rgba(0,230,118,0.6)] flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-4 h-4 stroke-[3]" />
            <span>Votre candidature a été transmise avec succès !</span>
          </div>
        )}

        {/* Modal: Postuler (accessible depuis la vue détail) */}
        {applyingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>Candidature · {applyingJob.title} ({applyingJob.company})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setApplyingJob(null)}
                  className="text-emerald-400/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmApply} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Document CV sélectionné
                  </label>
                  <select
                    value={selectedCv}
                    onChange={(e) => setSelectedCv(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl glass-input text-sm bg-emerald-950 text-white"
                  >
                    {profile.documents.length === 0 ? (
                      <option value={selectedCv || 'Mon CV.pdf'}>{selectedCv || 'Mon CV.pdf'}</option>
                    ) : (
                      <>
                        {!profile.documents.some(d => d.name === selectedCv) && selectedCv && (
                          <option value={selectedCv}>{selectedCv}</option>
                        )}
                        {profile.documents.map((d, i) => (
                          <option key={d.id || i} value={d.name}>{d.name} ({d.type})</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Lettre de motivation / Note d'introduction (Optionnelle)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Pourquoi votre profil correspond à cette offre..."
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm text-white"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/20 text-[11px] text-emerald-300/80 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Vos coordonnées ({profile.phone}, {profile.email}) seront transmises directement aux recruteurs.</span>
                </div>

                <div className="pt-3 border-t border-emerald-500/20 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setApplyingJob(null)}
                    className="px-4 py-2 rounded-xl glass-panel-subtle text-emerald-300 text-xs font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.5)] hover:shadow-[0_0_20px_rgba(0,230,118,0.8)]"
                  >
                    {applyingJob.applied ? 'Mettre à jour la candidature' : 'Transmettre ma candidature'}
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
  // JOBS LIST VIEW
  // ==========================================
  return (
    <div ref={topRef} className="space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {showAppliedToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_25px_rgba(0,230,118,0.6)] flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
          <span>Votre candidature a été transmise avec succès !</span>
        </div>
      )}

      {/* 1. Favorites & Applied History Toggle Header */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setFilterFavoriteOnly(prev => !prev);
            setFilterAppliedOnly(false);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all ${
            filterFavoriteOnly 
              ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]' 
              : 'glass-panel text-emerald-200 border-emerald-500/30 hover:border-emerald-400'
          }`}
        >
          <Heart className={`w-4 h-4 ${filterFavoriteOnly ? 'fill-current' : 'text-rose-400'}`} />
          <span>Mes favoris ({favoriteJobsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterAppliedOnly(prev => !prev);
            setFilterFavoriteOnly(false);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all ${
            filterAppliedOnly 
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_15px_rgba(0,230,118,0.5)]' 
              : 'glass-panel text-emerald-200 border-emerald-500/30 hover:border-emerald-400'
          }`}
        >
          <FileText className={`w-4 h-4 ${filterAppliedOnly ? 'text-slate-950' : 'text-emerald-400'}`} />
          <span>Historique ({appliedJobsCount})</span>
        </button>
      </div>

      {/* 2. Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/70" />
          <input
            type="text"
            placeholder="Rechercher un emploi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm focus:ring-1 focus:ring-emerald-400 transition-all placeholder:text-emerald-300/40"
          />
        </div>
      </div>

      {/* 4. Job Listings */}
      {filteredJobs.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8 border border-emerald-500/25 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            {filterAppliedOnly ? <FileText className="w-6 h-6" /> : filterFavoriteOnly ? <Heart className="w-6 h-6 text-rose-400" /> : <Briefcase className="w-6 h-6" />}
          </div>
          <p className="text-sm font-bold text-white">
            {filterAppliedOnly
              ? 'Aucune candidature enregistrée pour le moment'
              : filterFavoriteOnly
                ? 'Aucune offre enregistrée en favori'
                : 'Aucune offre ne correspond à votre recherche'}
          </p>
          <p className="text-xs text-emerald-200/70 max-w-md mx-auto">
            {filterAppliedOnly
              ? 'Postulez à une offre pour la retrouver ici avec votre CV sélectionné et votre lettre de motivation.'
              : 'Modifiez vos filtres ou réinitialisez l’affichage pour consulter toutes les offres disponibles.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterAppliedOnly(false);
              setFilterFavoriteOnly(false);
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold transition-all"
          >
            Voir toutes les offres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              className="glass-panel rounded-3xl p-5 border border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_4px_25px_rgba(0,20,15,0.4)] transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* Header: Company Emblem + Title & Favorite */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {renderCompanyLogo(job.company, 'md')}

                    <div>
                      <h3 className="font-bold text-white text-base leading-tight group-hover:text-emerald-300 transition-colors">
                        {job.title}
                      </h3>
                      <p className="text-xs text-emerald-300 font-semibold mt-0.5">{job.company}</p>
                      <p className="text-[11px] text-emerald-400/60 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400" /> {job.location}
                      </p>
                    </div>
                  </div>

                  {/* Heart Favorite Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteJob(job.id);
                    }}
                    className="p-1.5 rounded-xl hover:bg-emerald-900/40 transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${job.isFavorite ? 'text-rose-400 fill-rose-400' : 'text-emerald-400/50 hover:text-rose-400'}`} />
                  </button>
                </div>

                {/* Badges strip: Contract + WorkMode */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold">
                    {job.contract}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                    <Home className="w-3 h-3" /> {job.workMode}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-emerald-200/70 mt-2.5 line-clamp-2">
                  {job.description}
                </p>

                {/* Persisted Application Metadata (CV, Cover Note, Date) */}
                {job.applied && (job.appliedCv || job.appliedCoverNote || job.appliedAt) && (
                  <div className="mt-3 p-2.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between gap-2 text-emerald-300 font-semibold">
                      <span className="truncate flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{job.appliedCv || getDefaultCvName()}</span>
                      </span>
                      {job.appliedAt && (
                        <span className="text-[10px] text-emerald-400/80 shrink-0">{job.appliedAt}</span>
                      )}
                    </div>
                    {job.appliedCoverNote && (
                      <p className="text-emerald-100/75 line-clamp-2 italic">
                        « {job.appliedCoverNote} »
                      </p>
                    )}
                  </div>
                )}

                {/* Salary & Deadline strip */}
                <div className="mt-3.5 pt-3 border-t border-emerald-500/15 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-emerald-400" /> {job.salary}
                    </span>
                    <span className="text-[11px] text-emerald-400/60 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-400" /> Publié : {job.postedDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-300/80">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {job.rating} · {job.experience}
                    </span>
                    <span className="flex items-center gap-1 text-rose-300/80">
                      <Clock className="w-3 h-3" /> Limite : {job.deadlineDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Voir les détails + Postuler */}
              <div className="mt-4 pt-3 border-t border-emerald-500/20 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedJobId(job.id);
                  }}
                  className="py-2 px-3 rounded-xl glass-panel-subtle text-emerald-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Voir les détails</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openApplyModal(job);
                  }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    job.applied 
                      ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300' 
                      : 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(0,230,118,0.4)] hover:shadow-[0_0_20px_rgba(0,230,118,0.7)]'
                  }`}
                >
                  {job.applied ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Postulé</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Postuler</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* 5. Bottom Counters: Offres enregistrées & Historique candidatures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 pt-2">
        <div 
          onClick={() => {
            setFilterFavoriteOnly(prev => !prev);
            setFilterAppliedOnly(false);
            topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className={`glass-panel rounded-3xl p-4 sm:p-5 border flex items-center justify-between cursor-pointer transition-all group ${
            filterFavoriteOnly
              ? 'border-rose-400/70 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
              : 'border-emerald-500/30 hover:border-emerald-400/60'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <p className="text-xs text-emerald-200/70 font-medium">Offres enregistrées</p>
              <span className="text-2xl font-extrabold text-white">{favoriteJobsCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-300 font-bold group-hover:translate-x-1 transition-transform">
            <span>{filterFavoriteOnly ? 'Toutes les offres' : 'Voir mes favoris'}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        <div 
          onClick={() => {
            setFilterAppliedOnly(prev => !prev);
            setFilterFavoriteOnly(false);
            topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className={`glass-panel rounded-3xl p-4 sm:p-5 border flex items-center justify-between cursor-pointer transition-all group ${
            filterAppliedOnly
              ? 'border-emerald-400/70 shadow-[0_0_20px_rgba(0,230,118,0.2)]'
              : 'border-emerald-500/30 hover:border-emerald-400/60'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-xs text-emerald-200/70 font-medium">Historique des candidatures</p>
              <span className="text-2xl font-extrabold text-white">{appliedJobsCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-300 font-bold group-hover:translate-x-1 transition-transform">
            <span>{filterAppliedOnly ? 'Toutes les offres' : "Voir l'historique"}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Modal: Postuler */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Candidature · {applyingJob.title} ({applyingJob.company})</span>
              </h3>
              <button
                type="button"
                onClick={() => setApplyingJob(null)}
                className="text-emerald-400/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmApply} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Document CV sélectionné
                </label>
                <select
                  value={selectedCv}
                  onChange={(e) => setSelectedCv(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl glass-input text-sm bg-emerald-950 text-white"
                >
                  {profile.documents.length === 0 ? (
                    <option value={selectedCv || 'Mon CV.pdf'}>{selectedCv || 'Mon CV.pdf'}</option>
                  ) : (
                    <>
                      {!profile.documents.some(d => d.name === selectedCv) && selectedCv && (
                        <option value={selectedCv}>{selectedCv}</option>
                      )}
                      {profile.documents.map((d, i) => (
                        <option key={d.id || i} value={d.name}>{d.name} ({d.type})</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Lettre de motivation / Note d'introduction (Optionnelle)
                </label>
                <textarea
                  rows={3}
                  placeholder="Pourquoi votre profil correspond à cette offre..."
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm text-white"
                />
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/20 text-[11px] text-emerald-300/80 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Vos coordonnées ({profile.phone}, {profile.email}) seront transmises directement aux recruteurs.</span>
              </div>

              <div className="pt-3 border-t border-emerald-500/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApplyingJob(null)}
                  className="px-4 py-2 rounded-xl glass-panel-subtle text-emerald-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.5)] hover:shadow-[0_0_20px_rgba(0,230,118,0.8)]"
                >
                  {applyingJob.applied ? 'Mettre à jour la candidature' : 'Transmettre ma candidature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
