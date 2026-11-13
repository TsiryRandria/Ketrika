export const DEFAULT_SILENCE_TIMEOUT_MS = 8000;
export const DEFAULT_MAX_LISTEN_DURATION_MS = 180000;
export const DEFAULT_RESTART_DELAY_MS = 180;
export const MAX_TRANSIENT_NETWORK_RETRIES = 3;

export type SpeechSubmitReason = 'silence' | 'manual_stop' | 'max_duration';

export interface SpeechResultAlternativeLike {
  transcript?: string;
}

export interface SpeechResultLike {
  isFinal: boolean;
  0?: SpeechResultAlternativeLike;
}

export interface ExtractedInstanceTranscript {
  finalText: string;
  interimText: string;
  combinedText: string;
}

export function normalizeSpeechWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function dedupeSequentialSegments(segments: string[]): string[] {
  const result: string[] = [];
  for (const raw of segments) {
    const clean = normalizeSpeechWhitespace(raw);
    if (!clean) continue;

    if (result.length === 0) {
      result.push(clean);
      continue;
    }

    const prev = result[result.length - 1];
    const cleanLower = clean.toLowerCase();
    const prevLower = prev.toLowerCase();

    const wordCount = clean.split(' ').length;

    // Ignorer un doublon exact ou une répétition multi-mots en suffixe séparée par un espace
    if (
      cleanLower === prevLower ||
      (wordCount >= 2 && prevLower.endsWith(` ${cleanLower}`))
    ) {
      continue;
    }

    // Certains navigateurs Android réémettent le segment cumulé en remplaçant le précédent (avec frontière d'espace)
    if (cleanLower.startsWith(`${prevLower} `)) {
      result[result.length - 1] = clean;
      continue;
    }

    result.push(clean);
  }
  return result;
}

/**
 * Reconstruit proprement les segments finaux et intermédiaires d'une instance SpeechRecognition
 * sans dupliquer les résultats déjà présents dans `event.results`.
 */
export function extractInstanceTranscript(
  results: ArrayLike<SpeechResultLike> | null | undefined
): ExtractedInstanceTranscript {
  if (!results || typeof results.length !== 'number') {
    return { finalText: '', interimText: '', combinedText: '' };
  }

  const finalSegments: string[] = [];
  const interimSegments: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    const rawChunk = item?.[0]?.transcript || '';
    const cleanChunk = normalizeSpeechWhitespace(rawChunk);
    if (!cleanChunk) continue;

    if (item.isFinal) {
      finalSegments.push(cleanChunk);
    } else {
      interimSegments.push(cleanChunk);
    }
  }

  const finalText = dedupeSequentialSegments(finalSegments).join(' ');
  const interimText = dedupeSequentialSegments(interimSegments).join(' ');
  const combinedText = mergeTranscriptWithoutDuplicates(finalText, interimText);

  return {
    finalText,
    interimText,
    combinedText,
  };
}

/**
 * Concatène un nouvel extrait au transcript accumulé en éliminant les doublons
 * exacts et les chevauchements multi-mots aux frontières (lors des redémarrages ou reprises).
 */
export function mergeTranscriptWithoutDuplicates(base: string, addition: string): string {
  const cleanBase = normalizeSpeechWhitespace(base);
  const cleanAdd = normalizeSpeechWhitespace(addition);

  if (!cleanAdd) return cleanBase;
  if (!cleanBase) return cleanAdd;

  const baseLower = cleanBase.toLowerCase();
  const addLower = cleanAdd.toLowerCase();

  if (baseLower === addLower) {
    return cleanBase;
  }

  // Si le nouvel extrait contient déjà tout le texte accumulé au début (ex: reprise cumulative)
  if (addLower.startsWith(`${baseLower} `) || addLower === baseLower) {
    return cleanAdd;
  }

  const baseWords = cleanBase.split(' ');
  const addWords = cleanAdd.split(' ');

  // Si la fin du transcript déjà accumulé répète exactement cet extrait (>= 2 mots)
  if (addWords.length >= 2 && baseLower.endsWith(addLower)) {
    return cleanBase;
  }

  // Recherche du plus grand chevauchement suffixe(base) == préfixe(addition) sur >= 2 mots
  const maxOverlap = Math.min(baseWords.length, addWords.length);
  for (let overlap = maxOverlap; overlap >= 2; overlap--) {
    let matches = true;
    for (let i = 0; i < overlap; i++) {
      if (
        baseWords[baseWords.length - overlap + i].toLowerCase() !== addWords[i].toLowerCase()
      ) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return [...baseWords, ...addWords.slice(overlap)].join(' ');
    }
  }

  return `${cleanBase} ${cleanAdd}`;
}

export interface VoiceTurnControllerOptions {
  manualStopOnly?: boolean;
  silenceTimeoutMs?: number;
  maxListenDurationMs?: number;
  restartDelayMs?: number;
  maxNetworkRetries?: number;
  onTranscriptChange: (transcript: string) => void;
  onSubmitTranscript: (transcript: string, reason: SpeechSubmitReason) => void;
  onAutoRestartRequested: () => void;
  onMaxDurationEmpty: () => void;
  onFatalError: (message: string, preservedTranscript: string) => void;
  setTimeoutFn?: (cb: () => void, ms: number) => number;
  clearTimeoutFn?: (id: number) => void;
  nowFn?: () => number;
}

