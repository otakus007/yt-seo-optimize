---
name: yt-audit
description: Post-publish audit of an own channel — find underperforming videos from real metrics (CTR, retention, first-7-day views vs baseline), critique thumbnails, write prioritized Recommendations with executable Steps into the DB, report results of past Changes, and propose playbook edits. Use for "audit", "what should I fix", "improve my videos", "which videos are weak", "did the change work".
---

# yt-audit

## Preconditions
- Data ≤ 24h old (else run `yt-sync`). CTR flags need at least one Studio CSV import.
- Read `.agents/skills/playbook-manhwa.md`.

## Steps
1. `pnpm tsx scripts/stats.ts --channel @handle --json` → save to a temp file. Use:
   `baseline`, `underperformers`, `outliers`, `changeResults`, `recommendations` (open),
   `channelReports`, `ypp` (if pre-YPP).
2. **Report past changes first.** For each `changeResults[]` with `d7.complete`:
   views/day before → after, CTR before → after. Say plainly which worked (≥ +20%),
   which did nothing, which hurt (≤ −20%). Propose a playbook line for each clear result
   (owner must approve before you edit the playbook).
3. Pick at most 5 videos: `underperformers` sorted by potential (recent, high impressions
   but low CTR first; then low retention; then cheap metadata fixes). Skip videos that
   already have an open recommendation.
4. For each: `pnpm tsx scripts/stats.ts --video <youtubeId> --json` → `reports.retention`
   (where viewers drop), `reports.traffic`, `reports.search-terms`, `studio`, `changes`.
   Look at the thumbnail: download `video.thumbnailUrl` to the scratch dir and view it;
   apply the playbook critique checklist.
5. Write recommendations (rationale MUST cite numbers, or the script rejects it):
   ```
   pnpm tsx scripts/recommend.ts <<'JSON'
   [{"videoId":"<youtubeId>","title":"Retitle + new thumbnail","rationale":"CTR 2.1% vs median 4.3%; 41% avg view (median 38%) so the video holds — packaging problem.","priority":1,"source":"audit",
     "steps":[
       {"kind":"api","field":"title","payload":"<new title>","instructions":"Why this title: ..."},
       {"kind":"api","field":"thumbnail","instructions":"Gemini prompt: ... Overlay: ... Upload the JPEG on this step, then Apply."},
       {"kind":"api","field":"tags","payload":["..."],"instructions":"..."},
       {"kind":"manual","instructions":"Add end screen to <next recap> in Studio → Editor."}
     ]}]
   JSON
   ```
   `field` ∈ title | description | tags | thumbnail | playlist. `payload` for tags is an
   array; for playlist it is the playlist id; thumbnail has no payload (owner uploads).
6. Channel-level recommendation (no `videoId`) for upload cadence, series playlists, or
   pre-YPP watch-hour strategy when the data supports it.
7. Tell the owner: the dashboard lists each recommendation with Apply buttons; every apply
   writes a Change and can be restored; re-run this skill in 7 and 14 days to measure.

## Rules
- Numbers from `stats.ts` only. No "best practice" claims without a metric next to them.
- One recommendation per video, ordered steps, cheapest-first inside the steps.
- Never call `videos.update` yourself; the dashboard Apply path is the only writer.
- Write `rationale` and `instructions` (and anything you say to the owner) in Vietnamese.
  Keep `payload` values (title/description/tags), Gemini prompts, and overlay text in
  `Channel.language` (English for this channel) since that's what gets applied to YouTube.
