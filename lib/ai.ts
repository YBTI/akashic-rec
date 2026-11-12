import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

const provider = () => (process.env.AI_PROVIDER === 'anthropic' ? 'anthropic' : 'gemini');

/** インタビューの質問用(速く安いモデル) */
export function questionModel() {
  return provider() === 'anthropic'
    ? anthropic(process.env.ANTHROPIC_QUESTION_MODEL || 'claude-haiku-5-5')
    : google(process.env.GEMINI_QUESTION_MODEL || 'gemini-2.5-flash');
}

/** 記事化用(丁寧なモデル) */
export function articleModel() {
  return provider() === 'anthropic'
    ? anthropic(process.env.ANTHROPIC_ARTICLE_MODEL || 'claude-sonnet-5-5')
    : google(process.env.GEMINI_ARTICLE_MODEL || 'gemini-2.5-flash');
}

export function dailyLimit() {
  const n = Number(process.env.AI_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : 30;
}