export class VoiceTurnController {
  private readonly manualStopOnly: boolean;
  private readonly silenceTimeoutMs: number;
  private readonly maxListenDurationMs: number;
  private readonly restartDelayMs: number;
  private readonly maxNetworkRetries: number;
  private readonly setTimeoutFn: (cb: () => void, ms: number) => number;
  private readonly clearTimeoutFn: (id: number) => void;
  private readonly nowFn: () => number;

  private readonly onTranscriptChange: (transcript: string) => void;
  private readonly onSubmitTranscript: (transcript: string, reason: SpeechSubmitReason) => void;
  private readonly onAutoRestartRequested: () => void;
  private readonly onMaxDurationEmpty: () => void;
  private readonly onFatalError: (message: string, preservedTranscript: string) => void;

  private committedBase = '';
  private currentInstanceFinal = '';
  private currentInstanceInterim = '';
  private lastSpeechAt: number | null = null;
  private networkErrorCount = 0;
  private submitted = false;
  private stopped = true;

  private silenceTimerId: number | null = null;
  private maxDurationTimerId: number | null = null;
  private restartTimerId: number | null = null;

  constructor(options: VoiceTurnControllerOptions) {
    this.manualStopOnly = options.manualStopOnly ?? true;
    this.silenceTimeoutMs = Math.max(500, options.silenceTimeoutMs ?? DEFAULT_SILENCE_TIMEOUT_MS);
    this.maxListenDurationMs = Math.max(
      this.silenceTimeoutMs + 1000,
      options.maxListenDurationMs ?? DEFAULT_MAX_LISTEN_DURATION_MS
    );
    this.restartDelayMs = Math.max(50, options.restartDelayMs ?? DEFAULT_RESTART_DELAY_MS);
    this.maxNetworkRetries = Math.max(1, options.maxNetworkRetries ?? MAX_TRANSIENT_NETWORK_RETRIES);

    this.setTimeoutFn =
      options.setTimeoutFn ?? ((cb, ms) => window.setTimeout(cb, ms));
    this.clearTimeoutFn =
      options.clearTimeoutFn ?? ((id) => window.clearTimeout(id));
    this.nowFn = options.nowFn ?? (() => Date.now());

    this.onTranscriptChange = options.onTranscriptChange;
    this.onSubmitTranscript = options.onSubmitTranscript;
    this.onAutoRestartRequested = options.onAutoRestartRequested;
    this.onMaxDurationEmpty = options.onMaxDurationEmpty;
    this.onFatalError = options.onFatalError;
  }

  public startTurn(seedTranscript = ''): void {
    this.clearAllTimers();
    this.committedBase = normalizeSpeechWhitespace(seedTranscript);
    this.currentInstanceFinal = '';
    this.currentInstanceInterim = '';
    this.networkErrorCount = 0;
    this.submitted = false;
    this.stopped = false;
    this.lastSpeechAt = this.committedBase ? this.nowFn() : null;

    this.onTranscriptChange(this.committedBase);

    if (!this.manualStopOnly) {
      if (this.committedBase) {
        this.resetSilenceTimer();
      }

      this.maxDurationTimerId = this.setTimeoutFn(() => {
        if (this.stopped || this.submitted) return;
        this.commitCurrentInstance();
        const full = this.getFullTranscript();
        if (full) {
          this.submitTurn('max_duration');
        } else {
          this.stopped = true;
          this.clearAllTimers();
          this.onMaxDurationEmpty();
        }
      }, this.maxListenDurationMs);
    }
  }

  public isListeningActive(): boolean {
    return !this.stopped && !this.submitted;
  }

  public hasSubmitted(): boolean {
    return this.submitted;
  }

  public getFullTranscript(): string {
    const instanceCombined = mergeTranscriptWithoutDuplicates(
      this.currentInstanceFinal,
      this.currentInstanceInterim
    );
    return mergeTranscriptWithoutDuplicates(this.committedBase, instanceCombined);
  }

  public handleRecognitionResults(results: ArrayLike<SpeechResultLike> | null | undefined): void {
    if (this.stopped || this.submitted) return;

    const prevFinal = this.currentInstanceFinal;
    const prevCombined = mergeTranscriptWithoutDuplicates(
      this.currentInstanceFinal,
      this.currentInstanceInterim
    );

    const extracted = extractInstanceTranscript(results);
    const hasSpokenContent = Boolean(extracted.finalText || extracted.interimText);
    const hasProgress =
      hasSpokenContent &&
      (extracted.combinedText !== prevCombined || extracted.finalText !== prevFinal);

    this.currentInstanceFinal = extracted.finalText;
    this.currentInstanceInterim = extracted.interimText;

    if (hasProgress) {
      this.networkErrorCount = 0;
      this.lastSpeechAt = this.nowFn();
      if (!this.manualStopOnly) {
        this.resetSilenceTimer();
      }
    }

    this.onTranscriptChange(this.getFullTranscript());
  }

