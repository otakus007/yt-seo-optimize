# Dashboard UI Design

## Purpose
Build a visually stunning, premium Next.js dashboard to visualize synced YouTube channels and their videos. The UI will use an "AI Insights Grid" layout to highlight actionable SEO optimizations for videos to increase view hours.

## Architecture & Routing
Using Next.js App Router and React Server Components.
- **`app/page.tsx`**: The home page. Queries the SQLite database for all `Channel` records and displays them.
- **`app/channel/[id]/page.tsx`**: The detailed channel view. Queries the database for all `Video` records belonging to the channel and displays them in a grid.

## UI Components
- **`ChannelCard`**: Reusable component for the home page. Displays channel name, subscriber count, and total videos.
- **`VideoCard`**: Reusable component for the grid.
  - Displays: Title, views, duration.
  - Generates a dynamic "AI Action Badge" based on simple heuristics (e.g., if duration > 1 hour and description is short, flag as "Missing Timestamps"; if title is very short, flag as "Unoptimized Title", otherwise "Optimized").
- **`ChannelHeader`**: Displays aggregated stats at the top of the channel page.

## Data Fetching
- Fully server-side via Prisma. Data is fetched directly from the local SQLite database.
- Example: `const videos = await prisma.video.findMany({ where: { channelId: id }, orderBy: { viewCount: 'desc' } })`.
- No loading spinners required for initial load due to Server Components.

## Styling & Aesthetics
- **Vanilla CSS**: `app/globals.css` and CSS Modules (`*.module.css`). No TailwindCSS will be used.
- **Aesthetics**: Premium dark mode. Uses deep blacks (`#0a0a0a`), subtle borders (`#222`), and vibrant accents (e.g., `#ff3366` for YouTube red).
- **Interactions**: Smooth hover effects (transform translations, box-shadow adjustments) to make the UI feel alive and responsive.
- **Typography**: Clean, sans-serif fonts (like Inter or system defaults) with strong hierarchical weighting.
