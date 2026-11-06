-- Sentiment ranking covers destinations in every region, not just the Visayas.
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
    and (p_from is null or (f.created_at at time zone 'Asia/Manila')::date >= p_from)
    and (p_to is null or (f.created_at at time zone 'Asia/Manila')::date <= p_to)
  group by d.id
  order by 1
$$;
