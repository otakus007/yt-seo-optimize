#!/usr/bin/env bash
# Verifies the multi-host harness is intact. Runs in `pnpm lint`.
set -u; fail=0
err() { echo "check-harness: $*" >&2; fail=1; }
[ "$(readlink .claude/skills)" = "../.agents/skills" ] || err ".claude/skills must symlink to ../.agents/skills"
[ "$(readlink .agents/rules/repo.md)" = "../../AGENTS.md" ] || err ".agents/rules/repo.md must symlink to ../../AGENTS.md"
grep -q '^@AGENTS.md' CLAUDE.md || err "CLAUDE.md must include @AGENTS.md"
[ "$(wc -l < AGENTS.md)" -le 120 ] || err "AGENTS.md over 120 lines; move detail to docs/"
for f in .agents/skills/*/SKILL.md; do
  grep -q '^name:' "$f" && grep -q '^description:' "$f" || err "$f missing name/description frontmatter"
done
for f in .claude/settings.json .cursor/hooks.json .codex/hooks.json .agents/hooks.json; do
  grep -q 'guard.sh' "$f" || err "$f does not wire scripts/hooks/guard.sh"
done
[ -x scripts/hooks/guard.sh ] || err "guard.sh not executable"
echo '{"tool_input":{"command":"pnpm prisma migrate reset"}}' | bash scripts/hooks/guard.sh 2>/dev/null && err "guard.sh failed to block migrate reset"
for c in "rm -rf data" "rm -rf ./data" "find data -delete" "rm data/app.db"; do
  echo "{\"tool_input\":{\"command\":\"$c\"}}" | bash scripts/hooks/guard.sh 2>/dev/null && err "guard.sh failed to block: $c"
done
echo '{"tool_input":{"command":"pnpm test"}}' | bash scripts/hooks/guard.sh 2>/dev/null || err "guard.sh blocked a safe command"
exit $fail
