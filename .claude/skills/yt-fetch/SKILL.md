---
name: yt-fetch
description: Fetch YouTube channel and video data via YouTube Data API v3. Use this skill to sync a channel by handle (@mkbhd) or ID, fetch all recent videos, save stats to SQLite via Prisma, and detect schema gaps. Always use this skill when fetching, syncing, updating, or refreshing YouTube data.
---

# YT Fetch Skill

## Overview

Fetch YouTube channel and video data, then persist to SQLite via Prisma upsert. Uses existing `src/lib/youtube.ts` and `src/lib/db.ts` — extend them if needed, never bypass them.

## Prerequisites

- `YOUTUBE_API_KEY` in `.env` (fail fast if missing)
- Prisma client generated: `pnpm prisma generate`
- DB migrated: `pnpm prisma db push`

## Fetch Sequence

1. Resolve handle → channelId + uploadsPlaylistId via `getChannelByHandle()`
2. Fetch channel stats via `getChannelBasicStats()`
3. Upsert Channel record
4. Fetch video IDs from uploads playlist (paginated, up to 200 by default via `maxVideos` param)
5. Fetch video stats in batch via `getVideoStats()`
6. Upsert each Video record

## Running Existing Scripts

```bash
# Add/update channel by ID
pnpm tsx scripts/add-channel.ts <CHANNEL_ID>

# Full sync by handle (channel + videos)
pnpm tsx scripts/sync-videos.ts @<handle>
```

## Schema Gaps to Address

Current Video model is missing fields that enable richer analysis. When extending for full SEO analysis, add to `prisma/schema.prisma`:

```prisma
model Video {
  // existing fields...
  likeCount     Int      @default(0)   // for engagement ratio
  commentCount  Int      @default(0)   // for engagement signals  
  tags          String?               // JSON array stored as string
  thumbnailUrl  String?               // default thumbnail URL
}
```

After schema change:
```bash
pnpm prisma db push
```

And update `getVideoStats()` in `src/lib/youtube.ts` to map the new fields from `video.statistics.likeCount`, `video.statistics.commentCount`, `video.snippet.tags`, `video.snippet.thumbnails.default.url`.

## Quota Management

YouTube Data API v3 quota: 10,000 units/day

| Operation | Cost |
|-----------|------|
| channels.list | 1 unit |
| playlistItems.list (per page of 50) | 1 unit |
| videos.list (per batch of 50) | 1 unit |

Typical full sync (1 channel, 50 videos): ~3 units. Very cheap.

## Output

Write `_workspace/01_fetch_result.json` with structure defined in yt-fetcher agent definition.

If `_workspace/` doesn't exist, create it: `mkdir -p _workspace`
