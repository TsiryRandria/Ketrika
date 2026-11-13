import React, { useEffect, useRef } from 'react';
import type { VoiceState } from './types';
import { prefersReducedMotion } from './voiceUtils';

const COLORS: Record<VoiceState, { a: string; b: string }> = {
  idle: { a: '#34d399', b: '#059669' },
  listening: { a: '#00e676', b: '#38bdf8' },
  thinking: { a: '#38bdf8', b: '#6366f1' },
  speaking: { a: '#6ee7b7', b: '#10b981' },
};
const BARS = 36;

/** Orbe façon réacteur : anneaux SVG animés + barres radiales qui réagissent au volume du micro. */
export const VoiceOrb: React.FC<{ state: VoiceState; levelRef: React.MutableRefObject<number>; micLive: boolean }> = ({ state, levelRef, micLive }) => {
  const coreRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const barsRef = useRef<(SVGLineElement | null)[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const micRef = useRef(micLive);
  micRef.current = micLive;
  const reduced = prefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      coreRef.current?.setAttribute('transform', 'scale(1)');
      return;
    }
    let raf = 0;
    const loop = (ms: number) => {
      const t = ms / 1000;
      const s = stateRef.current;
      let level: number;
      if (s === 'listening') level = micRef.current ? levelRef.current : 0.18 + 0.1 * Math.sin(t * 4);
      else if (s === 'speaking') level = 0.35 + 0.3 * Math.abs(Math.sin(t * 7) * Math.sin(t * 2.3 + 1));
      else if (s === 'thinking') level = 0.2 + 0.05 * Math.sin(t * 10);
      else level = 0.06 + 0.04 * Math.sin(t * 1.4);
      coreRef.current?.setAttribute('transform', `scale(${1 + level * 0.55})`);
      glowRef.current?.setAttribute('opacity', String(0.25 + level * 0.9));
      for (let i = 0; i < BARS; i++) {
        const bar = barsRef.current[i];
        if (!bar) continue;
        const wave = s === 'thinking' ? 0.5 + 0.5 * Math.sin(t * 6 - i * 0.5) : 0.55 + 0.45 * Math.sin(t * 5 + i * 1.3);
        const len = 6 + (s === 'idle' ? 3 : level * 46) * (0.45 + 0.55 * wave);
        const ang = (i / BARS) * Math.PI * 2;
        const r1 = 108;
        bar.setAttribute('x2', String(160 + Math.cos(ang) * (r1 + len)));
        bar.setAttribute('y2', String(160 + Math.sin(ang) * (r1 + len)));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [levelRef, reduced]);

  const c = COLORS[state];
  const arcs = [0, 90, 180, 270].map((deg) => {
    const a1 = ((deg + 8) * Math.PI) / 180;
    const a2 = ((deg + 64) * Math.PI) / 180;
    const r = 92;
    return `M ${160 + r * Math.cos(a1)} ${160 + r * Math.sin(a1)} A ${r} ${r} 0 0 1 ${160 + r * Math.cos(a2)} ${160 + r * Math.sin(a2)}`;
  });

  return (
    <svg className="assistant-orb w-full h-full" data-state={state} viewBox="0 0 320 320" role="img" aria-label={`Orbe Ketrika, état : ${state}`}>
      <defs>
        <radialGradient id="assistantOrbCore" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#ecfdf5" />
          <stop offset="35%" stopColor={c.a} />
          <stop offset="100%" stopColor={c.b} />
        </radialGradient>
        <radialGradient id="assistantOrbGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c.a} stopOpacity="0.9" />
          <stop offset="100%" stopColor={c.a} stopOpacity="0" />
        </radialGradient>
        <filter id="assistantOrbBlur"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>

      <circle ref={glowRef} cx="160" cy="160" r="150" fill="url(#assistantOrbGlow)" opacity="0.3" />

      {Array.from({ length: BARS }).map((_, i) => {
        const ang = (i / BARS) * Math.PI * 2;
        return (
          <line key={i} ref={(el) => { barsRef.current[i] = el; }}
            x1={160 + Math.cos(ang) * 108} y1={160 + Math.sin(ang) * 108}
            x2={160 + Math.cos(ang) * 116} y2={160 + Math.sin(ang) * 116}
            stroke={c.a} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        );
      })}

      <g className="assistant-orb-ring-a">
        <circle cx="160" cy="160" r="100" fill="none" stroke={c.a} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 9" />
      </g>
      <g className="assistant-orb-ring-b">
        {arcs.map((d, i) => <path key={i} d={d} fill="none" stroke={c.b} strokeWidth="4" strokeLinecap="round" opacity="0.9" />)}
      </g>
      <circle cx="160" cy="160" r="74" fill="none" stroke={c.a} strokeOpacity="0.5" strokeWidth="1.5" />

      <circle ref={coreRef} className="assistant-orb-core" cx="160" cy="160" r="54" fill="url(#assistantOrbCore)" filter="url(#assistantOrbBlur)" opacity="0.55" />
      <circle className="assistant-orb-core" cx="160" cy="160" r="46" fill="url(#assistantOrbCore)" />
      <circle cx="160" cy="160" r="46" fill="none" stroke="#ecfdf5" strokeOpacity="0.5" strokeWidth="1" />
    </svg>
  );
};
