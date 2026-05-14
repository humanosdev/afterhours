-- Curated per-venue lines for UI (weekend + annual holiday overrides). Edit JSON in Supabase as seasons change.
alter table public.venues
  add column if not exists context_copy jsonb not null default '{}'::jsonb;

comment on column public.venues.context_copy is
  'Optional copy: {"default":"…","weekend":"…","holidays":{"MM-DD":"…","YYYY-MM-DD":"…"}} — see apps/web/src/lib/venueContextCopy.ts';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Behind the unmarked door: cuts early, craft cocktails late.',
  'weekend', 'Weekend nights stack fast—beat the line before the room locks.',
  'holidays', jsonb_build_object(
    '12-31', 'NYE: salon winds down early; bar side carries the countdown.',
    '01-01', 'New Year''s Day: lighter hours—check before you roll through.'
  )
)
where id = '9a3ec4e9-e11c-42b6-8606-f4440076c596';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Kitchen-led bar on 13th—groups, snacks, then night moves.',
  'weekend', 'Weekend dinner rolls straight into last call and spill-out energy.',
  'holidays', jsonb_build_object('07-04', 'July 4th: streets get loud—give yourself extra walk time.')
)
where id = 'a9948022-4d20-48a8-8eb6-571821979de0';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Philly dive royalty—cash-friendly, character-heavy, zero pretense.',
  'weekend', 'Weekend packs the bar rail—order two while you still have elbow room.',
  'holidays', jsonb_build_object('03-17', 'St. Patrick''s: arrive with patience (and cash).')
)
where id = '97e8ab68-f1d1-4a0c-83f7-1a5f632c2322';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'North Broad social room—bar energy close to campus and transit.',
  'weekend', 'Weekend fills after campus events—stake a booth early.',
  'holidays', jsonb_build_object('12-24', 'Holiday eve: crowds thin on campus—double-check hours.')
)
where id = '05effcd9-bab4-4408-b247-89bf57a3a90d';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Neighborhood club room—low lights, loyal regulars, steady pours.',
  'weekend', 'Friday–Sunday tables flip quick—link your crew before you roll up.',
  'holidays', jsonb_build_object('12-25', 'Christmas Day: call ahead—hours often tighten.')
)
where id = '63c2783c-ded7-4719-863b-843add38a8a6';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Street-art bar—DJ-forward even when it''s "just Thursday."',
  'weekend', 'Weekend sound bumps louder—hydrate, it''s a sprint not a stroll.',
  'holidays', jsonb_build_object('10-31', 'Halloween: costumes, lines, and sticky floors—in that order.')
)
where id = 'f5eb4bdd-6d88-49a3-9b0d-e1940fccdbc8';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Temple campus hub—meetups, food court, and the student pulse.',
  'weekend', 'Weekend campus is calmer—good for study blocks or club fairs.',
  'holidays', jsonb_build_object('01-01', 'Winter break windows—building access can shift.')
)
where id = '08d2a8a4-6654-4271-b13b-64037232b364';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Main Campus dining—swipe life, comfort rounds, between-class fuel.',
  'weekend', 'Weekend meals run shorter windows—check the board before you trek.',
  'holidays', jsonb_build_object('11-27', 'Thanksgiving week: hours compress—plan around break closures.')
)
where id = '8d61bba5-bc04-48bb-ad15-96dd2aa4e44f';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Rittenhouse-edge bar—cocktails, crowd control, and late energy.',
  'weekend', 'Weekend is standing-room math—arrive early or commit to the wait.',
  'holidays', jsonb_build_object('02-14', 'Valentine''s weekend: pairs pack tight—book if they take it.')
)
where id = '80ad9962-4407-4a47-bbb4-653816e4fdd8';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Temple bar-strip classic—cheap drinks, loud loyalty, fast tabs.',
  'weekend', 'Weekend pre-game Central—hydrate, it''s a marathon to Broad.',
  'holidays', jsonb_build_object('03-17', 'St. Patrick''s: campus strip spikes early—IDs ready.')
)
where id = 'ea09c578-d77a-4b1e-bc23-09212a41cfee';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'America''s oldest continuously operated tavern—history in every pint.',
  'weekend', 'Weekend tourists plus locals—embrace the squeeze at the rail.',
  'holidays', jsonb_build_object('12-31', 'NYE: lines are real—snag your crew and a baseline drink fast.')
)
where id = 'ad64c672-fcd6-4bd6-9559-8e9c736b0d2d';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Late-night whiskey and cocktails—dim, deliberate, South-of-Market.',
  'weekend', 'Weekend after-hours magnet—rideshare surge is part of the tax.',
  'holidays', jsonb_build_object('12-31', 'NYE: late close energy—leave the car, plan the exit.')
)
where id = '1b3d9e42-59a2-4590-aef1-7b4a4e2d2a50';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'South Campus dining—fuel between classes and late labs.',
  'weekend', 'Weekend brunch-style hours vary—don''t trust yesterday''s screenshot.',
  'holidays', jsonb_build_object('12-24', 'Holiday break: doors pivot—check dining comms.')
)
where id = '3c5f2622-90e2-4077-973f-8a75f04009ee';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'NoLibs patio energy—see-and-be-seen cocktails when weather plays nice.',
  'weekend', 'Weekend roof-line vibes—dress for breeze, plan for spillover indoors.',
  'holidays', jsonb_build_object('07-04', 'July 4th: riverward crowds—extra patience getting in.')
)
where id = 'c7960d75-8e87-489f-bf1a-9154716c506f';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Nightclub scale on Callowhill—big lights, VIP tables, heavy bass.',
  'weekend', 'Weekend is the main event—tickets and IDs before you Uber.',
  'holidays', jsonb_build_object('12-31', 'NYE: sellouts happen—buy early, charge your phone.')
)
where id = '2fa65ca8-5343-43f6-bb90-07743f164597';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Temple rec & fitness—courts, pickup, and the student-athlete grind.',
  'weekend', 'Weekend leagues eat prime slots—book if you want a guaranteed run.',
  'holidays', jsonb_build_object('01-01', 'Holiday week: reduced hours—check the rec desk.')
)
where id = 'ec85d9ee-0a5b-4630-a655-8a521ce81376';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Campus-adjacent pub—pitchers, trivia nights, chill booths.',
  'weekend', 'Weekend caps after games and gigs on Broad—tables turn loud.',
  'holidays', jsonb_build_object('03-17', 'St. Patrick''s: green beer gravity—arrive early.')
)
where id = 'de0aa143-e03e-41e9-bf02-a43ab13472c9';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Sports campus by the stadiums—screens on screens, tailgate gravity.',
  'weekend', 'Game-day weekends are law here—go early or take Broad Street Line.',
  'holidays', jsonb_build_object('07-04', 'July 4th: stadium-zone traffic—plan pickup pins carefully.')
)
where id = '97e2a825-f6ba-4875-812b-2ed097357738';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Fishtown-adjacent energy—cocktails, DJs, and late-night pull.',
  'weekend', 'Weekend lines reward the patient—pre-game hydration advised.',
  'holidays', jsonb_build_object('12-31', 'NYE: ride queues spike—split the pin with your driver.')
)
where id = '79a17265-25af-4baf-af99-4be87eb6912a';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Kensington Ave cocktail bar—polished pours, date-night lighting.',
  'weekend', 'Weekend pairs pack the rail—ask about reservations if they open them.',
  'holidays', jsonb_build_object('02-14', 'Valentine''s: two-tops disappear first—plan timing.')
)
where id in ('e06bc107-7baa-46fa-bb25-649463fea42a', 'fa37816e-451c-4167-9be3-8a95c41d20a7');

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Temple-area event complex—parties, formals, and capacity nights.',
  'weekend', 'Weekend flips for rentals and concerts—read the week''s calendar.',
  'holidays', jsonb_build_object('12-31', 'NYE events: security lines tighten—bags minimal.')
)
where id = '457a6e68-c02c-4aa2-961c-236cc8ca498d';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Whiskey-house energy on 13th—craft pours, bar rails, low drama.',
  'weekend', 'Weekend lines for rare pours—patience pays once you''re inside.',
  'holidays', jsonb_build_object('11-27', 'Thanksgiving weekend: industry nights—tip heavy.')
)
where id = '448e37c7-43e4-49db-8a72-c40e8ac95ee0';

update public.venues
set context_copy = jsonb_build_object(
  'default', 'Gayborhood dance floor—late closes, big sound, high energy.',
  'weekend', 'Weekend prime time starts after midnight—dress code and ID tight.',
  'holidays', jsonb_build_object('06-01', 'Pride month weekends: streets swell—plan meetup pins.')
)
where id = '6309d91f-cb00-46a3-a0a9-facc8b103520';
