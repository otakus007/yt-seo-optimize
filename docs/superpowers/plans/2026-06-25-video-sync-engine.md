# Video Sync Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI-driven backend engine to fetch YouTube videos for a specified channel handle and store them in a local SQLite database.

**Architecture:** Add a `Video` model to the Prisma schema, update the YouTube client to support fetching videos, and create a CLI script `scripts/sync-videos.ts` to coordinate fetching and saving.

**Tech Stack:** TypeScript, Prisma, SQLite, Jest.

---

### Task 1: Add Video Model to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update Schema**

Modify `prisma/schema.prisma` to add the `Video` model and update the `Channel` model to include the relation.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Channel {
  id              String   @id @default(uuid())
  youtubeId       String   @unique
  title           String
  description     String?
  subscriberCount Int      @default(0)
  viewCount       Int      @default(0)
  videoCount      Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  videos          Video[]
}

model Video {
  id           String   @id @default(uuid())
  youtubeId    String   @unique
  title        String
  description  String?
  publishedAt  DateTime
  viewCount    Int      @default(0)
  duration     String?
  channelId    String
  channel      Channel  @relation(fields: [channelId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

- [ ] **Step 2: Run Migration**

Run: `pnpm prisma migrate dev --name add_video_model`
Expected: Success message that the database is in sync.

- [ ] **Step 3: Run Existing Tests**

Run: `pnpm test`
Expected: PASS (Verifying that the schema update didn't break the existing database client logic).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Video model to database schema"
```

### Task 2: Expand YouTube Client Utilities

**Files:**
- Modify: `src/lib/youtube.ts`
- Modify: `tests/youtube.test.ts`

- [ ] **Step 1: Add Video Interfaces to YouTube Client**

Append the following code to `src/lib/youtube.ts` to define the new interfaces:

```typescript
export interface YouTubeVideoStats {
  youtubeId: string;
  title: string;
  description: string;
  publishedAt: Date;
  viewCount: number;
  duration: string;
}

export interface ChannelResolution {
  channelId: string;
  uploadsPlaylistId: string;
}
```

- [ ] **Step 2: Add Resolution and Playlist Functions**

Append these functions to `src/lib/youtube.ts`:

```typescript
export async function getChannelByHandle(handle: string, apiKey: string): Promise<ChannelResolution> {
  // Remove the @ if the user included it
  const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
  const params = new URLSearchParams({
    part: 'contentDetails',
    forHandle: cleanHandle,
    key: apiKey
  });
  
  const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`YouTube API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('Channel not found for the given handle');
  }

  return {
    channelId: data.items[0].id,
    uploadsPlaylistId: data.items[0].contentDetails.relatedPlaylists.uploads
  };
}

export async function getVideosFromPlaylist(playlistId: string, apiKey: string): Promise<string[]> {
  const params = new URLSearchParams({
    part: 'contentDetails',
    playlistId: playlistId,
    maxResults: '50', // Fetch up to 50 videos at once
    key: apiKey
  });
  
  const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`YouTube API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    return [];
  }

  return data.items.map((item: any) => item.contentDetails.videoId);
}

export async function getVideoStats(videoIds: string[], apiKey: string): Promise<YouTubeVideoStats[]> {
  if (videoIds.length === 0) return [];
  
  const params = new URLSearchParams({
    part: 'snippet,contentDetails,statistics',
    id: videoIds.join(','),
    key: apiKey
  });
  
  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`YouTube API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.items) return [];

  return data.items.map((video: any) => ({
    youtubeId: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    publishedAt: new Date(video.snippet.publishedAt),
    viewCount: parseInt(video.statistics.viewCount || '0', 10),
    duration: video.contentDetails.duration
  }));
}
```

- [ ] **Step 3: Write Tests for New Utilities**

Append the following test cases to the `describe` block in `tests/youtube.test.ts`:

```typescript
  it('should resolve channel handle to ID and uploads playlist', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          id: 'UC456',
          contentDetails: { relatedPlaylists: { uploads: 'UU456' } }
        }]
      })
    });

    const result = await require('../src/lib/youtube').getChannelByHandle('@testhandle', 'key');
    expect(result.channelId).toBe('UC456');
    expect(result.uploadsPlaylistId).toBe('UU456');
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('forHandle=testhandle'));
  });

  it('should fetch video IDs from playlist', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { contentDetails: { videoId: 'v1' } },
          { contentDetails: { videoId: 'v2' } }
        ]
      })
    });

    const result = await require('../src/lib/youtube').getVideosFromPlaylist('UU456', 'key');
    expect(result).toEqual(['v1', 'v2']);
  });

  it('should fetch video stats', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'v1',
            snippet: { title: 'Vid 1', description: 'Desc', publishedAt: '2023-01-01T00:00:00Z' },
            contentDetails: { duration: 'PT5M' },
            statistics: { viewCount: '100' }
          }
        ]
      })
    });

    const result = await require('../src/lib/youtube').getVideoStats(['v1'], 'key');
    expect(result[0].youtubeId).toBe('v1');
    expect(result[0].viewCount).toBe(100);
    expect(result[0].duration).toBe('PT5M');
  });
```

- [ ] **Step 4: Run Tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/youtube.ts tests/youtube.test.ts
git commit -m "feat: add video fetching functions to YouTube client"
```

### Task 3: Create Sync Script

**Files:**
- Create: `scripts/sync-videos.ts`

- [ ] **Step 1: Write Sync Script**

Create `scripts/sync-videos.ts`:

```typescript
import * as dotenv from 'dotenv';
import { 
  getChannelByHandle, 
  getChannelBasicStats, 
  getVideosFromPlaylist, 
  getVideoStats 
} from '../src/lib/youtube';
import prisma from '../src/lib/db';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const handle = args[0];

  if (!handle) {
    console.error('Usage: pnpm ts-node scripts/sync-videos.ts <@handle>');
    process.exit(1);
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('Error: YOUTUBE_API_KEY is not set in .env');
    process.exit(1);
  }

  try {
    console.log(`[1/4] Resolving handle ${handle}...`);
    const { channelId, uploadsPlaylistId } = await getChannelByHandle(handle, apiKey);
    
    console.log(`[2/4] Fetching basic stats for channel ${channelId}...`);
    const stats = await getChannelBasicStats(channelId, apiKey);

    const savedChannel = await prisma.channel.upsert({
      where: { youtubeId: stats.youtubeId },
      update: {
        title: stats.title,
        description: stats.description,
        subscriberCount: stats.subscriberCount,
        viewCount: stats.viewCount,
        videoCount: stats.videoCount,
      },
      create: {
        youtubeId: stats.youtubeId,
        title: stats.title,
        description: stats.description,
        subscriberCount: stats.subscriberCount,
        viewCount: stats.viewCount,
        videoCount: stats.videoCount,
      }
    });

    console.log(`[3/4] Fetching up to 50 recent videos from uploads playlist ${uploadsPlaylistId}...`);
    const videoIds = await getVideosFromPlaylist(uploadsPlaylistId, apiKey);
    
    if (videoIds.length === 0) {
      console.log('No videos found.');
      return;
    }

    console.log(`[4/4] Fetching stats and saving ${videoIds.length} videos...`);
    const videosStats = await getVideoStats(videoIds, apiKey);

    let savedCount = 0;
    for (const video of videosStats) {
      await prisma.video.upsert({
        where: { youtubeId: video.youtubeId },
        update: {
          title: video.title,
          description: video.description,
          viewCount: video.viewCount,
          duration: video.duration,
        },
        create: {
          youtubeId: video.youtubeId,
          title: video.title,
          description: video.description,
          publishedAt: video.publishedAt,
          viewCount: video.viewCount,
          duration: video.duration,
          channelId: savedChannel.id
        }
      });
      savedCount++;
    }

    console.log(`✅ Success! Synced channel "${savedChannel.title}" and ${savedCount} videos to the database.`);
  } catch (error) {
    console.error('❌ Sync failed:', error instanceof Error ? error.message : String(error));
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

- [ ] **Step 2: Verify Compilation**

Run: `pnpm tsc --noEmit scripts/sync-videos.ts`
Expected: Clean exit (no errors)

- [ ] **Step 3: Commit**

```bash
git add scripts/sync-videos.ts
git commit -m "feat: add CLI script to sync channel and videos"
```
