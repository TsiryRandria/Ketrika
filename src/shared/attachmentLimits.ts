export type AttachmentKind = 'image' | 'text';

export interface AssistantAttachmentPayload {
  id: string;
  name: string;
  mimeType: string;
  kind: AttachmentKind;
  rawSize: number;
  base64Data?: string;
  textContent?: string;
}

export interface AttachmentMeta {
  id: string;
  name: string;
  mimeType: string;
  kind: AttachmentKind;
  rawSize: number;
  encodedSize: number;
  previewUrl?: string;
}

// Limites alignées entre le frontend (Jarvis) et le serveur Express
export const MAX_ATTACHMENT_COUNT = 5;
export const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 Mo brut par fichier
export const MAX_TOTAL_RAW_BYTES = 4 * 1024 * 1024; // 4 Mo brut au total

// Base64 ajoute ~33.33 % (4 caractères pour 3 octets)
export const estimateBase64Bytes = (rawBytes: number): number => {
  if (rawBytes <= 0) return 0;
  return Math.ceil(rawBytes / 3) * 4;
};

// Limite d'un fichier après encodage Base64 (~2,67 Mo pour 2 Mo brut)
export const MAX_FILE_BASE64_BYTES = estimateBase64Bytes(MAX_FILE_BYTES);

// Limite totale encodée acceptée (Base64 / contenu texte) : 5,5 Mo (~5 767 168 octets)
// Pour 4 Mo brut en Base64 : ceil(4 194 304 / 3) * 4 = 5 592 408 octets (~5,33 Mo)
export const MAX_TOTAL_ENCODED_BYTES = Math.floor(5.5 * 1024 * 1024);

// Limite totale du payload JSON (message + contexte + pièces jointes encodées)
export const MAX_JSON_PAYLOAD_BYTES = 6 * 1024 * 1024; // 6 Mo

// Limite configurée sur express.json() (marge technique au-dessus de MAX_JSON_PAYLOAD_BYTES)
export const EXPRESS_JSON_LIMIT = '7mb';
export const EXPRESS_JSON_LIMIT_BYTES = 7 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

export const ALLOWED_TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.json',
  '.log',
  '.xml',
  '.yaml',
  '.yml',
  '.html',
  '.htm',
  '.css',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.sql',
]);

export const formatBytesFr = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2).replace('.', ',')} Mo`;
};

export const estimateDecodedBase64Bytes = (base64: string): number => {
  const cleaned = base64.replace(/\s+/g, '');
  if (!cleaned) return 0;
  let padding = 0;
  if (cleaned.endsWith('==')) padding = 2;
  else if (cleaned.endsWith('=')) padding = 1;
  return Math.max(0, Math.floor((cleaned.length * 3) / 4) - padding);
};

export const detectAttachmentKind = (
  fileName: string,
  mimeType: string
): { kind: AttachmentKind; normalizedMime: string } | null => {
  const lowerMime = (mimeType || '').toLowerCase().trim();
  if (ALLOWED_IMAGE_MIME_TYPES.has(lowerMime)) {
    return {
      kind: 'image',
      normalizedMime: lowerMime === 'image/jpg' ? 'image/jpeg' : lowerMime,
    };
  }

  const extMatch = /\.([a-z0-9]+)$/i.exec(fileName || '');
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';

  if (
    lowerMime.startsWith('text/') ||
    lowerMime === 'application/json' ||
    lowerMime === 'application/xml' ||
    lowerMime === 'application/javascript' ||
    lowerMime === 'application/x-yaml' ||
    ALLOWED_TEXT_EXTENSIONS.has(ext)
  ) {
    return {
      kind: 'text',
      normalizedMime: lowerMime || (ext === '.json' ? 'application/json' : 'text/plain'),
    };
  }

  // Fallback par extension pour les images si le navigateur ne fournit pas le MIME
  if (ext === '.png') return { kind: 'image', normalizedMime: 'image/png' };
  if (ext === '.jpg' || ext === '.jpeg') return { kind: 'image', normalizedMime: 'image/jpeg' };
  if (ext === '.webp') return { kind: 'image', normalizedMime: 'image/webp' };
  if (ext === '.gif') return { kind: 'image', normalizedMime: 'image/gif' };

  return null;
};
