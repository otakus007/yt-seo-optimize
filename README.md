# yt-seo-optimize

Data-driven optimization for the owner's YouTube channels (Manhwa/Webtoon recap).
Next.js 16 dashboard + SQLite + scripts, driven by any coding agent that reads `AGENTS.md`
(Claude Code, Cursor, Codex, Antigravity, Grok Build).

## Setup (once)
```
pnpm install
bash scripts/setup-wizard.sh     # optional: API key, OAuth client, TOKEN_KEY, Cloudflare, cron
pnpm dev                         # http://localhost:3000 → paste the Google OAuth client there → Connect a YouTube channel
pnpm sync                        # backfill Analytics (minutes on first run)
```
Impressions and CTR are not in the YouTube API: export Studio → Analytics → Content → CSV
weekly and import it on the dashboard home page.

## Daily use
- Before uploading: ask your agent to run the `yt-new-video` skill.
- Weekly: `yt-sync` → `yt-audit` → apply recommendations from the dashboard (each apply is
  logged and restorable) → `yt-audit` again after 7/14 days to see what worked.
- `yt-competitors` for outliers to copy; `yt-niche-research` is a stub.

## Commands
`pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm sync` · `pnpm backup` ·
`pnpm tsx scripts/{stats,competitors,keywords,import-studio,recommend,draft,add-competitor}.ts --help`

See `AGENTS.md` (map + rules) and `docs/decisions/0001-rebuild.md` (why).
