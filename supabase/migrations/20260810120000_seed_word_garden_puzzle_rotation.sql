begin;

with puzzle_templates as (
  select *
  from (
    values
      (0, 'petal-rite', 'Petal Rite', 'PETALSR', 'A',
        array['PALE','PALETTE','PAPER','PAPERS','PARLERS','PAST','PEAR','PEARS','PETAL','PETALS','PLATE','PLATES','PLEAT','RATE','RATES','REAL','REAP','SALE','SALT','SEAL','SLATE','SPARE','SPEAR','STALE','STAPLE','STAR','START','TAPE','TAPER','TAPERS','TEAR','TEARS','PETALERS']::text[],
        array['PETALERS']::text[]),
      (1, 'planter-song', 'Planter Song', 'PLANTER', 'A',
        array['ALERT','ALTER','LATER','PALE','PANEL','PARENT','PEAR','PETAL','PLANE','PLANER','PLANET','PLANT','PLANTER','PLATE','PLEAT','RATE','REAL','TALE','TAPER']::text[],
        array['PLANTER']::text[]),
      (2, 'garden-vow', 'Garden Vow', 'GARDENS', 'A',
        array['AGES','DARE','DEAR','DRAG','GARDEN','GARDENS','GEAR','GRAND','RAGE','READ','SAGE','SAND','SNARE']::text[],
        array['GARDENS']::text[]),
      (3, 'violet-hour', 'Violet Hour', 'VIOLETS', 'O',
        array['LOVE','OLIVE','SLOT','SOIL','TOIL','TOLL','TOOL','VIOLET','VIOLETS','VOTE']::text[],
        array['VIOLETS']::text[]),
      (4, 'thorned-path', 'Thorned Path', 'THORNED', 'O',
        array['HONOR','HORN','NORTH','NOTE','OTHER','THORN','THORNED','TONE','TORE','TORN']::text[],
        array['THORNED']::text[]),
      (5, 'pollen-drift', 'Pollen Drift', 'FLOWERS', 'O',
        array['FLOSS','FLOOR','FLOORS','FLOW','FLOWER','FLOWERS','FLOWS','FOOL','FOOLS','FORE','FORES','FOWL','FOWLS','LOOSE','LOSE','LOWER','LOWERS','LOWS','OWES','ROLE','ROLES','ROSE','ROWS','SLOW','SLOWER','SOLE','SORE','WOLF','WOLFS','WOOL','WOOF','WORE']::text[],
        array['FLOWERS']::text[]),
      (6, 'meadow-rest', 'Meadow Rest', 'MEADOWS', 'A',
        array['DAME','DAWN','MADE','MEADOW','MEADOWS','SAME','SAND','SEAM','WADERS']::text[],
        array['MEADOWS']::text[])
  ) as template(rotation_index, puzzle_key, title, letters, center_letter, accepted_words, full_bloom_words)
),
puzzle_dates as (
  select day::date as puzzle_date
  from pg_catalog.generate_series(
    date '2026-01-01',
    date '2035-12-31',
    interval '1 day'
  ) as generated(day)
)
insert into public.daily_word_puzzles (
  puzzle_date,
  game_key,
  puzzle_key,
  title,
  letters,
  center_letter,
  accepted_words,
  full_bloom_words
)
select
  dates.puzzle_date,
  'word-garden',
  templates.puzzle_key || '-' || pg_catalog.to_char(dates.puzzle_date, 'YYYYMMDD'),
  templates.title,
  templates.letters,
  templates.center_letter,
  templates.accepted_words,
  templates.full_bloom_words
from puzzle_dates as dates
join puzzle_templates as templates
  on templates.rotation_index = (
    ((dates.puzzle_date - date '2026-08-10') % 7 + 7) % 7
  )
on conflict (puzzle_date, game_key) do nothing;

commit;
