import type {
  Job, Note, Project, Task, Transaction, UserProfile, FinanceSettings, NavigationTab,
} from '../types';
import type { AssistantAction, AssistantAttachment, AssistantMessage } from '../components/assistant/types';

/* -------------------------------------------------------------------------- */
/* Dates (l'app stocke JJ/MM/AAAA)                                            */
/* -------------------------------------------------------------------------- */

export const parseFrDate = (value?: string): Date | null => {
  if (!value) return null;
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
};

export const toFrDate = (d: Date): string =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/** Accepte AAAA-MM-JJ ou JJ/MM/AAAA ; sinon renvoie `fallback` (aujourd'hui par défaut). */
export const normalizeDate = (value: unknown, fallback = new Date()): string => {
  const d = typeof value === 'string' ? parseFrDate(value.trim()) : null;
  return toFrDate(d || fallback);
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/* -------------------------------------------------------------------------- */
/* Snapshot de l'état de l'app                                                */
/* -------------------------------------------------------------------------- */

export interface AppSnapshot {
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  jobs: Job[];
  transactions: Transaction[];
  profile: UserProfile;
  financeSettings: FinanceSettings;
  currentBalance: number;
  totalRevenue: number;
  totalExpense: number;
}

const fmtAr = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} Ar`;
const clip = (s: string | undefined, n: number) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s || '');

export const classifyTasks = (tasks: Task[], now = new Date()) => {
  const today = startOfDay(now).getTime();
  const pending = tasks.filter((t) => !t.completed);
  const overdue: Task[] = [];
  const dueToday: Task[] = [];
  const upcoming: Task[] = [];
  for (const t of pending) {
    const d = parseFrDate(t.dueDate);
    if (!d) continue;
    const time = startOfDay(d).getTime();
    if (time < today) overdue.push(t);
    else if (time === today) dueToday.push(t);
    else if (time <= today + 3 * 86400000) upcoming.push(t);
  }
  return { pending, overdue, dueToday, upcoming };
};

const tokens = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9+#.]+/).filter((w) => w.length >= 3);

export const matchJobsToProfile = (jobs: Job[], profile: UserProfile, max = 3) => {
  const skillWords = new Set<string>();
  (profile.skills || []).forEach((sk) => tokens(sk.name).forEach((w) => skillWords.add(w)));
  tokens(profile.professionalProfile?.title || '').forEach((w) => skillWords.add(w));
  const stop = new Set(['and', 'les', 'des', 'pour', 'avec', 'the']);
  return jobs
    .filter((j) => !j.applied)
    .map((j) => {
      const hay = new Set(tokens(`${j.title} ${j.description}`));
      let score = 0;
      skillWords.forEach((w) => { if (!stop.has(w) && hay.has(w)) score += 1; });
      return { job: j, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
};

export const buildBriefing = (s: AppSnapshot, now = new Date()) => {
  const { overdue, dueToday, upcoming, pending } = classifyTasks(s.tasks, now);
  return {
    overdue,
    dueToday,
    upcoming,
    pendingCount: pending.length,
    balance: s.currentBalance,
    budgetMax: s.financeSettings?.monthlyBudgetMax || 0,
    totalExpense: s.totalExpense,
    jobs: matchJobsToProfile(s.jobs, s.profile),
  };
};

export const buildSuggestions = (s: AppSnapshot): { label: string; prompt: string }[] => {
  const b = buildBriefing(s);
  const out: { label: string; prompt: string }[] = [];
  if (b.overdue.length) out.push({ label: `${b.overdue.length} tâche${b.overdue.length > 1 ? 's' : ''} en retard`, prompt: "J'ai des tâches en retard. Aide-moi à les prioriser et à replanifier." });
  if (b.dueToday.length) out.push({ label: `${b.dueToday.length} pour aujourd'hui`, prompt: "Quelles sont mes tâches d'aujourd'hui ? Propose un ordre d'exécution." });
  if (b.jobs.length) out.push({ label: `${b.jobs.length} offre${b.jobs.length > 1 ? 's' : ''} pour mon profil`, prompt: "Quelles offres d'emploi correspondent le mieux à mon profil ?" });
  if (b.budgetMax > 0 && b.totalExpense > b.budgetMax * 0.8) out.push({ label: 'Budget bientôt atteint', prompt: "Analyse mon budget : où en suis-je et que puis-je réduire ?" });
  out.push({ label: 'Bilan de ma semaine', prompt: 'Fais-moi un bilan complet : tâches, projets et finances.' });
  out.push({ label: 'Créer une tâche', prompt: 'Crée une tâche : ' });
  out.push({ label: 'Idées de projets', prompt: 'Donne-moi 3 idées de projets adaptées à mes compétences.' });
  out.push({ label: 'Conseils de productivité', prompt: 'Donne-moi 3 conseils de productivité adaptés à ma charge actuelle.' });
  return out.slice(0, 6);
};

