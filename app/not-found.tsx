import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty">
      <p>ページが見つかりませんでした。</p>
      <Link className="btn" href="/">トップへ戻る</Link>
    </div>
  );
}
