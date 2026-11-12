import LoginButton from '@/components/LoginButton';
import Logo from '@/components/Logo';

export const metadata = { title: 'ログイン' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="page" style={{ textAlign: 'center' }}>
      <div style={{ margin: '24px 0 16px' }}><Logo size={30} /></div>
      <h1>ログイン</h1>
      <p className="sub">記録を書くにはGoogleアカウントでログインしてください。</p>
      {error && <p className="err">ログインできませんでした。もう一度お試しください。</p>}
      <LoginButton next={next && next.startsWith('/') && !next.startsWith('//') ? next : '/'} />
    </div>
  );
}
