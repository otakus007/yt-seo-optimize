#!/usr/bin/env bash
# PreToolUse guard: blocks commands that destroy the DB, data/, or .env.
# Reads the host's JSON payload on stdin; pattern-matches the whole payload
# so it works for Claude Code, Codex, Antigravity, Grok (exit 2 = block)
# and Cursor (--cursor: JSON {"permission":"deny"} on stdout).
# ponytail: substring match, no JSON parsing; add jq if a host nests commands oddly.
# Only inspect text before the first heredoc marker so docs mentioning
# forbidden commands can still be written. ponytail: commands chained after a heredoc are not inspected.
payload=$(cat | sed 's/<<.*//')
deny=""
if grep -Eq 'migrate +reset|--force-reset|--accept-data-loss' <<<"$payload"; then deny="prisma reset / force-reset / accept-data-loss is forbidden on the real DB"; fi
if grep -Eq 'rm +(-[a-zA-Z]+ +)*[^ ]*(data/|app\.db|backups|\.env)' <<<"$payload"; then deny="rm of data/, app.db, backups or .env is forbidden"; fi
if grep -Eq 'git +clean[^|;&]*-[a-zA-Z]*x' <<<"$payload"; then deny="git clean -x would wipe data/ and .env"; fi
if grep -Eq 'DROP +TABLE|DELETE +FROM +(Change|Recommendation|Draft|StudioSnapshot)' <<<"$payload"; then deny="destructive SQL on history tables"; fi
if grep -Eq '> *data/app\.db|truncate[^|;&]*app\.db' <<<"$payload"; then deny="overwriting app.db"; fi
[ -z "$deny" ] && exit 0
if [ "$1" = "--cursor" ]; then
  printf '{"permission":"deny","userMessage":"guard: %s","agentMessage":"guard: %s"}\n' "$deny" "$deny"; exit 0
fi
echo "guard: $deny" >&2; exit 2
