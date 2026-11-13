import express, { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  AssistantAttachmentPayload,
  EXPRESS_JSON_LIMIT,
  MAX_ATTACHMENT_COUNT,
  MAX_FILE_BASE64_BYTES,
  MAX_FILE_BYTES,
  MAX_TOTAL_ENCODED_BYTES,
  MAX_TOTAL_RAW_BYTES,
  detectAttachmentKind,
  estimateDecodedBase64Bytes,
  formatBytesFr,
} from './src/shared/attachmentLimits.ts';
import {
  ProjectSummaryForValidation,
  validateProjectAiFunctionCall,
} from './src/shared/projectDateValidation.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local first (higher priority) then .env, without overriding existing runtime env vars
for (const envFile of ['.env.local', '.env']) {
  const envPath = path.resolve(__dirname, envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const isProduction = process.env.NODE_ENV === 'production';
const isManagedContainer = Boolean(
  process.env.K_SERVICE || process.env.CLOUD_RUN_TIMEOUT_SECONDS
);
const PORT = 3000;
const HOST = process.env.HOST?.trim() || (isManagedContainer ? '0.0.0.0' : '127.0.0.1');
const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

const MAX_MESSAGE_CHARS = 8000;
const MAX_CONTEXT_CHARS = 8000;
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 15;
const RATE_LIMIT_GLOBAL_MAX_REQUESTS = Number(process.env.RATE_LIMIT_GLOBAL_MAX_REQUESTS) || 60;

const JARVIS_PROJECT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'create_project',
        description:
          "Crée un nouveau projet Ketrika lorsque l'utilisateur le demande explicitement. Les dates doivent être au format AAAA-MM-JJ ou JJ/MM/AAAA et la date de fin doit être postérieure ou égale à la date de début.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Titre du projet',
            },
            description: {
              type: Type.STRING,
              description: 'Description détaillée du projet',
            },
            startDate: {
              type: Type.STRING,
              description: 'Date de début au format AAAA-MM-JJ ou JJ/MM/AAAA',
            },
            endDate: {
              type: Type.STRING,
              description: "Date d'échéance (fin) au format AAAA-MM-JJ ou JJ/MM/AAAA, >= startDate",
            },
            priority: {
              type: Type.STRING,
              description: 'Priorité : Haute, Moyenne ou Basse',
            },
            category: {
              type: Type.STRING,
              description: 'Catégorie du projet',
            },
          },
          required: ['title', 'startDate', 'endDate'],
        },
      },
      {
        name: 'update_project',
        description:
          "Modifie un projet Ketrika existant lorsque l'utilisateur le demande explicitement. Les dates fournies doivent être au format AAAA-MM-JJ ou JJ/MM/AAAA et respecter endDate >= startDate.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            projectId: {
              type: Type.STRING,
              description: 'Identifiant du projet existant (si connu)',
            },
            projectTitle: {
              type: Type.STRING,
              description: 'Titre du projet existant à modifier',
            },
            title: {
              type: Type.STRING,
              description: 'Nouveau titre du projet',
            },
            description: {
              type: Type.STRING,
              description: 'Nouvelle description du projet',
            },
            startDate: {
              type: Type.STRING,
              description: 'Nouvelle date de début au format AAAA-MM-JJ ou JJ/MM/AAAA',
            },
            endDate: {
              type: Type.STRING,
              description: "Nouvelle date d'échéance (fin) au format AAAA-MM-JJ ou JJ/MM/AAAA",
            },
            priority: {
              type: Type.STRING,
              description: 'Nouvelle priorité : Haute, Moyenne ou Basse',
            },
            status: {
              type: Type.STRING,
              description: 'Nouveau statut : En cours, À faire ou Terminé',
            },
            category: {
              type: Type.STRING,
              description: 'Nouvelle catégorie',
            },
          },
        },
      },
    ],
  },
];

// Build strict origin allowlist
function buildAllowedOrigins(): Set<string> {
  const allowed = new Set<string>([
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`,
    `http://[::1]:${PORT}`,
  ]);

  const candidates = [
    process.env.APP_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;
    try {
      allowed.add(new URL(trimmed).origin);
    } catch {
      // Ignore malformed origin entries
    }
  }

  return allowed;
}

const allowedOrigins = buildAllowedOrigins();

