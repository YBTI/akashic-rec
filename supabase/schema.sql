-- =========================================================
-- Akashic REC データベース定義
-- Supabase の SQL Editor に貼り付けて一度だけ実行してください
-- =========================================================

-- ---------- プロフィール ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles are readable by everyone" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);

-- Googleログイン時に自動でプロフィールを作成
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 記事(下書きと公開記事を同じ表で管理) ----------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null default '',
  target text not null check (target in ('神様','聖霊様','御心','先生')),
  lead text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  cover_path text,
  toc boolean not null default false,
  mode text not null default 'text' check (mode in ('text','interview')),
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists posts_published_idx on public.posts (status, published_at desc);
create index if not exists posts_author_idx on public.posts (author_id, updated_at desc);
alter table public.posts enable row level security;
create policy "published posts are public" on public.posts for select
  using (status = 'published' or auth.uid() = author_id);
create policy "users insert own posts" on public.posts for insert with check (auth.uid() = author_id);
create policy "users update own posts" on public.posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "users delete own posts" on public.posts for delete using (auth.uid() = author_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();

-- ---------- インタビュー記録(本人だけが読める) ----------
create table if not exists public.interviews (
  post_id uuid primary key references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  turns jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.interviews enable row level security;
create policy "users manage own interviews" on public.interviews for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- AI利用回数の制限 ----------
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
-- ポリシーは作らない(下の関数からのみ更新)

create or replace function public.consume_ai_quota(daily_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare c int;
begin
  if auth.uid() is null then return false; end if;
  insert into public.ai_usage (user_id, day, count) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into c;
  return c <= daily_limit;
end $$;
revoke all on function public.consume_ai_quota(int) from public;
grant execute on function public.consume_ai_quota(int) to authenticated;

-- ---------- 画像(Storage) ----------
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

create policy "users upload images to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own images" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
