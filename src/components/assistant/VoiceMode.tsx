import React, { useState } from 'react';
import { Mic, MicOff, Send, Settings2, Square, Volume2, VolumeX, X } from 'lucide-react';
import { VoiceOrb } from './VoiceOrb';
import { useVoiceMode } from './useVoiceMode';
import type { VoiceState } from './types';

const LABELS: Record<VoiceState, string> = {
  idle: 'Au repos — touchez l’orbe pour parler',
  listening: 'Je vous écoute…',
  thinking: 'Je réfléchis…',
  speaking: 'Je parle… (parlez ou touchez l’orbe pour m’interrompre)',
};

const ERRORS: Record<string, string> = {
  unsupported: "La reconnaissance vocale n'est pas disponible sur ce navigateur (utilisez Chrome ou Edge). Vous pouvez écrire ci-dessous : je vous répondrai à voix haute.",
  permission: "Accès au micro refusé. Autorisez le micro via le cadenas de la barre d'adresse (ou les réglages du site), puis rouvrez le mode vocal. Vous pouvez aussi écrire ci-dessous.",
  network: "La reconnaissance vocale du navigateur nécessite une connexion Internet.",
  'mic-busy': "Le micro est occupé : l'orbe reste animée mais ne suit plus le volume de votre voix.",
};

interface Props {
  busy: boolean;
  send: (text: string) => Promise<void> | void;
  setReplyListener: (fn: ((text: string) => void) | null) => void;
  onClose: () => void;
}

export const VoiceMode: React.FC<Props> = ({ busy, send, setReplyListener, onClose }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [typed, setTyped] = useState('');
  const v = useVoiceMode({ active: true, busy, onUserSpeech: (t) => void send(t), setReplyListener });

  const canType = v.error === 'unsupported' || v.error === 'permission' || !v.recognitionSupported;
  const submitTyped = () => {
    const t = typed.trim();
    if (!t || busy) return;
    setTyped('');
    v.markThinking();
    void send(t);
  };

  return (
    <div className="assistant-voice-overlay absolute inset-0 z-30 rounded-3xl flex flex-col" role="dialog" aria-modal="true" aria-label="Mode vocal Ketrika">
      <div className="flex items-center justify-between p-4">
        <div>
          <h3 className="text-sm font-extrabold text-white tracking-wide">Mode Jarvis</h3>
          <p className="text-[11px] text-emerald-300/70">Conversation mains libres</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setShowSettings((s) => !s)} className="assistant-round-btn !w-9 !h-9" aria-label="Réglages vocaux" aria-expanded={showSettings}><Settings2 className="w-4 h-4" /></button>
          <button type="button" onClick={onClose} className="assistant-round-btn !w-9 !h-9" aria-label="Fermer le mode vocal"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {showSettings && (
        <div className="mx-4 mb-2 p-3 rounded-2xl glass-panel-subtle border border-emerald-500/30 space-y-3 text-xs text-white/90">
          <label className="block">
            <span className="block mb-1 text-emerald-300 font-semibold">Voix</span>
            <select
              value={v.prefs.voiceURI}
              onChange={(e) => v.updatePrefs({ voiceURI: e.target.value })}
              disabled={!v.synthesisSupported}
              className="w-full px-2 py-1.5 rounded-lg glass-input text-xs"
            >
              <option value="">Automatique (français)</option>
              {v.voices.map((vo) => <option key={vo.voiceURI} value={vo.voiceURI}>{vo.name} ({vo.lang})</option>)}
            </select>
            {v.synthesisSupported && v.voices.length === 0 && <span className="block mt-1 text-[10px] text-amber-300/80">Aucune voix française détectée sur cet appareil.</span>}
          </label>
          <label className="block">
            <span className="block mb-1 text-emerald-300 font-semibold">Vitesse : {v.prefs.rate.toFixed(1)}×</span>
            <input type="range" min={0.7} max={1.4} step={0.1} value={v.prefs.rate} onChange={(e) => v.updatePrefs({ rate: Number(e.target.value) })} className="assistant-range w-full" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={v.prefs.bargeIn} onChange={(e) => v.updatePrefs({ bargeIn: e.target.checked })} className="assistant-range" />
            <span>Interruption en parlant <span className="text-emerald-300/60">(préférez un casque pour éviter l'écho)</span></span>
          </label>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 gap-3">
        <button
          type="button"
          onClick={v.tapOrb}
          className="w-[min(62vw,44vh,300px)] aspect-square rounded-full"
          aria-label={v.state === 'speaking' ? "Interrompre Ketrika" : "Activer l'écoute"}
        >
          <VoiceOrb state={v.state} levelRef={v.levelRef} micLive={v.micLive} />
        </button>

        <p className="text-sm font-bold text-emerald-200 text-center" role="status" aria-live="polite">{LABELS[v.state]}</p>

        <div className="w-full max-w-md min-h-[3.5rem] max-h-[22vh] overflow-y-auto no-scrollbar text-center space-y-1">
          {v.transcript && <p className="text-sm text-cyan-100 italic">« {v.transcript} »</p>}
          {!v.transcript && v.lastReply && <p className="text-xs text-emerald-100/70 leading-relaxed">{v.lastReply.replace(/[*#`]/g, '')}</p>}
        </div>

        {v.error && (
          <p role="alert" className="max-w-md text-center text-[11px] leading-relaxed px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-100">
            {ERRORS[v.error]}
          </p>
        )}
      </div>

      <div className="p-4 space-y-3">
        {canType && (
          <div className="flex gap-2 max-w-md mx-auto w-full">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
              placeholder="Écrire à Ketrika (réponse vocale)…"
              aria-label="Message à envoyer en mode vocal"
              className="flex-1 min-w-0 px-3 py-2 rounded-2xl glass-input text-sm"
            />
            <button type="button" onClick={submitTyped} disabled={busy || !typed.trim()} className="assistant-send-btn" aria-label="Envoyer"><Send className="w-4 h-4" /></button>
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => { v.updatePrefs({ muted: !v.prefs.muted }); if (!v.prefs.muted) v.interrupt(); }}
            className={`assistant-round-btn ${v.prefs.muted ? '!text-rose-300 !border-rose-400/60' : ''}`}
            aria-pressed={v.prefs.muted}
            aria-label={v.prefs.muted ? 'Réactiver la voix de Ketrika' : 'Couper la voix de Ketrika (muet)'}
            title="Muet"
          >
            {v.prefs.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button type="button" onClick={v.tapOrb} className="assistant-send-btn !w-14 !h-14 !rounded-full" aria-label={v.state === 'listening' ? 'À l’écoute' : v.state === 'speaking' ? 'Interrompre' : 'Parler'}>
            {v.state === 'speaking' ? <Square className="w-5 h-5 fill-current" /> : v.error === 'permission' || v.error === 'unsupported' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button type="button" onClick={onClose} className="assistant-round-btn" aria-label="Quitter le mode vocal" title="Quitter"><X className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};