function normalizeOrigin(rawOrigin?: string | null): string | null {
  if (!rawOrigin || rawOrigin === 'null') return null;
  try {
    const parsed = new URL(rawOrigin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function getRequestSelfOrigin(req: Request): string | null {
  const rawHost =
    (isManagedContainer ? req.get('x-forwarded-host') : undefined) || req.get('host');
  if (!rawHost) return null;

  const host = rawHost.split(',')[0].trim();
  // Reject malformed Host headers
  if (!/^[a-zA-Z0-9.-]+(:\d{1,5})?$/.test(host)) return null;

  const rawProto =
    (isManagedContainer ? req.get('x-forwarded-proto') : undefined) || req.protocol || 'http';
  const proto = rawProto.split(',')[0].trim().toLowerCase();
  if (proto !== 'http' && proto !== 'https') return null;

  return normalizeOrigin(`${proto}://${host}`);
}

function isOriginAuthorized(req: Request): { ok: boolean; origin: string | null } {
  const secFetchSite = req.get('sec-fetch-site')?.trim().toLowerCase();
  if (secFetchSite === 'cross-site') {
    return { ok: false, origin: null };
  }

  const origin = normalizeOrigin(req.get('origin'));
  if (!origin) {
    return { ok: false, origin: null };
  }

  if (allowedOrigins.has(origin)) {
    return { ok: true, origin };
  }

  const selfOrigin = getRequestSelfOrigin(req);
  if (selfOrigin && origin === selfOrigin) {
    return { ok: true, origin };
  }

  return { ok: false, origin };
}

function redactSensitiveData(input: unknown, activeApiKey?: string): string {
  let message =
    input instanceof Error
      ? `${input.name}: ${input.message}`
      : typeof input === 'string'
        ? input
        : 'Unknown error';

  if (activeApiKey) {
    message = message.split(activeApiKey).join('[REDACTED_KEY]');
  }

  return message
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_GOOGLE_KEY]')
    .replace(/AQ\.[0-9A-Za-z._-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/([?&](?:key|api_key|token)=)[^&\s"']+/gi, '$1[REDACTED]')
    .replace(/(x-goog-api-key\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]');
}

// In-memory sliding/fixed-window rate limiter (per IP + global quota protection)
interface RateBucket {
  count: number;
  resetAt: number;
}

const ipBuckets = new Map<string, RateBucket>();
let globalBucket: RateBucket = { count: 0, resetAt: Date.now() + RATE_LIMIT_WINDOW_MS };

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of ipBuckets.entries()) {
    if (bucket.resetAt <= now) {
      ipBuckets.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS);
cleanupTimer.unref();

function getClientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function consumeRateLimit(
  bucket: RateBucket,
  limit: number,
  now: number
): { allowed: boolean; remaining: number; resetAt: number } {
  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  return {
    allowed: bucket.count <= limit,
    remaining,
    resetAt: bucket.resetAt,
  };
}

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const clientKey = getClientKey(req);

  let ipBucket = ipBuckets.get(clientKey);
  if (!ipBucket || ipBucket.resetAt <= now) {
    ipBucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    ipBuckets.set(clientKey, ipBucket);
  }

  const ipResult = consumeRateLimit(ipBucket, RATE_LIMIT_MAX_REQUESTS, now);
  const globalResult = consumeRateLimit(globalBucket, RATE_LIMIT_GLOBAL_MAX_REQUESTS, now);

  const effectiveRemaining = Math.min(ipResult.remaining, globalResult.remaining);
  const effectiveResetAt = Math.max(ipResult.resetAt, globalResult.resetAt);
  const retryAfterSeconds = Math.max(1, Math.ceil((effectiveResetAt - now) / 1000));

  res.setHeader('RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
  res.setHeader('RateLimit-Remaining', String(effectiveRemaining));
  res.setHeader('RateLimit-Reset', String(Math.ceil(effectiveResetAt / 1000)));

  if (!ipResult.allowed || !globalResult.allowed) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      error: 'Limite de requêtes atteinte. Veuillez patienter avant de réessayer.',
      retryAfterSeconds,
      reply: null,
      fallback: true,
    });
    return;
  }

  next();
}

function isPlaceholderKey(apiKey?: string): boolean {
  if (!apiKey) return true;
  const normalized = apiKey.trim();
  return (
    !normalized ||
    normalized === 'MY_GEMINI_API_KEY' ||
    normalized === 'your_gemini_api_key_here'
  );
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', isManagedContainer ? 1 : false);

  // Baseline security headers for API routes (keep framing compatible with AI Studio preview)
  app.use('/api', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'no-store');

    const { ok, origin } = isOriginAuthorized(req);

    if (req.method === 'OPTIONS') {
      if (!ok || !origin) {
        res.status(403).json({ error: 'Origine non autorisée.', reply: null, fallback: true });
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '600');
      res.status(204).end();
      return;
    }

    if (!ok || !origin) {
      res.status(403).json({
        error: 'Origine de requête non autorisée.',
        reply: null,
        fallback: true,
      });
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    next();
  });

  app.use('/api', express.json({ limit: EXPRESS_JSON_LIMIT }));

  // Safe JSON body parse / size error handler (never leaks internals)
  app.use('/api', (err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err?.type === 'entity.too.large') {
      res.status(413).json({
        error: `La requête dépasse la limite maximale du serveur (${formatBytesFr(MAX_TOTAL_RAW_BYTES)} brut / ~${formatBytesFr(MAX_TOTAL_ENCODED_BYTES)} encodé en Base64 au total).`,
        reply: null,
        fallback: true,
      });
      return;
    }
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Corps JSON invalide.', reply: null, fallback: true });
      return;
    }
    next(err);
  });

  app.all('/api/assistant', (req, res, next) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      res.status(405).json({ error: 'Méthode non autorisée.', reply: null, fallback: true });
      return;
    }
    if (!req.is('application/json')) {
      res.status(415).json({
        error: 'Content-Type application/json requis.',
        reply: null,
        fallback: true,
      });
      return;
    }
    next();
  });

  // Server-side Gemini API proxy route (keeps GEMINI_API_KEY exclusively on the server)
  app.post('/api/assistant', rateLimitMiddleware, async (req, res) => {
    const rawKey = process.env.GEMINI_API_KEY?.trim();

    try {
      const { message, context, stream, tools, attachments, projectsContext } = req.body ?? {};
      const hasMessage = typeof message === 'string' && message.trim().length > 0;
      const rawAttachments: unknown[] = Array.isArray(attachments) ? attachments : [];
      const parsedProjectsContext: ProjectSummaryForValidation[] = Array.isArray(projectsContext)
        ? projectsContext
            .slice(0, 100)
            .filter((p): p is ProjectSummaryForValidation => Boolean(p && typeof p === 'object'))
            .map((p) => ({
              id: typeof p.id === 'string' ? p.id : '',
              title: typeof p.title === 'string' ? p.title : '',
              startDate: typeof p.startDate === 'string' ? p.startDate : '',
              endDate: typeof p.endDate === 'string' ? p.endDate : '',
            }))
        : [];

      if (attachments !== undefined && !Array.isArray(attachments)) {
        res.status(400).json({ error: 'Format de pièces jointes invalide.', reply: null, fallback: true });
        return;
      }

      if (!hasMessage && rawAttachments.length === 0) {
        res.status(400).json({ error: 'Message ou pièce jointe requis.', reply: null, fallback: true });
        return;
      }

      if (typeof message === 'string' && message.length > MAX_MESSAGE_CHARS) {
        res.status(400).json({ error: 'Message trop long.', reply: null, fallback: true });
        return;
      }

      if (context !== undefined && (typeof context !== 'string' || context.length > MAX_CONTEXT_CHARS)) {
        res.status(400).json({ error: 'Contexte invalide ou trop long.', reply: null, fallback: true });
        return;
      }

      if (tools !== undefined && (!Array.isArray(tools) || tools.length > 20)) {
        res.status(400).json({ error: 'Outils invalides.', reply: null, fallback: true });
        return;
      }

      if (rawAttachments.length > MAX_ATTACHMENT_COUNT) {
        res.status(413).json({
          error: `Nombre maximum de pièces jointes dépassé (${rawAttachments.length}/${MAX_ATTACHMENT_COUNT}).`,
          reply: null,
          fallback: true,
        });
        return;
      }

      const validatedAttachments: AssistantAttachmentPayload[] = [];
      let totalRawBytes = 0;
      let totalEncodedBytes = 0;

      for (const item of rawAttachments) {
        if (!item || typeof item !== 'object') {
          res.status(400).json({ error: 'Pièce jointe invalide.', reply: null, fallback: true });
          return;
        }

        const candidate = item as Partial<AssistantAttachmentPayload>;
        const fileName = typeof candidate.name === 'string' && candidate.name.trim()
          ? candidate.name.trim().slice(0, 180)
          : 'fichier';
        const mimeType = typeof candidate.mimeType === 'string' ? candidate.mimeType.trim() : '';
        const detected = detectAttachmentKind(fileName, mimeType);

        if (!detected || (candidate.kind !== 'image' && candidate.kind !== 'text') || detected.kind !== candidate.kind) {
          res.status(400).json({
            error: `Type de fichier non pris en charge pour "${fileName}". Formats acceptés : images (PNG, JPG, WEBP, GIF) et fichiers texte.`,
            reply: null,
            fallback: true,
          });
          return;
        }

        if (candidate.kind === 'image') {
          if (!ALLOWED_IMAGE_MIME_TYPES.has(detected.normalizedMime)) {
            res.status(400).json({
              error: `Format d'image non pris en charge pour "${fileName}".`,
              reply: null,
              fallback: true,
            });
            return;
          }

          if (typeof candidate.base64Data !== 'string' || !candidate.base64Data.trim()) {
            res.status(400).json({
              error: `Contenu image manquant pour "${fileName}".`,
              reply: null,
              fallback: true,
            });
            return;
          }

          const cleanBase64 = candidate.base64Data.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
          if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)) {
            res.status(400).json({
              error: `Encodage Base64 invalide pour "${fileName}".`,
              reply: null,
              fallback: true,
            });
            return;
          }

          const encodedBytes = Buffer.byteLength(cleanBase64, 'utf8');
          const decodedBytes = estimateDecodedBase64Bytes(cleanBase64);

          if (decodedBytes > MAX_FILE_BYTES || encodedBytes > MAX_FILE_BASE64_BYTES) {
            res.status(413).json({
              error: `Le fichier "${fileName}" dépasse la limite autorisée par fichier (${formatBytesFr(MAX_FILE_BYTES)} brut / ~${formatBytesFr(MAX_FILE_BASE64_BYTES)} en Base64).`,
              reply: null,
              fallback: true,
            });
            return;
          }

          totalRawBytes += decodedBytes;
          totalEncodedBytes += encodedBytes;

          validatedAttachments.push({
            id: typeof candidate.id === 'string' ? candidate.id : `att-${validatedAttachments.length}`,
            name: fileName,
            mimeType: detected.normalizedMime,
            kind: 'image',
            rawSize: decodedBytes,
            base64Data: cleanBase64,
          });
        } else {
          if (typeof candidate.textContent !== 'string') {
            res.status(400).json({
              error: `Contenu texte manquant pour "${fileName}".`,
              reply: null,
              fallback: true,
            });
            return;
          }

          const rawTextBytes = Buffer.byteLength(candidate.textContent, 'utf8');
          const encodedTextBytes = Buffer.byteLength(JSON.stringify(candidate.textContent), 'utf8');

          if (rawTextBytes > MAX_FILE_BYTES || encodedTextBytes > MAX_FILE_BASE64_BYTES) {
            res.status(413).json({
              error: `Le fichier texte "${fileName}" dépasse la limite autorisée par fichier (${formatBytesFr(MAX_FILE_BYTES)}).`,
              reply: null,
              fallback: true,
            });
            return;
          }

          totalRawBytes += rawTextBytes;
          totalEncodedBytes += encodedTextBytes;

          validatedAttachments.push({
            id: typeof candidate.id === 'string' ? candidate.id : `att-${validatedAttachments.length}`,
            name: fileName,
            mimeType: detected.normalizedMime,
            kind: 'text',
            rawSize: rawTextBytes,
            textContent: candidate.textContent,
          });
        }

        if (totalRawBytes > MAX_TOTAL_RAW_BYTES || totalEncodedBytes > MAX_TOTAL_ENCODED_BYTES) {
          res.status(413).json({
            error: `La taille totale des pièces jointes (${formatBytesFr(totalRawBytes)} brut / ${formatBytesFr(totalEncodedBytes)} encodé) dépasse la limite du serveur (${formatBytesFr(MAX_TOTAL_RAW_BYTES)} brut / ~${formatBytesFr(MAX_TOTAL_ENCODED_BYTES)} encodé).`,
            reply: null,
            fallback: true,
          });
          return;
        }
      }

      const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

      if (isPlaceholderKey(rawKey)) {
        res.json({ reply: null, fallback: true });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: rawKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const config: Record<string, unknown> = {};
      if (typeof context === 'string' && context.trim()) {
        config.systemInstruction = context.trim();
      }
      if (Array.isArray(tools) && tools.length > 0) {
        config.tools = tools;
      } else {
        config.tools = JARVIS_PROJECT_TOOLS;
      }

      const userText = hasMessage
        ? message.trim()
        : 'Analyse ces pièces jointes et aide-moi en conséquence.';

      let contents: unknown = userText;
      if (validatedAttachments.length > 0) {
        const parts: Array<Record<string, unknown>> = [{ text: userText }];
        for (const att of validatedAttachments) {
          if (att.kind === 'image' && att.base64Data) {
            parts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: att.base64Data,
              },
            });
          } else if (att.kind === 'text' && att.textContent !== undefined) {
            parts.push({
              text: `\n[Pièce jointe texte : ${att.name} (${att.mimeType}, ${formatBytesFr(att.rawSize)})]\n${att.textContent}`,
            });
          }
        }
        contents = [{ role: 'user', parts }];
      }

      const requestParams = {
        model,
        contents: contents as any,
        ...(Object.keys(config).length > 0 ? { config } : {}),
      };

      const validateFunctionCallsBatch = (
        calls: Array<{ name?: string; args?: Record<string, unknown> }> | undefined
      ) => {
        if (!calls || calls.length === 0) return { valid: true as const, calls: [] };
        const normalizedCalls: Array<{ name?: string; args?: Record<string, unknown> }> = [];
        for (const call of calls) {
          if (call.name === 'create_project' || call.name === 'update_project') {
            const check = validateProjectAiFunctionCall(
              call.name,
              call.args,
              parsedProjectsContext
            );
            if (!check.valid) {
              return { valid: false as const, error: check.error || 'Dates de projet invalides.' };
            }
            normalizedCalls.push({
              ...call,
              args: check.normalizedArgs ?? call.args,
            });
          } else {
            normalizedCalls.push(call);
          }
        }
        return { valid: true as const, calls: normalizedCalls };
      };

      const wantsStream =
        stream === true || req.accepts(['json', 'text/event-stream']) === 'text/event-stream';

      if (wantsStream) {
        const responseStream = await ai.models.generateContentStream(requestParams);

        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();

        let clientClosed = false;
        res.on('close', () => {
          if (!res.writableEnded) {
            clientClosed = true;
          }
        });

        for await (const chunk of responseStream) {
          if (clientClosed) break;
          const payload: Record<string, unknown> = {};
          if (chunk.text) payload.text = chunk.text;
          if (chunk.functionCalls && chunk.functionCalls.length > 0) {
            const fcValidation = validateFunctionCallsBatch(
              chunk.functionCalls as Array<{ name?: string; args?: Record<string, unknown> }>
            );
            if (!fcValidation.valid) {
              res.write(
                `event: error\ndata: ${JSON.stringify({
                  error: fcValidation.error,
                  fallback: false,
                })}\n\n`
              );
              res.end();
              return;
            }
            payload.functionCalls = fcValidation.calls;
          }
          if (Object.keys(payload).length > 0) {
            res.write(`data: ${JSON.stringify(payload)}\n\n`);
          }
        }

        if (!clientClosed) {
          res.write('data: [DONE]\n\n');
          res.end();
        }
        return;
      }

      const response = await ai.models.generateContent(requestParams);

      const fcValidation = validateFunctionCallsBatch(
        response.functionCalls as Array<{ name?: string; args?: Record<string, unknown> }> | undefined
      );
      if (!fcValidation.valid) {
        res.status(400).json({
          error: fcValidation.error,
          reply: fcValidation.error,
          invalidFunctionCall: true,
          fallback: false,
        });
        return;
      }

      res.json({
        reply:
          response.text ||
          (fcValidation.calls.length > 0
            ? ''
            : 'Je suis à votre disposition pour vous aider dans vos projets Ketrika.'),
        ...(fcValidation.calls.length > 0 ? { functionCalls: fcValidation.calls } : {}),
        fallback: false,
      });
    } catch (error) {
      console.error(
        '[Ketrika API] Erreur lors de la génération IA:',
        redactSensitiveData(error, rawKey)
      );
      if (res.headersSent) {
        res.write(
          `event: error\ndata: ${JSON.stringify({
            error: 'Erreur temporaire du service IA.',
            fallback: true,
          })}\n\n`
        );
        res.end();
        return;
      }
      res.json({ reply: null, fallback: true });
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint API introuvable.' });
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: HOST, port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Ketrika server running on http://${HOST}:${PORT}`);
  });
}

startServer();
