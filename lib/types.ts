export const TARGETS = ['神様', '聖霊様', '御心', '先生'] as const;
export type Target = (typeof TARGETS)[number];

export type BlockType = 'p' | 'h2' | 'h3' | 'q' | 'img';
export type Block =
  | { t: 'p' | 'h2' | 'h3' | 'q'; text: string }
  | { t: 'img'; path: string; cap?: string };

export type Turn = { role: 'user' | 'assistant'; content: string; display?: string };

export const BLOCK_LABELS: Record<Exclude<BlockType, 'img'>, string> = {
  p: '本文',
  h2: '大見出し',
  h3: '小見出し',
  q: '質問(Q)',
};

export const MAX_QUESTIONS = 8;

export function isTarget(v: unknown): v is Target {
  return typeof v === 'string' && (TARGETS as readonly string[]).includes(v);
}

export function normBlocks(raw: unknown): Block[] {
  const out: Block[] = [];
  if (Array.isArray(raw)) {
    for (const b of raw) {
      if (!b || typeof b !== 'object') continue;
      const o = b as Record<string, unknown>;
      if (o.t === 'img' && typeof o.path === 'string') out.push({ t: 'img', path: o.path, cap: String(o.cap ?? '') });
      else if (o.t === 'p' || o.t === 'h2' || o.t === 'h3' || o.t === 'q') out.push({ t: o.t, text: String(o.text ?? '') });
    }
  }
  return out.length ? out : [{ t: 'p', text: '' }];
}

export function imageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${path}`;
}

export function formatDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}
