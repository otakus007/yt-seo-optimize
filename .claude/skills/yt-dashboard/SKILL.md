---
name: yt-dashboard
description: Build and update the Next.js YouTube analytics dashboard in src/app/. Use this skill to display channel stats, video SEO badges, performance metrics, and recommendations from the analysis pipeline. Always use when building, updating, or refreshing the dashboard, adding stats panels, showing SEO recommendations in the UI, or rendering analysis results in Next.js pages.
---

# YT Dashboard Skill

## Overview

Enhance `src/app/channel/[id]/` to display live analysis data from SQLite. All rendering is server-side (Next.js server components). No chart libraries — use CSS-based visuals.

## Page Structure

```
src/app/
  page.tsx                        ← channel list (existing, no changes)
  channel/
    [id]/
      page.tsx                    ← enhanced: stats bar + video grid with real badges
      page.module.css             ← extended styles
      analysis/
        page.tsx                  ← new: full report, top/bottom tables, recommendations
        page.module.css           ← new styles
```

## Stats Computation (server-side)

```typescript
// In page.tsx server component
const videos = channel.videos
const views = videos.map(v => v.viewCount)
const avg = Math.round(views.reduce((a, b) => a + b, 0) / views.length)
const sorted = [...views].sort((a, b) => a - b)
const median = sorted[Math.floor(sorted.length / 2)]
const likeRatio = videos.filter(v => v.viewCount > 0)
  .reduce((a, v) => a + v.likeCount / v.viewCount, 0) / videos.length

const missingTags = videos.filter(v => !v.tags).length
const missingDesc = videos.filter(v => !v.description || v.description.trim().length < 50).length
const longTitles = videos.filter(v => v.title.length > 70).length
```

## SEO Badge System

Each video gets 1–3 badges based on real DB fields:

| Field | Condition | Badge |
|-------|-----------|-------|
| `tags` | null or empty | 🔴 No Tags |
| `description` | null or < 50 chars | 🔴 No Description |
| `title` | > 70 chars | 🟠 Title Too Long |
| `title` | contains "manwha"/"ronmantic" (case insensitive) | 🟠 Misspelling |
| `likeCount/viewCount` | > 3% | 🟢 High Engagement |
| all checks pass | — | 🟢 SEO Good |

## CSS Bar Chart (no library)

For a simple view distribution bar:
```tsx
// Normalize to max width 100%
const maxViews = Math.max(...videos.map(v => v.viewCount))
<div className={styles.barChart}>
  {topVideos.map(v => (
    <div key={v.id} className={styles.barRow}>
      <div className={styles.barLabel}>{v.title.slice(0, 40)}…</div>
      <div className={styles.barTrack}>
        <div className={styles.bar} style={{ width: `${(v.viewCount / maxViews) * 100}%` }} />
        <span className={styles.barValue}>{v.viewCount.toLocaleString()}</span>
      </div>
    </div>
  ))}
</div>
```

## Reading Workspace Recommendations

```typescript
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

function getQuickWins(channelId: string) {
  const path = join(process.cwd(), '_workspace', '03_seo_recommendations.json')
  if (!existsSync(path)) return []
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'))
    if (data.channelId !== channelId) return []  // wrong channel
    return (data.quickWins || []).slice(0, 3)
  } catch { return [] }
}
```

## Analysis Page — Full Report

```typescript
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

function getReport() {
  const path = join(process.cwd(), 'yt-channel-report.md')
  if (!existsSync(path)) return null
  return readFileSync(path, 'utf-8')
}
```

Render markdown as preformatted or use a minimal markdown-to-html conversion (replace `##` with `<h2>` etc via regex — no library needed for this structured output).

## CSS Variable Reference

```css
--bg-color: #0a0a0a
--surface-color: #151515
--surface-hover: #1f1f1f
--border-color: #2a2a2a
--text-primary: #ffffff
--text-secondary: #a0a0a0
--accent-color: #ff3366
--badge-red-bg / --badge-red-border / --badge-red-text
--badge-orange-bg / --badge-orange-border / --badge-orange-text
--badge-green-bg / --badge-green-border / --badge-green-text
```

## Layout Patterns

Stats bar — 4 metric tiles in a row:
```css
.statsBar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
.statTile { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; }
.statValue { font-size: 2rem; font-weight: 700; color: var(--accent-color); }
.statLabel { font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; }
```

Health bar — issue counts:
```css
.healthBar { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.healthBadge { padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
```
