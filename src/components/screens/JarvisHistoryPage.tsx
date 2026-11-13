import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { JarvisConversation, JarvisConversationMode, ChatMessage } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  MessageSquareText,
  Trash2,
  Calendar,
  Clock,
  Volume2,
  Square,
  Bot,
  ArrowRight,
  AlertTriangle,
  Search,
  X,
  FileText,
  Image as ImageIcon,
  History,
} from 'lucide-react';
import { AttachmentMeta, formatBytesFr } from '../../shared/attachmentLimits';

interface JarvisHistoryPageProps {
  onBack: () => void;
}

const cleanTextForSpeech = (rawText: string): string => {
  return rawText
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[•\-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseMessageAttachments = (
  attachmentsMeta?: AttachmentMeta[],
  rawAttachment?: string
): AttachmentMeta[] => {
  if (attachmentsMeta && attachmentsMeta.length > 0) {
    return attachmentsMeta;
  }
  if (!rawAttachment) return [];
  try {
    const parsed = JSON.parse(rawAttachment);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && typeof item.name === 'string');
    }
  } catch {
    return [
      {
        id: 'legacy-att',
        name: rawAttachment,
        mimeType: 'application/octet-stream',
        kind: 'text',
        rawSize: 0,
        encodedSize: 0,
      },
    ];
  }
  return [];
};

const pickBestFrenchVoice = (): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined') {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  const frenchVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('fr'));
  if (frenchVoices.length === 0) return null;
  return (
    frenchVoices.find((v) =>
      /natural|google|thomas|am[eé]lie|hortense|denise|henri|paul|julie/i.test(v.name)
    ) || frenchVoices[0]
  );
};

type ClearConfirmTarget = 'voice' | 'text' | 'all' | null;

