import { createClient } from './supabase/server';
import { dailyLimit } from './ai';
import { isTarget, type Target, type Turn } from './types';

type Ok = { ok: true; title: string; target: Target; turns: Turn[] };
type Ng = { ok: false; res: Response };

/** AI API 共通:ログイン確認・入力チェック・利用回数の消費 */
export async function guardAiRequest(req: Request): Promise<Ok | Ng> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, res: json({ error: 'ログインが必要です。' }, 401) };

  let body: unknown;
  try { body = await req.json(); } catch { return { ok: false, res: json({ error: '不正なリクエストです。' }, 400) }; }
  const b = body as { title?: unknown; target?: unknown; turns?: unknown };
  const title = typeof b.title === 'string' ? b.title.slice(0, 120) : '';
  if (!isTarget(b.target)) return { ok: false, res: json({ error: '対象が正しくありません。' }, 400) };
  if (!Array.isArray(b.turns) || b.turns.length > 60) return { ok: false, res: json({ error: '記録の形式が正しくありません。' }, 400) };
  const turns: Turn[] = [];
  for (const t of b.turns) {
    const o = t as { role?: unknown; content?: unknown };
    if ((o.role !== 'user' && o.role !== 'assistant') || typeof o.content !== 'string') {
      return { ok: false, res: json({ error: '記録の形式が正しくありません。' }, 400) };
    }
    turns.push({ role: o.role, content: o.content.slice(0, 4000) });
  }

  const { data: allowed, error } = await supabase.rpc('consume_ai_quota', { daily_limit: dailyLimit() });
  if (error) return { ok: false, res: json({ error: '利用状況を確認できませんでした。' }, 500) };
  if (!allowed) return { ok: false, res: json({ error: '本日のAI利用回数の上限に達しました。明日また続きから再開できます。' }, 429) };

  return { ok: true, title, target: b.target, turns };
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
