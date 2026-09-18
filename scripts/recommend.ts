/**
 * Write a Recommendation (+ steps) produced by a skill into the DB, from JSON on stdin or a file.
 *   pnpm tsx scripts/recommend.ts < rec.json
 * Shape: { videoId: "<youtubeId>" | null, channel: "<id|handle>", title, rationale, priority, source,
 *          steps: [{ kind: "api"|"manual", field?, payload?, instructions }] }
 */
import { readFileSync } from 'fs';
import prisma, { findChannel } from '../src/lib/db';
import { out, positional } from './_cli';

interface StepIn { kind: 'api' | 'manual'; field?: string; payload?: unknown; instructions: string }
interface RecIn { videoId?: string | null; channel?: string; title: string; rationale: string; priority?: number; source?: string; steps?: StepIn[] }

async function main() {
  const text = positional[0] ? readFileSync(positional[0], 'utf8') : readFileSync(0, 'utf8');
  const parsed = JSON.parse(text) as RecIn | RecIn[];
  const items: RecIn[] = Array.isArray(parsed) ? parsed : [parsed];
  const created = [];
  for (const r of items) {
    const video = r.videoId ? await prisma.video.findUniqueOrThrow({ where: { youtubeId: r.videoId } }) : null;
    const channelId = video?.channelId ?? (await findChannel(r.channel)).id;
    if (!r.rationale || !/\d/.test(r.rationale)) throw new Error(`rationale must cite numbers: ${r.title}`);
    const rec = await prisma.recommendation.create({
      data: {
        channelId, videoId: video?.id, title: r.title, rationale: r.rationale, priority: r.priority ?? 3, source: r.source ?? 'audit',
        steps: { create: (r.steps ?? []).map((s, i) => ({ order: i + 1, kind: s.kind, field: s.field, payload: s.payload === undefined ? null : JSON.stringify(s.payload), instructions: s.instructions })) },
      },
    });
    created.push(rec.id);
  }
  out({ created });
}
main().finally(() => prisma.$disconnect());