  /**
   * Appelé lorsque l'instance SpeechRecognition s'interrompt ou termine (ex: coupure 60s Chrome
   * ou pause). En mode arrêt manuel, ne soumet jamais automatiquement : conserve tout et relance l'écoute.
   */
  public handleRecognitionEnd(): void {
    if (this.stopped || this.submitted) return;

    this.commitCurrentInstance();

    if (!this.manualStopOnly) {
      const full = this.getFullTranscript();
      if (
        full &&
        this.lastSpeechAt !== null &&
        this.nowFn() - this.lastSpeechAt >= this.silenceTimeoutMs
      ) {
        this.submitTurn('silence');
        return;
      }
    }

    this.clearRestartTimer();
    this.restartTimerId = this.setTimeoutFn(() => {
      this.restartTimerId = null;
      if (!this.stopped && !this.submitted) {
        this.onAutoRestartRequested();
      }
    }, this.restartDelayMs);
  }

  public handleRecognitionError(errorCode: string | undefined): { fatal: boolean } {
    if (this.stopped || this.submitted || errorCode === 'aborted') {
      return { fatal: false };
    }

    // Toujours préserver ce qui a déjà été capturé avant toute gestion d'erreur
    this.commitCurrentInstance();
    const preserved = this.getFullTranscript();

    if (
      errorCode === 'not-allowed' ||
      errorCode === 'service-not-allowed' ||
      errorCode === 'audio-capture'
    ) {
      this.stopped = true;
      this.clearAllTimers();
      const message =
        errorCode === 'audio-capture'
          ? 'Le microphone a été interrompu ou est indisponible. Vos phrases déjà capturées ont été conservées.'
          : "Impossible d'accéder au microphone. Vérifiez les permissions de votre navigateur.";
      this.onFatalError(message, preserved);
      return { fatal: true };
    }

    if (errorCode === 'network') {
      this.networkErrorCount += 1;
      if (this.networkErrorCount >= this.maxNetworkRetries) {
        this.stopped = true;
        this.clearAllTimers();
        this.onFatalError(
          'Le service de reconnaissance vocale est temporairement inaccessible. Vos phrases déjà capturées ont été conservées.',
          preserved
        );
        return { fatal: true };
      }
      return { fatal: false };
    }

    // no-speech ou erreur transitoire : continuer l'écoute sans perdre le transcript
    return { fatal: false };
  }

  /**
   * Arrêt manuel par l'utilisateur : envoie une seule fois le transcript complet s'il est non vide.
   */
  public manualStop(): boolean {
    if (this.submitted) return false;
    this.commitCurrentInstance();
    const full = this.getFullTranscript();
    if (full) {
      return this.submitTurn('manual_stop');
    }
    this.stopped = true;
    this.clearAllTimers();
    return false;
  }

  public abortWithoutSubmit(): void {
    this.stopped = true;
    this.clearAllTimers();
  }

  private commitCurrentInstance(): void {
    const instanceCombined = mergeTranscriptWithoutDuplicates(
      this.currentInstanceFinal,
      this.currentInstanceInterim
    );
    if (instanceCombined) {
      this.committedBase = mergeTranscriptWithoutDuplicates(this.committedBase, instanceCombined);
    }
    this.currentInstanceFinal = '';
    this.currentInstanceInterim = '';
    this.onTranscriptChange(this.committedBase);
  }

  private submitTurn(reason: SpeechSubmitReason): boolean {
    if (this.submitted) return false;
    this.commitCurrentInstance();
    const full = this.getFullTranscript();
    if (!full) {
      this.stopped = true;
      this.clearAllTimers();
      return false;
    }

    this.submitted = true;
    this.stopped = true;
    this.clearAllTimers();
    this.onSubmitTranscript(full, reason);
    return true;
  }

  private resetSilenceTimer(): void {
    if (this.manualStopOnly) return;
    this.clearSilenceTimer();
    this.silenceTimerId = this.setTimeoutFn(() => {
      this.silenceTimerId = null;
      if (this.stopped || this.submitted) return;
      this.commitCurrentInstance();
      const full = this.getFullTranscript();
      if (full) {
        this.submitTurn('silence');
      }
    }, this.silenceTimeoutMs);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimerId !== null) {
      this.clearTimeoutFn(this.silenceTimerId);
      this.silenceTimerId = null;
    }
  }

  private clearRestartTimer(): void {
    if (this.restartTimerId !== null) {
      this.clearTimeoutFn(this.restartTimerId);
      this.restartTimerId = null;
    }
  }

  private clearAllTimers(): void {
    this.clearSilenceTimer();
    this.clearRestartTimer();
    if (this.maxDurationTimerId !== null) {
      this.clearTimeoutFn(this.maxDurationTimerId);
      this.maxDurationTimerId = null;
    }
  }
}