/* -------------------------------------------------------------------------- */
/* Contexte envoyé au serveur (compact, tronqué)                              */
/* -------------------------------------------------------------------------- */

export const buildContext = (s: AppSnapshot, now = new Date()): string => {
  const { overdue, dueToday, upcoming, pending } = classifyTasks(s.tasks, now);
  const weekday = now.toLocaleDateString('fr-FR', { weekday: 'long' });
  const lines: string[] = [];
  const t = (x: Task) => `- [${x.id}] ${clip(x.title, 60)} (${x.priority}, échéance ${x.dueDate}${x.projectTitle ? `, projet ${clip(x.projectTitle, 30)}` : ''})`;

  lines.push(`DATE DU JOUR : ${weekday} ${toFrDate(now)} (ISO ${now.toISOString().slice(0, 10)}).`);
  const p = s.profile;
  const skills = (p.skills || []).slice(0, 12).map((k) => `${k.name} (${k.level})`).join(', ');
  lines.push(`PROFIL : ${p.name}${p.professionalProfile?.title ? `, ${p.professionalProfile.title}` : ''}${p.city ? `, ${p.city}` : ''}. Compétences : ${skills || 'non renseignées'}.`);
  lines.push(`PROJETS (${s.projects.length}) :\n${s.projects.filter((x) => !x.isArchived).slice(0, 8).map((x) => `- ${clip(x.title, 50)} · ${x.status} · ${x.progress}% · ${x.priority} · fin ${x.endDate}`).join('\n') || '- aucun'}`);
  lines.push(`TÂCHES : ${pending.length} en attente sur ${s.tasks.length}.`);
  lines.push(`En retard (${overdue.length}) :\n${overdue.slice(0, 10).map(t).join('\n') || '- aucune'}`);
  lines.push(`Aujourd'hui (${dueToday.length}) :\n${dueToday.slice(0, 10).map(t).join('\n') || '- aucune'}`);
  lines.push(`Prochains jours (${upcoming.length}) :\n${upcoming.slice(0, 8).map(t).join('\n') || '- aucune'}`);
  lines.push(`NOTES (${s.notes.length}) :\n${s.notes.filter((n) => !n.isArchived).slice(0, 6).map((n) => `- ${clip(n.title, 40)} : ${clip(n.content.replace(/\s+/g, ' '), 80)}`).join('\n') || '- aucune'}`);
  lines.push(`OFFRES D'EMPLOI (${s.jobs.length}) :\n${s.jobs.slice(0, 8).map((j) => `- [${j.id}] ${clip(j.title, 45)} · ${clip(j.company, 25)} · ${j.contract} · ${j.workMode}${j.isFavorite ? ' · ★' : ''}${j.applied ? ' · candidature envoyée' : ''}`).join('\n') || '- aucune'}`);
  lines.push(`FINANCES : solde ${fmtAr(s.currentBalance)}, revenus ${fmtAr(s.totalRevenue)}, dépenses ${fmtAr(s.totalExpense)}, budget mensuel max ${fmtAr(s.financeSettings?.monthlyBudgetMax || 0)}, épargne ${fmtAr(s.financeSettings?.savingsGoalCurrent || 0)}/${fmtAr(s.financeSettings?.savingsGoalTarget || 0)}.`);
  lines.push(`Dernières transactions :\n${s.transactions.slice(0, 5).map((x) => `- ${x.date} ${x.type} ${fmtAr(x.amount)} ${clip(x.title, 35)} (${x.category})`).join('\n') || '- aucune'}`);

  return lines.join('\n').slice(0, 9500);
};

