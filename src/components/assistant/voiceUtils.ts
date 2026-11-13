export const speechRecognitionCtor = (): (new () => any) | null =>
  typeof window === 'undefined' ? null : ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null);

export const hasSpeechSynthesis = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Retire le markdown et les emojis pour une lecture vocale naturelle. */
export const stripForSpeech = (text: string): string =>
  text
    .replace(/```[\s\S]*?```/g, ' (bloc de code) ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#>~]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

export const getFrenchVoices = (): SpeechSynthesisVoice[] =>
  hasSpeechSynthesis() ? window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr')) : [];

export const speakText = (
  text: string,
  opts: { voiceURI?: string; rate?: number; onEnd?: () => void; onStart?: () => void } = {},
): boolean => {
  if (!hasSpeechSynthesis()) return false;
  const clean = stripForSpeech(text);
  if (!clean) { opts.onEnd?.(); return true; }
  window.speechSynthesis.cancel();
  // Chrome coupe les énoncés longs : on découpe par phrases
  const chunks = clean.match(/[^.!?…\n]+[.!?…]*/g)?.map((s) => s.trim()).filter(Boolean) || [clean];
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = 'fr-FR';
    u.rate = opts.rate ?? 1;
    const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === opts.voiceURI) || getFrenchVoices()[0];
    if (voice) u.voice = voice;
    if (i === 0) u.onstart = () => opts.onStart?.();
    if (i === chunks.length - 1) { u.onend = () => opts.onEnd?.(); u.onerror = () => opts.onEnd?.(); }
    window.speechSynthesis.speak(u);
  });
  return true;
};

export const stopSpeaking = () => { if (hasSpeechSynthesis()) window.speechSynthesis.cancel(); };
