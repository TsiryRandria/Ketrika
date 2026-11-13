import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, type Tool } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;

async function startServer() {
  const app = express();

  // ---------------------------------------------------------------------------
  // Assistant IA : proxy Gemini côté serveur (multi-tours, function calling, SSE)
  // ---------------------------------------------------------------------------
  const str = (description: string) => ({ type: Type.STRING, description });
  const assistantTools: Tool[] = [
    {
      functionDeclarations: [
        {
          name: 'create_task',
          description: "Crée une nouvelle tâche pour l'utilisateur.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              title: str('Titre court de la tâche'),
              description: str('Description facultative'),
              priority: { type: Type.STRING, enum: ['Haute', 'Moyenne', 'Basse'], description: 'Priorité' },
              category: { type: Type.STRING, enum: ['Rapport', 'Présentation', 'Développement', 'Marketing', 'Organisation'], description: 'Catégorie' },
              dueDate: str("Échéance au format AAAA-MM-JJ (utilise la date du jour fournie dans le contexte pour « demain », « vendredi »…)"),
              dueTime: str('Heure HH:MM, facultatif'),
              projectTitle: str("Titre exact d'un projet existant, facultatif"),
            },
            required: ['title'],
          },
        },
        {
          name: 'complete_task',
          description: "Marque une tâche comme terminée (ou la rouvre) à partir de son identifiant (voir le contexte).",
          parameters: { type: Type.OBJECT, properties: { taskId: str('Identifiant de la tâche') }, required: ['taskId'] },
        },
        {
          name: 'update_task',
          description: 'Modifie une tâche existante (titre, priorité, échéance, statut…).',
          parameters: {
            type: Type.OBJECT,
            properties: {
              taskId: str('Identifiant de la tâche'),
              title: str('Nouveau titre'),
              description: str('Nouvelle description'),
              priority: { type: Type.STRING, enum: ['Haute', 'Moyenne', 'Basse'] },
              status: { type: Type.STRING, enum: ['À faire', 'En cours'] },
              dueDate: str('Nouvelle échéance AAAA-MM-JJ'),
              dueTime: str('Nouvelle heure HH:MM'),
            },
            required: ['taskId'],
          },
        },
        {
          name: 'create_note',
          description: 'Crée une note.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              title: str('Titre de la note'),
              content: str('Contenu de la note'),
              category: str('Catégorie, ex. Idées, Travail, Personnel'),
            },
            required: ['title', 'content'],
          },
        },
        {
          name: 'create_project',
          description: 'Crée un nouveau projet.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              title: str('Titre du projet'),
              description: str('Description'),
              priority: { type: Type.STRING, enum: ['Haute', 'Moyenne', 'Basse'] },
              category: str('Catégorie'),
              startDate: str('Début AAAA-MM-JJ'),
              endDate: str('Fin AAAA-MM-JJ'),
            },
            required: ['title'],
          },
        },
        {
          name: 'create_transaction',
          description: 'Enregistre un revenu ou une dépense (montants en Ariary).',
          parameters: {
            type: Type.OBJECT,
            properties: {
              title: str('Libellé'),
              type: { type: Type.STRING, enum: ['Revenu', 'Dépense'] },
              amount: { type: Type.NUMBER, description: 'Montant positif en Ar' },
              category: str('Catégorie, ex. Alimentation, Transport, Salaire'),
              date: str('Date AAAA-MM-JJ, par défaut aujourd’hui'),
            },
            required: ['title', 'type', 'amount'],
          },
        },
        {
          name: 'navigate',
          description: "Ouvre un écran de l'application.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              screen: { type: Type.STRING, enum: ['accueil', 'notes', 'projets', 'taches', 'emplois', 'finances', 'statistiques', 'parametres', 'notifications'] },
            },
            required: ['screen'],
          },
        },
        {
          name: 'favorite_job',
          description: "Ajoute ou retire une offre d'emploi des favoris à partir de son identifiant.",
          parameters: { type: Type.OBJECT, properties: { jobId: str("Identifiant de l'offre") }, required: ['jobId'] },
        },
        {
          name: 'get_summary',
          description: "Renvoie un bilan chiffré à jour (tâches, projets, finances, offres) pour répondre précisément.",
          parameters: {
            type: Type.OBJECT,
            properties: { scope: { type: Type.STRING, enum: ['tout', 'taches', 'projets', 'finances', 'emplois'] } },
          },
        },
      ],
    },
  ];

  const SYSTEM_INSTRUCTION = `Tu es Ketrika IA, l'assistant personnel intégré à l'application de productivité Ketrika (style Jarvis).
- Réponds toujours en français, de façon concise, chaleureuse et proactive.
- Pour agir (créer/terminer/modifier une tâche, créer une note, un projet, une transaction, ouvrir un écran, mettre une offre en favori), utilise les outils fournis plutôt que de décrire l'action.
- Tu ne peux JAMAIS supprimer de données. Si on te le demande, explique que l'utilisateur doit le faire lui-même dans l'écran concerné.
- N'invente jamais d'identifiants : utilise ceux du contexte, ou appelle get_summary si tu en as besoin.
- Après une action, confirme en une phrase. Reste bref : quelques lignes, listes courtes, markdown léger (gras, listes, code).
- Les montants sont en Ariary (Ar). Utilise la date du jour du contexte pour interpréter les dates relatives.`;

  const sse = (res: express.Response, payload: unknown) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const classifyError = (err: any): string => {
    const msg = String(err?.message || err || '').toLowerCase();
    const status = Number(err?.status || err?.code || 0);
    if (status === 429 || msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('rate')) return 'quota';
    if (status === 401 || status === 403 || msg.includes('api key') || msg.includes('permission')) return 'auth';
    if (status === 404 || msg.includes('not found') || msg.includes('model')) return 'model';
    if (msg.includes('fetch failed') || msg.includes('enotfound') || msg.includes('econn') || msg.includes('network')) return 'network';
    return 'unknown';
  };

  // Le parseur JSON de cette route est déclaré avant le parseur global (limite 100 ko) pour accepter les pièces jointes.
  app.post('/api/assistant', express.json({ limit: '14mb' }), async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json({ fallback: true, reason: 'no_key' });
      return;
    }

    const body = req.body || {};
    // Compatibilité avec l'ancien format { message, context }
    const rawContents = Array.isArray(body.contents)
      ? body.contents
      : [{ role: 'user', parts: [{ text: String(body.message || '') }] }];
    const contents = rawContents.slice(-60);
    const context = typeof body.context === 'string' ? body.context.slice(0, 12000) : '';
    const useTools = body.tools !== false;
    const model = process.env.GEMINI_MODEL || 'gemini-3.7-flash';

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let aborted = false;
    res.on('close', () => { aborted = true; });

    try {
      const ai = new GoogleGenAI({ apiKey });
      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${context}`,
          temperature: 0.7,
          ...(useTools ? { tools: assistantTools } : {}),
        },
      });

      const modelParts: any[] = [];
      const calls: { id: string; name: string; args: Record<string, unknown> }[] = [];

      for await (const chunk of stream) {
        if (aborted) break;
        const parts = chunk.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          modelParts.push(part);
          if (part.functionCall?.name) {
            calls.push({
              id: part.functionCall.id || `call-${Date.now()}-${calls.length}`,
              name: part.functionCall.name,
              args: (part.functionCall.args as Record<string, unknown>) || {},
            });
          } else if (typeof part.text === 'string' && part.text && !part.thought) {
            sse(res, { type: 'text', text: part.text });
          }
        }
      }

      if (!aborted) {
        sse(res, { type: 'done', modelParts, functionCalls: calls });
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      if (!aborted) sse(res, { type: 'error', code: classifyError(error) });
    } finally {
      res.end();
    }
  });

  app.use(express.json());

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ketrika server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
