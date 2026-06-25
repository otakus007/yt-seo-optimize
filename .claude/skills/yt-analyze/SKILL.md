---
name: yt-analyze
description: Analyze YouTube channel statistics from SQLite DB. Use this skill to compute performance metrics, find top/bottom videos, detect upload patterns, title length correlations, and channel health signals. Always use when analyzing, computing stats, finding trends, or benchmarking YouTube channel performance.
---

# YT Analyze Skill

## Overview

Query the SQLite DB via Prisma and compute statistical analysis of a channel's video performance. Produces `_workspace/02_analysis.json`.

## DB Access Pattern

```typescript
import prisma from '../src/lib/db'

// Get all videos for a channel
const videos = await prisma.video.findMany({
  where: { channel: { youtubeId: channelId } },
  orderBy: { viewCount: 'desc' }
})

// Get channel with videos
const channel = await prisma.channel.findUnique({
  where: { youtubeId: channelId },
  include: { videos: true }
})
```

## Metrics to Compute

### View Statistics
```typescript
const views = videos.map(v => v.viewCount)
const avg = views.reduce((a, b) => a + b, 0) / views.length
const sorted = [...views].sort((a, b) => a - b)
const median = sorted[Math.floor(sorted.length / 2)]
const stdDev = Math.sqrt(views.map(v => (v - avg) ** 2).reduce((a, b) => a + b) / views.length)
```

### Upload Frequency
```typescript
const dates = videos.map(v => v.publishedAt).sort()
const spanDays = (dates[dates.length-1] - dates[0]) / (1000 * 60 * 60 * 24)
const perMonth = (videos.length / spanDays) * 30
```

### Best Upload Days
```typescript
const dayCounts = videos.reduce((acc, v) => {
  const day = new Date(v.publishedAt).toLocaleDateString('en', { weekday: 'long' })
  acc[day] = (acc[day] || 0) + 1
  return acc
}, {})
```

### Title Length Correlation
```typescript
const topVideos = videos.slice(0, Math.floor(videos.length * 0.2))  // top 20%
const bottomVideos = videos.slice(-Math.floor(videos.length * 0.2))  // bottom 20%
const topAvgTitleLen = topVideos.reduce((a, v) => a + v.title.length, 0) / topVideos.length
const bottomAvgTitleLen = bottomVideos.reduce((a, v) => a + v.title.length, 0) / bottomVideos.length
```

### Duration Parsing (ISO 8601)
```typescript
function parseDurationSeconds(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  return (+(match?.[1] || 0)) * 3600 + (+(match?.[2] || 0)) * 60 + (+(match?.[3] || 0))
}
```

## Running Analysis

If writing a one-off analysis script:
```bash
pnpm tsx scripts/analyze-channel.ts <CHANNEL_ID>
```

Or run analysis inline using Prisma directly within the agent session.

## Key Findings Format

State findings as concrete sentences:
- "Top 20% of videos average 45-char titles vs 62-char for bottom 20%"
- "78% of uploads happen Mon-Wed; highest-viewed videos were uploaded Saturday"
- "Views are highly concentrated: top 3 videos account for 60% of total views"

## Output

Write `_workspace/02_analysis.json` — see yt-analyst agent definition for schema.
