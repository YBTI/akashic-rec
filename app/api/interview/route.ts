import { streamText } from 'ai';
import { questionModel, fastProviderOptions } from '@/lib/ai';
import { guardAiRequest, json } from '@/lib/guard';
import { interviewSystem, INTERVIEW_START } from '@/lib/prompts';

export const maxDuration = 60;

export async function POST(req: Request) {
  const t0 = Date.now();
  const g = await guardAiRequest(req);
  if (!g.ok) return g.res;
  console.log(`[interview] guard ok ${Date.now() - t0}ms`);
  let first = 0;

  const messages = [{ role: 'user' as const, content: INTERVIEW_START }, ...g.turns.map((t) => ({ role: t.role, content: t.content }))];
  if (messages[messages.length - 1].role !== 'user') return json({ error: '回答がありません。' }, 400);

  try {
    const result = streamText({
      model: questionModel(),
      system: interviewSystem(g.title, g.target),
      messages,
      maxOutputTokens: 1500,
      temperature: 0.7,
      providerOptions: fastProviderOptions,
      abortSignal: AbortSignal.timeout(50_000),
      onChunk: () => {
        if (!first) { first = Date.now(); console.log(`[interview] first chunk ${first - t0}ms`); }
      },
      onFinish: ({ finishReason, usage }) =>
        console.log(`[interview] finish ${Date.now() - t0}ms reason=${finishReason} usage=${JSON.stringify(usage)}`),
      onError: ({ error }) => console.error(`[interview] AI error after ${Date.now() - t0}ms:`, error),
    });
    return result.toTextStreamResponse();
  } catch (e) {
    console.error('[interview] AI error:', e);
    return json({ error: '質問を用意できませんでした。' }, 500);
  }
}
