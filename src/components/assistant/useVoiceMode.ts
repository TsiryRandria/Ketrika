import { useCallback, useEffect, useRef, useState } from 'react';
import { VoiceState } from './types';
import { getFrenchVoices, hasSpeechSynthesis, speakText, speechRecognitionCtor, stopSpeaking } from './voiceUtils';

const PREFS_KEY = 'ketrika_assistant_voice_prefs_v1';
interface Prefs { voiceURI: string; rate: number; muted: boolean; bargeIn: boolean }
const defaultPrefs: Prefs = { voiceURI: '', rate: 1, muted: false, bargeIn: true };
const loadPrefs = (): Prefs => {
  try { return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { return defaultPrefs; }
};

export type VoiceError = 'unsupported' | 'permission' | 'network' | 'mic-busy' | null;

interface Opts {
  active: boolean;
  onUserSpeech: (text: string) => void;
  busy: boolean;
  setReplyListener: (fn: ((text: string) => void) | null) => void;
}

export const useVoiceMode = ({ active, onUserSpeech, busy, setReplyListener }: Opts) => {
  const [state, setStateRaw] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [error, setError] = useState<VoiceError>(null);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [micLive, setMicLive] = useState(false);

  const stateRef = useRef<VoiceState>('idle');
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const activeRef = useRef(active);
  activeRef.current = active;
  const onSpeechRef = useRef(onUserSpeech);
  onSpeechRef.current = onUserSpeech;
  const levelRef = useRef(0);
  const recRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const restartCount = useRef(0);

  const setState = useCallback((s: VoiceState) => { stateRef.current = s; setStateRaw(s); }, []);
  const updatePrefs = (p: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...p };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const recognitionSupported = Boolean(speechRecognitionCtor());
  const synthesisSupported = hasSpeechSynthesis();

  /* --- Voix disponibles --- */
  useEffect(() => {
    if (!synthesisSupported) return;
    const load = () => setVoices(getFrenchVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [synthesisSupported]);

  /* --- Reconnaissance --- */
  const stopRecognition = useCallback(() => {
    const rec = recRef.current;
    recRef.current = null;
    if (rec) { rec.onresult = rec.onerror = rec.onend = null; try { rec.abort(); } catch { /* ignore */ } }
  }, []);

  const startListening = useCallback(() => {
    if (!activeRef.current) return;
    const Ctor = speechRecognitionCtor();
    if (!Ctor) { setError('unsupported'); setState('idle'); return; }
    stopRecognition();
    stopSpeaking();
    setTranscript('');
    setState('listening');

    const rec = new Ctor();
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let gotFinal = false;

    rec.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript;
      }
      setTranscript((final || interim).trim());
      if (final.trim()) {
        gotFinal = true;
        restartCount.current = 0;
        stopRecognition();
        setState('thinking');
        onSpeechRef.current(final.trim());
      }
    };
    rec.onerror = (e: any) => {
      const code = e?.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') { setError('permission'); setState('idle'); stopRecognition(); }
      else if (code === 'network') { setError('network'); setState('idle'); stopRecognition(); }
      else if (code === 'audio-capture') {
        // Certains Android ne partagent pas le micro entre analyse audio et reconnaissance : on libère l'analyseur
        streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setMicLive(false);
        setError('mic-busy');
      }
    };
    rec.onend = () => {
      if (gotFinal || recRef.current !== rec) return;
      if (activeRef.current && stateRef.current === 'listening' && restartCount.current < 8) {
        restartCount.current += 1;
        setTimeout(() => { if (activeRef.current && stateRef.current === 'listening') startListening(); }, 250);
      } else if (restartCount.current >= 8) {
        setState('idle'); // trop de silences : on repasse au repos
      }
    };
    recRef.current = rec;
    try { rec.start(); } catch { setError('mic-busy'); setState('idle'); }
  }, [setState, stopRecognition]);

  /* --- Réponse de l'IA → parole → ré-écoute --- */
  const handleReply = useCallback((text: string) => {
    if (!activeRef.current) return;
    setLastReply(text);
    if (prefsRef.current.muted || !synthesisSupported) { startListening(); return; }
    setState('speaking');
    speakText(text, {
      voiceURI: prefsRef.current.voiceURI, rate: prefsRef.current.rate,
      onEnd: () => { if (activeRef.current && stateRef.current === 'speaking') startListening(); },
    });
  }, [setState, startListening, synthesisSupported]);

  useEffect(() => {
    if (!active) return;
    setReplyListener(handleReply);
    return () => setReplyListener(null);
  }, [active, handleReply, setReplyListener]);

  /* Si la génération s'arrête sans réponse (annulation…), on ne reste pas bloqué en « réflexion » */
  useEffect(() => {
    if (!active || state !== 'thinking' || busy) return;
    const t = setTimeout(() => { if (stateRef.current === 'thinking') startListening(); }, 1800);
    return () => clearTimeout(t);
  }, [active, state, busy, startListening]);

  const interrupt = useCallback(() => {
    stopSpeaking();
    if (activeRef.current) startListening();
  }, [startListening]);

  /* --- Micro + analyse du volume (orbe) + interruption en parlant --- */
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let loudSince = 0;
    setError(null);
    restartCount.current = 0;

    (async () => {
      if (!recognitionSupported) setError('unsupported');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const ctx: AudioContext = new AC();
        ctxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        setMicLive(true);
        const loop = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
          const rms = Math.min(1, Math.sqrt(sum / buf.length) * 4);
          levelRef.current = levelRef.current * 0.7 + rms * 0.3;
          // Interruption en parlant : voix soutenue pendant que Ketrika parle
          if (stateRef.current === 'speaking' && prefsRef.current.bargeIn && levelRef.current > 0.3) {
            if (!loudSince) loudSince = performance.now();
            else if (performance.now() - loudSince > 450) { loudSince = 0; interrupt(); }
          } else loudSince = 0;
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch (e: any) {
        if (cancelled) return;
        setMicLive(false);
        if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') setError('permission');
        else if (e?.name === 'NotFoundError') setError('unsupported');
      }
    })();

    if (recognitionSupported) startListening();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      stopRecognition();
      stopSpeaking();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
      levelRef.current = 0;
      setMicLive(false);
      setState('idle');
    };
  }, [active, recognitionSupported, startListening, stopRecognition, interrupt, setState]);

  /** Appui sur l'orbe : interrompt la parole, ou relance l'écoute depuis le repos */
  const tapOrb = useCallback(() => {
    if (stateRef.current === 'speaking') interrupt();
    else if (stateRef.current === 'idle') { setError((e) => (e === 'unsupported' || e === 'permission' ? e : null)); restartCount.current = 0; startListening(); }
  }, [interrupt, startListening]);

  return {
    state, transcript, lastReply, error, micLive, levelRef, voices, prefs, updatePrefs,
    recognitionSupported, synthesisSupported, tapOrb, interrupt,
    markThinking: () => setState('thinking'),
  };
};
