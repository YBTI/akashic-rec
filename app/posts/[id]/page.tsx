import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ArticleBody, { Toc } from '@/components/ArticleBody';
import Inline from '@/components/Inline';
import DeletePostButton from '@/components/DeletePostButton';
import { createClient } from '@/lib/supabase/server';
import { formatDate, imageUrl, normBlocks } from '@/lib/types';

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('posts')
    .select('id, title, target, lead, blocks, cover_path, toc, mode, status, author_id, published_at, author:profiles(display_name, avatar_url)')
    .eq('id', id)
    .maybeSingle();
  const { data: { user } } = await supabase.auth.getUser();
  return { post: data as any, uid: user?.id ?? null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { post } = await load(id);
  if (!post) return {};
  return {
    title: post.title,
    description: post.lead || undefined,
    openGraph: post.cover_path ? { images: [imageUrl(post.cover_path)] } : undefined,
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const { post, uid } = await load(id);
  if (!post) notFound();
  const mine = uid === post.author_id;
  if (post.status !== 'published' && !mine) notFound();
  const blocks = normBlocks(post.blocks);
  const name = post.author?.display_name || '名前非公開のユーザー';

  return (
    <article className="art">
      {post.cover_path && <figure className="cover"><img src={imageUrl(post.cover_path)} alt="" /></figure>}
      <div className="meta">
        <span className="tag">{post.target}</span>
        {post.mode === 'interview' && <span className="badge">インタビューで作成</span>}
        {post.status !== 'published' && <span className="badge">下書き</span>}
      </div>
      <h1>{post.title}</h1>
      <div className="meta">
        {post.author?.avatar_url ? <img className="av" src={post.author.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span className="av" aria-hidden="true">{name.charAt(0)}</span>}
        <strong style={{ color: 'var(--ink)' }}>{name}</strong>
        <span>{formatDate(post.published_at)}</span>
      </div>
      {post.lead && <p className="lead"><Inline text={post.lead} /></p>}
      {post.toc && <Toc blocks={blocks} />}
      <ArticleBody blocks={blocks} />
      <div className="art-foot">
        <Link className="btn dark" href="/write">私も記録する</Link>
        {mine && (
          <>
            <Link className="btn ghost" href={`/editor/${post.id}`}>編集</Link>
            <DeletePostButton id={post.id} />
          </>
        )}
      </div>
    </article>
  );
}
