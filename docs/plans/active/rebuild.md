# Plan — rebuild (decision 0001)

Status per item; move this file to `docs/plans/completed/` when all are done.

- [x] Decision record `docs/decisions/0001-rebuild.md`
- [x] Harness: `AGENTS.md`, `CLAUDE.md`, symlinks, guard hook in 5 hosts, `check-harness.sh`
- [x] Schema v2 + fresh migration, DB at `data/app.db`
- [x] Libs: crypto, oauth, youtube (write ops), analytics (raw + daily + snapshots), auth (Cf Access), apply/restore, stats, sync, competitors, studio CSV
- [x] Scripts: sync, add-competitor, backup, import-studio, keywords, stats, competitors, recommend, draft
- [x] Dashboard: proxy gate, OAuth connect, home, channel, video, competitors, Apply/Restore/Upload/Import actions
- [x] Skills: yt-sync, yt-new-video, yt-audit, yt-competitors, yt-niche-research (stub), playbook
- [x] Tests green (`pnpm lint && pnpm typecheck && pnpm test`)
- [ ] Owner setup: Google Cloud OAuth client + Analytics API, `.env`, first connect, Cloudflare Tunnel + Access, crontab (sync + backup)
- [ ] First real sync + Studio CSV import → first `yt-audit`
- [ ] Verify Cursor / Grok do not double-list skills via the `.claude/skills` symlink
  - 2026-09-18 docs check: Cursor reads `.agents/skills/` (primary) AND `.claude/skills/` (legacy) and walks recursively,
    no stated dedupe → may list each skill twice. Grok reads `.grok/skills/` + Claude Code paths (`.claude/skills/`), not
    `.agents/skills/` → symlink is required for Grok. Owner check: open Cursor's skills list; if duplicated, remove the
    `.claude/skills` symlink and drop that line from `scripts/check-harness.sh` (Cursor + Codex read `.agents/skills`; Grok
    would then need a `.grok/skills -> ../.agents/skills` symlink instead).
