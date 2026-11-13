import { useEffect, useRef, useState } from 'react';
import { speechRecognitionCtor } from './voiceUtils';

const WAKE = /\b(hey|hé|hei|ok|okay|salut|dis)[\s,]+(ketrika|kétrika|ketrica|quetrika|kétrica|kitrika|katrika)\b/i;

/**
 * Phrase d'activation « Hey Ketrika ».
 * Limites : écoute uniquement tant que cette page est ouverte ET visible (le navigateur coupe le micro en arrière-plan),
 * utilise la reconnaissance vocale du navigateur (en ligne sur Chrome), et le navigateur affiche son indicateur micro.
 */
export const useWakeWord = (enabled: boolean, onWake: () => void, onProblem: (reason: 'permission' | 'unsupported') => void) => {
  const [listening, setListening] = useState(false);
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;
  const onProblemRef = useRef(onProblem);
  onProblemRef.current = onProblem;

  useEffect(() => {
    if (!enabled) return;
    const Ctor = speechRecognitionCtor();
    if (!Ctor) { onProblemRef.current('unsupported'); return; }

    let stopped = false;
    let rec: any = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    const start = () => {
      if (stopped || document.hidden) return;
      rec = new Ctor();
      rec.lang = 'fr-FR';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onstart = () => setListening(true);
      rec.onresult = (e: any) => {
        failures = 0;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (WAKE.test(e.results[i][0].transcript)) {
            try { rec.abort(); } catch { /* ignore */ }
            onWakeRef.current();
            return;
          }
        }
      };
      rec.onerror = (e: any) => {
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') { stopped = true; onProblemRef.current('permission'); }
      };
      rec.onend = () => {
        setListening(false);
        if (stopped) return;
        failures += 1;
        if (failures > 12) { stopped = true; return; }
        timer = setTimeout(start, 500);
      };
      try { rec.start(); } catch { timer = setTimeout(start, 1000); }
    };

    const onVisibility = () => {
      if (document.hidden) { try { rec?.abort(); } catch { /* ignore */ } }
      else if (!stopped) { clearTimeout(timer); timer = setTimeout(start, 300); }
    };
    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      if (rec) { rec.onend = rec.onresult = rec.onerror = null; try { rec.abort(); } catch { /* ignore */ } }
      setListening(false);
    };
  }, [enabled]);

  return { listening };
};