/* -------------------------------------------------------------------------- */
/* Historique → contenus Gemini                                               */
/* -------------------------------------------------------------------------- */

export type GeminiPart = Record<string, unknown>;
export interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }

const attachmentParts = (atts: AssistantAttachment[] = []): GeminiPart[] =>
  atts.map((a) =>
    a.kind === 'image'
      ? { inlineData: { mimeType: a.mimeType, data: a.data } }
      : { text: `[Fichier joint : ${a.name}]\n${a.data}` },
  );

export const toGeminiContents = (messages: AssistantMessage[], limit = 20): GeminiContent[] => {
  const recent = messages.filter((m) => !m.isError && (m.text.trim() || m.attachments?.length)).slice(-limit);
  // Les pièces jointes ne sont renvoyées que pour les derniers messages (poids de la requête)
  const attachFrom = Math.max(0, recent.length - 6);
  const contents: GeminiContent[] = recent.map((m, i) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [
      ...(m.role === 'user' && i >= attachFrom ? attachmentParts(m.attachments) : []),
      { text: m.text || '(pièce jointe)' },
    ],
  }));
  // Gemini exige de commencer par un tour utilisateur
  while (contents.length && contents[0].role !== 'user') contents.shift();
  return contents;
};

/* -------------------------------------------------------------------------- */
/* Client SSE                                                                 */
/* -------------------------------------------------------------------------- */

export interface FunctionCallItem { id: string; name: string; args: Record<string, unknown> }

export type StreamResult =
  | { type: 'ok'; modelParts: GeminiPart[]; functionCalls: FunctionCallItem[] }
  | { type: 'fallback'; reason: string }
  | { type: 'error'; code: 'offline' | 'network' | 'quota' | 'auth' | 'model' | 'timeout' | 'unknown' | 'aborted' };

export const streamAssistant = async (
  contents: GeminiContent[],
  context: string,
  onText: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<StreamResult> => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { type: 'error', code: 'offline' };

  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  let timedOut = false;
  let idle: ReturnType<typeof setTimeout>;
  const arm = (ms: number) => {
    clearTimeout(idle);
    idle = setTimeout(() => { timedOut = true; ctrl.abort(); }, ms);
  };

  try {
    arm(30000);
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, context, tools: true }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { type: 'fallback', reason: `http_${res.status}` };

    const ctype = res.headers.get('content-type') || '';
    if (ctype.includes('application/json')) {
      const data = await res.json().catch(() => ({}));
      return { type: 'fallback', reason: data?.reason || 'json' };
    }
    if (!res.body) return { type: 'fallback', reason: 'no_body' };

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: StreamResult | null = null;

    for (;;) {
      arm(45000);
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        if (!raw.startsWith('data:')) continue;
        try {
          const ev = JSON.parse(raw.slice(5).trim());
          if (ev.type === 'text') onText(String(ev.text || ''));
          else if (ev.type === 'done') finalResult = { type: 'ok', modelParts: ev.modelParts || [], functionCalls: ev.functionCalls || [] };
          else if (ev.type === 'error') finalResult = { type: 'error', code: ev.code || 'unknown' };
        } catch {
          // chunk partiel : ignoré
        }
      }
    }
    return finalResult || { type: 'error', code: 'unknown' };
  } catch {
    if (signal?.aborted) return { type: 'error', code: 'aborted' };
    if (timedOut) return { type: 'error', code: 'timeout' };
    return { type: 'error', code: navigator.onLine === false ? 'offline' : 'network' };
  } finally {
    clearTimeout(idle!);
    signal?.removeEventListener('abort', onAbort);
  }
};

