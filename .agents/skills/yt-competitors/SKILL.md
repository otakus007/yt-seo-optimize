---
name: yt-competitors
description: Study competitor channels from public data — outlier videos (>3x their channel median), title/thumbnail patterns, upload cadence, length — and turn them into concrete things to copy for the owner's channel. Use for "competitors", "what are others doing", "why is X growing", "which formats work".
---

# yt-competitors

## Steps
1. If competitors are missing or stale: `pnpm tsx scripts/add-competitor.ts @handle ...`
   or `pnpm tsx scripts/sync.ts --competitors-only`.
2. `pnpm tsx scripts/competitors.ts --json` → per channel: `medianViews`, `viewsPerSub`,
   `uploadsPerWeek`, `medianDurationMin`, `medianTitleLength`, `outliers[]` (title, views,
   `multiple`, thumbnailUrl, tags, durationSec).
3. For the top 10 outliers across channels: view the thumbnails (download to scratch),
   and group by title structure, emotion, colour, subject framing, series vs one-shot,
   length bucket.
4. Compare with the owner's own outliers from `pnpm tsx scripts/stats.ts --json`.
5. Output: a table of patterns with the evidence (which outliers, multiples), then
   3–5 concrete actions for the owner's next uploads, each tied to a pattern. Propose
   playbook lines (owner approves).

## Rules
- Only public data; never guess a competitor's CTR or revenue.
- "Pattern" needs ≥ 3 outliers behind it; otherwise call it an anecdote.
