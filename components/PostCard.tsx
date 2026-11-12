import Link from 'next/link';
import { formatDate, imageUrl } from '@/lib/types';

export type PostListItem = {
  id: string;
  title: string;
  target: string;
  mode: string;
  cover_path: string | null;
  published_at: string | null;
  author: { display_name: string | null; avatar_url: string | null } | null;
};

export default function PostCard({ p }: { p: PostListItem }) {
  const name = p.author?.display_name || '名前非公開のユーザー';
  return (
    <Link className="card" href={`/posts/${p.id}`}>
      <div className="ct">
        <span className="tag">{p.target}</span>
        <h2>{p.title}</h2>
        <div className="meta">
          {p.author?.avatar_url ? <img className="av" src={p.author.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span className="av" aria-hidden="true">{name.charAt(0)}</span>}
          {name}
          <span>{formatDate(p.published_at)}</span>
          {p.mode === 'interview' && <span className="badge">インタビュー</span>}
        </div>
      </div>
      {p.cover_path && <span className="thumb"><img src={imageUrl(p.cover_path)} alt="" loading="lazy" /></span>}
    </Link>
  );
}
