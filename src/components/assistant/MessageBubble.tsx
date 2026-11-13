import React, { useState } from 'react';
import { Bot, Check, Copy, FileText, RefreshCw, Undo2, Volume2, VolumeX, XCircle, Zap } from 'lucide-react';
import { Markdown } from './Markdown';
import { formatSize } from './attachments';
import type { AssistantAction, AssistantMessage } from './types';

export const ActionCards: React.FC<{ actions: AssistantAction[]; onUndo?: (id: string) => void }> = ({ actions, onUndo }) => (
  <div className="space-y-1.5 mt-2" role="list" aria-label="Actions effectuées par Ketrika">
    {actions.map((a) => (
      <div
        key={a.id}
        role="listitem"
        className={`assistant-action-card ${a.ok ? '' : 'assistant-action-card--fail'} ${a.undone ? 'opacity-60' : ''}`}
      >
        {a.ok ? <Zap className="w-3.5 h-3.5 text-emerald-300 shrink-0" aria-hidden /> : <XCircle className="w-3.5 h-3.5 text-rose-300 shrink-0" aria-hidden />}
        <div className="min-w-0 flex-1 text-[11px] leading-snug">
          {a.ok ? <span className="font-bold text-emerald-300">Ketrika a fait : </span> : <span className="font-bold text-rose-300">Action impossible : </span>}
          <span className={`text-white/90 ${a.undone ? 'line-through' : ''}`}>{a.label}</span>
        </div>
        {a.ok && a.undo && onUndo && (
          a.undone
            ? <span className="text-[10px] text-emerald-300/70 shrink-0">Annulé</span>
            : (
              <button type="button" onClick={() => onUndo(a.id)} className="assistant-undo-btn" aria-label={`Annuler : ${a.label}`}>
                <Undo2 className="w-3 h-3" aria-hidden /> Annuler
              </button>
            )
        )}
      </div>
    ))}
  </div>
);

interface Props {
  msg: AssistantMessage;
  canRegenerate: boolean;
  isSpeaking: boolean;
  onRegenerate: () => void;
  onSpeak: (m: AssistantMessage) => void;
  onUndo: (messageId: string, actionId: string) => void;
}

export const MessageBubble: React.FC<Props> = ({ msg, canRegenerate, isSpeaking, onRegenerate, onSpeak, onUndo }) => {
  const [copied, setCopied] = useState(false);
  const isAssistant = msg.role === 'assistant';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* presse-papiers indisponible */ }
  };

  return (
    <div className={`flex items-start gap-2.5 ${isAssistant ? '' : 'flex-row-reverse'} assistant-msg-in`}>
      {isAssistant ? (
        <div className="assistant-avatar" aria-hidden><Bot className="w-4 h-4" /></div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs" aria-hidden>Moi</div>
      )}

      <div className={`min-w-0 max-w-[88%] ${isAssistant ? '' : 'flex flex-col items-end'}`}>
        <div
          className={`rounded-3xl px-3.5 py-2.5 text-[13px] sm:text-sm leading-relaxed break-words ${
            isAssistant
              ? `glass-panel ${msg.isError ? 'border-amber-400/50' : 'border-emerald-500/30'} text-emerald-50 rounded-tl-sm`
              : 'bg-emerald-500 text-slate-950 font-medium rounded-tr-sm shadow-[0_0_15px_rgba(0,230,118,0.3)]'
          }`}
        >
          {msg.attachments?.length ? (
            <div className="flex flex-wrap gap-2 mb-2">
              {msg.attachments.map((a) => a.kind === 'image' ? (
                <img key={a.id} src={`data:${a.mimeType};base64,${a.data}`} alt={a.name} className="w-24 h-24 object-cover rounded-xl border border-black/20" />
              ) : (
                <span key={a.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/20 text-[11px]">
                  <FileText className="w-3.5 h-3.5" aria-hidden />{a.name} · {formatSize(a.size)}
                </span>
              ))}
            </div>
          ) : null}
          {isAssistant ? <Markdown text={msg.text} /> : <p className="whitespace-pre-wrap">{msg.text}</p>}
          {isAssistant && msg.actions?.length ? <ActionCards actions={msg.actions} onUndo={(aid) => onUndo(msg.id, aid)} /> : null}
        </div>

        <div className={`flex items-center gap-1 mt-1 px-1 ${isAssistant ? '' : 'justify-end'}`}>
          <span className="text-[10px] text-emerald-400/60">{msg.timestamp}</span>
          {isAssistant && (
            <>
              <button type="button" onClick={copy} className="assistant-icon-btn" aria-label="Copier la réponse" title="Copier">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button type="button" onClick={() => onSpeak(msg)} className="assistant-icon-btn" aria-label={isSpeaking ? 'Arrêter la lecture' : 'Lire à voix haute'} title={isSpeaking ? 'Arrêter' : 'Lire à voix haute'}>
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-emerald-300" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              {canRegenerate && (
                <button type="button" onClick={onRegenerate} className="assistant-icon-btn" aria-label="Régénérer la réponse" title="Régénérer">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
