import React, { useEffect, useRef } from 'react';
import { AudioLines, FileText, Paperclip, Send, Square, X } from 'lucide-react';
import { MAX_ATTACHMENTS, formatSize, readAttachments } from './attachments';
import type { AssistantAttachment } from './types';

interface Props {
  value: string;
  onChange: (v: string) => void;
  attachments: AssistantAttachment[];
  onAttachmentsChange: (a: AssistantAttachment[]) => void;
  onSend: () => void;
  onStop: () => void;
  onOpenVoice: () => void;
  busy: boolean;
  onNotice: (msg: string) => void;
}

export const Composer: React.FC<Props> = ({ value, onChange, attachments, onAttachmentsChange, onSend, onStop, onOpenVoice, busy, onNotice }) => {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [value]);

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const { added, errors } = await readAttachments(Array.from(files), attachments.length);
    if (added.length) onAttachmentsChange([...attachments, ...added]);
    if (errors.length) onNotice(errors[0]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const canSend = !busy && (value.trim().length > 0 || attachments.length > 0);

  return (
    <div className="assistant-composer">
      {attachments.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2" aria-label="Pièces jointes">
          {attachments.map((a) => (
            <div key={a.id} className="relative shrink-0 rounded-xl glass-panel-subtle border border-emerald-500/30 overflow-hidden">
              {a.kind === 'image' ? (
                <img src={`data:${a.mimeType};base64,${a.data}`} alt={a.name} className="w-16 h-16 object-cover" />
              ) : (
                <div className="w-28 h-16 p-2 flex flex-col justify-between">
                  <FileText className="w-4 h-4 text-emerald-300" aria-hidden />
                  <div className="text-[10px] leading-tight text-white/90 truncate">{a.name}<br /><span className="text-emerald-300/70">{formatSize(a.size)}</span></div>
                </div>
              )}
              <button type="button" onClick={() => onAttachmentsChange(attachments.filter((x) => x.id !== a.id))} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-slate-950/80 text-white flex items-center justify-center" aria-label={`Retirer ${a.name}`}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input ref={fileRef} type="file" multiple hidden accept="image/png,image/jpeg,image/webp,image/gif,text/*,.md,.csv,.json,.log" onChange={(e) => void pickFiles(e.target.files)} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={attachments.length >= MAX_ATTACHMENTS} className="assistant-round-btn" aria-label="Joindre une image ou un fichier texte" title="Joindre (image ≤ 4 Mo, texte ≤ 200 Ko)">
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (canSend) onSend(); } }}
          placeholder="Écrivez à Ketrika…"
          aria-label="Message pour Ketrika"
          enterKeyHint="send"
          className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl glass-input text-sm placeholder:text-emerald-300/40 resize-none max-h-32 leading-snug"
        />

        <button type="button" onClick={onOpenVoice} className="assistant-round-btn" aria-label="Ouvrir le mode vocal Jarvis" title="Mode vocal">
          <AudioLines className="w-4 h-4 text-cyan-300" />
        </button>

        {busy ? (
          <button type="button" onClick={onStop} className="assistant-send-btn !from-rose-500 !to-rose-400" aria-label="Arrêter la génération"><Square className="w-4 h-4 fill-current" /></button>
        ) : (
          <button type="button" onClick={onSend} disabled={!canSend} className="assistant-send-btn" aria-label="Envoyer le message"><Send className="w-4 h-4 stroke-[2.5]" /></button>
        )}
      </div>
    </div>
  );
};
