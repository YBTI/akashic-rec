import { redirect } from 'next/navigation';
import WriteForm from '@/components/WriteForm';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: '新しい記録' };

export default async function WritePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/write');
  return <WriteForm />;
}
