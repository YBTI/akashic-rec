'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  async function login() {
    setBusy(true);
    await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }
  return (
    <button className="btn dark" onClick={login} disabled={busy}>
      {busy ? '移動しています…' : 'Googleでログイン'}
    </button>
  );
}
