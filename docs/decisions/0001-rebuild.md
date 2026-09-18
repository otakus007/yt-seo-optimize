# 0001 — Rebuild as a data-driven YouTube content optimizer

Date: 2026-09-18. Status: accepted. Supersedes the 2026-06-25 five-agent pipeline.

## Goal
Turn this repo into an "optimization expert" for the owner's YouTube channels
(currently Manhwa/Webtoon recap, English; later one channel per language, later
other niches). Every recommendation must come from real data, and every applied
change must be measurable before/after.

## Decisions (each was a question put to the owner; answers recorded here)

**Portability.** One code base runs under Claude Code, Cursor, Codex, Antigravity,
Grok Build. Logic lives in `scripts/*.ts` (run via `pnpm tsx`); LLM-facing
instructions live in `.agents/skills/*/SKILL.md`; entrypoint is `AGENTS.md`.
No host-specific sub-agents. Symlinks bridge hosts that read other paths.

**Runtime.** Next.js + SQLite on the owner's machine. Remote access through a
Cloudflare Tunnel, gated by Cloudflare Access (owner's email only); the app also
verifies the `Cf-Access-Jwt-Assertion` header when the request arrives via the
public domain, and lets `localhost` through. No Postgres, no app-level users.

**Data.**
- Own channels: OAuth (web flow from the dashboard, one per Google account),
  refresh token stored AES-GCM-encrypted. YouTube Analytics API backfilled from
  channel start, then daily cron + re-fetch of the last 7 days.
- Every Analytics report is stored raw (`AnalyticsReport.json`); a typed
  `VideoDaily` table holds the columns the dashboard uses.
- **Thumbnail impressions / CTR are NOT in the Analytics API** (verified
  2026-09-18 against developers.google.com/youtube/analytics/metrics). They are
  imported from YouTube Studio CSV exports into `StudioSnapshot`.
- Competitors: owner-supplied handles, public Data API only, outlier detection.
- Keywords: YouTube autocomplete + competitor titles/tags + own search terms.
- `Channel.monetized`: true → rank by revenue/RPM; false → optimize for watch
  hours + subs toward YPP (1,000 subs / 4,000 h). Long-form only, no Shorts.

**Workflow.**
1. `yt-new-video`: manhwa + hook + emotion → 5 titles, description, tags,
   Gemini thumbnail prompt, 3 overlay texts. Saved as `Draft`, linked to the
   `Video` after publish.
2. `yt-audit`: underperformers + thumbnail critique → `Recommendation` with
   ordered `Step`s (`api` or `manual`, each with instructions). Also reports
   results of past `Change`s and proposes playbook edits (owner approves).
3. Dashboard "Apply" per step: read live metadata first, download the current
   thumbnail to `data/thumbnails/`, call `videos.update` / `thumbnails.set`,
   write a `Change` with before/after. "Restore" reverts from that record.
4. Measurement: per-Change CTR/views 7 and 14 days before vs after.
5. `yt-competitors` now; `yt-niche-research` is a stub until the current
   channel shows results.

**Safety.** Daily SQLite backup (`data/backups/`, keep 30). A PreToolUse guard
hook (wired into every host's hook config) blocks commands that destroy the DB
or `data/`. The DB is no longer tracked in git.

**Not doing (yet).** Shorts, Postgres, app-level auth, charts, per-host rule
files (`.cursor/rules`), typecheck-on-edit hooks, paid keyword tools,
auto-composed thumbnail text (owner adds text in Canva).

## Consequences
- Old `.claude/agents`, `.claude/skills/yt-*`, `_workspace/`, `.omc/`,
  `docs/superpowers/` removed.
- Repo lives on NTFS; `node_modules` must be installed from Linux (Windows
  junctions are unreadable here). Git symlinks require `core.symlinks=true`
  if the repo is ever checked out on Windows.
