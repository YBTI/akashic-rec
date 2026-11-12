import Link from 'next/link';
import Logo from './Logo';
import { createClient } from '@/lib/supabase/server';

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let avatar: string | null = null;
  let name = '';
  if (user) {
    const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle();
    avatar = data?.avatar_url ?? null;
    name = data?.display_name ?? '';
  }
  return (
    <header className="hd">
      <div className="wrap">
        <Link href="/"><Logo /></Link>
        <nav className="hd-nav">
          {user ? (
            <Link href="/me" aria-label="マイページ">
              {avatar ? <img className="avatar" src={avatar} alt="" referrerPolicy="no-referrer" /> : <span className="avatar">{name.charAt(0) || '・'}</span>}
            </Link>
          ) : (
            <Link className="btn sm" href="/login">ログイン</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
