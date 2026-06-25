# Core Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js foundation, set up a SQLite database with Prisma to store channel information, and create the core YouTube API client to fetch basic channel stats.

**Architecture:** We will use Next.js App Router. The UI will use React Server Components where possible, falling back to Client Components for interactivity. Data fetching from YouTube will happen securely on the server via Next.js API routes or server actions. We will use a local SQLite database via Prisma to persist channel data and avoid re-authenticating constantly.

**Tech Stack:** Next.js (App Router), TypeScript, Prisma, SQLite, Jest (for testing), Vanilla CSS.

---

### Task 1: Initialize Next.js Project & Testing Environment

**Files:**
- Create: `package.json`, `jest.config.ts`, `tsconfig.json`

- [ ] **Step 1: Scaffold Next.js App**
Run the following command to initialize the Next.js app with TypeScript, ESLint, App Router, and the `src` directory, without Tailwind.

```bash
npx create-next-app@latest . --typescript --eslint --tailwind=false --src-dir --app --import-alias "@/*" --use-npm --yes
```

- [ ] **Step 2: Install Testing Dependencies**
```bash
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom ts-node @types/jest
```

- [ ] **Step 3: Configure Jest**
Create the file `jest.config.ts`:

```typescript
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
})

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  }
}

export default createJestConfig(config);
```

Create `jest.setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Commit**
```bash
git add .
git commit -m "chore: scaffold Next.js app and configure Jest"
```

### Task 2: Setup Prisma and Database Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Test: `tests/db.test.ts` (Integration test)

- [ ] **Step 1: Install and Initialize Prisma**
```bash
npm install prisma --save-dev
npm install @prisma/client
npx prisma init --datasource-provider sqlite
```

- [ ] **Step 2: Define the Channel Schema**
Overwrite `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Channel {
  id            String   @id @default(uuid())
  youtubeId     String   @unique
  title         String
  description   String?
  subscriberCount Int    @default(0)
  viewCount     Int      @default(0)
  videoCount    Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

- [ ] **Step 3: Run Migration**
```bash
npx prisma migrate dev --name init_channel_schema
```

- [ ] **Step 4: Create Database Client**
Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
```

- [ ] **Step 5: Write Database Test**
Create `tests/db.test.ts`:

```typescript
import prisma from '../src/lib/db';

describe('Database Client', () => {
  beforeAll(async () => {
    await prisma.channel.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create and retrieve a channel', async () => {
    const channel = await prisma.channel.create({
      data: {
        youtubeId: 'UC12345',
        title: 'Test Channel',
        subscriberCount: 1000,
      }
    });

    expect(channel).toBeDefined();
    expect(channel.youtubeId).toBe('UC12345');

    const retrieved = await prisma.channel.findUnique({
      where: { youtubeId: 'UC12345' }
    });
    
    expect(retrieved?.title).toBe('Test Channel');
  });
});
```

- [ ] **Step 6: Run Database Test**
Run: `npx jest tests/db.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**
```bash
git add prisma/ src/lib/ tests/ package.json package-lock.json
git commit -m "feat: setup Prisma with SQLite and Channel schema"
```

### Task 3: YouTube API Client Utility

**Files:**
- Create: `src/lib/youtube.ts`
- Create: `tests/youtube.test.ts`

- [ ] **Step 1: Write Failing Test for YouTube Client**
Create `tests/youtube.test.ts`:

```typescript
import { fetchChannelStats } from '../src/lib/youtube';

// Mock the global fetch API
global.fetch = jest.fn();

describe('YouTube API Client', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should fetch channel statistics successfully', async () => {
    const mockResponse = {
      items: [
        {
          id: 'UC123',
          snippet: { title: 'Mock Channel', description: 'Desc' },
          statistics: { subscriberCount: '100', viewCount: '500', videoCount: '10' }
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await fetchChannelStats('UC123', 'fake-api-key');
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('youtube/v3/channels?part=snippet%2Cstatistics&id=UC123&key=fake-api-key')
    );
    expect(result.title).toBe('Mock Channel');
    expect(result.subscriberCount).toBe(100);
  });

  it('should throw error if channel is not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] })
    });

    await expect(fetchChannelStats('bad-id', 'fake-api-key')).rejects.toThrow('Channel not found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx jest tests/youtube.test.ts`
Expected: FAIL (Cannot find module '../src/lib/youtube')

- [ ] **Step 3: Implement YouTube Client**
Create `src/lib/youtube.ts`:

```typescript
export interface YouTubeChannelStats {
  id: string;
  title: string;
  description: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

export async function fetchChannelStats(channelId: string, apiKey: string): Promise<YouTubeChannelStats> {
  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.searchParams.append('part', 'snippet,statistics');
  url.searchParams.append('id', channelId);
  url.searchParams.append('key', apiKey);

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error('Channel not found');
  }

  const channel = data.items[0];

  return {
    id: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    subscriberCount: parseInt(channel.statistics.subscriberCount, 10),
    viewCount: parseInt(channel.statistics.viewCount, 10),
    videoCount: parseInt(channel.statistics.videoCount, 10),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npx jest tests/youtube.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/youtube.ts tests/youtube.test.ts
git commit -m "feat: implement YouTube API client to fetch channel stats"
```
