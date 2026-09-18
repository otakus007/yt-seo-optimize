/**
 * The only path that writes to YouTube. Reads live metadata first, snapshots the
 * current thumbnail to disk, applies, and always writes a Change row (restorable).
 */
import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import prisma from './db';
import { accessTokenFor } from './oauth';
import { addToPlaylist, getVideoLive, setThumbnail, updateVideoSnippet, type LiveSnippet } from './youtube';

export const THUMB_DIR = path.join(process.cwd(), 'data', 'thumbnails');
export type Field = 'title' | 'description' | 'tags' | 'thumbnail' | 'playlist';

async function saveCurrentThumbnail(videoId: string, url: string | null, changeId: string): Promise<string | null> {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const dir = path.join(THUMB_DIR, videoId);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${changeId}.jpg`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return path.relative(process.cwd(), file);
}

interface Target { video: { id: string; youtubeId: string }; channel: { id: string; isOwn: boolean; refreshToken: string | null } }

/** Apply one field value to YouTube and record it. `value`: string | string[] | {path} for thumbnail. */
export async function applyField(t: Target, field: Field, value: unknown, meta: { stepId?: string; restoresChangeId?: string } = {}) {
  if (!t.channel.isOwn) throw new Error('Not an own channel');
  const token = await accessTokenFor(t.channel);
  const live = await getVideoLive(token, t.video.youtubeId);
  const changeId = randomUUID();
  const before = field === 'thumbnail' ? live.thumbnailUrl : field === 'playlist' ? null : live[field];
  const beforeThumbnailPath = field === 'thumbnail' ? await saveCurrentThumbnail(t.video.youtubeId, live.thumbnailUrl, changeId) : null;

  // Record first: a DB failure (lock, duplicate stepId) then aborts before YouTube is touched.
  const change = await prisma.change.create({
    data: {
      id: changeId, videoId: t.video.id, stepId: meta.stepId, field,
      before: JSON.stringify(before ?? null), after: JSON.stringify(value),
      beforeThumbnailPath, restoresChangeId: meta.restoresChangeId,
    },
  });
  try {
    if (field === 'thumbnail') {
      await setThumbnail(token, t.video.youtubeId, await readFile(path.resolve(process.cwd(), (value as { path: string }).path)));
    } else if (field === 'playlist') {
      await addToPlaylist(token, String(value), t.video.youtubeId);
    } else {
      await updateVideoSnippet(token, t.video.youtubeId, { ...live, [field]: value } as LiveSnippet);
      await prisma.video.update({ where: { id: t.video.id }, data: { [field]: field === 'tags' ? JSON.stringify(value) : value } });
    }
  } catch (e) {
    await prisma.change.delete({ where: { id: changeId } }).catch(() => {});
    throw e;
  }
  return change;
}

export async function applyStep(stepId: string) {
  const step = await prisma.step.findUniqueOrThrow({ where: { id: stepId }, include: { recommendation: { include: { video: { include: { channel: true } }, steps: true } } } });
  if (step.status !== 'pending') throw new Error('Step already handled');
  const video = step.recommendation.video;
  if (!video) throw new Error('Recommendation has no video');
  if (step.kind === 'manual') {
    await prisma.step.update({ where: { id: stepId }, data: { status: 'applied', appliedAt: new Date() } });
  } else {
    if (!step.field || step.payload == null) throw new Error('api step needs field + payload');
    await applyField({ video, channel: video.channel }, step.field as Field, JSON.parse(step.payload), { stepId });
    await prisma.step.update({ where: { id: stepId }, data: { status: 'applied', appliedAt: new Date() } });
  }
  const remaining = step.recommendation.steps.filter((s) => s.id !== stepId && s.status === 'pending').length;
  if (remaining === 0) await prisma.recommendation.update({ where: { id: step.recommendationId }, data: { status: 'applied' } });
}

export async function restoreChange(changeId: string) {
  const ch = await prisma.change.findUniqueOrThrow({ where: { id: changeId }, include: { video: { include: { channel: true } } } });
  if (ch.field === 'playlist') throw new Error('playlist additions are not restorable here');
  const value = ch.field === 'thumbnail'
    ? (ch.beforeThumbnailPath ? { path: ch.beforeThumbnailPath } : null)
    : JSON.parse(ch.before);
  if (value == null) throw new Error('No saved "before" value to restore');
  return applyField({ video: ch.video, channel: ch.video.channel }, ch.field as Field, value, { restoresChangeId: changeId });
}
