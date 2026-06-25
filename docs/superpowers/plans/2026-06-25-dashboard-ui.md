# Dashboard UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium Next.js dashboard using React Server Components and Vanilla CSS to visualize YouTube channels and their videos with AI action badges.

**Architecture:** Next.js App Router. `app/page.tsx` for the channels list, and `app/channel/[id]/page.tsx` for the video grid and AI insights.

**Tech Stack:** Next.js (App Router), React, Prisma, Vanilla CSS.

---

### Task 1: Setup Global Styles & Premium Aesthetic

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Define CSS Variables and Base Styles**

Replace the contents of `src/app/globals.css` with a premium dark mode aesthetic:

```css
:root {
  --bg-color: #0a0a0a;
  --surface-color: #151515;
  --surface-hover: #1f1f1f;
  --border-color: #2a2a2a;
  --border-hover: #3a3a3a;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --accent-color: #ff3366;
  --accent-glow: rgba(255, 51, 102, 0.15);
  
  --badge-red-bg: rgba(255, 51, 102, 0.1);
  --badge-red-border: rgba(255, 51, 102, 0.3);
  --badge-red-text: #ff4d79;
  
  --badge-orange-bg: rgba(255, 153, 51, 0.1);
  --badge-orange-border: rgba(255, 153, 51, 0.3);
  --badge-orange-text: #ffb366;

  --badge-green-bg: rgba(51, 204, 102, 0.1);
  --badge-green-border: rgba(51, 204, 102, 0.3);
  --badge-green-text: #66ff99;

  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

body {
  background-color: var(--bg-color);
  color: var(--text-primary);
  font-family: var(--font-sans);
  line-height: 1.5;
  min-height: 100vh;
}

a {
  color: inherit;
  text-decoration: none;
}

h1, h2, h3 {
  letter-spacing: -0.03em;
  font-weight: 700;
}
```

- [ ] **Step 2: Update Layout**

Update `src/app/layout.tsx` to ensure it imports `globals.css` properly and sets a nice title.

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Antigravity YT SEO",
  description: "AI-powered YouTube SEO Optimization Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify Compilation**

Run: `pnpm tsc --noEmit`
Expected: Clean exit.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "style: setup premium dark mode global CSS"
```

### Task 2: Build the Home Page (Channel List)

**Files:**
- Create: `src/app/page.module.css`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create CSS Module for Home Page**

Create `src/app/page.module.css`:

```css
.header {
  margin-bottom: 40px;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.header p {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-color);
  box-shadow: 0 10px 30px var(--accent-glow);
}

.cardTitle {
  font-size: 1.4rem;
  font-weight: 600;
}

