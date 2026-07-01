-- Run this in Supabase SQL Editor
-- Creates the devlog posts table with author whitelisting

create table posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  username    text,
  avatar_url  text,
  title       text not null,
  body        text not null,
  image_urls  text[],
  created_at  timestamptz default now()
);

alter table posts enable row level security;

-- anyone can read posts
create policy "anyone can read posts"
  on posts for select using (true);

-- only whitelisted users can insert
create policy "devs insert posts"
  on posts for insert
  with check (auth.uid()::text = user_id);

-- only the author can delete their own post
create policy "devs delete own posts"
  on posts for delete
  using (auth.uid()::text = user_id);

-- whitelisted dev Discord user IDs
-- add your Discord user ID and your devs' IDs here
create table dev_whitelist (
  user_id text primary key,
  display_name text
);

-- INSERT YOUR USER IDS HERE
-- you can find your Discord user ID by going to Discord settings
-- → Advanced → enable Developer Mode, then right-click your name → Copy User ID
-- example:
-- insert into dev_whitelist (user_id, display_name) values ('123456789012345678', 'alfie');
-- insert into dev_whitelist (user_id, display_name) values ('987654321098765432', 'other dev');
