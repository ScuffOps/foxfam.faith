-- The broad authenticated policy previously bypassed path-specific dangerous
-- extension checks because RLS policies are ORed together. Keep all existing
-- community upload flows working while enforcing the deny-list globally.
drop policy if exists "Authenticated upload insert" on storage.objects;
create policy "Authenticated upload insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'community-uploads'
  and lower(name) !~ '\.(aab|apk|app|appimage|appx|appxbundle|bat|bin|cmd|com|command|deb|dll|dmg|drv|exe|flatpak|flatpakref|flatpakrepo|ipa|iso|jar|js|jse|lnk|macho|mpkg|msi|msix|msixbundle|msp|pkg|pif|ps1|psm1|reg|rpm|run|scf|scr|sh|snap|so|sys|url|vbe|vbs|vhd|vhdx|wsf|wsh|zsh)$'
);
