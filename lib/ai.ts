import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

const provider = () => (process.env.AI_PROVIDER === 'anthropic' ? 'anthropic' : 'gemini');

/** インタビューの質問用(速く安いモデル) */
export function questionModel() {
  return provider() === 'anthropic'
    ? anthropic(process.env.ANTHROPIC_QUESTION_MODEL || 'claude-haiku-5-5')
    : google(process.env.GEMINI_QUESTION_MODEL || 'gemini-3.8-flash');
}

/** 記事化用(丁寧なモデル) */
export function articleModel() {
  return provider() === 'anthropic'
    ? anthropic(process.env.ANTHROPIC_ARTICLE_MODEL || 'claude-sonnet-5-5')
    : google(process.env.GEMINI_ARTICLE_MODEL || 'gemini-3.8-flash');
}

export function dailyLimit() {
  const n = Number(process.env.AI_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

/** Gemini 3 系は既定で「考える」処理が入り遅くなるため最小限にする(Claude 使用時は無視される) */
export const fastProviderOptions = {
  google: { thinkingConfig: { thinkingLevel: 'low' } },
};
