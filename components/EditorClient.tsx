'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BLOCK_LABELS, TARGETS, imageUrl, type Block, type Target } from '@/lib/types';

type Doc = {
  id: string; title: string; target: Target; lead: string; blocks: Block[];
  cover_path: string | null; toc: boolean; mode: string; status: string; published_at: string | null;
};
type Sel = { key: 'lead' | number; s: number; e: number };
type TextKind = keyof typeof BLOCK_LABELS;
const KINDS = Object.keys(BLOCK_LABELS) as TextKind[];

async function prepImage(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const max = 1600;
    if (bmp.width <= max && file.size < 1_500_000) return file;
    const sc = Math.min(1, max / bmp.width);
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob((b) => r(b || file), 'image/jpeg', 0.85));
  } catch { return file; }
}

export default function EditorClient({ initial, uid }: { initial: Doc; uid: string }) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const [doc, setDoc] = useState<Doc>(initial);
  const [status, setStatus] = useState(initial.status === 'published' ? '公開中' : '下書き');
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const sel = useRef<Sel | null>(null);
  const linkSel = useRef<Sel | null>(null);
  const pickFor = useRef<{ kind: 'cover' } | { kind: 'block'; at: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async (d: Doc, extra: Record<string, unknown> = {}) => {
    const { error } = await supabase.from('posts').update({
      title: d.title, target: d.target, lead: d.lead, blocks: d.blocks, cover_path: d.cover_path, toc: d.toc, ...extra,
    }).eq('id', d.id);
    return !error;
  }, [supabase]);

  // 自動保存(公開済み記事は「更新して刻む」まで反映しない)
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (doc.status === 'published') { setStatus('未反映の変更があります'); return; }
    setStatus('保存中…');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => setStatus((await persist(doc)) ? '下書き保存済み' : '保存できませんでした'), 1200);
  }, [doc, persist]);

  // テキストエリアの高さを内容に合わせる
  useEffect(() => {
    rootRef.current?.querySelectorAll<HTMLTextAreaElement>('textarea.auto').forEach((t) => {
      t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px';
    });
  });

  const update = (patch: Partial<Doc>) => setDoc((d) => ({ ...d, ...patch }));
  const setBlocks = (fn: (bs: Block[]) => Block[]) => setDoc((d) => ({ ...d, blocks: fn([...d.blocks]) }));
  const setBlock = (i: number, patch: Record<string, string>) =>
    setBlocks((bs) => { bs[i] = { ...bs[i], ...patch } as Block; return bs; });

  const track = (key: Sel['key']) => (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const t = e.currentTarget; sel.current = { key, s: t.selectionStart, e: t.selectionEnd };
  };
  const getText = (k: Sel['key']) => (k === 'lead' ? doc.lead : ((doc.blocks[k] as { text?: string })?.text ?? ''));
  const setText = (k: Sel['key'], v: string) => (k === 'lead' ? update({ lead: v }) : setBlock(k, { text: v }));
  const fieldEl = (k: Sel['key']) =>
    rootRef.current?.querySelector<HTMLTextAreaElement>(k === 'lead' ? '[data-lead]' : `[data-b="${k}"]`) ?? null;

  function bold() {
    const s = sel.current;
    if (!s) { setErr('太字にする文字を選んでください。'); return; }
    const v = getText(s.key); let nv: string, ns: number, ne: number;
    if (s.s === s.e) { nv = v.slice(0, s.s) + '**太字**' + v.slice(s.e); ns = s.s + 2; ne = s.s + 4; }
    else {
      const mid = v.slice(s.s, s.e);
      if (/^\*\*[\s\S]+\*\*$/.test(mid)) { nv = v.slice(0, s.s) + mid.slice(2, -2) + v.slice(s.e); ns = s.s; ne = s.e - 4; }
      else { nv = v.slice(0, s.s) + '**' + mid + '**' + v.slice(s.e); ns = s.s + 2; ne = s.e + 2; }
    }
    setText(s.key, nv); setErr('');
    requestAnimationFrame(() => { const el = fieldEl(s.key); if (el) { el.focus(); el.setSelectionRange(ns, ne); } });
  }
  function openLink() {
    if (!sel.current) { setErr('リンクにする文字を選ぶか、本文にカーソルを置いてください。'); return; }
    linkSel.current = { ...sel.current }; setLinkUrl(''); setLinkOpen(true); setErr('');
  }
  function applyLink() {
    const s = linkSel.current, url = linkUrl.trim();
    if (!/^https?:\/\/[^\s()]+$/.test(url)) { setErr('https:// から始まるURLを入力してください。'); return; }
    if (!s) return;
    const v = getText(s.key);
    const label = (v.slice(s.s, s.e) || 'リンク').replace(/[[\]\n]/g, '');
    setText(s.key, v.slice(0, s.s) + `[${label}](${url})` + v.slice(s.e));
    setLinkOpen(false); setErr(''); sel.current = null;
  }

  function pick(target: { kind: 'cover' } | { kind: 'block'; at: number }) {
    if (uploading) return;
    pickFor.current = target;
    if (fileRef.current) { fileRef.current.value = ''; fileRef.current.click(); }
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0], target = pickFor.current; pickFor.current = null;
    if (!f || !target) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) { setErr('JPEG・PNG・WebP・GIFの画像を選んでください。'); return; }
    setUploading(true); setErr('');
    try {
      const blob = await prepImage(f);
      const ext = blob.type === 'image/jpeg' ? 'jpg' : (blob.type.split('/')[1] || 'jpg');
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('images').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
      if (error) throw error;
      if (target.kind === 'cover') update({ cover_path: path });
      else setBlocks((bs) => { bs.splice(target.at, 0, { t: 'img', path, cap: '' }); return bs; });
    } catch {
      setErr('画像をアップロードできませんでした。');
    }
    setUploading(false);
  }

  function insert(i: number, t: TextKind | 'img') {
    setInsertAt(null);
    if (t === 'img') { pick({ kind: 'block', at: i + 1 }); return; }
    setBlocks((bs) => { bs.splice(i + 1, 0, { t, text: '' }); return bs; });
    requestAnimationFrame(() => fieldEl(i + 1)?.focus());
  }
  function move(i: number, d: number) {
    setBlocks((bs) => { const j = i + d; if (j < 0 || j >= bs.length) return bs; [bs[i], bs[j]] = [bs[j], bs[i]]; return bs; });
  }

  async function publish() {
    const blocks = doc.blocks
      .map((b) => (b.t === 'img' ? { ...b, cap: (b.cap || '').trim() } : { ...b, text: b.text.trim() }))
      .filter((b) => (b.t === 'img' ? !!b.path : !!b.text)) as Block[];
    if (!doc.title.trim()) { setErr('タイトルを入力してください。'); return; }
    if (!blocks.some((b) => b.t !== 'img')) { setErr('本文を入力してください。'); return; }
    setPublishing(true);
    if (timer.current) clearTimeout(timer.current);
    const ok = await persist({ ...doc, title: doc.title.trim(), blocks }, {
      status: 'published', published_at: doc.published_at ?? new Date().toISOString(),
    });
    if (!ok) { setPublishing(false); setErr('公開できませんでした。もう一度お試しください。'); return; }
    router.push(`/posts/${doc.id}`);
    router.refresh();
  }

  const insRow = (i: number) => (
    <div className="ins">
      <button className="plus" onClick={() => setInsertAt(insertAt === i ? null : i)} aria-expanded={insertAt === i} aria-label="ここにブロックを追加">+</button>
      {insertAt === i && (
        <div className="menu">
          {KINDS.map((k) => <button key={k} onClick={() => insert(i, k)}>{BLOCK_LABELS[k]}</button>)}
          <button onClick={() => insert(i, 'img')}>画像</button>
        </div>
      )}
    </div>
  );

  const n = doc.blocks.length;
  return (
    <div className="ed" ref={rootRef}>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onFile} />
      <div className="status">
        <span className="dot blink" aria-hidden="true" /><span className="rec" aria-hidden="true">REC</span>
        <span aria-live="polite">{uploading ? '画像をアップロード中…' : status}</span>
      </div>

      <div style={{ marginTop: 14 }}>
        {doc.cover_path ? (
          <figure className="cover-ed">
            <img src={imageUrl(doc.cover_path)} alt="見出し画像" />
            <button className="btn dark sm" onClick={() => update({ cover_path: null })}>画像を外す</button>
          </figure>
        ) : (
          <button className="cover-add" onClick={() => pick({ kind: 'cover' })}>見出し画像を追加</button>
        )}
      </div>

      <textarea className="bare auto t-title" rows={1} maxLength={80} aria-label="タイトル" placeholder="記事タイトル"
        value={doc.title} onChange={(e) => update({ title: e.target.value })} />
      <div className="opts">
        <label className="toggle">対象
          <select className="sel" value={doc.target} onChange={(e) => update({ target: e.target.value as Target })}>
            {TARGETS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="toggle"><input type="checkbox" checked={doc.toc} onChange={(e) => update({ toc: e.target.checked })} />目次を表示する</label>
      </div>
      <textarea className="bare auto t-lead" rows={1} aria-label="導入文" placeholder="導入文(任意)" data-lead
        value={doc.lead} onChange={(e) => update({ lead: e.target.value })} onSelect={track('lead')} />

      {insRow(-1)}
      {doc.blocks.map((b, i) => (
        <div key={i}>
          <div className="eb">
            {b.t === 'img' ? (
              <figure className="ed-fig">
                <img src={imageUrl(b.path)} alt={b.cap || ''} />
                <input className="bare" aria-label="画像のキャプション" placeholder="キャプションを入力(任意)" value={b.cap || ''} onChange={(e) => setBlock(i, { cap: e.target.value })} />
              </figure>
            ) : b.t === 'q' ? (
              <div className="b-q-wrap"><span aria-hidden="true">Q</span>
                <textarea className="bare auto b-q" rows={1} data-b={i} aria-label="質問" placeholder="質問" value={b.text} onChange={(e) => setBlock(i, { text: e.target.value })} />
              </div>
            ) : (
              <textarea className={`bare auto b-${b.t}`} rows={1} data-b={i} aria-label={BLOCK_LABELS[b.t]}
                placeholder={b.t === 'p' ? 'ご自由にお書きください' : BLOCK_LABELS[b.t]}
                value={b.text} onChange={(e) => setBlock(i, { text: e.target.value })}
                onSelect={b.t === 'p' ? track(i) : undefined} />
            )}
            <div className="tools">
              {b.t !== 'img' && (
                <select aria-label="ブロックの種類" value={b.t} onChange={(e) => setBlock(i, { t: e.target.value })}>
                  {KINDS.map((k) => <option key={k} value={k}>{BLOCK_LABELS[k]}</option>)}
                </select>
              )}
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="上へ移動">↑</button>
              <button onClick={() => move(i, 1)} disabled={i === n - 1} aria-label="下へ移動">↓</button>
              <button onClick={() => setBlocks((bs) => { bs.splice(i, 1); return bs; })} disabled={n === 1}>削除</button>
            </div>
          </div>
          {insRow(i)}
        </div>
      ))}

      <p className="err" role="alert">{err}</p>
      <div className="bar">
        <div className="fmtbar" role="toolbar" aria-label="文字の装飾">
          <button className="fb" onMouseDown={(e) => e.preventDefault()} onClick={bold} aria-label="太字"><b>B</b></button>
          <button className="fb" onMouseDown={(e) => e.preventDefault()} onClick={openLink}>リンク</button>
          {linkOpen && (
            <>
              <label htmlFor="link-url" className="sr">リンク先のURL</label>
              <input className="in" id="link-url" type="url" inputMode="url" placeholder="https://" autoFocus value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }} />
              <button className="fb" onClick={applyLink}>追加</button>
              <button className="fb" onClick={() => setLinkOpen(false)}>やめる</button>
            </>
          )}
        </div>
        {doc.mode === 'interview' && doc.status !== 'published' && <Link className="btn ghost" href={`/interview/${doc.id}`}>インタビューに戻る</Link>}
        <span style={{ flex: 1 }} />
        <button className="btn primary" onClick={publish} disabled={uploading || publishing}>
          {doc.status === 'published' ? '更新して刻む' : '刻む(公開)'}
        </button>
      </div>
    </div>
  );
}
