import React from 'react';

/** Rendu markdown léger : gras, italique, code, liens http(s)/mailto, titres, listes, blocs de code. Pas de HTML brut. */
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)\s]+\)|\*[^*\s][^*]*\*)/g;

const renderInline = (text: string, keyBase: string): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith('**')) out.push(<strong key={key} className="font-bold text-white">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={key} className="assistant-inline-code">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('[')) {
      const mm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (mm) out.push(<a key={key} href={mm[2]} target="_blank" rel="noopener noreferrer" className="assistant-link">{mm[1]}</a>);
    } else out.push(<em key={key} className="italic">{tok.slice(1, -1)}</em>);
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

type Block =
  | { t: 'code'; lang: string; body: string }
  | { t: 'h'; level: number; text: string }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'p'; text: string };

const parse = (src: string): Block[] => {
  const lines = src.replace(/\r/g, '').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) body.push(lines[i++]);
      i++;
      blocks.push({ t: 'code', lang, body: body.join('\n') });
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { blocks.push({ t: 'h', level: h[1].length, text: h[2] }); i++; continue; }
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*•]\s+/, ''));
      blocks.push({ t: 'ul', items }); continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      blocks.push({ t: 'ol', items }); continue;
    }
    if (!line.trim()) { i++; continue; }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*[-*•]\s|\s*\d+[.)]\s|```)/.test(lines[i])) para.push(lines[i++]);
    blocks.push({ t: 'p', text: para.join('\n') });
  }
  return blocks;
};

export const Markdown: React.FC<{ text: string }> = ({ text }) => {
  const blocks = React.useMemo(() => parse(text), [text]);
  return (
    <div className="assistant-md space-y-2">
      {blocks.map((b, bi) => {
        const k = `b${bi}`;
        switch (b.t) {
          case 'code':
            return <pre key={k} className="assistant-code-block"><code>{b.body}</code></pre>;
          case 'h':
            return <p key={k} className="font-extrabold text-white text-[0.95em] mt-1">{renderInline(b.text, k)}</p>;
          case 'ul':
            return <ul key={k} className="list-disc pl-5 space-y-0.5 marker:text-emerald-400">{b.items.map((it, ii) => <li key={ii}>{renderInline(it, `${k}-${ii}`)}</li>)}</ul>;
          case 'ol':
            return <ol key={k} className="list-decimal pl-5 space-y-0.5 marker:text-emerald-400">{b.items.map((it, ii) => <li key={ii}>{renderInline(it, `${k}-${ii}`)}</li>)}</ol>;
          default:
            return <p key={k} className="whitespace-pre-wrap">{renderInline(b.text, k)}</p>;
        }
      })}
    </div>
  );
};
