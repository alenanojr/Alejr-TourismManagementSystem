-- Tourist accounts expire too, not only unconfirmed sign-ups:
--   • unconfirmed: deleted 7 days after sign-up
--   • confirmed:   deleted 7 days after confirming the email, or 7 days after their
--                  last (non-cancelled) trip, whichever is later, so they can still rate it
--   • admins are never deleted
-- Bookings and feedback outlive the account: user_id becomes null and they show up as
-- "Former visitor", so ratings and sentiment analytics stay intact.

-- ───────── Keep bookings and feedback when an account goes ─────────
alter table public.bookings alter column user_id drop not null;
alter table public.bookings drop constraint bookings_user_id_fkey;
alter table public.bookings add constraint bookings_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete set null;

alter table public.feedback alter column user_id drop not null;
alter table public.feedback drop constraint feedback_user_id_fkey;
alter table public.feedback add constraint feedback_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete set null;

-- ───────── Expiry ─────────
create or replace function public.purge_unconfirmed_users()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  removed int;
begin
  delete from auth.users u
  where u.created_at < now() - interval '7 days'
    and (
      u.email_confirmed_at is null
      or (
        u.email_confirmed_at < now() - interval '7 days'
        and not exists (select 1 from public.profiles p where p.id = u.id and p.role = 'admin')
        and not exists (
          select 1 from public.bookings b
          where b.user_id = u.id
            and b.status <> 'cancelled'
            and b.visit_date > public.manila_today() - 7
        )
      )
    );
  get diagnostics removed = row_count;
  return removed;
end
$$;

revoke execute on function public.purge_unconfirmed_users() from public, anon, authenticated;

-- ───────── Lists that showed the visitor: left join, "Former visitor" when gone ─────────
create or replace function public.destination_recent_feedback(
  p_destination_id bigint, p_limit int default 10, p_sentiment text default null, p_offset int default 0
)
returns table (
  id bigint, rating smallint, comment text, tags text[], sentiment_label text,
  compound double precision, created_at timestamptz, author text, total_count int
)
language sql stable security definer set search_path = ''
as $$
  select f.id, f.rating, f.comment, f.tags, f.sentiment_label, f.compound, f.created_at,
         coalesce(
           split_part(p.name, ' ', 1)
             || coalesce(' ' || nullif(left(split_part(p.name, ' ', 2), 1), '') || '.', ''),
           'Former visitor'),
         (count(*) over ())::int
  from public.feedback f
  left join public.profiles p on p.id = f.user_id
  where f.destination_id = p_destination_id
    and (p_sentiment is null or f.sentiment_label = p_sentiment)
  order by f.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0)
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
         d.id, d.name, d.region, coalesce(p.name, 'Former visitor'), p.email,
         (count(*) over ())::int
  from public.feedback f
  join public.destinations d on d.id = f.destination_id
  left join public.profiles p on p.id = f.user_id
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
  select b.id, b.visit_date, b.guests, b.status, d.name, coalesce(p.name, 'Former visitor'), p.email, f.id
  from public.bookings b
  join public.destinations d on d.id = b.destination_id
  left join public.profiles p on p.id = b.user_id
  left join public.feedback f on f.booking_id = b.id
  where public.is_admin()
  order by b.visit_date desc
  limit 300
$$;
