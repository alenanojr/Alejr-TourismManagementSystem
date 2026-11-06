-- Visayas Tourism – Supabase schema
-- Tables, Row Level Security, and the RPC functions the React client calls.
-- Feedback rows are written only by the submit-feedback Edge Function (VADER runs there).

-- ───────────────────────── Helpers ─────────────────────────

-- "Today" on the tourist's calendar, not the server's (UTC).
create or replace function public.manila_today()
returns date language sql stable
as $$ select (now() at time zone 'Asia/Manila')::date $$;

-- ───────────────────────── Tables ─────────────────────────

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  email      text not null default '',
  role       text not null default 'tourist' check (role in ('tourist', 'admin')),
  created_at timestamptz not null default now()
);

create table public.destinations (
  id          bigint generated always as identity primary key,
  name        text not null,
  province    text not null,
  region      text not null check (region in ('Luzon', 'Visayas', 'Mindanao')),
  category    text not null default 'beach'
              check (category in ('beach', 'island', 'falls', 'marine', 'mountain', 'heritage')),
  description text,
  image_url   text,
  price       numeric(10, 2) not null default 0,
  created_at  timestamptz not null default now()
);

create table public.bookings (
  id             bigint generated always as identity primary key,
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  destination_id bigint not null references public.destinations (id) on delete cascade,
  visit_date     date not null,
  guests         int not null default 1 check (guests between 1 and 50),
  status         text not null default 'confirmed'
                 check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at     timestamptz not null default now()
);
create index bookings_user_idx on public.bookings (user_id, visit_date desc);

create table public.feedback (
  id              bigint generated always as identity primary key,
  booking_id      bigint not null unique references public.bookings (id) on delete cascade,
  destination_id  bigint not null references public.destinations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  rating          smallint not null check (rating between 1 and 5),
  comment         text not null check (char_length(btrim(comment)) between 10 and 2000),
  tags            text[] not null default '{}'
                  check (tags <@ array['Cleanliness', 'Accessibility', 'Safety',
                                       'Staff/Guides', 'Value for Money', 'Scenery']::text[]),
  compound        double precision not null check (compound between -1 and 1),
  pos             double precision not null check (pos between 0 and 1),
  neu             double precision not null check (neu between 0 and 1),
  neg             double precision not null check (neg between 0 and 1),
  sentiment_label text not null check (sentiment_label in ('Positive', 'Neutral', 'Negative')),
  created_at      timestamptz not null default now()
);
create index feedback_destination_created_idx on public.feedback (destination_id, created_at desc);
create index feedback_user_idx on public.feedback (user_id, created_at desc);
create index feedback_label_created_idx on public.feedback (sentiment_label, created_at desc);

-- ───────────────────────── Auth glue ─────────────────────────

-- Every new auth user gets a profile; the name comes from sign-up metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

-- A booking can be rated once the visit happened: the date has passed or an admin
-- marked it completed. Pending/cancelled bookings never count as a visit.
create or replace function public.booking_is_rateable(b public.bookings)
returns boolean language sql stable
as $$
  select b.status in ('confirmed', 'completed')
     and (b.status = 'completed' or b.visit_date < public.manila_today())
$$;

-- ───────────────────────── Row Level Security ─────────────────────────

alter table public.profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.bookings enable row level security;
alter table public.feedback enable row level security;

-- Profiles: read your own (admins read all). No client updates, so nobody can promote themselves.
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- Destinations: public catalogue, admins manage it.
create policy "destinations_select_all" on public.destinations
  for select using (true);
create policy "destinations_admin_write" on public.destinations
  for all using (public.is_admin()) with check (public.is_admin());

-- Bookings: tourists see and create their own upcoming bookings; admins manage all.
create policy "bookings_select_own_or_admin" on public.bookings
  for select using (user_id = auth.uid() or public.is_admin());
create policy "bookings_insert_own_upcoming" on public.bookings
  for insert with check (
    user_id = auth.uid() and status = 'confirmed' and visit_date >= public.manila_today()
  );
create policy "bookings_admin_update" on public.bookings
  for update using (public.is_admin()) with check (public.is_admin());

-- Feedback: read your own (admins read all). There is deliberately no insert policy:
-- only the Edge Function (service role) writes feedback, after running VADER.
create policy "feedback_select_own_or_admin" on public.feedback
  for select using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.feedback from anon, authenticated;

-- ───────────────────────── Public RPCs ─────────────────────────

create or replace function public.destinations_with_stats(p_region text default null)
returns table (
  id bigint, name text, province text, region text, category text, description text,
  image_url text, price numeric, feedback_count int, avg_rating double precision
)
language sql stable security definer set search_path = ''
as $$
  select d.id, d.name, d.province, d.region, d.category, d.description, d.image_url, d.price,
         count(f.id)::int,
         round(avg(f.rating)::numeric, 2)::double precision
  from public.destinations d
  left join public.feedback f on f.destination_id = d.id
  where p_region is null or d.region = p_region
  group by d.id
  order by d.region, d.name
