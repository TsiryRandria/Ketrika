import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AudioLines, Ear, History, Plus, X } from 'lucide-react';
import { Bot } from 'lucide-react';
import { useAssistant } from '../assistant/useAssistant';
import { MessageBubble, ActionCards } from '../assistant/MessageBubble';
import { Markdown } from '../assistant/Markdown';
import { BriefingCard } from '../assistant/BriefingCard';
import { Composer } from '../assistant/Composer';
import { ConversationList } from '../assistant/ConversationList';
import { VoiceMode } from '../assistant/VoiceMode';
import { VoiceOrb } from '../assistant/VoiceOrb';
import { useWakeWord } from '../assistant/useWakeWord';
import { hasSpeechSynthesis, speakText, speechRecognitionCtor, stopSpeaking } from '../assistant/voiceUtils';
import type { AssistantAttachment, AssistantMessage } from '../assistant/types';

const WAKE_KEY = 'ketrika_assistant_wake_v1';

/** Hauteur du bloc = viewport visible (dvh / visualViewport, clavier Android inclus) moins l'en-tête et la barre du bas. */
const useShellHeight = (ref: React.RefObject<HTMLDivElement | null>) => {
  const [height, setHeight] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const vv = window.visualViewport;
      const vh = vv?.height ?? window.innerHeight;
      const keyboardOpen = Boolean(vv && window.innerHeight - vv.height > 140);
      const top = el.getBoundingClientRect().top;
      const reserve = keyboardOpen ? 8 : window.innerWidth < 768 ? 96 : 32;
      setHeight(Math.max(460, Math.round(vh - Math.max(top, 0) - reserve)));
    };
    measure();
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [ref]);
  return height;
};