export const errorMessageFor = (code: string): string => {
  switch (code) {
    case 'offline': return "Vous êtes hors-ligne. Je reste disponible en mode local : demandez-moi un bilan, vos tâches en retard ou ouvrez un écran.";
    case 'quota': return "Le quota de l'IA Gemini est atteint pour le moment. Réessayez dans quelques minutes — en attendant, je réponds en mode local.";
    case 'auth': return "La clé API Gemini est refusée. Vérifiez GEMINI_API_KEY dans le fichier .env.local du serveur.";
    case 'model': return "Le modèle Gemini configuré est introuvable. Vérifiez GEMINI_MODEL dans .env.local.";
    case 'timeout': return "L'IA met trop de temps à répondre. Réessayez dans un instant.";
    case 'network': return "Impossible de joindre le serveur de l'IA. Je passe en mode local.";
    default: return "Une erreur est survenue côté IA. Je passe en mode local.";
  }
};

/* -------------------------------------------------------------------------- */
/* Exécuteur d'outils (function calling) — utilise les fonctions d'AppContext */
/* -------------------------------------------------------------------------- */

export interface ToolEnv {
  getState: () => AppSnapshot;
  addTask: (t: Omit<Task, 'id' | 'createdAt'>) => void;
  toggleTask: (id: string) => void;
  updateTask: (id: string, u: Partial<Task>) => void;
  addNote: (n: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addProject: (p: Omit<Project, 'id'>) => void;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  toggleFavoriteJob: (id: string) => void;
  setCurrentTab: (tab: NavigationTab) => void;
}

const tick = (ms = 40) => new Promise<void>((r) => setTimeout(r, ms));
const PRIORITIES = ['Haute', 'Moyenne', 'Basse'] as const;
const CATEGORIES = ['Rapport', 'Présentation', 'Développement', 'Marketing', 'Organisation'] as const;
const SCREENS: Record<string, { tab: NavigationTab; label: string }> = {
  accueil: { tab: 'accueil', label: "l'accueil" }, notes: { tab: 'notes', label: 'les notes' },
  projets: { tab: 'projets', label: 'les projets' }, taches: { tab: 'taches', label: 'les tâches' },
  emplois: { tab: 'emplois', label: 'les emplois' }, finances: { tab: 'finances', label: 'les finances' },
  statistiques: { tab: 'statistiques', label: 'les statistiques' }, parametres: { tab: 'parametres', label: 'les paramètres' },
  notifications: { tab: 'notifications', label: 'les notifications' },
};

const asStr = (v: unknown, max = 500): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T): T =>
  (list as readonly string[]).includes(v as string) ? (v as T) : fallback;

export interface ToolOutcome { response: Record<string, unknown>; action?: AssistantAction }

