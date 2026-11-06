-- Richer data for the redesigned UI:
--   • destinations_with_stats: positive feedback count (sentiment share on cards and hero)
--   • destination_feedback_summary: star distribution + most mentioned tags
--   • destination_recent_feedback: sentiment filter, paging and a total count
--   • my_bookings: destination price (trip totals)
-- Return types change, so each function is dropped and recreated.

drop function if exists public.destinations_with_stats(text);
create function public.destinations_with_stats(p_region text default null)
returns table (
  id bigint, name text, province text, region text, category text, description text,
  image_url text, price numeric, feedback_count int, avg_rating double precision, positive_count int
)
language sql stable security definer set search_path = ''
as $$
  select d.id, d.name, d.province, d.region, d.category, d.description, d.image_url, d.price,
         count(f.id)::int,
         round(avg(f.rating)::numeric, 2)::double precision,
         count(f.id) filter (where f.sentiment_label = 'Positive')::int
  from public.destinations d
  left join public.feedback f on f.destination_id = d.id
  where p_region is null or d.region = p_region
  group by d.id
  order by d.region, d.name
$$;

drop function if exists public.destination_feedback_summary(bigint);
create function public.destination_feedback_summary(p_destination_id bigint)
returns table (
  total int, avg_rating double precision, avg_compound double precision,
  positive int, neutral int, negative int,
  star_counts int[], top_tags jsonb
)
language sql stable security definer set search_path = ''
as $$
  select count(*)::int,
         round(avg(f.rating)::numeric, 2)::double precision,
         round(avg(f.compound)::numeric, 4)::double precision,
         count(*) filter (where f.sentiment_label = 'Positive')::int,
         count(*) filter (where f.sentiment_label = 'Neutral')::int,
         count(*) filter (where f.sentiment_label = 'Negative')::int,
         -- star_counts[1] = number of 1-star ratings … star_counts[5] = 5-star
         array[
           count(*) filter (where f.rating = 1)::int,
           count(*) filter (where f.rating = 2)::int,
           count(*) filter (where f.rating = 3)::int,
           count(*) filter (where f.rating = 4)::int,
           count(*) filter (where f.rating = 5)::int
         ],
         coalesce((
           select jsonb_agg(jsonb_build_object('tag', t.tag, 'count', t.n) order by t.n desc, t.tag)
           from (
             select x.tag, count(*)::int as n
             from public.feedback f2
             cross join lateral unnest(f2.tags) as x(tag)
             where f2.destination_id = p_destination_id
             group by x.tag
           ) t
         ), '[]'::jsonb)
  from public.feedback f
  where f.destination_id = p_destination_id
$$;

drop function if exists public.destination_recent_feedback(bigint, int);
create function public.destination_recent_feedback(
  p_destination_id bigint, p_limit int default 10, p_sentiment text default null, p_offset int default 0
)
returns table (
  id bigint, rating smallint, comment text, tags text[], sentiment_label text,
  compound double precision, created_at timestamptz, author text, total_count int
)
language sql stable security definer set search_path = ''
as $$
  select f.id, f.rating, f.comment, f.tags, f.sentiment_label, f.compound, f.created_at,
         split_part(p.name, ' ', 1)
           || coalesce(' ' || nullif(left(split_part(p.name, ' ', 2), 1), '') || '.', ''),
         (count(*) over ())::int
  from public.feedback f
  join public.profiles p on p.id = f.user_id
  where f.destination_id = p_destination_id
    and (p_sentiment is null or f.sentiment_label = p_sentiment)
  order by f.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

drop function if exists public.my_bookings(bigint);
create function public.my_bookings(p_booking_id bigint default null)
returns table (
  id bigint, destination_id bigint, visit_date date, guests int, status text, created_at timestamptz,
  destination_name text, province text, region text, category text, price numeric,
  feedback_id bigint, feedback_rating smallint, feedback_sentiment text, can_rate boolean
)
language sql stable security definer set search_path = ''
as $$
  select b.id, b.destination_id, b.visit_date, b.guests, b.status, b.created_at,
         d.name, d.province, d.region, d.category, d.price,
         f.id, f.rating, f.sentiment_label,
         (f.id is null and public.booking_is_rateable(b))
  from public.bookings b
  join public.destinations d on d.id = b.destination_id
  left join public.feedback f on f.booking_id = b.id
  where b.user_id = auth.uid()
    and (p_booking_id is null or b.id = p_booking_id)
  order by b.visit_date desc
$$;
