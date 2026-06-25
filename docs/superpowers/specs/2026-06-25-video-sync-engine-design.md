# Video Sync Engine Design

## Purpose
Build a CLI-driven backend engine to fetch YouTube videos for a specified channel handle, extract SEO-related statistics (titles, descriptions, durations, view counts), and store them in a local SQLite database. This data will be used by Antigravity (the AI brain) to analyze and suggest SEO improvements aimed at increasing view hours (watch time).

## Architecture & Components

### 1. Database Schema (`prisma/schema.prisma`)
We will add a new `Video` model to store video metadata, related to the existing `Channel` model.

**Model: `Video`**
- `id` (String, UUID)
- `youtubeId` (String, Unique)
- `title` (String)
- `description` (String, Optional)
- `publishedAt` (DateTime)
- `viewCount` (Int, Default 0)
- `duration` (String, Optional - ISO 8601 duration format from YouTube)
- `channelId` (String, Foreign Key to `Channel`)
- `createdAt` / `updatedAt`

### 2. YouTube API Enhancements (`src/lib/youtube.ts`)
We will expand the existing YouTube client to support fetching videos:
- **`getChannelByHandle(handle: string, apiKey: string)`**: Resolves a `@handle` to a YouTube Channel ID and its `uploads` playlist ID using the `channels` endpoint (`part=contentDetails`).
- **`getVideosFromPlaylist(playlistId: string, apiKey: string)`**: Fetches the list of video IDs from the uploads playlist using the `playlistItems` endpoint.
- **`getVideoStats(videoIds: string[], apiKey: string)`**: Fetches detailed stats (duration, view count, title, description, publishedAt) using the `videos` endpoint (`part=snippet,contentDetails,statistics`).

### 3. CLI Sync Script (`scripts/sync-videos.ts`)
A standalone Node.js script executed via `ts-node`.

**Data Flow:**
1. Accepts a YouTube handle as a CLI argument (e.g., `pnpm ts-node scripts/sync-videos.ts @sarahsanto-lt5em`).
2. Reads `YOUTUBE_API_KEY` from `.env`.
3. Calls `getChannelByHandle` to get the channel ID and uploads playlist ID.
4. Upserts the `Channel` in the database.
5. Calls `getVideosFromPlaylist` to get recent video IDs (limiting to the first 50 recent videos for quick batch analysis).
6. Calls `getVideoStats` to get the metadata for those videos.
7. Upserts each `Video` into the database linked to the `Channel`.

## Error Handling
- Validate CLI arguments and environment variables before making network requests.
- Wrap API calls in `try/catch` and throw standardized network errors.
- Ensure database connections are gracefully disconnected (`prisma.$disconnect()`) in a `finally` block to prevent leaks.

## Testing Strategy
- Update `tests/youtube.test.ts` to mock `fetch` and verify the new functions (`getChannelByHandle`, `getVideosFromPlaylist`, `getVideoStats`).
- Ensure the `Video` model schema is properly migrated.
