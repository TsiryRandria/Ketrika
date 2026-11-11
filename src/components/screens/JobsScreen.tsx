import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Job } from '../../types';
import { 
  Briefcase, 
  Heart, 
  Search, 
  SlidersHorizontal, 
  Globe, 
  DollarSign, 
  FileText, 
  Home, 
  Star, 
  Calendar, 
  Clock, 
  Eye, 
  Send, 
  Bookmark, 
  History, 
  ChevronRight, 
  X, 
  Check, 
  Building2, 
  MapPin, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const JobsScreen: React.FC = () => {
  const { 
    jobs, 
    toggleFavoriteJob, 
    applyToJob, 
    profile 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavoriteOnly, setFilterFavoriteOnly] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('Tous');
  const [selectedContract, setSelectedContract] = useState('Tous');
  const [selectedWorkMode, setSelectedWorkMode] = useState('Tous');
  
  // Modals
  const [viewingJob, setViewingJob] = useState<Job | null>(null);
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [selectedCv, setSelectedCv] = useState(profile.documents[2]?.name || 'Mon CV.pdf');
  const [coverNote, setCoverNote] = useState('');

  const favoriteJobsCount = jobs.filter(j => j.isFavorite).length;
  const appliedJobsCount = jobs.filter(j => j.applied).length + 3; // base 5 like in screenshot

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = 
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      j.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filterFavoriteOnly && !j.isFavorite) return false;
    if (selectedContract !== 'Tous' && j.contract !== selectedContract) return false;
    if (selectedWorkMode !== 'Tous' && j.workMode !== selectedWorkMode) return false;
    return true;
  });

  const handleConfirmApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob) return;
    applyToJob(applyingJob.id);
    setApplyingJob(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200">
      
      {/* 1. Header with Title & Favorites counter (Matching page 7) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Briefcase className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Emplois</h1>
            <p className="text-xs text-emerald-300/70">
              Trouvez l'opportunité idéale à l'échelle internationale.
            </p>
          </div>
        </div>

        <button
          onClick={() => setFilterFavoriteOnly(!filterFavoriteOnly)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all ${
            filterFavoriteOnly 
              ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]' 
              : 'glass-panel text-emerald-200 border-emerald-500/30 hover:border-emerald-400'
          }`}
        >
          <Heart className={`w-4 h-4 ${filterFavoriteOnly ? 'fill-current' : 'text-rose-400'}`} />
          <span>Mes favoris ({favoriteJobsCount})</span>
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
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
        <button 
          className="p-2.5 rounded-2xl glass-panel text-emerald-300 hover:text-white hover:border-emerald-400/50 transition-all"
          title="Filtres avancés"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* 3. Dropdown Filters Strip (Matching page 7: Pays, Salaire, Type de contrat, Télétravail) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {/* Contrat */}
        <div className="relative shrink-0">
          <select
            value={selectedContract}
            onChange={(e) => setSelectedContract(e.target.value)}
            className="glass-panel-subtle text-emerald-200 text-xs font-semibold px-3 py-2 rounded-xl border border-emerald-500/25 focus:outline-none appearance-none pr-8 cursor-pointer hover:border-emerald-400"
          >
            <option value="Tous" className="bg-emerald-950">Type de contrat: Tous</option>
            <option value="CDI" className="bg-emerald-950">CDI</option>
            <option value="Freelance" className="bg-emerald-950">Freelance</option>
          </select>
          <FileText className="w-3.5 h-3.5 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Télétravail */}
        <div className="relative shrink-0">
          <select
            value={selectedWorkMode}
            onChange={(e) => setSelectedWorkMode(e.target.value)}
            className="glass-panel-subtle text-emerald-200 text-xs font-semibold px-3 py-2 rounded-xl border border-emerald-500/25 focus:outline-none appearance-none pr-8 cursor-pointer hover:border-emerald-400"
          >
            <option value="Tous" className="bg-emerald-950">Télétravail: Tous</option>
            <option value="À distance" className="bg-emerald-950">À distance</option>
            <option value="Hybride" className="bg-emerald-950">Hybride</option>
            <option value="Sur site" className="bg-emerald-950">Sur site</option>
          </select>
          <Home className="w-3.5 h-3.5 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Salaire */}
        <div className="relative shrink-0">
          <div className="glass-panel-subtle text-emerald-200 text-xs font-semibold px-3 py-2 rounded-xl border border-emerald-500/25 flex items-center gap-1.5 cursor-pointer">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Salaire &gt; $80K</span>
          </div>
        </div>

        {/* Pays */}
        <div className="relative shrink-0">
          <div className="glass-panel-subtle text-emerald-200 text-xs font-semibold px-3 py-2 rounded-xl border border-emerald-500/25 flex items-center gap-1.5 cursor-pointer">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>International</span>
          </div>
        </div>
      </div>

      {/* 4. Job Listings (Matching page 7 cards: Google, Microsoft, Meta) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className="glass-panel rounded-3xl p-5 border border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_4px_25px_rgba(0,20,15,0.4)] transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Header: Company Emblem + Title & Favorite */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Brand Logo Box */}
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-center justify-center p-2 shrink-0">
                    {job.company === 'Google' && (
                      <span className="text-xl font-black text-white">G</span>
                    )}
                    {job.company === 'Microsoft' && (
                      <div className="grid grid-cols-2 gap-0.5 w-6 h-6">
                        <div className="bg-rose-500" />
                        <div className="bg-emerald-500" />
                        <div className="bg-sky-500" />
                        <div className="bg-amber-500" />
                      </div>
                    )}
                    {job.company === 'Meta' && (
                      <span className="text-xl font-black text-sky-400">∞</span >
                    )}
                    {!['Google', 'Microsoft', 'Meta'].includes(job.company) && (
                      <Building2 className="w-6 h-6 text-emerald-400" />
                    )}
                  </div>

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
                  onClick={() => toggleFavoriteJob(job.id)}
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
                onClick={() => setViewingJob(job)}
                className="py-2 px-3 rounded-xl glass-panel-subtle text-emerald-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voir les détails</span>
              </button>

              <button
                onClick={() => setApplyingJob(job)}
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

      {/* 5. Bottom Counters: Offres enregistrées & Historique candidatures (Matching page 7) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 pt-2">
        <div 
          onClick={() => setFilterFavoriteOnly(true)}
          className="glass-panel rounded-3xl p-4 sm:p-5 border border-emerald-500/30 flex items-center justify-between cursor-pointer hover:border-emerald-400/60 transition-all group"
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
            <span>Voir mes favoris</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        <div 
          onClick={() => alert(`Historique : Vous avez postulé à ${appliedJobsCount} offres sur Ketrika.`)}
          className="glass-panel rounded-3xl p-4 sm:p-5 border border-emerald-500/30 flex items-center justify-between cursor-pointer hover:border-emerald-400/60 transition-all group"
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
            <span>Voir l'historique</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Modal: Voir les détails */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl relative">
            <div className="flex items-start justify-between pb-3 border-b border-emerald-500/20">
              <div>
                <h3 className="text-lg font-bold text-white">{viewingJob.title}</h3>
                <p className="text-xs text-emerald-300 font-semibold">{viewingJob.company} · {viewingJob.location}</p>
              </div>
              <button
                onClick={() => setViewingJob(null)}
                className="text-emerald-400/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs text-emerald-100">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-extrabold text-sm">{viewingJob.salary}</span>
                <span>·</span>
                <span className="text-cyan-300">{viewingJob.contract} ({viewingJob.workMode})</span>
              </div>

              <div>
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-1">Missions principales</h4>
                <p className="leading-relaxed text-emerald-200/80">{viewingJob.description}</p>
              </div>

              <div>
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-1">Profil recherché</h4>
                <ul className="list-disc pl-4 space-y-1 text-emerald-200/80">
                  <li>Expérience minimum : {viewingJob.experience}</li>
                  <li>Capacité à collaborer en équipe internationale distribuée</li>
                  <li>Passion pour les technologies modernes et l'intelligence artificielle</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-emerald-500/20 flex justify-end gap-2">
                <button
                  onClick={() => setViewingJob(null)}
                  className="px-4 py-2 rounded-xl glass-panel-subtle text-emerald-300 font-bold"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    setApplyingJob(viewingJob);
                    setViewingJob(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(0,230,118,0.5)]"
                >
                  Postuler maintenant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Postuler */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                Candidature · {applyingJob.title} ({applyingJob.company})
              </h3>
              <button
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
                  className="w-full px-3 py-2.5 rounded-2xl glass-input text-sm bg-emerald-950"
                >
                  {profile.documents.map((d, i) => (
                    <option key={i} value={d.name}>{d.name} ({d.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Note d'introduction (Optionnelle)
                </label>
                <textarea
                  rows={3}
                  placeholder="Pourquoi votre profil correspond à cette offre..."
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
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
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.5)]"
                >
                  Transmettre ma candidature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
