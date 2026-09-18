'use server';
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import path from 'path';
import prisma from '@/lib/db';
import { applyStep, restoreChange, THUMB_DIR } from '@/lib/apply';
import { isAuthorized } from '@/lib/auth';
import { addCompetitor } from '@/lib/competitors';
import { parseStudioCsv } from '@/lib/studio';

async function guard() {
  if (!(await isAuthorized({ headers: await headers() }))) throw new Error('Unauthorized');
}
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '');

/** Runs scripts/sync.ts detached (backfill can take minutes); output in data/sync.log. */
export async function startSync(fd: FormData) {
  await guard();
  mkdirSync('data', { recursive: true });
  const log = openSync(path.join('data', 'sync.log'), 'a');
  const channel = str(fd, 'channel');
  const child = spawn('pnpm', ['tsx', 'scripts/sync.ts', ...(channel ? ['--channel', channel] : [])], { detached: true, stdio: ['ignore', log, log], cwd: process.cwd() });
  child.unref();
  revalidatePath('/');
}

export async function applyStepAction(fd: FormData) {
  await guard();
  await applyStep(str(fd, 'stepId'));
  revalidatePath('/', 'layout');
}

export async function uploadThumbnailAction(fd: FormData) {
  await guard();
  const stepId = str(fd, 'stepId'), file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('No file');
  const step = await prisma.step.findUniqueOrThrow({ where: { id: stepId }, include: { recommendation: { include: { video: true } } } });
  const vid = step.recommendation.video?.youtubeId ?? 'unknown';
  await mkdir(path.join(THUMB_DIR, vid), { recursive: true });
  const rel = path.relative(process.cwd(), path.join(THUMB_DIR, vid, `new-${stepId}.jpg`));
  await writeFile(rel, Buffer.from(await file.arrayBuffer()));
  await prisma.step.update({ where: { id: stepId }, data: { payload: JSON.stringify({ path: rel }) } });
  revalidatePath('/', 'layout');
}

export async function skipStepAction(fd: FormData) {
  await guard();
  await prisma.step.update({ where: { id: str(fd, 'stepId') }, data: { status: 'skipped' } });
  revalidatePath('/', 'layout');
}

export async function dismissRecommendationAction(fd: FormData) {
  await guard();
  await prisma.recommendation.update({ where: { id: str(fd, 'id') }, data: { status: 'dismissed' } });
  revalidatePath('/', 'layout');
}

export async function restoreChangeAction(fd: FormData) {
  await guard();
  await restoreChange(str(fd, 'changeId'));
  revalidatePath('/', 'layout');
}

export async function setChannelFlagsAction(fd: FormData) {
  await guard();
  await prisma.channel.update({ where: { id: str(fd, 'id') }, data: { monetized: fd.get('monetized') === 'on', niche: str(fd, 'niche') || 'manhwa-recap', language: str(fd, 'language') || 'en' } });
  revalidatePath('/', 'layout');
}

export async function addCompetitorAction(fd: FormData) {
  await guard();
  await addCompetitor(str(fd, 'handle'));
  revalidatePath('/');
}

/** One-time setup from the dashboard: writes GOOGLE_CLIENT_ID/SECRET (and TOKEN_KEY if missing) to .env. */
export async function saveGoogleCredsAction(fd: FormData) {
  await guard();
  const id = str(fd, 'clientId').trim(), secret = str(fd, 'clientSecret').trim();
  if (!id.endsWith('.apps.googleusercontent.com')) throw new Error('Client ID should end with .apps.googleusercontent.com');
  if (!secret.startsWith('GOCSPX-')) throw new Error('Client secret should start with GOCSPX- (open the client in Credentials, or the "client_secret" field of the downloaded JSON; not the file name)');
  const set: Record<string, string> = { GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret };
  if (!process.env.TOKEN_KEY) set.TOKEN_KEY = randomBytes(32).toString('hex');
  let env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
  for (const [k, v] of Object.entries(set)) {
    env = new RegExp(`^${k}=`, 'm').test(env) ? env.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`) : `${env.replace(/\n?$/, '\n')}${k}=${v}\n`;
    process.env[k] = v; // effective immediately, no restart
  }
  writeFileSync('.env', env);
  revalidatePath('/');
}

export async function importStudioAction(fd: FormData) {
  await guard();
  const file = fd.get('file'), from = str(fd, 'from'), to = str(fd, 'to');
  if (!(file instanceof File) || !from || !to) throw new Error('file, from, to required');
  const rows = parseStudioCsv(await file.text());
  for (const r of rows) {
    const v = await prisma.video.findUnique({ where: { youtubeId: r.youtubeId } });
    if (!v) continue;
    const key = { videoId: v.id, rangeStart: new Date(from), rangeEnd: new Date(to) };
    const data = { impressions: r.impressions, ctr: r.ctr, views: r.views, avdSec: r.avdSec };
    await prisma.studioSnapshot.upsert({ where: { videoId_rangeStart_rangeEnd: key }, update: data, create: { ...key, ...data } });
  }
  revalidatePath('/', 'layout');
}
