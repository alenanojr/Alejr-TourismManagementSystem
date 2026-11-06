-- Nationwide catalogue: 15 destinations each for Luzon, Visayas and Mindanao,
-- spread across all seven types (2 per type, plus a third in one type per region).
-- Rows that already exist are matched by name and keep their id, bookings, photos,
-- description and price (only province, region and type change). Destinations outside the
-- catalogue are removed, unless someone has booked them.

create temporary table catalogue (
  name text, province text, region text, category text, description text, price numeric
) on commit drop;

insert into catalogue (name, province, region, category, description, price) values
  -- ───────── Luzon ─────────
  ('Saud Beach', 'Ilocos Norte', 'Luzon', 'beach', 'A long crescent of fine white sand in Pagudpud, framed by coconut palms and the windmills of Bangui. Calm, clear water makes it ideal for swimming and lazy beach days.', 1200),
  ('Anawangin Cove', 'Zambales', 'Luzon', 'beach', 'A secluded cove of ash-gray sand and pine-like agoho trees, reachable only by boat from Pundaquit. Popular for overnight camping, bonfires and hikes up the surrounding hills.', 1500),
  ('El Nido Island Hopping', 'Palawan', 'Luzon', 'island', 'Boat tours through towering limestone cliffs, hidden lagoons and white beaches in Bacuit Bay. Stops include the Big Lagoon, Secret Lagoon and Shimizu Island.', 1400),
  ('Calaguas Islands', 'Camarines Norte', 'Luzon', 'island', 'A remote group of islands with powdery white sand and turquoise water, best known for Mahabang Buhangin beach. Visitors come for camping, swimming and quiet, undeveloped shores.', 2500),
  ('Pagsanjan Falls', 'Laguna', 'Luzon', 'falls', 'A dramatic waterfall reached by a thrilling boat ride upriver through a deep, green gorge. Visitors can ride a bamboo raft right under the cascading falls.', 1500),
  ('Tappiya Falls', 'Ifugao', 'Luzon', 'falls', 'A tall, misty waterfall with a natural pool, reached by a trek through the Batad Rice Terraces. A refreshing reward after one of the most scenic hikes in the Cordillera.', 1000),
  ('Donsol Whale Shark Interaction', 'Sorsogon', 'Luzon', 'marine', 'Snorkel alongside gentle whale sharks, locally called butanding, in their natural feeding grounds. Interactions follow strict community-run rules that protect the animals.', 1500),
  ('Anilao Dive Spots', 'Batangas', 'Luzon', 'marine', 'One of the country''s best macro-diving destinations, with colorful nudibranchs, soft corals and reef fish. Close to Manila and great for both snorkeling and diving.', 2500),
  ('Banaue Rice Terraces', 'Ifugao', 'Luzon', 'mountain', 'Two-thousand-year-old terraces carved into the Cordillera mountains.', 2000),
  ('Mt. Pulag', 'Benguet', 'Luzon', 'mountain', 'The highest peak in Luzon, famous for its sea of clouds at sunrise and grassland summit. Hikers need to register and attend an orientation at the DENR ranger station.', 2500),
  ('Mayon Volcano', 'Albay', 'Luzon', 'mountain', 'The world-famous perfect-cone volcano rising above the plains of Albay. Visitors can explore its lava trails by ATV and enjoy views from Lignon Hill.', 1500),
  ('Calle Crisologo', 'Ilocos Sur', 'Luzon', 'heritage', 'A cobblestone street in Vigan lined with centuries-old Spanish colonial houses. Ride a kalesa, shop for local crafts and taste Vigan empanada.', 500),
  ('Intramuros', 'Metro Manila', 'Luzon', 'heritage', 'The historic walled city of Manila, home to Fort Santiago, San Agustin Church and Spanish-era streets. Explore it on foot, by bike or by kalesa.', 300),
  ('Puerto Princesa Underground River', 'Palawan', 'Luzon', 'other', 'A navigable underground river winding through a spectacular limestone cave system. A UNESCO World Heritage Site toured by paddle boat.', 1500),
  ('Sumaguing Cave', 'Mountain Province', 'Luzon', 'other', 'The largest cave in Sagada, with striking rock formations and cool underground pools. Guided spelunking tours take visitors deep into its chambers.', 800),

  -- ───────── Visayas ─────────
  ('Boracay White Beach', 'Aklan', 'Visayas', 'beach', 'Four kilometers of powdery white sand, clear water and famous sunsets.', 2500),
  ('Bantayan Island', 'Cebu', 'Visayas', 'beach', 'Laid-back island with long white beaches and fresh seafood.', 1400),
  ('Kalanggaman Island', 'Leyte', 'Visayas', 'island', 'Well-known for its long, beautiful white sandbar surrounded by crystal-clear blue waters. It is perfect for swimming, snorkeling, photography, beach activities, and overnight camping.', 1500),
  ('Malapascua Island', 'Cebu', 'Visayas', 'island', 'Famous for its beautiful beaches, world-class diving spots, and thresher sharks. It is an excellent destination for diving enthusiasts, snorkeling activities, and visitors looking for a relaxing island experience.', 1500),
  ('Islas de Gigantes', 'Iloilo', 'Visayas', 'island', 'A breathtaking island destination featuring limestone rock formations, white sand beaches, hidden lagoons, and scenic coastal landscapes. Popular attractions include Cabugao Gamay, Antonia Beach, and Tangke Lagoon.', 1500),
  ('Kawasan Falls', 'Cebu', 'Visayas', 'falls', 'Turquoise multi-tiered falls in Badian, famous for canyoneering.', 1500),
  ('Cambugahay Falls', 'Siquijor', 'Visayas', 'falls', 'A three-tiered waterfall with turquoise pools surrounded by lush forest. Swing from a rope into the water or relax in its natural basins.', 500),
  ('Oslob Whale Shark Watching', 'Cebu', 'Visayas', 'marine', 'Swim alongside gentle whale sharks in the waters of southern Cebu.', 1800),
  ('Apo Island', 'Negros Oriental', 'Visayas', 'marine', 'A well-known marine sanctuary famous for its sea turtles, colorful coral reefs, and rich marine biodiversity. Visitors can enjoy snorkeling, diving, and exploring one of the most remarkable underwater environments in the Visayas.', 1500),
  ('Chocolate Hills', 'Bohol', 'Visayas', 'mountain', 'Over 1,200 cone-shaped hills that turn chocolate brown in the dry season.', 1200),
  ('Mt. Kanlaon Natural Park', 'Negros Occidental', 'Visayas', 'mountain', 'Highland trails around the tallest peak in the Visayas.', 1300),
  ('Magellan''s Cross', 'Cebu', 'Visayas', 'heritage', 'The historic cross planted in 1521, beside the Basilica del Santo Niño.', 300),
  ('Miagao Church', 'Iloilo', 'Visayas', 'heritage', 'A UNESCO-listed Baroque church built in 1797, known for its sandstone facade carved with tropical plants. One of the finest examples of Philippine colonial architecture.', 300),
  ('Philippine Tarsier Sanctuary', 'Bohol', 'Visayas', 'other', 'A protected forest in Corella where visitors can see the tiny, big-eyed Philippine tarsier up close. Guides lead quiet walks to spot them resting in the trees.', 300),
  ('Loboc River Cruise', 'Bohol', 'Visayas', 'other', 'A relaxing floating-restaurant cruise along the jungle-lined Loboc River. Enjoy a buffet lunch, live music and a cultural stop with local performers.', 900),

  -- ───────── Mindanao ─────────
  ('Siargao Cloud 9', 'Surigao del Norte', 'Mindanao', 'beach', 'The surfing capital of the Philippines.', 2300),
  ('Dahican Beach', 'Davao Oriental', 'Mindanao', 'beach', 'A seven-kilometer stretch of white sand in Mati, popular for skimboarding and surfing. Its waters are also a nesting ground for sea turtles.', 800),
  ('Samal Island', 'Davao del Norte', 'Mindanao', 'island', 'A short boat ride from Davao City, with white sand beaches, resorts and caves. Highlights include Hagimit Falls and the fruit bat colony at Monfort Bat Cave.', 1200),
  ('Great Santa Cruz Island', 'Zamboanga City', 'Mindanao', 'island', 'Home to a rare pink-sand beach colored by crushed red organ-pipe coral. The island is a protected area with a mangrove lagoon tour.', 1000),
  ('Britania Islands', 'Surigao del Sur', 'Mindanao', 'island', 'A group of 24 islets with white sand and clear water in San Agustin. Island-hop between them and enjoy quiet, uncrowded beaches.', 1200),
  ('Tinago Falls', 'Lanao del Norte', 'Mindanao', 'falls', 'A hidden waterfall in Iligan reached by a long stairway down a deep ravine. It cascades into a calm, deep-blue pool perfect for a raft ride.', 300),
  ('Asik-Asik Falls', 'Cotabato', 'Mindanao', 'falls', 'A curtain of water that bursts from a lush green cliff wall rather than flowing over the top. One of the most unique waterfalls in the country.', 300),
  ('Sohoton Cove', 'Surigao del Norte', 'Mindanao', 'marine', 'A hidden cove on Bucas Grande Island with lagoons, caves and a jellyfish sanctuary. Swim with stingless jellyfish and explore the cove by small boat.', 1800),
  ('Mantigue Island Marine Sanctuary', 'Camiguin', 'Mindanao', 'marine', 'A small island off Camiguin surrounded by a protected marine sanctuary. Snorkel above coral gardens with sea turtles and schools of reef fish.', 1000),
  ('Mt. Apo', 'Davao del Sur', 'Mindanao', 'mountain', 'The highest mountain in the Philippines, with mossy forests, sulfur vents and a crater lake. A challenging multi-day climb for experienced hikers.', 3500),
  ('Lake Sebu', 'South Cotabato', 'Mindanao', 'mountain', 'A highland lake surrounded by rolling hills and home to the T''boli people. Ride the zipline over its seven falls and learn about T''nalak weaving.', 1500),
  ('Fort Pilar Shrine', 'Zamboanga City', 'Mindanao', 'heritage', 'A 17th-century Spanish fort that is now an open-air shrine to Our Lady of the Pillar. It also houses a branch of the National Museum.', 200),
  ('Rizal Shrine Dapitan', 'Zamboanga del Norte', 'Mindanao', 'heritage', 'The estate where Jose Rizal lived in exile from 1892 to 1896, with replicas of his house, school and clinic. A peaceful park by the sea in Dapitan.', 200),
  ('Hinatuan Enchanted River', 'Surigao del Sur', 'Mindanao', 'other', 'A deep-blue spring river whose source runs into an underwater cave system. Watch the daily fish feeding at noon and swim in its brilliant blue water.', 500),
  ('Philippine Eagle Center', 'Davao del Sur', 'Mindanao', 'other', 'A conservation center in Malagos where visitors can see the critically endangered Philippine eagle. Learn about efforts to breed and protect the national bird.', 300);

-- Don't silently delete trips people have booked.
do $$
declare
  booked text;
begin
  select string_agg(distinct d.name, ', ') into booked
  from public.destinations d
  join public.bookings b on b.destination_id = d.id
  where lower(d.name) not in (select lower(name) from catalogue);
  if booked is not null then
    raise exception 'These destinations have bookings and were not removed: %', booked;
  end if;
end $$;

delete from public.destinations
where lower(name) not in (select lower(name) from catalogue);

update public.destinations d
set province = t.province,
    region = t.region,
    category = t.category
from catalogue t
where lower(d.name) = lower(t.name);

insert into public.destinations (name, province, region, category, description, price)
select t.name, t.province, t.region, t.category, t.description, t.price
from catalogue t
where not exists (select 1 from public.destinations d where lower(d.name) = lower(t.name));

do $$
begin
  if (select count(*) from public.destinations) <> 45
     or exists (select 1 from public.destinations group by region having count(*) <> 15) then
    raise exception 'Catalogue should be 15 destinations per region';
  end if;
end $$;
