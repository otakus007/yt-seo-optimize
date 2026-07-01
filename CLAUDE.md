@AGENTS.md

## Harness: YouTube Channel Analyzer

**Goal:** Fetch YouTube channel data, analyze performance, generate SEO recommendations to grow views and ad revenue.

**Trigger:** When YouTube analysis, channel sync, SEO improvement, or "grow my channel" tasks are requested, use the `yt-orchestrate` skill. Simple one-off questions can be answered directly.

**Agents:** `yt-fetcher` → `yt-analyst` + `yt-seo-advisor` (parallel) → `yt-reporter` → `yt-dashboard-builder`

**Change Log:**
| Date | Change | Target | Reason |
|------|--------|--------|--------|
| 2026-06-25 | Initial setup | All | - |
| 2026-06-25 | Added yt-dashboard-builder agent + yt-dashboard skill | agents/, skills/, orchestrator | User: show analysis results in Next.js dashboard |