export const JarvisHistoryPage: React.FC<JarvisHistoryPageProps> = ({ onBack }) => {
  const {
    jarvisConversations,
    resumeTextConversation,
    deleteJarvisConversation,
    clearJarvisHistory,
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<JarvisConversationMode>('voice');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [confirmDeleteConv, setConfirmDeleteConv] = useState<JarvisConversation | null>(null);
  const [confirmClearTarget, setConfirmClearTarget] = useState<ClearConfirmTarget>(null);
  const playbackCancelRef = useRef(false);

  const voiceConversations = useMemo(
    () => jarvisConversations.filter((c) => c.mode === 'voice'),
    [jarvisConversations]
  );
  const textConversations = useMemo(
    () => jarvisConversations.filter((c) => c.mode === 'text'),
    [jarvisConversations]
  );

  const categoryConversations = useMemo(() => {
    const base = activeCategory === 'voice' ? voiceConversations : textConversations;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return base;
    return base.filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        conv.preview.toLowerCase().includes(query) ||
        conv.dateLabel.toLowerCase().includes(query) ||
        conv.messages.some((m) => m.text.toLowerCase().includes(query))
    );
  }, [activeCategory, voiceConversations, textConversations, searchQuery]);

  const selectedConversation = useMemo(() => {
    if (!selectedId) return null;
    return (
      categoryConversations.find((c) => c.id === selectedId) ||
      (activeCategory === 'voice' ? voiceConversations : textConversations).find(
        (c) => c.id === selectedId
      ) ||
      null
    );
  }, [selectedId, categoryConversations, activeCategory, voiceConversations, textConversations]);

  const stopSpeechReplay = () => {
    playbackCancelRef.current = true;
    if (typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined') {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignorer erreur synthèse vocale
      }
    }
    setSpeakingMessageId(null);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined') {
      window.speechSynthesis.getVoices();
    }
    return () => {
      stopSpeechReplay();
    };
  }, []);

  useEffect(() => {
    stopSpeechReplay();
    setSelectedId(null);
  }, [activeCategory]);

  const handleReplayMessageSpeech = (msg: ChatMessage) => {
    if (speakingMessageId === msg.id) {
      stopSpeechReplay();
      return;
    }

    if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined') {
      return;
    }

    stopSpeechReplay();
    playbackCancelRef.current = false;

    const clean = cleanTextForSpeech(msg.text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    const frenchVoice = pickBestFrenchVoice();
    if (frenchVoice) utterance.voice = frenchVoice;

    setSpeakingMessageId(msg.id);
    utterance.onend = () => {
      setSpeakingMessageId((curr) => (curr === msg.id ? null : curr));
    };
    utterance.onerror = () => {
      setSpeakingMessageId((curr) => (curr === msg.id ? null : curr));
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleReplayAllVoiceReplies = (conv: JarvisConversation) => {
    if (speakingMessageId === `all-${conv.id}`) {
      stopSpeechReplay();
      return;
    }
    if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined') {
      return;
    }

    const assistantMessages = conv.messages.filter((m) => m.role === 'assistant');
    if (assistantMessages.length === 0) return;

    stopSpeechReplay();
    playbackCancelRef.current = false;
    setSpeakingMessageId(`all-${conv.id}`);

    const speakAt = (idx: number) => {
      if (playbackCancelRef.current || idx >= assistantMessages.length) {
        setSpeakingMessageId(null);
        return;
      }
      const clean = cleanTextForSpeech(assistantMessages[idx].text);
      if (!clean) {
        speakAt(idx + 1);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.0;
      const frenchVoice = pickBestFrenchVoice();
      if (frenchVoice) utterance.voice = frenchVoice;
      utterance.onend = () => speakAt(idx + 1);
      utterance.onerror = () => setSpeakingMessageId(null);
      window.speechSynthesis.speak(utterance);
    };

    speakAt(0);
  };

  const handleConfirmDeleteConversation = () => {
    if (!confirmDeleteConv) return;
    stopSpeechReplay();
    const targetId = confirmDeleteConv.id;
    deleteJarvisConversation(targetId);
    if (selectedId === targetId) {
      setSelectedId(null);
    }
    setConfirmDeleteConv(null);
  };

  const handleConfirmClear = () => {
    if (!confirmClearTarget) return;
    stopSpeechReplay();
    clearJarvisHistory(confirmClearTarget);
    setSelectedId(null);
    setConfirmClearTarget(null);
  };

  const canUseSpeechSynthesis =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';

  const totalCount = voiceConversations.length + textConversations.length;

  return (
    <div className="max-w-5xl mx-auto pb-32 md:pb-12 animate-in fade-in duration-200 space-y-5">
      {/* En-tête fixe de retour vers Paramètres */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-[#013b27]/92 backdrop-blur-xl border-b border-emerald-500/25 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              stopSpeechReplay();
              onBack();
            }}
            className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/35 text-emerald-200 hover:text-white hover:border-[#00e676]/60 transition-all text-xs font-bold shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Paramètres</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-extrabold text-white tracking-tight truncate flex items-center gap-2">
              <History className="w-5 h-5 text-[#00e676] shrink-0 hidden sm:inline" />
              <span className="truncate">Historique des conversations JARVIS</span>
            </h1>
            <p className="text-[11px] text-emerald-300/75 tabular-nums truncate">
              {voiceConversations.length} session{voiceConversations.length > 1 ? 's' : ''} vocale
              {voiceConversations.length > 1 ? 's' : ''} · {textConversations.length} conversation
              {textConversations.length > 1 ? 's' : ''} écrite
              {textConversations.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {totalCount > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClearTarget('all')}
            className="min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-400/45 hover:bg-rose-500/25 text-rose-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Tout supprimer</span>
            <span className="sm:hidden">Vider</span>
          </button>
        )}
      </div>

      {/* Sélecteur strict des 2 catégories distinctes */}
      <div
        role="tablist"
        aria-label="Catégories d'historique JARVIS"
        className="grid grid-cols-2 gap-3"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'voice'}
          onClick={() => setActiveCategory('voice')}
          className={`min-h-[56px] p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-2 text-left cursor-pointer ${
            activeCategory === 'voice'
              ? 'glass-panel-active text-white'
              : 'glass-panel-subtle text-emerald-200/80 hover:text-white hover:border-[#00e676]/45'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeCategory === 'voice'
                  ? 'bg-[#00e676] text-slate-950'
                  : 'bg-emerald-950/70 text-[#00e676] border border-emerald-500/30'
              }`}
            >
              <Mic className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-extrabold block truncate">
                Historique vocal 🎙️
              </span>
              <span className="text-[11px] text-emerald-200/75 block truncate">
                Sessions parlées
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-400/35 text-xs font-bold text-[#00ff88] tabular-nums shrink-0">
            {voiceConversations.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'text'}
          onClick={() => setActiveCategory('text')}
          className={`min-h-[56px] p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-2 text-left cursor-pointer ${
            activeCategory === 'text'
              ? 'glass-panel-active text-white'
              : 'glass-panel-subtle text-emerald-200/80 hover:text-white hover:border-[#00e676]/45'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeCategory === 'text'
                  ? 'bg-[#00e676] text-slate-950'
                  : 'bg-emerald-950/70 text-[#00e676] border border-emerald-500/30'
              }`}
            >
              <MessageSquareText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-extrabold block truncate">
                Historique écrit 💬
              </span>
              <span className="text-[11px] text-emerald-200/75 block truncate">
                Discussions clavier
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-400/35 text-xs font-bold text-[#00ff88] tabular-nums shrink-0">
            {textConversations.length}
          </span>
        </button>
      </div>

      {/* Barre de recherche et suppression de la catégorie active */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-emerald-400/80 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeCategory === 'voice'
                ? 'Rechercher dans les sessions vocales...'
                : 'Rechercher dans les discussions écrites...'
            }
            className="w-full min-h-[44px] pl-10 pr-9 py-2 rounded-2xl glass-input text-xs sm:text-sm placeholder:text-emerald-300/45"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-emerald-300 hover:text-white cursor-pointer"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {(activeCategory === 'voice' ? voiceConversations.length : textConversations.length) > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClearTarget(activeCategory)}
            className="min-h-[44px] px-4 py-2 rounded-2xl glass-panel-subtle border border-rose-400/35 hover:border-rose-400/70 hover:bg-rose-500/15 text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              {activeCategory === 'voice'
                ? "Vider l'historique vocal"
                : "Vider l'historique écrit"}
            </span>
          </button>
        )}
      </div>

      {/* Corps principal : Liste (gauche / mobile) + Détail (droite / mobile) */}
      {categoryConversations.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8 sm:p-10 text-center space-y-3 border border-emerald-500/25">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950/80 border border-[#00e676]/35 flex items-center justify-center text-[#00e676]">
            {activeCategory === 'voice' ? (
              <Mic className="w-7 h-7" />
            ) : (
              <MessageSquareText className="w-7 h-7" />
            )}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            {searchQuery
              ? 'Aucun résultat trouvé'
              : activeCategory === 'voice'
                ? 'Aucune conversation vocale enregistrée'
                : 'Aucune conversation écrite enregistrée'}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200/75 max-w-md mx-auto leading-relaxed">
            {searchQuery
              ? 'Essayez un autre mot-clé ou effacez le filtre de recherche.'
              : activeCategory === 'voice'
                ? 'Vos échanges vocaux démarrés avec le microphone dans JARVIS apparaîtront automatiquement ici.'
                : 'Vos discussions envoyées au clavier en Mode texte apparaîtront automatiquement ici pour être relues ou poursuivies.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Colonne Liste */}
          <div
            className={`lg:col-span-5 space-y-2.5 ${
              selectedConversation ? 'hidden lg:block' : 'block'
            }`}
          >
            {categoryConversations.map((conv) => {
              const isSelected = selectedConversation?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  className={`rounded-2xl p-3.5 border transition-all ${
                    isSelected
                      ? 'glass-panel-active'
                      : 'glass-panel-subtle hover:border-[#00e676]/55'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedId(conv.id)}
                      className="flex-1 min-w-0 text-left space-y-1.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-[11px] text-emerald-300/85 tabular-nums">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#00e676]" />
                          {conv.dateLabel || '—'}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#00e676]" />
                          {conv.timeLabel || '—'}
                        </span>
                        <span>·</span>
                        <span>
                          {conv.messages.length} msg
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white line-clamp-1">
                        {conv.title}
                      </h3>

                      <p className="text-xs text-emerald-100/75 line-clamp-2 leading-relaxed">
                        {conv.preview || 'Aucun aperçu'}
                      </p>
                    </button>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteConv(conv)}
                        className="p-2 rounded-xl text-emerald-300/65 hover:text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer"
                        title="Supprimer cette conversation"
                        aria-label={`Supprimer ${conv.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedId(conv.id)}
                        className="p-1.5 text-emerald-300/70 hover:text-white lg:hidden cursor-pointer"
                        aria-label="Ouvrir le détail"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Colonne Détail */}
          <div
            className={`lg:col-span-7 ${
              selectedConversation ? 'block' : 'hidden lg:block'
            }`}
          >
            {!selectedConversation ? (
              <div className="glass-panel rounded-3xl p-8 text-center border border-emerald-500/25 space-y-2">
                <p className="text-sm font-bold text-white">
                  Sélectionnez une conversation
                </p>
                <p className="text-xs text-emerald-200/75">
                  {activeCategory === 'voice'
                    ? 'Consultez la transcription complète et réécoutez les réponses vocales.'
                    : 'Relisez les messages ou reprenez la discussion exactement là où vous l’avez laissée.'}
                </p>
              </div>
            ) : (
              <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-[#00e676]/35 space-y-4">
                {/* Barre détail */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-emerald-500/20">
                  <div className="space-y-1 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        stopSpeechReplay();
                        setSelectedId(null);
                      }}
                      className="lg:hidden inline-flex items-center gap-1 text-xs font-bold text-[#00ff88] mb-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Retour à la liste</span>
                    </button>

                    <div className="flex items-center gap-2 text-[11px] text-emerald-300/80 tabular-nums">
                      <span>{selectedConversation.mode === 'voice' ? '🎙️ Vocal' : '💬 Écrit'}</span>
                      <span>·</span>
                      <span>{selectedConversation.dateLabel}</span>
                      <span>à {selectedConversation.timeLabel}</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug break-words">
                      {selectedConversation.title}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {selectedConversation.mode === 'voice' &&
                      canUseSpeechSynthesis &&
                      selectedConversation.messages.some((m) => m.role === 'assistant') && (
                        <button
                          type="button"
                          onClick={() => handleReplayAllVoiceReplies(selectedConversation)}
                          className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            speakingMessageId === `all-${selectedConversation.id}`
                              ? 'bg-rose-500/20 border-rose-400/60 text-rose-200'
                              : 'bg-emerald-950/75 border-[#00e676]/45 text-emerald-100 hover:border-[#00ff88]'
                          }`}
                        >
                          {speakingMessageId === `all-${selectedConversation.id}` ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Arrêter l&apos;écoute</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-4 h-4 text-[#00e676]" />
                              <span>Tout réécouter</span>
                            </>
                          )}
                        </button>
                      )}

                    {selectedConversation.mode === 'text' && (
                      <button
                        type="button"
                        onClick={() => resumeTextConversation(selectedConversation.id)}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#00e676] to-teal-400 text-slate-950 font-extrabold text-xs shadow-[0_0_16px_rgba(0,230,118,0.45)] hover:shadow-[0_0_24px_rgba(0,230,118,0.7)] transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Continuer cette conversation</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setConfirmDeleteConv(selectedConversation)}
                      className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-emerald-950/75 border border-emerald-500/30 hover:border-rose-400/60 hover:bg-rose-500/15 text-emerald-300 hover:text-rose-200 transition-all flex items-center justify-center cursor-pointer"
                      title="Supprimer cette conversation"
                      aria-label="Supprimer cette conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedConversation.mode === 'voice' &&
                  !selectedConversation.messages.some((m) => Boolean(m.audioDataUrl)) && (
                    <div className="px-3.5 py-2 rounded-2xl bg-emerald-950/70 border border-emerald-500/25 text-[11px] text-emerald-200/80">
                      Aucun fichier audio brut enregistré pour cette session — la réécoute utilise
                      la synthèse vocale du navigateur.
                    </div>
                  )}

                {/* Messages de la conversation */}
                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                  {selectedConversation.messages.map((msg) => {
                    const isAssistant = msg.role === 'assistant';
                    const msgAttachments = parseMessageAttachments(
                      msg.attachmentsMeta,
                      msg.attachment
                    );
                    const isSpeakingThis = speakingMessageId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2.5 ${
                          isAssistant ? '' : 'flex-row-reverse'
                        }`}
                      >
                        {isAssistant ? (
                          <div className="w-8 h-8 rounded-full bg-[#022d1f] border border-[#00e676]/70 flex items-center justify-center text-[#00ff88] shrink-0">
                            <Bot className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#00e676] text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                            U
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed space-y-2 ${
                            isAssistant
                              ? 'bg-emerald-950/75 border border-[#00e676]/25 text-emerald-50 rounded-tl-sm'
                              : 'bg-[#00e676] text-slate-950 font-medium rounded-tr-sm'
                          }`}
                        >
                          {msgAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {msgAttachments.map((att, idx) => (
                                <div
                                  key={att.id || idx}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-[11px] font-semibold ${
                                    isAssistant
                                      ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/30'
                                      : 'bg-slate-950/15 text-slate-950 border border-slate-950/20'
                                  }`}
                                >
                                  {att.kind === 'image' ? (
                                    <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  <span className="truncate max-w-[140px]">{att.name}</span>
                                  {att.rawSize > 0 && (
                                    <span className="opacity-75 tabular-nums">
                                      ({formatBytesFr(att.rawSize)})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="whitespace-pre-wrap">{msg.text}</div>

                          {/* Audio brut si disponible */}
                          {msg.audioDataUrl && (
                            <audio
                              controls
                              src={msg.audioDataUrl}
                              className="w-full h-9 mt-1"
                            />
                          )}

                          <div className="flex items-center justify-between gap-3 pt-0.5">
                            {isAssistant &&
                              selectedConversation.mode === 'voice' &&
                              !msg.audioDataUrl &&
                              canUseSpeechSynthesis && (
                                <button
                                  type="button"
                                  onClick={() => handleReplayMessageSpeech(msg)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                    isSpeakingThis
                                      ? 'bg-rose-500/20 border-rose-400/60 text-rose-200'
                                      : 'bg-emerald-900/60 border-[#00e676]/40 text-[#00ff88] hover:border-[#00ff88]'
                                  }`}
                                >
                                  {isSpeakingThis ? (
                                    <>
                                      <Square className="w-3 h-3 fill-current" />
                                      <span>Arrêter</span>
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3.5 h-3.5" />
                                      <span>Réécouter (synthèse)</span>
                                    </>
                                  )}
                                </button>
                              )}

                            <span
                              className={`text-[10px] tabular-nums ml-auto ${
                                isAssistant ? 'text-emerald-300/65' : 'text-slate-900/75'
                              }`}
                            >
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modale de confirmation : suppression d'une conversation */}
      {confirmDeleteConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-rose-400/50 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white">
                  Supprimer cette conversation ?
                </h3>
                <p className="text-xs text-emerald-100/80 leading-relaxed">
                  « {confirmDeleteConv.title} » sera définitivement supprimée de la base de
                  données locale SQLite.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-500/20">
              <button
                type="button"
                onClick={() => setConfirmDeleteConv(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl glass-panel-subtle text-emerald-200 hover:text-white text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteConversation}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-extrabold shadow-[0_0_16px_rgba(244,63,94,0.45)] cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de confirmation : suppression d'une catégorie ou de tout l'historique */}
      {confirmClearTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-rose-400/50 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white">
                  {confirmClearTarget === 'all'
                    ? "Supprimer tout l'historique JARVIS ?"
                    : confirmClearTarget === 'voice'
                      ? "Supprimer tout l'historique vocal ?"
                      : "Supprimer tout l'historique écrit ?"}
                </h3>
                <p className="text-xs text-emerald-100/80 leading-relaxed">
                  {confirmClearTarget === 'all'
                    ? 'Toutes vos conversations vocales et écrites avec JARVIS seront supprimées définitivement de SQLite.'
                    : confirmClearTarget === 'voice'
                      ? 'Toutes les sessions de l’historique vocal seront supprimées. Votre historique écrit restera intact.'
                      : 'Toutes les discussions de l’historique écrit seront supprimées. Votre historique vocal restera intact.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-500/20">
              <button
                type="button"
                onClick={() => setConfirmClearTarget(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl glass-panel-subtle text-emerald-200 hover:text-white text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-extrabold shadow-[0_0_16px_rgba(244,63,94,0.45)] cursor-pointer"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