$$;

create or replace function public.destination_feedback_summary(p_destination_id bigint)
returns table (
  total int, avg_rating double precision, avg_compound double precision,
  positive int, neutral int, negative int
)
language sql stable security definer set search_path = ''
as $$
  select count(*)::int,
         round(avg(rating)::numeric, 2)::double precision,
         round(avg(compound)::numeric, 4)::double precision,
         count(*) filter (where sentiment_label = 'Positive')::int,
         count(*) filter (where sentiment_label = 'Neutral')::int,
         count(*) filter (where sentiment_label = 'Negative')::int
  from public.feedback
  where destination_id = p_destination_id
$$;

-- Public listing shows first name + last initial only, never emails.
create or replace function public.destination_recent_feedback(p_destination_id bigint, p_limit int default 10)
returns table (
  id bigint, rating smallint, comment text, tags text[], sentiment_label text,
  compound double precision, created_at timestamptz, author text
)
language sql stable security definer set search_path = ''
as $$
  select f.id, f.rating, f.comment, f.tags, f.sentiment_label, f.compound, f.created_at,
         split_part(p.name, ' ', 1)
           || coalesce(' ' || nullif(left(split_part(p.name, ' ', 2), 1), '') || '.', '')
  from public.feedback f
  join public.profiles p on p.id = f.user_id
  where f.destination_id = p_destination_id
  order by f.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50)
$$;

-- ───────────────────────── Tourist RPCs ─────────────────────────

-- The signed-in user's bookings with can_rate and their feedback, if any.
create or replace function public.my_bookings(p_booking_id bigint default null)
returns table (
  id bigint, destination_id bigint, visit_date date, guests int, status text, created_at timestamptz,
  destination_name text, province text, region text, category text,
  feedback_id bigint, feedback_rating smallint, feedback_sentiment text, can_rate boolean
)
language sql stable security definer set search_path = ''
as $$
  select b.id, b.destination_id, b.visit_date, b.guests, b.status, b.created_at,
         d.name, d.province, d.region, d.category,
         f.id, f.rating, f.sentiment_label,
         (f.id is null and public.booking_is_rateable(b))
  from public.bookings b
  join public.destinations d on d.id = b.destination_id
  left join public.feedback f on f.booking_id = b.id
  where b.user_id = auth.uid()
    and (p_booking_id is null or b.id = p_booking_id)
  order by b.visit_date desc
$$;

create or replace function public.cancel_booking(p_booking_id bigint)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.bookings
     set status = 'cancelled'
   where id = p_booking_id
     and user_id = auth.uid()
     and status in ('pending', 'confirmed')
     and visit_date >= public.manila_today();
  if not found then
    raise exception 'Only upcoming bookings can be cancelled.';
  end if;
end;
$$;

-- Called only by the submit-feedback Edge Function (service role) after VADER scoring.
-- Errors: TM404 booking not found, TM403 visit not finished, TM409 already rated.
create or replace function public.insert_feedback(
  p_user_id uuid, p_booking_id bigint, p_rating int, p_comment text, p_tags text[],
  p_compound double precision, p_pos double precision, p_neu double precision,
  p_neg double precision, p_sentiment_label text
)
returns public.feedback language plpgsql security definer set search_path = ''
as $$
declare
  b public.bookings;
  f public.feedback;
begin
  select * into b from public.bookings where id = p_booking_id and user_id = p_user_id;
  if not found then
    raise exception 'Booking not found.' using errcode = 'TM404';
  end if;
  if not public.booking_is_rateable(b) then
    raise exception 'You can rate this destination after your visit date.' using errcode = 'TM403';
  end if;

  insert into public.feedback
    (booking_id, destination_id, user_id, rating, comment, tags,
     compound, pos, neu, neg, sentiment_label)
  values
    (b.id, b.destination_id, b.user_id, p_rating, btrim(p_comment), coalesce(p_tags, '{}'),
     p_compound, p_pos, p_neu, p_neg, p_sentiment_label)
  on conflict (booking_id) do nothing
  returning * into f;

  if f.id is null then
    raise exception 'You already left feedback for this booking.' using errcode = 'TM409';
  end if;
  return f;
end;
$$;

revoke execute on function public.insert_feedback from public, anon, authenticated;
grant execute on function public.insert_feedback to service_role;

-- ───────────────────────── Admin RPCs ─────────────────────────
-- Each returns no rows unless the caller is an admin.
-- Filters: destination, and an inclusive created_at date range (Asia/Manila).

