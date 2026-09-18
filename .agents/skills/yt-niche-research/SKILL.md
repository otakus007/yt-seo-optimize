---
name: yt-niche-research
description: STUB — evaluate a candidate niche for a new channel (can small channels win, production cost, estimated CPM, policy risk, demand). Not built yet; use only when the owner explicitly asks about a new niche, and say what is and is not evidence-based.
---

# yt-niche-research (stub)

Decision 0001: build this after the current channel shows measured results.

## What it will do
Criteria in priority order (owner's ranking): (1) small channels succeed — count of
channels < 50k subs with videos > 500k views in the niche, (2) production cost,
(3) estimated CPM (no public API; LLM estimate flagged as such), (4) copyright /
demonetization risk, (5) demand via autocomplete breadth.

## What you can do today
- `pnpm tsx scripts/add-competitor.ts @handle ...` for 5–10 channels in the candidate niche,
  then `pnpm tsx scripts/competitors.ts --json` gives (1) directly: `subscribers` vs
  `outliers[].views`.
- `pnpm tsx scripts/keywords.ts "<niche seed>" --json` gives (5).
- Everything else is an estimate — label it so.
