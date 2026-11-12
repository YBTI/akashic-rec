import { notFound, redirect } from 'next/navigation';
import EditorClient from '@/components/EditorClient';
import { createClient } from '@/lib/supabase/server';
import { normBlocks, type Target } from '@/lib/types';

export const metadata = { title: '編集' };

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/editor/${id}`);
  const { data: p } = await supabase
    .from('posts')
    .select('id, title, target, lead, blocks, cover_path, toc, mode, status, published_at, author_id')
    .eq('id', id)
    .maybeSingle();
  if (!p || p.author_id !== user.id) notFound();
  return (
    <EditorClient
      uid={user.id}
      initial={{
        id: p.id, title: p.title, target: p.target as Target, lead: p.lead ?? '', blocks: normBlocks(p.blocks),
        cover_path: p.cover_path, toc: !!p.toc, mode: p.mode, status: p.status, published_at: p.published_at,
      }}
    />
  );
}
