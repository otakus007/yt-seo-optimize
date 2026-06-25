---
name: yt-orchestrate
description: Orchestrate the full YouTube channel analysis pipeline. Use this skill to analyze a YouTube channel, fetch stats, compute performance metrics, generate SEO recommendations, produce an improvement report, and update the dashboard. Triggers on: "analyze channel", "analyze youtube", "fetch channel", "sync channel", "youtube report", "improve my channel", "youtube SEO", "increase views", "grow channel", "earn from youtube", "yt report", "re-run analysis", "update channel data", "refresh stats", "redo analysis", "improve recommendations", "update dashboard", "build dashboard", "show dashboard".
---

# YT Orchestrate Skill

## Overview

Coordinates the 5-agent YouTube analysis pipeline:
1. **yt-fetcher** (sub-agent) — fetch + persist YouTube data
2. **yt-analyst** + **yt-seo-advisor** (parallel sub-agents) — analyze + advise
3. **yt-reporter** (sub-agent) — synthesize final report
4. **yt-dashboard-builder** (sub-agent) — update Next.js dashboard with results

**Execution mode:** Hybrid — sub-agent for sequential phases, parallel for analysis.

## Phase 0: Context Check

Before doing anything, check workspace state:

```bash
ls _workspace/ 2>/dev/null && echo "workspace_exists" || echo "workspace_missing"
```

| State | User Request | Action |
|-------|-------------|--------|
| No `_workspace/` | Any | **Initial execution** — run full pipeline |
| `_workspace/` exists | "re-run", "update", "refresh", "redo" | **Full re-run** — rename to `_workspace_prev/`, run full pipeline |
| `_workspace/` exists | "improve recommendations", "change advice" | **Partial re-run** — skip fetch (Phase 1), re-run Phase 2-3 only |
| `_workspace/` exists | "update data", "sync latest" | **Fetch-only** — run Phase 1 only, then Phase 2-3 |

```bash
# Full re-run: preserve previous results
mv _workspace _workspace_prev 2>/dev/null; mkdir -p _workspace
```

## Phase 1: Fetch (Sub-agent)

Spawn yt-fetcher as sub-agent. Pass channel handle from user input.

**Agent definition:** `.claude/agents/yt-fetcher.md`
**Skill:** `yt-fetch`
**Model:** opus

Prompt to agent:
```
You are the yt-fetcher agent. Use the yt-fetch skill.
Channel: {handle_or_id}
Fetch channel info and videos, persist to SQLite, write _workspace/01_fetch_result.json.
```

Wait for completion. Check `_workspace/01_fetch_result.json` exists before proceeding.

If fetch fails: stop pipeline, report error to user with actionable fix.

## Phase 2: Parallel Analysis (Agent Team)

After Phase 1 completes, spawn yt-analyst and yt-seo-advisor in parallel as background sub-agents.

**yt-analyst prompt:**
```
You are the yt-analyst agent. Use the yt-analyze skill.
Read _workspace/01_fetch_result.json for channel context.
Query SQLite DB, compute performance metrics, write _workspace/02_analysis.json.
```

**yt-seo-advisor prompt:**
```
You are the yt-seo-advisor agent. Use the yt-advise skill.
Read _workspace/01_fetch_result.json for channel context.
Query SQLite DB for video titles/descriptions, generate SEO recommendations, write _workspace/03_seo_recommendations.json.
```

Run both with `run_in_background: true`. Wait for both to complete (check both output files exist).

## Phase 3: Report (Sub-agent)

After both Phase 2 agents complete, spawn yt-reporter.

**Agent definition:** `.claude/agents/yt-reporter.md`
**Model:** opus

Prompt:
```
You are the yt-reporter agent.
Read all _workspace/ files: 01_fetch_result.json, 02_analysis.json, 03_seo_recommendations.json.
Synthesize into a complete channel improvement report.
Write to yt-channel-report.md.
Print a summary to stdout.
```

## Phase 4: Dashboard Update (Sub-agent)

After reporter completes, spawn yt-dashboard-builder to update the Next.js dashboard.

**Agent definition:** `.claude/agents/yt-dashboard-builder.md`
**Skill:** `yt-dashboard`
**Model:** opus

Prompt:
```
You are the yt-dashboard-builder agent. Use the yt-dashboard skill.
Working directory: /mnt/sk/repos/yt-seo-optimize
The analysis workspace files are at _workspace/02_analysis.json and _workspace/03_seo_recommendations.json.
Update src/app/channel/[id]/page.tsx and create src/app/channel/[id]/analysis/page.tsx
to display the analysis results. See the yt-dashboard skill for full instructions.
```

Skip Phase 4 if user says "skip dashboard" or "report only".

## Phase 5: Deliver

After dashboard completes:
1. Confirm `yt-channel-report.md` was created
2. Confirm dashboard pages updated in `src/app/`
3. Show user the report key quick wins
4. Tell user to run `pnpm dev` to view the dashboard
5. Ask: "Want me to implement any of these recommendations? I can rewrite titles, update descriptions, or extend the DB schema."

## Error Handling

| Error | Action |
|-------|--------|
| Missing YOUTUBE_API_KEY | Stop immediately, tell user to add key to `.env` |
| API quota exceeded | Report partial data collected, suggest retry after midnight PST |
| No videos in DB | Ask user to run sync first or re-run with fetch |
| Phase 2 agent fails | Proceed with available data, note gap in report |
| DB connection error | Check `DATABASE_URL` in `.env`. Canonical DB is `prisma/dev.db` — Prisma resolves `file:./dev.db` relative to `schema.prisma` location. A stale `dev.db` at project root can be ignored. |

## Data Flow

```
User input (channel handle)
    ↓
[Phase 1] yt-fetcher
    → _workspace/01_fetch_result.json
    ↓
[Phase 2] yt-analyst ───────────────┐
    → _workspace/02_analysis.json   │ (parallel)
[Phase 2] yt-seo-advisor ───────────┘
    → _workspace/03_seo_recommendations.json
    ↓
[Phase 3] yt-reporter
    → yt-channel-report.md
    ↓
[Phase 4] yt-dashboard-builder
    → src/app/channel/[id]/page.tsx (enhanced)
    → src/app/channel/[id]/analysis/page.tsx (new)
```

## Test Scenarios

### Happy Path
**Input:** "Analyze the YouTube channel @mkbhd"
**Expected:** Full pipeline runs, `yt-channel-report.md` created with statistics and ≥3 recommendations

### Partial Re-run
**Input:** "Improve the SEO recommendations from last time"
**Expected:** Phase 0 detects existing workspace, skips Phase 1, re-runs Phase 2-3 only

### Error Path
**Input:** Channel with no videos in DB, no API key
**Expected:** Clear error message: "YOUTUBE_API_KEY not set in .env. Add it and retry."

### Follow-up
**Input:** "Implement the title rewrites from the report"
**Expected:** Orchestrator reads `_workspace/03_seo_recommendations.json`, confirms with user, updates video titles in DB
