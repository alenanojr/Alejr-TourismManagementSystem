-- "viewer": a view-only admin for demos. It sees every admin page (analytics, bookings,
-- destinations) but cannot change anything:
--   • write policies (destinations, booking status, photo storage) stay admin-only
--   • read-only admin RPCs accept admins and viewers (is_staff)
--   • tourists' emails are masked for viewers
--   • viewers can't book trips
--   • a viewer's password and email can't be changed, so a shared demo login stays usable
-- Also: confirmed accounts no longer expire; only unconfirmed sign-ups are removed after 7 days.

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('tourist', 'admin', 'viewer'));

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'viewer')) $$;

-- "ab•••@gmail.com" for viewers, the full address for admins.
create or replace function public.staff_email(p_email text)
returns text language sql stable set search_path = ''
as $$
  select case when p_email is null or public.is_admin() then p_email
              else left(split_part(p_email, '@', 1), 2) || '•••@' || split_part(p_email, '@', 2) end
$$;

-- ───────── No bookings from viewers ─────────
drop policy "bookings_insert_own_upcoming" on public.bookings;
create policy "bookings_insert_own_upcoming" on public.bookings
  for insert with check (
    user_id = auth.uid() and status = 'confirmed' and visit_date >= public.manila_today()
    and not exists (select 1 from public.profiles where id = auth.uid() and role = 'viewer')
  );

-- ───────── Lock a viewer's login details ─────────
create or replace function public.lock_viewer_credentials()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles where id = old.id and role = 'viewer') then
    new.encrypted_password := old.encrypted_password;
    new.email := old.email;
    new.email_change := old.email_change;
    new.phone := old.phone;
  end if;
  return new;
end
$$;

drop trigger if exists lock_viewer_credentials on auth.users;
create trigger lock_viewer_credentials
  before update on auth.users
  for each row execute function public.lock_viewer_credentials();

-- ───────── Only unconfirmed sign-ups expire ─────────
create or replace function public.purge_unconfirmed_users()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  removed int;
begin
  delete from auth.users
  where email_confirmed_at is null
    and created_at < now() - interval '7 days';
  get diagnostics removed = row_count;
  return removed;
end
$$;

revoke execute on function public.purge_unconfirmed_users() from public, anon, authenticated;

-- ───────── Read-only admin RPCs: admins and viewers ─────────
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
  where public.is_staff()
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
  where public.is_staff()
    and (p_destination_id is null or f.destination_id = p_destination_id)
    and (p_from is null or (f.created_at at time zone 'Asia/Manila')::date >= p_from)
    and (p_to is null or (f.created_at at time zone 'Asia/Manila')::date <= p_to)
  group by 1
  order by 1
$$;

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
  where public.is_staff()
    and (p_from is null or (f.created_at at time zone 'Asia/Manila')::date >= p_from)
    and (p_to is null or (f.created_at at time zone 'Asia/Manila')::date <= p_to)
  group by d.id
  order by 1
$$;

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
         d.id, d.name, d.region, coalesce(p.name, 'Former visitor'), public.staff_email(p.email),
         (count(*) over ())::int
  from public.feedback f
  join public.destinations d on d.id = f.destination_id
  left join public.profiles p on p.id = f.user_id
  join public.bookings b on b.id = f.booking_id
  where public.is_staff()
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
  select b.id, b.visit_date, b.guests, b.status, d.name, coalesce(p.name, 'Former visitor'),
         public.staff_email(p.email), f.id
  from public.bookings b
  join public.destinations d on d.id = b.destination_id
  left join public.profiles p on p.id = b.user_id
  left join public.feedback f on f.booking_id = b.id
  where public.is_staff()
  order by b.visit_date desc
  limit 300
$$;
