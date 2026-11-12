import Link from 'next/link';
import PostCard, { type PostListItem } from '@/components/PostCard';
import { createClient } from '@/lib/supabase/server';
import { TARGETS, isTarget } from '@/lib/types';

export default async function Home({ searchParams }: { searchParams: Promise<{ target?: string }> }) {
  const { target } = await searchParams;
  const current = isTarget(target) ? target : null;
  const supabase = await createClient();
  let q = supabase
    .from('posts')
    .select('id, title, target, mode, cover_path, published_at, author:profiles(display_name, avatar_url)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);
  if (current) q = q.eq('target', current);
  const { data, error } = await q;
  const posts = (data ?? []) as unknown as PostListItem[];

  return (
    <>
      <section className="hero">
        <h1 className="tagline">あの人がいた証を、<br />ここに刻む。</h1>
        <p className="intro">Akashic REC(アカシックレコード)は、あなたを救ってくれた存在との経験を、インタビュー形式で記録して残す場所です。</p>
      </section>
      <nav className="chips" aria-label="対象で絞り込む">
        <Link className="chip" href="/" aria-current={current === null}>すべて</Link>
        {TARGETS.map((t) => (
          <Link key={t} className="chip" href={`/?target=${encodeURIComponent(t)}`} aria-current={current === t}>{t}</Link>
        ))}
      </nav>
      {error && <p className="note">記録を読み込めませんでした。時間をおいて再読み込みしてください。</p>}
      {!error && posts.length === 0 ? (
        <div className="empty">
          <p>{current ? 'この対象の記録はまだありません。' : 'まだ記録がありません。最初の証を刻みましょう。'}</p>
          <Link className="btn primary" href="/write">記録を始める</Link>
        </div>
      ) : (
        posts.map((p) => <PostCard key={p.id} p={p} />)
      )}
      <div style={{ height: 100 }} />
      <Link className="btn primary fab" href="/write">書く</Link>
    </>
  );
}
