import { notFound, redirect } from 'next/navigation';
import InterviewClient from '@/components/InterviewClient';
import { createClient } from '@/lib/supabase/server';
import type { Target, Turn } from '@/lib/types';

export const metadata = { title: 'インタビュー' };

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/interview/${id}`);
  const { data: post } = await supabase.from('posts').select('id, title, target, author_id').eq('id', id).maybeSingle();
  if (!post || post.author_id !== user.id) notFound();
  const { data: iv } = await supabase.from('interviews').select('turns').eq('post_id', id).maybeSingle();
  return <InterviewClient postId={post.id} title={post.title} target={post.target as Target} initialTurns={(iv?.turns as Turn[]) ?? []} />;
}