export const executeTool = async (call: FunctionCallItem, env: ToolEnv): Promise<ToolOutcome> => {
  const a = call.args || {};
  const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const fail = (error: string): ToolOutcome => ({ response: { ok: false, error }, action: { id, tool: call.name, label: error, ok: false } });

  try {
    switch (call.name) {
      case 'create_task': {
        const title = asStr(a.title, 120);
        if (!title) return fail('Titre de tâche manquant.');
        const before = new Set(env.getState().tasks.map((t) => t.id));
        const projectTitle = asStr(a.projectTitle, 80);
        const proj = env.getState().projects.find((p) => p.title.toLowerCase() === projectTitle.toLowerCase());
        const dueDate = normalizeDate(a.dueDate);
        env.addTask({
          title, description: asStr(a.description, 500),
          category: pick(a.category, CATEGORIES, 'Organisation'),
          priority: pick(a.priority, PRIORITIES, 'Moyenne'),
          status: 'À faire', projectTitle: proj?.title || '',
          dueDate, dueTime: /^\d{1,2}:\d{2}$/.test(asStr(a.dueTime, 5)) ? asStr(a.dueTime, 5) : '09:00',
          completed: false,
        });
        await tick();
        const created = env.getState().tasks.find((t) => !before.has(t.id) && t.title === title);
        return {
          response: { ok: true, taskId: created?.id, title, dueDate },
          action: { id, tool: call.name, ok: true, label: `Tâche créée : « ${title} » (échéance ${dueDate})`, undo: created ? { kind: 'task', refId: created.id } : undefined },
        };
      }
      case 'complete_task': {
        const task = env.getState().tasks.find((t) => t.id === asStr(a.taskId, 80));
        if (!task) return fail('Tâche introuvable.');
        if (task.completed) return { response: { ok: true, note: 'déjà terminée' }, action: { id, tool: call.name, ok: true, label: `« ${task.title} » était déjà terminée` } };
        env.toggleTask(task.id);
        return { response: { ok: true, title: task.title }, action: { id, tool: call.name, ok: true, label: `Tâche terminée : « ${task.title} »`, undo: { kind: 'toggle-task', refId: task.id } } };
      }
      case 'update_task': {
        const task = env.getState().tasks.find((t) => t.id === asStr(a.taskId, 80));
        if (!task) return fail('Tâche introuvable.');
        const updates: Partial<Task> = {};
        const prev: Record<string, unknown> = {};
        const set = <K extends keyof Task>(k: K, v: Task[K]) => { prev[k] = task[k]; updates[k] = v; };
        if (asStr(a.title, 120)) set('title', asStr(a.title, 120));
        if (typeof a.description === 'string') set('description', asStr(a.description, 500));
        if (PRIORITIES.includes(a.priority as typeof PRIORITIES[number])) set('priority', a.priority as Task['priority']);
        if (a.status === 'À faire' || a.status === 'En cours') { set('status', a.status); set('completed', false); }
        if (a.dueDate) set('dueDate', normalizeDate(a.dueDate));
        if (/^\d{1,2}:\d{2}$/.test(asStr(a.dueTime, 5))) set('dueTime', asStr(a.dueTime, 5));
        if (!Object.keys(updates).length) return fail('Aucune modification valide.');
        env.updateTask(task.id, updates);
        return { response: { ok: true, updated: Object.keys(updates) }, action: { id, tool: call.name, ok: true, label: `Tâche modifiée : « ${updates.title || task.title} » (${Object.keys(updates).join(', ')})`, undo: { kind: 'update-task', refId: task.id, prev } } };
      }
      case 'create_note': {
        const title = asStr(a.title, 120);
        if (!title) return fail('Titre de note manquant.');
        const before = new Set(env.getState().notes.map((n) => n.id));
        env.addNote({ title, content: asStr(a.content, 4000), isFavorite: false, isPinned: false, isArchived: false, category: asStr(a.category, 40) || 'Idées' });
        await tick();
        const created = env.getState().notes.find((n) => !before.has(n.id) && n.title === title);
        return { response: { ok: true, noteId: created?.id }, action: { id, tool: call.name, ok: true, label: `Note créée : « ${title} »`, undo: created ? { kind: 'note', refId: created.id } : undefined } };
      }
      case 'create_project': {
        const title = asStr(a.title, 120);
        if (!title) return fail('Titre de projet manquant.');
        const before = new Set(env.getState().projects.map((p) => p.id));
        const start = normalizeDate(a.startDate);
        const end = normalizeDate(a.endDate, new Date(Date.now() + 30 * 86400000));
        env.addProject({ title, description: asStr(a.description, 600), startDate: start, endDate: end, priority: pick(a.priority, PRIORITIES, 'Moyenne'), status: 'À faire', progress: 0, tasks: [], category: asStr(a.category, 40) || 'Général' });
        await tick();
        const created = env.getState().projects.find((p) => !before.has(p.id) && p.title === title);
        return { response: { ok: true, projectId: created?.id }, action: { id, tool: call.name, ok: true, label: `Projet créé : « ${title} » (${start} → ${end})`, undo: created ? { kind: 'project', refId: created.id } : undefined } };
      }
      case 'create_transaction': {
        const title = asStr(a.title, 120);
        const amount = Math.abs(Number(a.amount));
        if (!title || !Number.isFinite(amount) || amount <= 0) return fail('Transaction invalide (libellé ou montant).');
        const type = a.type === 'Revenu' ? 'Revenu' : 'Dépense';
        const before = new Set(env.getState().transactions.map((t) => t.id));
        env.addTransaction({ title, type, amount, category: asStr(a.category, 40) || (type === 'Revenu' ? 'Revenu' : 'Autres'), date: normalizeDate(a.date), source: 'Assistant IA' });
        await tick();
        const created = env.getState().transactions.find((t) => !before.has(t.id) && t.title === title);
        return { response: { ok: true, transactionId: created?.id, newBalance: env.getState().currentBalance }, action: { id, tool: call.name, ok: true, label: `${type} enregistré(e) : ${fmtAr(amount)} — ${title}`, undo: created ? { kind: 'transaction', refId: created.id } : undefined } };
      }
      case 'navigate': {
        const target = SCREENS[asStr(a.screen, 20)];
        if (!target) return fail('Écran inconnu.');
        env.setCurrentTab(target.tab);
        return { response: { ok: true, screen: target.tab }, action: { id, tool: call.name, ok: true, label: `Ouverture de ${target.label}` } };
      }
      case 'favorite_job': {
        const job = env.getState().jobs.find((j) => j.id === asStr(a.jobId, 80));
        if (!job) return fail('Offre introuvable.');
        env.toggleFavoriteJob(job.id);
        return { response: { ok: true, title: job.title, favorite: !job.isFavorite }, action: { id, tool: call.name, ok: true, label: `${job.isFavorite ? 'Retirée des' : 'Ajoutée aux'} favoris : « ${job.title} »`, undo: { kind: 'favorite-job', refId: job.id } } };
      }
      case 'get_summary': {
        const s = env.getState();
        const b = buildBriefing(s);
        return { response: { ok: true, tachesEnAttente: b.pendingCount, enRetard: b.overdue.map((t) => ({ id: t.id, titre: t.title, echeance: t.dueDate })), aujourdhui: b.dueToday.map((t) => ({ id: t.id, titre: t.title })), projets: s.projects.map((p) => ({ titre: p.title, statut: p.status, avancement: p.progress })), solde: s.currentBalance, revenus: s.totalRevenue, depenses: s.totalExpense, offresPourProfil: b.jobs.map((x) => ({ id: x.job.id, titre: x.job.title })) } };
      }
      default:
        return fail(`Outil inconnu : ${call.name}`);
    }
  } catch (e) {
    return fail(`Échec de l'action (${(e as Error)?.message || 'erreur'}).`);
  }
};

