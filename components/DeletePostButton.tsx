'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DeletePostButton({ id, small }: { id: string; small?: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function onClick() {
    if (!confirm) { setConfirm(true); return; }
    setBusy(true);
    const { error } = await createClient().from('posts').delete().eq('id', id);
    setBusy(false);
    if (error) { alert('削除できませんでした。'); return; }
    router.push('/me');
    router.refresh();
  }
  return (
    <button className={small ? 'link-btn' : 'btn ghost'} onClick={onClick} disabled={busy} onBlur={() => setConfirm(false)}>
      {confirm ? 'もう一度押すと削除します' : '削除'}
    </button>
  );
}
