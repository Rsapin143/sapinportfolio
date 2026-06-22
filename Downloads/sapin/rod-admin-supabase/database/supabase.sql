-- Supabase setup for the portfolio website
-- Run this in Supabase Dashboard → SQL Editor.

create table if not exists public.site_settings (
  id text primary key default 'main',
  profile jsonb not null default '{}'::jsonb,
  works jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, profile, works)
values (
  'main',
  $$ {"name": "Rodolfo", "title": "Full Stack Developer", "bio": "I craft beautiful, performant digital experiences at the intersection of design and engineering. Based in Manila, turning complex problems into elegant, user-centric solutions.", "location": "Manila, Philippines", "contactEmail": "rodolfo@gmail.com", "github": "", "linkedin": "", "profileImage": "", "skills": [{"name": "React", "level": 90}, {"name": "Node.js", "level": 85}, {"name": "TypeScript", "level": 80}, {"name": "MongoDB", "level": 75}, {"name": "UI/UX Design", "level": 72}, {"name": "Docker", "level": 65}]} $$::jsonb,
  $$ [{"id": 1, "title": "E-Commerce Platform", "description": "Full-stack e-commerce with real-time inventory, smart recommendations, and seamless checkout flow.", "tech": ["React", "Node.js", "MongoDB", "Stripe"], "images": ["https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=700&h=450&fit=crop", "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=700&h=450&fit=crop", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=700&h=450&fit=crop"], "category": "Web App", "url": "#", "video": "", "videoRatio": "16 / 9"}, {"id": 2, "title": "Analytics Dashboard", "description": "Real-time data visualization platform with interactive charts, smart reporting, and predictive insights.", "tech": ["Vue.js", "D3.js", "Python", "FastAPI"], "images": ["https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=700&h=450&fit=crop", "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=700&h=450&fit=crop", "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=700&h=450&fit=crop"], "category": "Dashboard", "url": "#", "video": "", "videoRatio": "16 / 9"}, {"id": 3, "title": "Mobile Banking App", "description": "Secure banking app with biometric authentication, real-time notifications, and smart budgeting.", "tech": ["React Native", "TypeScript", "Firebase"], "images": ["https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=700&h=450&fit=crop", "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=700&h=450&fit=crop", "https://images.unsplash.com/photo-1616077168712-fc6c788bfe49?w=700&h=450&fit=crop"], "category": "Mobile", "url": "#", "video": "", "videoRatio": "16 / 9"}] $$::jsonb
)
on conflict (id) do nothing;

-- Make the table available to Supabase Realtime.
alter table public.site_settings replica identity full;
do $$
begin
  begin
    alter publication supabase_realtime add table public.site_settings;
  exception
    when duplicate_object then null;
  end;
end $$;

-- Simple public policies for a static website.
-- This makes the site easy to run with only the anon key.
-- For production, use Supabase Auth and restrict update/insert/delete to authenticated admins.
alter table public.site_settings enable row level security;

drop policy if exists "Public read site settings" on public.site_settings;
drop policy if exists "Public insert site settings" on public.site_settings;
drop policy if exists "Public update site settings" on public.site_settings;

create policy "Public read site settings"
on public.site_settings
for select
to anon
using (true);

create policy "Public insert site settings"
on public.site_settings
for insert
to anon
with check (id = 'main');

create policy "Public update site settings"
on public.site_settings
for update
to anon
using (id = 'main')
with check (id = 'main');

-- Storage bucket for profile images and project videos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-media',
  'portfolio-media',
  true,
  524288000,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read portfolio media" on storage.objects;
drop policy if exists "Public insert portfolio media" on storage.objects;
drop policy if exists "Public update portfolio media" on storage.objects;
drop policy if exists "Public delete portfolio media" on storage.objects;

create policy "Public read portfolio media"
on storage.objects
for select
to anon
using (bucket_id = 'portfolio-media');

create policy "Public insert portfolio media"
on storage.objects
for insert
to anon
with check (bucket_id = 'portfolio-media');

create policy "Public update portfolio media"
on storage.objects
for update
to anon
using (bucket_id = 'portfolio-media')
with check (bucket_id = 'portfolio-media');

create policy "Public delete portfolio media"
on storage.objects
for delete
to anon
using (bucket_id = 'portfolio-media');
