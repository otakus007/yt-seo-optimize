/**
 * Save a pre-publish Draft produced by yt-new-video, or link a Draft to a published video.
 *   pnpm tsx scripts/draft.ts save < draft.json     # {channel, input:{...}, output:{titles[],description,tags[],thumbnailPrompt,overlays[]}, chosenTitle?}
 *   pnpm tsx scripts/draft.ts link <draftId> <youtubeId>
 *   pnpm tsx scripts/draft.ts list [--json]
 */
import { readFileSync } from 'fs';
import prisma from '../src/lib/db';
import { out, positional } from './_cli';

async function main() {
  const [cmd, a, b] = positional;
  if (cmd === 'save') {
    const d = JSON.parse(readFileSync(0, 'utf8'));
    const ch = await prisma.channel.findFirstOrThrow({ where: { OR: [{ id: d.channel }, { handle: d.channel }, { isOwn: d.channel ? undefined : true }] } });
    const draft = await prisma.draft.create({ data: { channelId: ch.id, input: JSON.stringify(d.input), output: JSON.stringify(d.output), chosenTitle: d.chosenTitle } });
    return out({ id: draft.id });
  }
  if (cmd === 'link') {
    const v = await prisma.video.findUniqueOrThrow({ where: { youtubeId: b } });
    await prisma.draft.update({ where: { id: a }, data: { videoId: v.id } });
    return out({ linked: a, video: b });
  }
  const drafts = await prisma.draft.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { video: { select: { youtubeId: true, title: true } } } });
  out(drafts.map((d) => ({ id: d.id, createdAt: d.createdAt, chosenTitle: d.chosenTitle, video: d.video, input: JSON.parse(d.input) })));
}
main().finally(() => prisma.$disconnect());
