-- The "Islands" category holds exactly the 12 Visayas island-hopping spots.
-- Price is the low end of each spot's estimated per-person range.
-- Existing rows are updated by name (keeping their bookings, feedback and photos);
-- missing ones are inserted.

create temporary table twelve_islands (name text, province text, description text, price numeric) on commit drop;
insert into twelve_islands (name, province, description, price) values
  ('Nalusuan Island', 'Cebu', 'Famous for its crystal-clear waters, beautiful wooden boardwalk, and rich marine sanctuary. Visitors can enjoy snorkeling, swimming, and exploring colorful coral reefs surrounded by tropical marine life.', 1100),
  ('Pescador Island', 'Cebu', 'A popular destination for snorkeling and diving because of its vibrant coral reefs and diverse marine life. Visitors can also explore the famous sardine run and spot sea turtles in the surrounding waters.', 1400),
  ('Sumilon Island', 'Cebu', 'Known for its stunning white sandbar and beautiful turquoise waters. It offers excellent opportunities for swimming, snorkeling, photography, and relaxing along its picturesque beaches.', 1700),
  ('Virgin Island', 'Cebu', 'Features pristine white sand beaches, crystal-clear waters, and beautiful coastal scenery. It is an ideal destination for swimming, snorkeling, sunbathing, and enjoying a peaceful tropical getaway.', 1500),
  ('Camotes Islands', 'Cebu', 'Beautiful white sand beaches, crystal-clear waters, caves, and natural lakes. Visitors can explore nearby islands, enjoy water activities, and discover the natural beauty of this tropical destination.', 1500),
  ('Malapascua Island', 'Cebu', 'Famous for its beautiful beaches, world-class diving spots, and thresher sharks. It is an excellent destination for diving enthusiasts, snorkeling activities, and visitors looking for a relaxing island experience.', 1500),
  ('Kalanggaman Island', 'Leyte', 'Well-known for its long, beautiful white sandbar surrounded by crystal-clear blue waters. It is perfect for swimming, snorkeling, photography, beach activities, and overnight camping.', 1500),
  ('Islas de Gigantes', 'Iloilo', 'A breathtaking island destination featuring limestone rock formations, white sand beaches, hidden lagoons, and scenic coastal landscapes. Popular attractions include Cabugao Gamay, Antonia Beach, and Tangke Lagoon.', 1500),
  ('Balicasag Island', 'Bohol', 'A famous marine sanctuary known for its colorful coral reefs, sea turtles, and diverse underwater ecosystem. It is an excellent destination for snorkeling, diving, and dolphin-watching activities.', 1500),
  ('Boracay Island Hopping', 'Aklan', 'An exciting island-hopping experience featuring beautiful beaches, snorkeling spots, and scenic coastal attractions. Visitors can explore Crystal Cove, Crocodile Island, and nearby beaches while enjoying various water activities.', 1500),
  ('Apo Island', 'Negros Oriental', 'A well-known marine sanctuary famous for its sea turtles, colorful coral reefs, and rich marine biodiversity. Visitors can enjoy snorkeling, diving, and exploring one of the most remarkable underwater environments in the Visayas.', 1500),
  ('Guimaras Island Hopping', 'Guimaras', 'A relaxing island-hopping adventure featuring beautiful beaches, caves, rock formations, and small offshore islands. Popular stops include Ave Maria Island, Natago Beach, and Baras Cave, making it a great destination for sightseeing and swimming.', 800);

update public.destinations d
set province = t.province, region = 'Visayas', category = 'island', description = t.description, price = t.price
from twelve_islands t
where lower(d.name) = lower(t.name);

insert into public.destinations (name, province, region, category, description, price)
select t.name, t.province, 'Visayas', 'island', t.description, t.price
from twelve_islands t
where not exists (select 1 from public.destinations d where lower(d.name) = lower(t.name));

-- Anything else filed under "island" (e.g. Siquijor) moves to "other".
update public.destinations
set category = 'other'
where category = 'island'
  and lower(name) not in (select lower(name) from twelve_islands);