.cardStats {
  display: flex;
  gap: 16px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.statItem {
  display: flex;
  flex-direction: column;
}

.statValue {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 1.1rem;
}
```

- [ ] **Step 2: Build Home Page Server Component**

Overwrite `src/app/page.tsx`:

```tsx
import prisma from '@/lib/db';
import Link from 'next/link';
import styles from './page.module.css';

// Force dynamic rendering if desired, but since it's a local DB, default is fine.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <div className={styles.header}>
        <h1>Your Channels</h1>
        <p>Select a channel to view AI SEO insights and video performance.</p>
      </div>

      <div className={styles.grid}>
        {channels.map((channel) => (
          <Link key={channel.id} href={`/channel/${channel.id}`} className={styles.card}>
            <div className={styles.cardTitle}>{channel.title}</div>
            <div className={styles.cardStats}>
              <div className={styles.statItem}>
                <span>Subscribers</span>
                <span className={styles.statValue}>{channel.subscriberCount.toLocaleString()}</span>
              </div>
              <div className={styles.statItem}>
                <span>Total Views</span>
                <span className={styles.statValue}>{channel.viewCount.toLocaleString()}</span>
              </div>
              <div className={styles.statItem}>
                <span>Videos</span>
                <span className={styles.statValue}>{channel.videoCount.toLocaleString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify Compilation**

Run: `pnpm tsc --noEmit`
Expected: Clean exit.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.module.css src/app/page.tsx
git commit -m "feat: build home page displaying synced channels"
```

### Task 3: Build the Channel Details Page (Video Grid & AI Badges)

**Files:**
- Create: `src/app/channel/[id]/page.module.css`
- Create: `src/app/channel/[id]/page.tsx`

- [ ] **Step 1: Create CSS Module for Channel Page**

Create `src/app/channel/[id]/page.module.css`:

```css
.header {
  margin-bottom: 40px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 20px;
}

.backLink {
  color: var(--accent-color);
  font-size: 0.9rem;
  margin-bottom: 12px;
  display: inline-block;
}

.title {
  font-size: 2rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.videoCard {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s;
}

.videoCard:hover {
  transform: translateY(-2px);
  border-color: var(--border-hover);
}

.videoTitle {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.videoStats {
  display: flex;
  gap: 16px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 20px;
}

.badge {
  margin-top: auto;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-block;
  width: fit-content;
}

.badgeRed {
  background: var(--badge-red-bg);
  border: 1px solid var(--badge-red-border);
  color: var(--badge-red-text);
}

.badgeOrange {
  background: var(--badge-orange-bg);
  border: 1px solid var(--badge-orange-border);
  color: var(--badge-orange-text);
}

.badgeGreen {
  background: var(--badge-green-bg);
  border: 1px solid var(--badge-green-border);
  color: var(--badge-green-text);
}
```

- [ ] **Step 2: Build Channel Details Server Component**

Create `src/app/channel/[id]/page.tsx`:

```tsx
import prisma from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

function getAIAction(video: { title: string; description: string | null; duration: string | null }) {
  const isLong = video.duration && (video.duration.includes('H') || parseInt(video.duration.replace(/[^0-9]/g, '')) > 45);
  const descLength = video.description?.length || 0;
  
  if (isLong && descLength < 200) {
    return { text: "🔴 Missing Watch Next Links", className: styles.badgeRed };
  }
  
  if (video.title.length > 80 && !video.title.includes('?')) {
    return { text: "🟠 Title Lacks Emotional Hook", className: styles.badgeOrange };
  }
  
  if (video.title.startsWith('#ep') || video.title.startsWith('Part')) {
    return { text: "🔴 Poor Title Structure", className: styles.badgeRed };
  }

  return { text: "🟢 SEO Optimized", className: styles.badgeGreen };
}

function parseDuration(durationStr: string | null) {
  if (!durationStr) return 'Unknown';
  return durationStr.replace('PT', '').toLowerCase();
}

export default async function ChannelPage({ params }: { params: { id: string } }) {
  const channel = await prisma.channel.findUnique({
    where: { id: params.id },
    include: {
      videos: {
        orderBy: { viewCount: 'desc' }
      }
    }
  });

  if (!channel) {
    notFound();
  }

  return (
    <div>
      <Link href="/" className={styles.backLink}>← Back to Channels</Link>
      
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{channel.title}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{channel.videos.length} videos analyzed</p>
        </div>
      </div>

      <div className={styles.grid}>
        {channel.videos.map((video) => {
          const badge = getAIAction(video);
          
          return (
            <div key={video.id} className={styles.videoCard}>
              <div className={styles.videoTitle}>{video.title}</div>
              
              <div className={styles.videoStats}>
                <span>👀 {video.viewCount.toLocaleString()} views</span>
                <span>⏱️ {parseDuration(video.duration)}</span>
              </div>
              
              <div className={`${styles.badge} ${badge.className}`}>
                {badge.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify Compilation**

Run: `pnpm tsc --noEmit`
Expected: Clean exit.

- [ ] **Step 4: Commit**

```bash
git add src/app/channel/
git commit -m "feat: build channel details page with AI insights grid"
```
