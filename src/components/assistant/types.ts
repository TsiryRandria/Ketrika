export type AssistantRole = 'user' | 'assistant';

export interface AssistantAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: 'image' | 'text';
  /** base64 (images) ou texte brut (fichiers texte) */
  data: string;
}

export type UndoInfo =
  | { kind: 'task' | 'note' | 'project' | 'transaction'; refId: string }
  | { kind: 'toggle-task'; refId: string }
  | { kind: 'update-task'; refId: string; prev: Record<string, unknown> }
  | { kind: 'favorite-job'; refId: string };

/** Action exécutée par l'IA, affichée dans une carte « Ketrika a fait : … » */
export interface AssistantAction {
  id: string;
  tool: string;
  label: string;
  ok: boolean;
  /** Présent seulement si l'action est annulable */
  undo?: UndoInfo;
  undone?: boolean;
}

export interface AssistantMessage {
  id: string;
  role: AssistantRole;
  text: string;
  timestamp: string;
  createdAt: number;
  attachments?: AssistantAttachment[];
  actions?: AssistantAction[];
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AssistantMessage[];
}

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';