create or replace function public.admin_feedback_breakdown(
  p_destination_id bigint default null, p_from date default null, p_to date default null
)
returns table (
  destination_id bigint, destination_name text, region text, total int,
  positive int, neutral int, negative int, avg_rating double precision, avg_compound double precision
)
language sql stable security definer set search_path = ''
as $$
  select d.id, d.name, d.region, count(*)::int,
         count(*) filter (where f.sentiment_label = 'Positive')::int,
         count(*) filter (where f.sentiment_label = 'Neutral')::int,
         count(*) filter (where f.sentiment_label = 'Negative')::int,
         round(avg(f.rating)::numeric, 2)::double precision,
         round(avg(f.compound)::numeric, 4)::double precision
  from public.feedback f
  join public.destinations d on d.id = f.destination_id
  where public.is_admin()
    and (p_destination_id is null or f.destination_id = p_destination_id)
    and (p_from is null or (f.created_at at time zone 'Asia/Manila')::date >= p_from)
    and (p_to is null or (f.created_at at time zone 'Asia/Manila')::date <= p_to)
  group by d.id
  order by count(*) desc, d.name
$$;

create or replace function public.admin_feedback_trend(
  p_granularity text default 'month', p_destination_id bigint default null,
  p_from date default null, p_to date default null
)
returns table (
  period text, total int, positive int, neutral int, negative int,
  avg_compound double precision, avg_rating double precision
)
language sql stable security definer set search_path = ''
as $$
  select to_char(date_trunc(
           case when p_granularity in ('day', 'week', 'month') then p_granularity else 'month' end,
           f.created_at at time zone 'Asia/Manila'), 'YYYY-MM-DD'),
         count(*)::int,
         count(*) filter (where f.sentiment_label = 'Positive')::int,
         count(*) filter (where f.sentiment_label = 'Neutral')::int,
         count(*) filter (where f.sentiment_label = 'Negative')::int,
         round(avg(f.compound)::numeric, 4)::double precision,
         round(avg(f.rating)::numeric, 2)::double precision
  from public.feedback f
  where public.is_admin()
    and (p_destination_id is null or f.destination_id = p_destination_id)
    and (p_from is null or (f.created_at at time zone 'Asia/Manila')::date >= p_from)
    and (p_to is null or (f.created_at at time zone 'Asia/Manila')::date <= p_to)
  group by 1
  order by 1
$$;

-- Visayas destinations ranked by average compound score.
create or replace function public.admin_feedback_ranking(p_from date default null, p_to date default null)
returns table (
  rank int, destination_id bigint, destination_name text, province text, total int,
  avg_compound double precision, avg_rating double precision, positive_pct double precision
)
language sql stable security definer set search_path = ''
as $$
  select (row_number() over (order by avg(f.compound) desc, count(*) desc))::int,
         d.id, d.name, d.province, count(*)::int,
         round(avg(f.compound)::numeric, 4)::double precision,
         round(avg(f.rating)::numeric, 2)::double precision,
         round(100.0 * count(*) filter (where f.sentiment_label = 'Positive') / count(*), 1)::double precision
  from public.feedback f
  join public.destinations d on d.id = f.destination_id
  where public.is_admin()
    and d.region = 'Visayas'
    and (p_from is null or (f.created_at at time zone 'Asia/Manila')::date >= p_from)
    and (p_to is null or (f.created_at at time zone 'Asia/Manila')::date <= p_to)
  group by d.id
  order by 1
$$;

-- Feedback list for follow-up and CSV export. p_limit null = all rows.
create or replace function public.admin_feedback_list(
  p_sentiment text default null, p_destination_id bigint default null,
  p_from date default null, p_to date default null,
  p_limit int default 20, p_offset int default 0
)
returns table (
  id bigint, booking_id bigint, rating smallint, comment text, tags text[],
  compound double precision, pos double precision, neu double precision, neg double precision,
  sentiment_label text, created_at timestamptz, visit_date date,
  destination_id bigint, destination_name text, region text,
  user_name text, user_email text, total_count int
)
language sql stable security definer set search_path = ''
as $$
  select f.id, f.booking_id, f.rating, f.comment, f.tags, f.compound, f.pos, f.neu, f.neg,
         f.sentiment_label, f.created_at, b.visit_date,
         d.id, d.name, d.region, p.name, p.email,
         (count(*) over ())::int
  from public.feedback f
  join public.destinations d on d.id = f.destination_id
  join public.profiles p on p.id = f.user_id
  join public.bookings b on b.id = f.booking_id
  where public.is_admin()
    and (p_sentiment is null or f.sentiment_label = p_sentiment)
    and (p_destination_id is null or f.destination_id = p_destination_id)
    and (p_from is null or (f.created_at at time zone 'Asia/Manila')::date >= p_from)
    and (p_to is null or (f.created_at at time zone 'Asia/Manila')::date <= p_to)
  order by f.created_at desc
  limit p_limit offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function public.admin_bookings()
returns table (
  id bigint, visit_date date, guests int, status text, destination_name text,
  user_name text, user_email text, feedback_id bigint
)
language sql stable security definer set search_path = ''
as $$
  select b.id, b.visit_date, b.guests, b.status, d.name, p.name, p.email, f.id
  from public.bookings b
  join public.destinations d on d.id = b.destination_id
  join public.profiles p on p.id = b.user_id
  left join public.feedback f on f.booking_id = b.id
  where public.is_admin()
  order by b.visit_date desc
  limit 300
$$;
