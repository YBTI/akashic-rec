'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TARGETS, type Target } from '@/lib/types';

export default function WriteForm() {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState<Target>(TARGETS[0]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function start(mode: 'interview' | 'text') {
    if (!title.trim()) { setErr('タイトルを入力してください。'); return; }
    setBusy(true); setErr('');
    const supabase = createClient();
    const { data, error } = await supabase
      .from('posts')
      .insert({ title: title.trim(), target, mode, blocks: [{ t: 'p', text: '' }] })
      .select('id')
      .single();
    if (error || !data) { setBusy(false); setErr('記録を作成できませんでした。'); return; }
    if (mode === 'interview') {
      await supabase.from('interviews').insert({ post_id: data.id, turns: [] });
      router.push(`/interview/${data.id}`);
    } else {
      router.push(`/editor/${data.id}`);
    }
  }

  return (
    <div className="page">
      <h1>新しい記録を始める</h1>
      <p className="sub">記録のタイトルと対象を決めましょう。タイトルはあとから変更できます。</p>
      <label className="f" htmlFor="w-title">タイトル</label>
      <input className="in" id="w-title" maxLength={80} placeholder="記録のタイトル" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="f" htmlFor="w-target">対象</label>
      <select className="sel" id="w-target" value={target} onChange={(e) => setTarget(e.target.value as Target)}>
        {TARGETS.map((t) => <option key={t}>{t}</option>)}
      </select>
      <p className="err" role="alert">{err}</p>
      <div className="choices">
        <button className="choice" disabled={busy} onClick={() => start('interview')}>
          <strong>インタビューで書く</strong>
          <span>AIの質問に答えていくと、記事の下書きができあがります。テキストでも音声でも答えられます。</span>
        </button>
        <button className="choice" disabled={busy} onClick={() => start('text')}>
          <strong>自分で書く</strong>
          <span>最初から自分の言葉で自由に書きます。</span>
        </button>
      </div>
    </div>
  );
}
