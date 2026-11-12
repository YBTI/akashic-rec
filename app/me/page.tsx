import Link from 'next/link';
import { redirect } from 'next/navigation';
import DeletePostButton from '@/components/DeletePostButton';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/types';

export const metadata = { title: 'マイページ' };

export default async function MePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/me');
  const [{ data: profile }, { data: posts }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
    supabase.from('posts').select('id, title, target, mode, status, updated_at, published_at').eq('author_id', user.id).order('updated_at', { ascending: false }),
  ]);
  const drafts = (posts ?? []).filter((p) => p.status === 'draft');
  const published = (posts ?? []).filter((p) => p.status === 'published');

  return (
    <div className="page">
      <h1>マイページ</h1>
      <p className="sub">{profile?.display_name}</p>

      <h2 className="sec-h"><span className="dot blink" aria-hidden="true" />記録中の下書き</h2>
      {drafts.length ? drafts.map((d) => (
        <div className="row" key={d.id}>
          <div className="t"><strong>{d.title || '無題の下書き'}</strong><span>{d.target} / {formatDate(d.updated_at)}</span></div>
          <Link className="btn ghost sm" href={d.mode === 'interview' ? `/interview/${d.id}` : `/editor/${d.id}`}>続ける</Link>
          <DeletePostButton id={d.id} small />
        </div>
      )) : <p className="note">記録途中の下書きはありません。</p>}

      <h2 className="sec-h"><span className="dot" aria-hidden="true" />刻まれた記録</h2>
      {published.length ? published.map((p) => (
        <div className="row" key={p.id}>
          <div className="t"><Link href={`/posts/${p.id}`}><strong>{p.title}</strong></Link><span>{p.target} / {formatDate(p.published_at)}</span></div>
          <Link className="btn ghost sm" href={`/editor/${p.id}`}>編集</Link>
        </div>
      )) : <p className="note">まだ公開した記録はありません。</p>}

      <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link className="btn primary" href="/write">新しい記録を始める</Link>
        <form action="/auth/signout" method="post"><button className="btn ghost">ログアウト</button></form>
      </div>
    </div>
  );
}
