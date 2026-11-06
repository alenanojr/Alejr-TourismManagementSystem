-- Admin-managed destinations:
--   • a public "destination-images" Storage bucket that only admins can write to
--   • an "other" category for spots that don't fit the six types
--   • sanity checks on admin input
--   • my_bookings returns the destination photo

-- ───────── Photo storage ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('destination-images', 'destination-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may view; the Storage API also needs select to delete files.
create policy "destination_images_read" on storage.objects
  for select using (bucket_id = 'destination-images');
create policy "destination_images_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'destination-images' and public.is_admin());
create policy "destination_images_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'destination-images' and public.is_admin());
create policy "destination_images_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'destination-images' and public.is_admin());

-- ───────── Destination rules ─────────
alter table public.destinations drop constraint if exists destinations_category_check;
alter table public.destinations add constraint destinations_category_check
  check (category in ('beach', 'island', 'falls', 'marine', 'mountain', 'heritage', 'other'));
alter table public.destinations add constraint destinations_price_check check (price >= 0);
alter table public.destinations add constraint destinations_name_check check (char_length(btrim(name)) between 2 and 120);
alter table public.destinations add constraint destinations_province_check check (char_length(btrim(province)) between 2 and 120);

-- ───────── Photos in my_bookings ─────────
drop function if exists public.my_bookings(bigint);
create function public.my_bookings(p_booking_id bigint default null)
returns table (
  id bigint, destination_id bigint, visit_date date, guests int, status text, created_at timestamptz,
  destination_name text, province text, region text, category text, price numeric, image_url text,
  feedback_id bigint, feedback_rating smallint, feedback_sentiment text, can_rate boolean
)
language sql stable security definer set search_path = ''
as $$
  select b.id, b.destination_id, b.visit_date, b.guests, b.status, b.created_at,
         d.name, d.province, d.region, d.category, d.price, d.image_url,
         f.id, f.rating, f.sentiment_label,
         (f.id is null and public.booking_is_rateable(b))
  from public.bookings b
  join public.destinations d on d.id = b.destination_id
  left join public.feedback f on f.booking_id = b.id
  where b.user_id = auth.uid()
    and (p_booking_id is null or b.id = p_booking_id)
  order by b.visit_date desc
$$;
