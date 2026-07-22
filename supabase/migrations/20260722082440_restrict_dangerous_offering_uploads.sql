-- Keep offerings open to guests and members while preventing public hosting of
-- executable, installer, and script payloads. MIME types are client-controlled,
-- so the object-name extension check is the authoritative storage guard.
drop policy if exists "Anon offering upload" on storage.objects;
create policy "Anon offering upload"
on storage.objects for insert
to anon
with check (
  bucket_id = 'community-uploads'
  and name like 'offerings/%'
  and lower(name) !~ '\.(aab|apk|app|appimage|appx|appxbundle|bat|bin|cmd|com|command|deb|dll|dmg|drv|exe|flatpak|flatpakref|flatpakrepo|ipa|iso|jar|js|jse|lnk|macho|mpkg|msi|msix|msixbundle|msp|pkg|pif|ps1|psm1|reg|rpm|run|scf|scr|sh|snap|so|sys|url|vbe|vbs|vhd|vhdx|wsf|wsh|zsh)$'
);

drop policy if exists "Authenticated offering upload" on storage.objects;
create policy "Authenticated offering upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'community-uploads'
  and name like 'offerings/%'
  and lower(name) !~ '\.(aab|apk|app|appimage|appx|appxbundle|bat|bin|cmd|com|command|deb|dll|dmg|drv|exe|flatpak|flatpakref|flatpakrepo|ipa|iso|jar|js|jse|lnk|macho|mpkg|msi|msix|msixbundle|msp|pkg|pif|ps1|psm1|reg|rpm|run|scf|scr|sh|snap|so|sys|url|vbe|vbs|vhd|vhdx|wsf|wsh|zsh)$'
);
