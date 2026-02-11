-- MVP schema for melody extraction and Kunkunshi conversion

create extension if not exists "pgcrypto";

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('upload', 'record', 'youtube')),
  youtube_url text,
  audio_path text,
  key_root text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transcriptions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  status text not null check (status in ('queued', 'processing', 'done', 'failed')),
  notes_json jsonb,
  beats_json jsonb,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  transcription_id uuid not null references public.transcriptions (id) on delete cascade,
  strategy text not null,
  kunkunshi_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.songs enable row level security;
alter table public.transcriptions enable row level security;
alter table public.conversions enable row level security;

create policy "songs_owner_select" on public.songs
for select using (auth.uid() = user_id);

create policy "songs_owner_insert" on public.songs
for insert with check (auth.uid() = user_id);

create policy "songs_owner_update" on public.songs
for update using (auth.uid() = user_id);

create policy "transcriptions_owner_rw" on public.transcriptions
for all
using (
  exists (
    select 1 from public.songs s
    where s.id = transcriptions.song_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.songs s
    where s.id = transcriptions.song_id
      and s.user_id = auth.uid()
  )
);

create policy "conversions_owner_rw" on public.conversions
for all
using (
  exists (
    select 1
    from public.transcriptions t
    join public.songs s on s.id = t.song_id
    where t.id = conversions.transcription_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.transcriptions t
    join public.songs s on s.id = t.song_id
    where t.id = conversions.transcription_id
      and s.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do nothing;

create policy "audio_read_public" on storage.objects
for select using (bucket_id = 'audio');

create policy "audio_owner_insert" on storage.objects
for insert with check (
  bucket_id = 'audio'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "audio_owner_update" on storage.objects
for update using (
  bucket_id = 'audio'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "audio_owner_delete" on storage.objects
for delete using (
  bucket_id = 'audio'
  and auth.uid()::text = (storage.foldername(name))[1]
);
