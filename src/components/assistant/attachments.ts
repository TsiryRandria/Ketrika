import type { AssistantAttachment } from './types';

export const MAX_ATTACHMENTS = 4;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_TEXT_BYTES = 200 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|xml|html?|css|js|jsx|ts|tsx|py|java|c|cpp|sql|yml|yaml|log|ini|env\.example)$/i;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

export const readAttachments = async (
  files: File[],
  existingCount: number,
): Promise<{ added: AssistantAttachment[]; errors: string[] }> => {
  const added: AssistantAttachment[] = [];
  const errors: string[] = [];
  for (const file of files) {
    if (existingCount + added.length >= MAX_ATTACHMENTS) { errors.push(`Maximum ${MAX_ATTACHMENTS} pièces jointes par message.`); break; }
    const isImage = IMAGE_TYPES.includes(file.type);
    const isText = file.type.startsWith('text/') || file.type === 'application/json' || TEXT_EXT.test(file.name);
    if (!isImage && !isText) { errors.push(`« ${file.name} » : format non pris en charge (images ou fichiers texte).`); continue; }
    if (isImage && file.size > MAX_IMAGE_BYTES) { errors.push(`« ${file.name} » dépasse 4 Mo.`); continue; }
    if (isText && file.size > MAX_TEXT_BYTES) { errors.push(`« ${file.name} » dépasse 200 Ko.`); continue; }
    try {
      const data = isImage ? await fileToBase64(file) : await file.text();
      added.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name, size: file.size, kind: isImage ? 'image' : 'text',
        mimeType: isImage ? file.type : 'text/plain', data,
      });
    } catch {
      errors.push(`« ${file.name} » : lecture impossible.`);
    }
  }
  return { added, errors };
};

export const formatSize = (n: number) => (n < 1024 ? `${n} o` : n < 1048576 ? `${Math.round(n / 1024)} Ko` : `${(n / 1048576).toFixed(1)} Mo`);
