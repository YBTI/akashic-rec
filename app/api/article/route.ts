import { generateObject } from 'ai';
import { z } from 'zod';
import { articleModel } from '@/lib/ai';
import { guardAiRequest, json } from '@/lib/guard';
import { articlePrompt } from '@/lib/prompts';

export const maxDuration = 60;

const schema = z.object({
  lead: z.string(),
  blocks: z.array(z.object({ q: z.string(), a: z.string() })),
});

export async function POST(req: Request) {
  const g = await guardAiRequest(req);
  if (!g.ok) return g.res;

  // 質問と回答の組にする(スキップ・言い換え依頼は除く)
  const pairs: string[] = [];
  let q = '';
  for (const t of g.turns) {
    if (t.role === 'assistant') q = t.content;
    else if (!/^[((](スキップ|別の聞き方)/.test(t.content)) pairs.push(`Q: ${q}\nA: ${t.content}`);
  }
  if (!pairs.length) return json({ error: 'まだ回答がありません。' }, 400);

  try {
    const { object } = await generateObject({
      model: articleModel(),
      schema,
      prompt: articlePrompt(g.title, g.target, pairs.join('\n\n')),
      maxOutputTokens: 4000,
    });
    return json(object);
  } catch {
    return json({ error: '記事にまとめられませんでした。もう一度お試しください。' }, 500);
  }
}
