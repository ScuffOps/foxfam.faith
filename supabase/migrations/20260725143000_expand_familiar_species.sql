alter table public.user_familiars
  drop constraint if exists user_familiars_species_allowed,
  drop constraint if exists user_familiars_species_coat_match,
  drop constraint if exists user_familiars_species_markings_match;

alter table public.user_familiars
  add constraint user_familiars_species_allowed
    check (species in (
      'fox-cat',
      'moon-rabbit',
      'shrine-cat',
      'cloud-poodle',
      'moss-turtle',
      'moon-seal'
    )),
  add constraint user_familiars_species_coat_match
    check (
      (species = 'fox-cat' and coat in ('cream', 'rose', 'mist'))
      or (species = 'moon-rabbit' and coat in ('lily', 'malibu', 'lavender'))
      or (species = 'shrine-cat' and coat in ('taupe', 'cream', 'teal-gray'))
      or (species = 'cloud-poodle' and coat in ('lily', 'malibu', 'lavender'))
      or (species = 'moss-turtle' and coat in ('taupe', 'teal-gray', 'cream'))
      or (species = 'moon-seal' and coat in ('lily', 'malibu', 'mist'))
    ),
  add constraint user_familiars_species_markings_match
    check (
      (species = 'fox-cat' and markings in ('brow-star', 'soft-mask', 'none'))
      or (species = 'moon-rabbit' and markings in ('none', 'moon-brow', 'petal-cheeks'))
      or (species = 'shrine-cat' and markings in ('temple-mask', 'brow-star', 'none'))
      or (species = 'cloud-poodle' and markings in ('none', 'petal-cheeks', 'brow-star'))
      or (species = 'moss-turtle' and markings in ('temple-mask', 'none', 'brow-star'))
      or (species = 'moon-seal' and markings in ('none', 'moon-brow', 'petal-cheeks'))
    );
