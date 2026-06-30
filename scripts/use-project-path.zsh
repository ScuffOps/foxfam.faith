# Source this from the project root:
#   source scripts/use-project-path.zsh
#
# It prepends this repo's local npm binaries, including the Supabase CLI.
_foxfam_path_script="${(%):-%N}"
_foxfam_path_dir="${_foxfam_path_script:A:h}"
export PATH="${_foxfam_path_dir:h}/node_modules/.bin:$PATH"
unset _foxfam_path_script _foxfam_path_dir
