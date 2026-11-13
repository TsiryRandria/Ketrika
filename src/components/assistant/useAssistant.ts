import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { assistantStorage } from '../../services/assistantStorage';
import {
  AppSnapshot, GeminiContent, ToolEnv, buildContext, buildBriefing, buildSuggestions,
  errorMessageFor, executeTool, localReply, streamAssistant, toGeminiContents,
} from '../../services/assistantService';
import type { AssistantAction, AssistantAttachment, AssistantMessage, Conversation } from './types';

const MAX_TOOL_ITERATIONS = 4;
const MAX_TOOL_EXECUTIONS = 8;
export const DEFAULT_TITLE = 'Nouvelle conversation';

const nowTime = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const newConv = (): Conversation => ({ id: uid('conv'), title: DEFAULT_TITLE, createdAt: Date.now(), updatedAt: Date.now(), messages: [] });

export const useAssistant = () => {
  const app = useApp();

  /* --- Références vers l'état le plus récent (les boucles async ne doivent pas lire du périmé) --- */
  const snapshot: AppSnapshot = {
    projects: app.projects, tasks: app.tasks, notes: app.notes, jobs: app.jobs, transactions: app.transactions,
    profile: app.profile, financeSettings: app.financeSettings, currentBalance: app.currentBalance,
    totalRevenue: app.totalRevenue, totalExpense: app.totalExpense,
  };
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;
  const appRef = useRef(app);
  appRef.current = app;

  const env: ToolEnv = useMemo(() => ({
    getState: () => snapRef.current,
    addTask: (t) => appRef.current.addTask(t),
    toggleTask: (id) => appRef.current.toggleTask(id),
    updateTask: (id, u) => appRef.current.updateTask(id, u),
    addNote: (n) => appRef.current.addNote(n),
    addProject: (p) => appRef.current.addProject(p),
    addTransaction: (t) => appRef.current.addTransaction(t),
    toggleFavoriteJob: (id) => appRef.current.toggleFavoriteJob(id),
    setCurrentTab: (tab) => appRef.current.setCurrentTab(tab),
  }), []);

  /* --- Conversations --- */
  const [conversations, setConversationsState] = useState<Conversation[]>([]);
  const convsRef = useRef<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [loaded, setLoaded] = useState(false);

  const setConvs = (next: Conversation[]) => { convsRef.current = next; setConversationsState(next); };
  const upsert = useCallback((conv: Conversation) => {
    const next = [conv, ...convsRef.current.filter((c) => c.id !== conv.id)].sort((a, b) => b.updatedAt - a.updatedAt);
    setConvs(next);
    if (conv.messages.length > 0 || conv.title !== DEFAULT_TITLE) void assistantStorage.save(conv);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await assistantStorage.loadAll();
      if (!alive) return;
      const draft = newConv();
      setConvs([draft, ...list]);
      setActiveId(draft.id);
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  /* Migration additive de l'ancien chat (chat_messages) : copie en lecture seule, rien n'est supprimé */
  useEffect(() => {
    if (!loaded || !app.isDbReady || assistantStorage.isLegacyMigrated()) return;
    const legacy = app.chatMessages.filter((m) => m.id !== 'msg-1');
    assistantStorage.markLegacyMigrated();
    if (!legacy.length) return;
    const msgs: AssistantMessage[] = app.chatMessages.map((m, i) => ({
      id: uid('legacy'), role: m.role, text: m.text, timestamp: m.timestamp, createdAt: Date.now() - (app.chatMessages.length - i) * 1000,
    }));
    const conv: Conversation = { id: uid('conv'), title: 'Ancienne conversation', createdAt: Date.now() - 1e6, updatedAt: Date.now() - 1e6, messages: msgs };
    upsert(conv);
  }, [loaded, app.isDbReady, app.chatMessages, upsert]);

  const active = conversations.find((c) => c.id === activeId) || null;
  const messages = active?.messages || [];

  /* --- Génération --- */
  const [busy, setBusy] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [liveActions, setLiveActions] = useState<AssistantAction[]>([]);
  const [status, setStatus] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const replyListenerRef = useRef<((text: string) => void) | null>(null);
  const setReplyListener = useCallback((fn: ((text: string) => void) | null) => { replyListenerRef.current = fn; }, []);

  const run = useCallback(async (convId: string, history: AssistantMessage[]) => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true); setStreamText(''); setLiveActions([]); setStatus('Réflexion…');

    const extra: GeminiContent[] = [];
    const actions: AssistantAction[] = [];
    let text = '';
    let failure: string | null = null;
    let usedFallback = false;
    const lastUserText = [...history].reverse().find((m) => m.role === 'user')?.text || '';

    try {
      for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
        if (i > 0 && text && !text.endsWith('\n\n')) text += '\n\n';
        const res = await streamAssistant(
          [...toGeminiContents(history), ...extra],
          buildContext(snapRef.current),
          (chunk) => { text += chunk; setStreamText(text); setStatus(''); },
          ctrl.signal,
        );

        if (res.type === 'fallback') { usedFallback = true; break; }
        if (res.type === 'error') {
          if (res.code === 'aborted') break;
          failure = res.code; break;
        }
        if (!res.functionCalls.length) break;

        extra.push({ role: 'model', parts: res.modelParts });
        const responses: Record<string, unknown>[] = [];
        for (const call of res.functionCalls) {
          if (actions.length >= MAX_TOOL_EXECUTIONS) {
            responses.push({ functionResponse: { id: call.id, name: call.name, response: { ok: false, error: "Limite d'actions atteinte pour ce message." } } });
            continue;
          }
          setStatus('Exécution des actions…');
          const out = await executeTool(call, env);
          if (out.action) { actions.push(out.action); setLiveActions([...actions]); }
          responses.push({ functionResponse: { id: call.id, name: call.name, response: out.response } });
        }
        extra.push({ role: 'user', parts: responses });
        if (i === MAX_TOOL_ITERATIONS - 1 && !text.trim()) text = actions.length ? 'Les actions demandées ont été exécutées.' : '';
      }

      if (ctrl.signal.aborted && !text.trim() && !actions.length) return;

      if (usedFallback || failure) {
        const local = await localReply(lastUserText, env);
        actions.push(...local.actions);
        text = failure ? `${errorMessageFor(failure)}\n\n${local.text}` : local.text;
      } else if (!text.trim()) {
        text = actions.length ? "C'est fait." : "Je n'ai pas de réponse à vous donner. Pouvez-vous reformuler ?";
      }

      const reply: AssistantMessage = {
        id: uid('msg'), role: 'assistant', text: text.trim(), timestamp: nowTime(), createdAt: Date.now(),
        actions: actions.length ? actions : undefined, isError: Boolean(failure),
      };
      const conv = convsRef.current.find((c) => c.id === convId);
      if (conv) upsert({ ...conv, messages: [...history, reply], updatedAt: Date.now() });
      replyListenerRef.current?.(reply.text);
    } finally {
      setBusy(false); setStreamText(''); setLiveActions([]); setStatus('');
      abortRef.current = null;
    }
  }, [env, upsert]);

  const send = useCallback(async (text: string, attachments: AssistantAttachment[] = []) => {
    const clean = text.trim();
    if ((!clean && !attachments.length) || busy) return;
    let conv = convsRef.current.find((c) => c.id === activeId) || newConv();
    const userMsg: AssistantMessage = {
      id: uid('msg'), role: 'user', text: clean, timestamp: nowTime(), createdAt: Date.now(),
      attachments: attachments.length ? attachments : undefined,
    };
    const title = conv.messages.length === 0 && conv.title === DEFAULT_TITLE
      ? (clean || attachments[0]?.name || DEFAULT_TITLE).slice(0, 42)
      : conv.title;
    conv = { ...conv, title, messages: [...conv.messages, userMsg], updatedAt: Date.now() };
    upsert(conv);
    setActiveId(conv.id);
    await run(conv.id, conv.messages);
  }, [activeId, busy, run, upsert]);

  const regenerate = useCallback(async () => {
    if (busy || !active) return;
    const idx = [...active.messages].map((m) => m.role).lastIndexOf('assistant');
    if (idx < 1 || active.messages[idx].actions?.length) return; // jamais rejouer des actions
    const history = active.messages.slice(0, idx);
    upsert({ ...active, messages: history, updatedAt: Date.now() });
    await run(active.id, history);
  }, [active, busy, run, upsert]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /* --- Annulation d'une action (initiée par l'utilisateur via le bouton Annuler) --- */
  const undoAction = useCallback((messageId: string, actionId: string) => {
    const conv = convsRef.current.find((c) => c.id === activeId);
    const msg = conv?.messages.find((m) => m.id === messageId);
    const action = msg?.actions?.find((a) => a.id === actionId);
    if (!conv || !msg || !action?.undo || action.undone) return;
    const u = action.undo;
    const a = appRef.current;
    const s = snapRef.current;
    switch (u.kind) {
      case 'task': if (s.tasks.some((t) => t.id === u.refId)) a.deleteTask(u.refId); break;
      case 'note': if (s.notes.some((n) => n.id === u.refId)) a.deleteNote(u.refId); break;
      case 'project': if (s.projects.some((p) => p.id === u.refId)) a.deleteProject(u.refId); break;
      case 'transaction': if (s.transactions.some((t) => t.id === u.refId)) a.deleteTransaction(u.refId); break;
      case 'toggle-task': a.toggleTask(u.refId); break;
      case 'update-task': a.updateTask(u.refId, u.prev as never); break;
      case 'favorite-job': a.toggleFavoriteJob(u.refId); break;
    }
    const messagesNext = conv.messages.map((m) => m.id !== messageId ? m : { ...m, actions: m.actions?.map((x) => x.id === actionId ? { ...x, undone: true } : x) });
    upsert({ ...conv, messages: messagesNext });
  }, [activeId, upsert]);

  /* --- Gestion des conversations --- */
  const newConversation = useCallback(() => {
    if (busy) return;
    const current = convsRef.current.find((c) => c.id === activeId);
    if (current && current.messages.length === 0) return;
    const empty = convsRef.current.find((c) => c.messages.length === 0 && c.title === DEFAULT_TITLE);
    if (empty) { setActiveId(empty.id); return; }
    const c = newConv();
    setConvs([c, ...convsRef.current]);
    setActiveId(c.id);
  }, [activeId, busy]);

  const openConversation = useCallback((id: string) => { if (!busy) setActiveId(id); }, [busy]);

  const renameConversation = useCallback((id: string, title: string) => {
    const conv = convsRef.current.find((c) => c.id === id);
    const t = title.trim().slice(0, 60);
    if (conv && t) upsert({ ...conv, title: t, updatedAt: conv.updatedAt });
  }, [upsert]);

  const deleteConversation = useCallback((id: string) => {
    if (busy) return;
    void assistantStorage.remove(id);
    let rest = convsRef.current.filter((c) => c.id !== id);
    if (!rest.length || !rest.some((c) => c.messages.length === 0)) rest = [newConv(), ...rest];
    setConvs(rest);
    if (id === activeId) setActiveId((rest.find((c) => c.messages.length === 0) || rest[0]).id);
  }, [activeId, busy]);

  const briefing = useMemo(() => buildBriefing(snapshot), [snapshot.tasks, snapshot.jobs, snapshot.profile, snapshot.currentBalance, snapshot.totalExpense, snapshot.financeSettings]); // eslint-disable-line react-hooks/exhaustive-deps
  const suggestions = useMemo(() => buildSuggestions(snapshot), [snapshot.tasks, snapshot.jobs, snapshot.profile, snapshot.currentBalance, snapshot.totalExpense, snapshot.financeSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    loaded, conversations: conversations.filter((c) => c.messages.length > 0 || c.id === activeId),
    active, activeId, messages, busy, streamText, liveActions, status,
    briefing, suggestions, snapshot,
    send, regenerate, stop, undoAction, setReplyListener,
    newConversation, openConversation, renameConversation, deleteConversation,
  };
};
