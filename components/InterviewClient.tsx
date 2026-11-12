'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from './Logo';
import { createClient } from '@/lib/supabase/client';
import { MAX_QUESTIONS, type Target, type Turn } from '@/lib/types';

const MicIcon = ({ s = 20 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" />
  </svg>
);
const AiMark = () => (
  <span className="mk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" opacity=".5" /></svg></span>
);

type Props = { postId: string; title: string; target: Target; initialTurns: Turn[] };

export default function InterviewClient({ postId, title, target, initialTurns }: Props) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [pending, setPending] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [answer, setAnswer] = useState('');
  const [generating, setGenerating] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceNote, setVoiceNote] = useState('');
  const [tts, setTts] = useState(true);
  const recRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const started = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const answered = turns.filter((t) => t.role === 'user').length;
  const asked = turns.filter((t) => t.role === 'assistant').length;
  const done = answered >= MAX_QUESTIONS;
  const lastQ = [...turns].reverse().find((t) => t.role === 'assistant')?.content ?? '';

  const save = useCallback(async (next: Turn[]) => {
    await supabase.from('interviews').upsert({ post_id: postId, turns: next });
  }, [postId, supabase]);

  const speak = useCallback((text: string) => {
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      speechSynthesis.speak(u);
    } catch {}
  }, []);

  const ask = useCallback(async (current: Turn[]) => {
    setErr(''); setPending('');
    abortRef.current = new AbortController();
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, target, turns: current.map(({ role, content }) => ({ role, content })) }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || '質問を用意できませんでした。');
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let text = '';
      for (;;) {
        const { done: d, value } = await reader.read();
        if (d) break;
        text += dec.decode(value, { stream: true });
        setPending(text);
      }
      text = text.trim();
      if (!text) throw new Error('質問を用意できませんでした。');
      const next: Turn[] = [...current, { role: 'assistant', content: text }];
      setTurns(next); setPending(null);
      await save(next);
      if (mode === 'voice' && tts) speak(text);
    } catch (e: any) {
      setPending(null);
      if (e?.name !== 'AbortError') setErr(e?.message || '質問を用意できませんでした。');
    }
  }, [title, target, save, mode, tts, speak]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const last = turns[turns.length - 1];
    if ((!turns.length || last.role === 'user') && answered < MAX_QUESTIONS) ask(turns);
    return () => { abortRef.current?.abort(); try { recRef.current?.stop(); speechSynthesis.cancel(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [turns, pending]);

  async function submit(content: string, display?: string) {
    const t = content.trim();
    if (!t || pending !== null) return;
    const next: Turn[] = [...turns, { role: 'user', content: t, ...(display ? { display } : {}) }];
    setTurns(next); setAnswer(''); setVoiceText('');
    await save(next);
    if (next.filter((x) => x.role === 'user').length >= MAX_QUESTIONS) return;
    ask(next);
  }

  function stopListening() {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  }

  function toggleListen() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setVoiceNote('このブラウザは音声入力に対応していません。テキストで答えるか、スマホのキーボードの音声入力を使ってください。'); return; }
    if (listening) { stopListening(); return; }
    try { speechSynthesis.cancel(); } catch {}
    const r = new SR();
    r.lang = 'ja-JP'; r.continuous = true; r.interimResults = true;
    let base = voiceText;
    r.onresult = (e: any) => {
      let fin = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t; else interim += t;
      }
      base += fin;
      setVoiceText(base + interim);
    };
    r.onerror = (e: any) => {
      setVoiceNote(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'マイクを使えませんでした。ブラウザのマイク許可を確認するか、テキストで答えてください。'
        : e.error === 'no-speech' ? '声が聞き取れませんでした。もう一度話してください。' : '音声入力でエラーが起きました。もう一度試してください。');
    };
    r.onend = () => { setListening(false); setVoiceText(base); };
    recRef.current = r;
    setVoiceNote('');
    try { r.start(); setListening(true); } catch { setVoiceNote('音声入力を開始できませんでした。'); }
  }

  async function makeArticle() {
    stopListening();
    setGenerating(true); setErr('');
    abortRef.current = new AbortController();
    try {
      const res = await fetch('/api/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, target, turns: turns.map(({ role, content }) => ({ role, content })) }),
        signal: abortRef.current.signal,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || '記事にまとめられませんでした。');
      const blocks = (j.blocks as { q: string; a: string }[]).flatMap((b) => [
        ...(b.q ? [{ t: 'q', text: b.q }] : []),
        ...(b.a ? [{ t: 'p', text: b.a }] : []),
      ]);
      const { error } = await supabase.from('posts').update({ lead: j.lead || '', blocks: blocks.length ? blocks : [{ t: 'p', text: '' }] }).eq('id', postId);
      if (error) throw new Error('記事を保存できませんでした。');
      router.push(`/editor/${postId}`);
    } catch (e: any) {
      setGenerating(false);
      if (e?.name !== 'AbortError') setErr(e?.message || '記事にまとめられませんでした。');
    }
  }

  const busy = pending !== null;
  const qNum = Math.min(Math.max(asked, 1), MAX_QUESTIONS);
  const voiceQ = busy ? (pending || '考えています…') : done ? 'インタビューはここまでです。「記事にする」で記事にまとめましょう。' : lastQ;

  return (
    <div className="iv">
      <div className="iv-top">
        <Link className="btn ghost sm" href="/me" aria-label="マイページへ(記録は保存されます)">中断</Link>
        <div className="seg" role="group" aria-label="回答方法">
          <button aria-pressed={mode === 'text'} onClick={() => { setMode('text'); stopListening(); }}>テキスト</button>
          <button aria-pressed={mode === 'voice'} onClick={() => { setMode('voice'); if (tts && !busy && lastQ) speak(lastQ); }}>音声</button>
        </div>
        <button className={`btn sm ${done ? 'primary' : 'ghost'}`} onClick={makeArticle} disabled={answered === 0 || busy || generating}>記事にする</button>
      </div>
      <div className="prog"><span>{title}({target})</span><span>質問 {qNum} / {MAX_QUESTIONS}</span></div>
      <div className="track" aria-hidden="true"><i style={{ width: `${Math.round((answered / MAX_QUESTIONS) * 100)}%` }} /></div>
      {err && <p className="err" role="alert">{err} {!busy && !done && turns[turns.length - 1]?.role !== 'assistant' && <button className="link-btn" onClick={() => ask(turns)}>もう一度試す</button>}</p>}

      {mode === 'voice' ? (
        <div className="voice">
          <p className="vq" aria-live="polite">{voiceQ}</p>
          {!done && (
            <>
              <button className={`mic ${listening ? 'on' : ''}`} onClick={toggleListen} disabled={busy} aria-label={listening ? '録音を止める' : '話して答える'}>
                <span className="r1" /><span className="r2" /><span className="core"><MicIcon s={40} /></span>
              </button>
              <p className="vt">{voiceText || (listening ? '聞いています…' : 'ボタンを押して話してください')}</p>
              {voiceNote && <p className="err">{voiceNote}</p>}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn ghost" onClick={() => setVoiceText('')} disabled={!voiceText}>言い直す</button>
                <button className="btn primary" onClick={() => { stopListening(); submit(voiceText); }} disabled={!voiceText || busy}>この回答を送る</button>
              </div>
              <label className="toggle" style={{ color: 'var(--muted)' }}>
                <input type="checkbox" checked={tts} onChange={(e) => { setTts(e.target.checked); if (!e.target.checked) try { speechSynthesis.cancel(); } catch {} }} />質問を読み上げる
              </label>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="chat" aria-live="polite">
            {turns.map((t, i) => t.role === 'assistant'
              ? <div className="ai" key={i}><AiMark /><p>{t.content}</p></div>
              : <p className="me" key={i}>{t.display || t.content}</p>)}
            {busy && <div className="ai"><AiMark /><p className={pending ? '' : 'thinking'}>{pending || '考えています…'}</p></div>}
            {done && !busy && <div className="ai"><AiMark /><p>ありがとうございました。インタビューはここまでです。お話しいただいた内容を記事にまとめましょう。</p></div>}
            <div ref={bottomRef} />
          </div>
          {!done && (
            <div className="composer">
              <div className="mini">
                <button disabled={busy} onClick={() => submit('(スキップ)別の観点から質問してください。', 'この質問はスキップしました')}>この質問をスキップ</button>
                <button disabled={busy} onClick={() => submit('(別の聞き方)直前の質問を、もっと答えやすく言い換えてください。', '別の聞き方でお願いします')}>別の聞き方で</button>
              </div>
              <div className="comp-row">
                <label htmlFor="answer" className="sr">回答</label>
                <textarea
                  className="ta" id="answer" rows={1} placeholder="回答を入力…" value={answer}
                  onChange={(e) => { setAnswer(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(answer); } }}
                />
                <button className="round" onClick={() => setMode('voice')} aria-label="音声で答える"><MicIcon /></button>
                <button className="round send" onClick={() => submit(answer)} disabled={busy || !answer.trim()} aria-label="送信">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {generating && (
        <div className="overlay" role="status">
          <Logo />
          <p>インタビューを記事にまとめています…</p>
          <button className="btn ghost" onClick={() => abortRef.current?.abort()}>中止</button>
        </div>
      )}
    </div>
  );
}
