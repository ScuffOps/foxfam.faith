begin;

with puzzle_words(base_key, accepted_words, full_bloom_words) as (
  values
    ('petal-rite', array['AERATE','ALERT','ALTAR','ALTER','APART','APPEAL','APPEAR','APPLE','APSE','AREA','ARREST','ASLEEP','ASSET','ASTER','ATLAS','EASE','EASEL','EAST','EASTER','EATER','ELAPSE','ELATE','ERASE','LASER','LAST','LATE','LATER','LATEST','LATTER','LEAP','LEAPT','LEASE','LEAST','PALE','PALATE','PALETTE','PAPER','PAPERS','PARLERS','PAST','PEAR','PEARS','PETAL','PETALS','PLATE','PLATES','PLEAT','RATE','RATES','REAL','REAP','SALE','SALT','SEAL','SLATE','SPARE','SPEAR','STALE','STAPLE','STAR','START','TAPE','TAPER','TAPERS','TEAR','TEARS','PETALERS']::text[], array['PETALERS']::text[]),
    ('planter-song', array['ALERT','ALTER','APPAREL','APPARENT','APPEAL','APPEAR','APPLE','AREA','ARENA','EARN','EATER','ELATE','ENTRAP','LANE','LANTERN','LATE','LATENT','LATER','LEAN','LEAP','LEARN','NEAR','PALE','PANEL','PARENT','PEAR','PETAL','PLANE','PLANER','PLANET','PLANT','PLANTER','PLATE','PLEAT','RATE','REAL','RENTAL','TALE','TALENT','TAPER','TEAR','TRAP']::text[], array['PLANTER']::text[]),
    ('garden-vow', array['AGED','AGENDA','AGREE','ANGER','AREA','ARENA','DANGER','DARE','DARN','DEAD','DEAN','DEAR','DEGRADE','DRAG','DREAD','EAGER','EARN','EASE','ENGAGE','ENRAGE','ERASE','ERRAND','GARDEN','GARDENS','GEAR','GRAND','RAGE','RANGE','RANGER','RANGES','READ','SAGE','SAND','SNARE']::text[], array['GARDENS']::text[]),
    ('violet-hour', array['EVOLVE','LOVE','LOSE','LOST','OLIVE','SILO','SLOE','SLOT','SOIL','SOLE','SOLO','SOLVE','SOOT','STOLE','STOOL','STOVE','TOIL','TOILET','TOLL','TOOL','TOOT','TOTE','VETO','VIOLET','VIOLETS','VOLE','VOLT','VOTE']::text[], array['VIOLETS']::text[]),
    ('thorned-path', array['DENOTE','DETHRONE','DONE','DONOR','DOOR','DOTE','DRONE','ERODE','HERO','HERON','HONOR','HOOD','HOOT','HORN','HORNET','NEON','NODE','NOON','NORTH','NORTHERN','NOTE','ODOR','ORDER','OTHER','OTTER','REDO','REDONE','RODE','RODENT','RODEO','ROOT','ROTE','ROTTEN','TENDON','TENON','TENOR','THORN','THORNED','THRONE','TONE','TOON','TOOT','TOOTH','TORE','TORN','TORRENT']::text[], array['THORNED']::text[]),
    ('pollen-drift', array['FLOSS','FLOOR','FLOORS','FLOW','FLOWER','FLOWERS','FLOWS','FOOL','FOOLS','FORE','FORES','FOWL','FOWLS','LOOSE','LOSE','LOWER','LOWERS','LOWS','OWES','ROLE','ROLES','ROSE','ROWS','SLOW','SLOWER','SOLE','SORE','WOLF','WOLFS','WOOL','WOOF','WORE']::text[], array['FLOWERS']::text[]),
    ('meadow-rest', array['AMASS','AWESOME','DAME','DEAD','DOODAD','EASE','MADAM','MADE','MASS','MEAD','MEADOW','MEADOWS','MESA','SAME','SAWED','SEAM','SEESAW','SESAME','SODA','SWAM','WADE']::text[], array['MEADOWS']::text[])
)
update public.daily_word_puzzles as puzzle
set accepted_words = words.accepted_words,
    full_bloom_words = words.full_bloom_words
from puzzle_words as words
where puzzle.game_key = 'word-garden'
  and puzzle.puzzle_key ~ ('^' || words.base_key || '-[0-9]{8}$');

update public.daily_word_puzzles
set letters = 'FLOWERS',
    center_letter = 'O'
where game_key = 'word-garden'
  and puzzle_key ~ '^pollen-drift-[0-9]{8}$';

commit;