export const AssistantScreen: React.FC = () => {
  const a = useAssistant();
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const height = useShellHeight(shellRef);

  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<AssistantAttachment[]>([]);
  const [notice, setNotice] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [wakeEnabled, setWakeEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(WAKE_KEY) === '1'; } catch { return false; }
  });
  const idleLevel = useRef(0);

  const flash = useCallback((msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 4500); }, []);

  /* Défilement : on suit le bas seulement si l'utilisateur y est déjà */
  const nearBottom = useRef(true);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };
  useEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottom.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [a.messages.length, a.streamText, a.liveActions.length, a.busy]);
  useEffect(() => { nearBottom.current = true; }, [a.activeId]);

  useEffect(() => () => stopSpeaking(), []);

  /* « Hey Ketrika » : actif seulement si la page est ouverte et le mode vocal fermé */
  const wake = useWakeWord(
    wakeEnabled && !voiceOpen,
    () => setVoiceOpen(true),
    (reason) => {
      setWakeEnabled(false);
      try { localStorage.setItem(WAKE_KEY, '0'); } catch { /* ignore */ }
      flash(reason === 'permission' ? "Micro refusé : l'activation « Hey Ketrika » est désactivée." : "Ce navigateur ne gère pas la reconnaissance vocale (essayez Chrome ou Edge).");
    },
  );
  const toggleWake = () => {
    if (!speechRecognitionCtor()) { flash("Ce navigateur ne gère pas la reconnaissance vocale (essayez Chrome ou Edge)."); return; }
    const next = !wakeEnabled;
    setWakeEnabled(next);
    try { localStorage.setItem(WAKE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
  };

  const doSend = useCallback((text?: string) => {
    const t = (text ?? draft).trim();
    if (a.busy) return;
    if (!t && !attachments.length) return;
    const atts = text === undefined ? attachments : [];
    setDraft('');
    if (text === undefined) setAttachments([]);
    void a.send(t, atts);
  }, [a, draft, attachments]);

  const onSuggestion = (prompt: string) => {
    if (prompt.trim().endsWith(':')) { setDraft(`${prompt.trim()} `); return; }
    doSend(prompt);
  };

  const onSpeak = (m: AssistantMessage) => {
    if (speakingId === m.id) { stopSpeaking(); setSpeakingId(null); return; }
    if (!hasSpeechSynthesis()) { flash("La lecture vocale n'est pas disponible sur ce navigateur."); return; }
    setSpeakingId(m.id);
    speakText(m.text, { onEnd: () => setSpeakingId((cur) => (cur === m.id ? null : cur)) });
  };

  const lastAssistantIdx = a.messages.map((m) => m.role).lastIndexOf('assistant');
  const isEmpty = a.messages.length === 0;
  const convList = (
    <ConversationList
      conversations={a.conversations}
      activeId={a.activeId}
      disabled={a.busy}
      onNew={() => { a.newConversation(); setDrawerOpen(false); }}
      onOpen={(id) => { a.openConversation(id); setDrawerOpen(false); }}
      onRename={a.renameConversation}
      onDelete={a.deleteConversation}
    />
  );

  return (
    <div ref={shellRef} className="assistant-shell relative animate-in fade-in duration-200" style={height ? { height } : { height: 'calc(100dvh - 8rem)' }}>
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4 h-full">

        {/* Colonne gauche (desktop/tablette large) */}
        <aside className="hidden lg:flex flex-col gap-3 min-h-0" aria-label="Conversations">
          <div className="glass-panel rounded-3xl p-4 border border-emerald-500/30 flex items-center gap-3 shrink-0">
            <div className="w-16 h-16 shrink-0"><VoiceOrb state="idle" levelRef={idleLevel} micLive={false} /></div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-white leading-tight">Assistant IA</h2>
              <p className="text-[11px] text-emerald-300/80 leading-snug">Ketrika IA — votre Jarvis personnel</p>
            </div>
          </div>
          <div className="glass-panel rounded-3xl p-4 border border-emerald-500/30 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-2 mb-3 text-emerald-300 shrink-0">
              <History className="w-4 h-4 text-emerald-400" aria-hidden />
              <h3 className="font-bold text-xs uppercase tracking-wider">Conversations</h3>
            </div>
            <div className="flex-1 min-h-0">{convList}</div>
          </div>
          <WakeToggle enabled={wakeEnabled} listening={wake.listening} onToggle={toggleWake} />
        </aside>

        {/* Zone de chat */}
        <section className="glass-panel rounded-3xl border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)] flex flex-col min-h-0 overflow-hidden relative" aria-label="Discussion avec Ketrika IA">
          <header className="flex items-center gap-2 px-4 py-3 border-b border-emerald-500/20 shrink-0">
            <button type="button" onClick={() => setDrawerOpen(true)} className="assistant-round-btn !w-9 !h-9 lg:hidden" aria-label="Ouvrir la liste des conversations"><History className="w-4 h-4" /></button>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-extrabold text-white truncate">{a.active?.title || 'Nouvelle conversation'}</h2>
              <p className="text-[10px] text-emerald-300/70">{a.busy ? (a.status || 'Ketrika écrit…') : 'Ketrika IA'}</p>
            </div>
            <button type="button" onClick={a.newConversation} disabled={a.busy} className="assistant-round-btn !w-9 !h-9 lg:hidden" aria-label="Nouvelle conversation"><Plus className="w-4 h-4" /></button>
            <button type="button" onClick={() => setVoiceOpen(true)} disabled={a.busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-100 text-xs font-bold hover:bg-cyan-500/25 transition-colors disabled:opacity-50" aria-label="Ouvrir le mode vocal Jarvis">
              <AudioLines className="w-4 h-4" aria-hidden /><span className="hidden sm:inline">Mode vocal</span>
            </button>
          </header>

          <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 space-y-4" aria-live="polite" aria-relevant="additions">
            {!a.loaded ? (
              <p className="text-xs text-emerald-300/70">Chargement…</p>
            ) : (
              <>
                <BriefingCard briefing={a.briefing} onAsk={(p) => doSend(p)} disabled={a.busy} />

                {isEmpty && (
                  <div className="text-center py-4">
                    <div className="w-20 h-20 mx-auto"><VoiceOrb state="idle" levelRef={idleLevel} micLive={false} /></div>
                    <p className="text-lg font-extrabold text-white mt-2">Bonjour {a.snapshot.profile.name?.split(' ')[0] || ''} 👋</p>
                    <p className="text-xs text-emerald-200/80 mt-1 max-w-sm mx-auto leading-relaxed">
                      Je peux créer vos tâches, notes, projets et transactions, ouvrir un écran ou analyser vos données. Écrivez ou parlez-moi.
                    </p>
                  </div>
                )}

                {a.messages.map((m, i) => (
                  <MessageBubble
                    key={m.id}
                    msg={m}
                    canRegenerate={i === lastAssistantIdx && i > 0 && !a.busy && !m.actions?.length}
                    isSpeaking={speakingId === m.id}
                    onRegenerate={() => void a.regenerate()}
                    onSpeak={onSpeak}
                    onUndo={a.undoAction}
                  />
                ))}

                {a.busy && (
                  <div className="flex items-start gap-2.5 assistant-msg-in">
                    <div className="assistant-avatar" aria-hidden><Bot className="w-4 h-4" /></div>
                    <div className="min-w-0 max-w-[88%] glass-panel rounded-3xl rounded-tl-sm px-3.5 py-2.5 text-[13px] sm:text-sm text-emerald-50 leading-relaxed">
                      {a.streamText ? <Markdown text={a.streamText} /> : (
                        <span className="inline-flex items-center gap-2 text-emerald-300 text-xs">
                          <span className="assistant-typing" aria-hidden><span /><span /><span /></span>
                          {a.status || 'Ketrika réfléchit…'}
                        </span>
                      )}
                      {a.liveActions.length > 0 && <ActionCards actions={a.liveActions} />}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-3 pb-3 shrink-0 space-y-2">
            {notice && <p role="alert" className="text-[11px] px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-100">{notice}</p>}
            {a.suggestions.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar" aria-label="Suggestions">
                {a.suggestions.map((s) => (
                  <button key={s.label} type="button" disabled={a.busy} onClick={() => onSuggestion(s.prompt)} className="assistant-chip">{s.label}</button>
                ))}
              </div>
            )}
            <Composer
              value={draft}
              onChange={setDraft}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              onSend={() => doSend()}
              onStop={a.stop}
              onOpenVoice={() => setVoiceOpen(true)}
              busy={a.busy}
              onNotice={flash}
            />
          </div>

          {voiceOpen && (
            <VoiceMode
              busy={a.busy}
              send={(t) => a.send(t)}
              setReplyListener={a.setReplyListener}
              onClose={() => { stopSpeaking(); setVoiceOpen(false); }}
            />
          )}
        </section>
      </div>

      {/* Tiroir des conversations (mobile / tablette étroite) */}
      {drawerOpen && (
        <div className="absolute inset-0 z-20 lg:hidden flex" role="dialog" aria-modal="true" aria-label="Conversations">
          <div className="w-[88%] max-w-sm glass-panel rounded-3xl p-4 border border-emerald-400/40 flex flex-col min-h-0 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-300">Conversations</h3>
              <button type="button" onClick={() => setDrawerOpen(false)} className="assistant-icon-btn" aria-label="Fermer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 min-h-0">{convList}</div>
            <div className="mt-3 shrink-0"><WakeToggle enabled={wakeEnabled} listening={wake.listening} onToggle={toggleWake} /></div>
          </div>
          <button type="button" className="flex-1" onClick={() => setDrawerOpen(false)} aria-label="Fermer la liste" />
        </div>
      )}
    </div>
  );
};

const WakeToggle: React.FC<{ enabled: boolean; listening: boolean; onToggle: () => void }> = ({ enabled, listening, onToggle }) => (
  <div className="glass-panel-subtle rounded-2xl p-3 border border-emerald-500/25 shrink-0">
    <button type="button" onClick={onToggle} role="switch" aria-checked={enabled} className="w-full flex items-center gap-2 text-left">
      <Ear className={`w-4 h-4 shrink-0 ${listening ? 'text-cyan-300' : 'text-emerald-400'}`} aria-hidden />
      <span className="flex-1 text-xs font-semibold text-white">« Hey Ketrika »</span>
      <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${enabled ? 'bg-emerald-500' : 'bg-emerald-950 border border-emerald-500/40'}`}>
        <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-4' : ''}`} />
      </span>
    </button>
    <p className="text-[10px] text-emerald-300/60 mt-1.5 leading-snug">
      Écoute uniquement tant que cette page est ouverte et visible (indicateur micro du navigateur affiché).
    </p>
  </div>
);
