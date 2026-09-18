---
name: yt-sync
description: Fetch YouTube data into the local DB — own channels (Data API + Analytics via OAuth) and competitors (public Data API). Use for "sync", "refresh data", "update stats", "add competitor", or before any analysis when data is older than 24h.
---

# yt-sync

## When
Before `yt-audit`, `yt-competitors`, or `yt-new-video` if `lastSyncedAt` is older than 24h
(`pnpm tsx scripts/stats.ts --json | jq .channel.lastSyncedAt`), or when the owner asks.

## Steps
1. Check `.env` has `YOUTUBE_API_KEY`; own channels also need `GOOGLE_CLIENT_ID/SECRET`
   and `TOKEN_KEY`. If an own channel is missing, tell the owner to click
   "Connect a YouTube channel" in the dashboard (OAuth cannot be done from the CLI).
2. Run (foreground; first backfill can take minutes):
   - everything: `pnpm tsx scripts/sync.ts`
   - one channel: `pnpm tsx scripts/sync.ts --channel @handle`
   - competitors only: `pnpm tsx scripts/sync.ts --competitors-only`
   - new competitor: `pnpm tsx scripts/add-competitor.ts @handle`
3. Impressions/CTR are NOT in the API. If the owner has a Studio CSV export:
   `pnpm tsx scripts/import-studio.ts <file.csv> --from YYYY-MM-DD --to YYYY-MM-DD`
   (Studio → Analytics → Content → date range → Export → CSV). Ask them to export the
   same range each week so before/after comparisons line up.
4. Report: channels synced, video counts, any `FAILED` lines, and whether CTR data exists.

## Never
- Do not delete or reset the DB to "fix" a sync. Re-running is idempotent (upserts).
- Do not print tokens or `.env` contents.
