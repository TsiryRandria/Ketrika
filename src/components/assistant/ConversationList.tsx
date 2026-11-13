import React, { useState } from 'react';
import { Check, MessageSquare, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Conversation } from './types';

interface Props {
  conversations: Conversation[];
  activeId: string;
  disabled?: boolean;
  onNew: () => void;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

const dateLabel = (ts: number) => {
  const d = new Date(ts);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return same
    ? `Aujourd'hui ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const ConversationList: React.FC<Props> = ({ conversations, activeId, disabled, onNew, onOpen, onRename, onDelete }) => {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const commit = (id: string) => { onRename(id, draft); setEditing(null); };

  return (
    <div className="flex flex-col min-h-0 h-full">
      <button type="button" onClick={onNew} disabled={disabled} className="assistant-new-btn" aria-label="Nouvelle conversation">
        <Plus className="w-4 h-4 stroke-[3]" /> Nouvelle conversation
      </button>

      <ul className="mt-3 space-y-1.5 overflow-y-auto no-scrollbar flex-1 min-h-0" aria-label="Conversations">
        {conversations.length === 0 && <li className="text-[11px] text-emerald-300/60 px-1">Aucune conversation enregistrée.</li>}
        {conversations.map((c) => {
          const active = c.id === activeId;
          return (
            <li key={c.id} className={`rounded-2xl border transition-colors ${active ? 'bg-emerald-500/15 border-emerald-400/60' : 'bg-emerald-950/50 border-emerald-500/20 hover:border-emerald-400/40'}`}>
              {editing === c.id ? (
                <div className="flex items-center gap-1 p-2">
                  <input
                    autoFocus
                    value={draft}
                    maxLength={60}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commit(c.id); if (e.key === 'Escape') setEditing(null); }}
                    aria-label="Nouveau titre de la conversation"
                    className="flex-1 min-w-0 px-2 py-1 rounded-lg glass-input text-xs"
                  />
                  <button type="button" onClick={() => commit(c.id)} className="assistant-icon-btn" aria-label="Valider"><Check className="w-4 h-4 text-emerald-300" /></button>
                  <button type="button" onClick={() => setEditing(null)} className="assistant-icon-btn" aria-label="Annuler"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1 pr-1.5">
                  <button type="button" disabled={disabled} onClick={() => onOpen(c.id)} className="flex-1 min-w-0 text-left p-2.5 flex items-start gap-2" aria-current={active ? 'true' : undefined}>
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-white truncate">{c.title}</span>
                      <span className="block text-[10px] text-emerald-400/60 mt-0.5">{dateLabel(c.updatedAt)} · {c.messages.length} msg</span>
                    </span>
                  </button>
                  {confirmId === c.id ? (
                    <>
                      <button type="button" onClick={() => { onDelete(c.id); setConfirmId(null); }} className="px-2 py-1 rounded-lg bg-rose-500/80 text-white text-[10px] font-bold" aria-label={`Confirmer la suppression de ${c.title}`}>Supprimer ?</button>
                      <button type="button" onClick={() => setConfirmId(null)} className="assistant-icon-btn" aria-label="Annuler la suppression"><X className="w-3.5 h-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <button type="button" disabled={disabled} onClick={() => { setEditing(c.id); setDraft(c.title); }} className="assistant-icon-btn" aria-label={`Renommer ${c.title}`}><Pencil className="w-3.5 h-3.5" /></button>
                      <button type="button" disabled={disabled} onClick={() => setConfirmId(c.id)} className="assistant-icon-btn hover:!text-rose-300" aria-label={`Supprimer ${c.title}`}><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