/* -------------------------------------------------------------------------- */
/* Fallback local amélioré (sans clé API / hors-ligne)                        */
/* -------------------------------------------------------------------------- */

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const localReply = async (text: string, env: ToolEnv): Promise<{ text: string; actions: AssistantAction[] }> => {
  const s = env.getState();
  const q = norm(text);
  const b = buildBriefing(s);
  const actions: AssistantAction[] = [];
  const list = (ts: Task[]) => ts.slice(0, 6).map((t) => `- **${t.title}** (${t.priority}, ${t.dueDate})`).join('\n');

  // Commandes simples exécutables sans IA
  const taskCmd = text.match(/(?:ajoute|cree|crée|creer|créer|nouvelle)\s+(?:une\s+)?t[aâ]che\s*[:\-]?\s*(.+)/i);
  if (taskCmd?.[1]) {
    const out = await executeTool({ id: 'local', name: 'create_task', args: { title: taskCmd[1].trim() } }, env);
    if (out.action) actions.push(out.action);
    return { text: `C'est fait. Je suis en mode local (sans IA en ligne), mais j'ai pu créer la tâche.`, actions };
  }
  const noteCmd = text.match(/(?:note|crée une note|cree une note|ajoute une note)\s*[:\-]\s*(.+)/i);
  if (noteCmd?.[1]) {
    const out = await executeTool({ id: 'local', name: 'create_note', args: { title: noteCmd[1].trim().slice(0, 60), content: noteCmd[1].trim() } }, env);
    if (out.action) actions.push(out.action);
    return { text: 'Note enregistrée.', actions };
  }
  const nav = Object.keys(SCREENS).find((k) => new RegExp(`(ouvre|va|affiche|aller).*${k.replace(/s$/, '')}`).test(q));
  if (nav) {
    const out = await executeTool({ id: 'local', name: 'navigate', args: { screen: nav } }, env);
    if (out.action) actions.push(out.action);
    return { text: `Je vous emmène vers ${SCREENS[nav].label}.`, actions };
  }

  if (/(retard)/.test(q)) {
    return { text: b.overdue.length ? `Vous avez **${b.overdue.length} tâche(s) en retard** :\n${list(b.overdue)}\n\nJe vous conseille de traiter d'abord la plus prioritaire, puis de replanifier le reste.` : "Aucune tâche en retard, bravo ! 🎉", actions };
  }
  if (/(aujourd|jour|briefing|bilan|resume|résume|activit)/.test(q)) {
    const jobs = b.jobs.length ? `\n\n**Offres adaptées :** ${b.jobs.map((x) => x.job.title).join(', ')}.` : '';
    return { text: `**Briefing du jour**\n- Tâches du jour : **${b.dueToday.length}**\n- En retard : **${b.overdue.length}**\n- En attente au total : **${b.pendingCount}**\n- Solde : **${fmtAr(b.balance)}**${jobs}${b.dueToday.length ? `\n\n${list(b.dueToday)}` : ''}`, actions };
  }
  if (/(finance|budget|argent|solde|depense|dépense|revenu)/.test(q)) {
    return { text: `Votre solde est de **${fmtAr(s.currentBalance)}** (revenus ${fmtAr(s.totalRevenue)}, dépenses ${fmtAr(s.totalExpense)}).${b.budgetMax ? ` Budget mensuel max : ${fmtAr(b.budgetMax)}.` : ''}`, actions };
  }
  if (/(emploi|offre|job|travail|poste)/.test(q)) {
    return { text: b.jobs.length ? `Offres qui correspondent à votre profil :\n${b.jobs.map((x) => `- **${x.job.title}** — ${x.job.company} (${x.job.workMode})`).join('\n')}` : "Je n'ai pas trouvé d'offre clairement adaptée à votre profil pour l'instant.", actions };
  }
  if (/(projet)/.test(q)) {
    const ps = s.projects.filter((p) => !p.isArchived).slice(0, 6);
    return { text: ps.length ? `Vos projets :\n${ps.map((p) => `- **${p.title}** — ${p.progress}% (${p.status})`).join('\n')}` : "Vous n'avez aucun projet pour l'instant. Dites « crée un projet … » quand l'IA en ligne est disponible.", actions };
  }
  if (/(bonjour|salut|coucou|hello|hey)/.test(q)) {
    return { text: `Bonjour ${s.profile.name?.split(' ')[0] || ''} ! Vous avez ${b.dueToday.length} tâche(s) aujourd'hui et ${b.overdue.length} en retard. Que souhaitez-vous faire ?`, actions };
  }
  return { text: "Je suis en **mode local** (IA en ligne indisponible). Je peux : donner un briefing, lister vos tâches en retard, résumer vos finances ou projets, créer une tâche (« crée une tâche : … »), créer une note (« note : … ») ou ouvrir un écran.", actions };
};
