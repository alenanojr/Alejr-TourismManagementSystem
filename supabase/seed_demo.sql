-- OPTIONAL demo data so the charts have something to show.
-- Run AFTER seed.sql and after at least one tourist account has signed up.
-- Creates past bookings with feedback for every tourist profile, plus one finished
-- visit awaiting feedback and one upcoming trip each.
--
-- The VADER scores below were produced by the same vader-sentiment library the
-- submit-feedback Edge Function uses; real feedback is always scored there.

do $$
declare
  comments constant jsonb := '[
    [5, "Absolutely beautiful place! The guides were friendly and very helpful. Highly recommended.", ["Scenery","Staff/Guides"], 0.9207, 0.621, 0.379, 0],
    [5, "Amazing experience, clean surroundings and stunning views. We will definitely come back!", ["Cleanliness","Scenery"], 0.902, 0.602, 0.398, 0],
    [4, "Great trip overall. The scenery was lovely, but the queue at the entrance was long.", ["Scenery"], 0.6059, 0.276, 0.724, 0],
    [4, "Good value for money and the staff were kind. Bring water because it gets hot.", ["Value for Money","Staff/Guides"], 0.8271, 0.42, 0.58, 0],
    [3, "It was okay. We arrived at noon and stayed for about two hours.", [], 0.2263, 0.137, 0.863, 0],
    [3, "The place is as described. Parking is available near the entrance.", ["Accessibility"], 0, 0, 1, 0],
    [2, "Too crowded and the restrooms were dirty. Not worth the entrance fee.", ["Cleanliness","Value for Money"], -0.25, 0.128, 0.676, 0.196],
    [2, "Disappointing. The path was slippery and unsafe, and there were no railings.", ["Safety","Accessibility"], -0.6597, 0, 0.649, 0.351],
    [1, "Terrible experience. Rude staff, overpriced, and trash everywhere. Very bad.", ["Staff/Guides","Cleanliness"], -0.8718, 0, 0.414, 0.586],
    [5, "Wonderful and safe for kids. The water was so clear and the beach was spotless!", ["Safety","Cleanliness","Scenery"], 0.8823, 0.461, 0.539, 0],
    [4, "Nice and relaxing, though the road going there is rough. Still a happy trip.", ["Accessibility","Scenery"], 0.8658, 0.492, 0.508, 0],
    [1, "Awful. We were scammed by a fake guide and nobody helped. Horrible and frustrating.", ["Safety","Staff/Guides"], -0.91, 0, 0.419, 0.581]
  ]';
  tourist record;
  dest_ids bigint[];
  c jsonb;
  visit_ago int;
  new_booking bigint;
  dest bigint;
  i int;
begin
  select array_agg(id) into dest_ids from public.destinations;
  if dest_ids is null then
    raise exception 'Run seed.sql first.';
  end if;

  for tourist in select id from public.profiles where role = 'tourist' loop
    for i in 1..12 loop
      dest := dest_ids[1 + floor(random() * array_length(dest_ids, 1))::int];
      visit_ago := 5 + floor(random() * 270)::int;

      insert into public.bookings (user_id, destination_id, visit_date, guests, status, created_at)
      values (tourist.id, dest, public.manila_today() - visit_ago, 1 + floor(random() * 4)::int,
              case when random() < 0.4 then 'completed' else 'confirmed' end,
              now() - make_interval(days => visit_ago + 14))
      returning id into new_booking;

      c := comments -> floor(random() * jsonb_array_length(comments))::int;
      insert into public.feedback
        (booking_id, destination_id, user_id, rating, comment, tags,
         compound, pos, neu, neg, sentiment_label, created_at)
      values
        (new_booking, dest, tourist.id, (c ->> 0)::int, c ->> 1,
         array(select jsonb_array_elements_text(c -> 2)),
         (c ->> 3)::float8, (c ->> 4)::float8, (c ->> 5)::float8, (c ->> 6)::float8,
         case when (c ->> 3)::float8 >= 0.05 then 'Positive'
              when (c ->> 3)::float8 <= -0.05 then 'Negative'
              else 'Neutral' end,
         now() - make_interval(days => visit_ago - 1));
    end loop;

    -- One finished visit waiting for a rating, and one upcoming trip.
    insert into public.bookings (user_id, destination_id, visit_date, guests, status) values
      (tourist.id, dest_ids[1 + floor(random() * array_length(dest_ids, 1))::int], public.manila_today() - 2, 2, 'confirmed'),
      (tourist.id, dest_ids[1 + floor(random() * array_length(dest_ids, 1))::int], public.manila_today() + 20, 2, 'confirmed');
  end loop;
end;
$$;
