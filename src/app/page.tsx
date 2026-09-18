import { existsSync, readFileSync } from 'fs';
import Link from 'next/link';
import prisma from '@/lib/db';
import styles from './dash.module.css';
import { addCompetitorAction, importStudioAction, saveGoogleCredsAction, setChannelFlagsAction, startSync } from './actions';
import { date, hoursAgo, n } from './fmt';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const channels = await prisma.channel.findMany({ orderBy: [{ isOwn: 'desc' }, { createdAt: 'asc' }], include: { _count: { select: { videos: true, recommendations: { where: { status: 'open' } } } } } });
  const drafts = await prisma.draft.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { video: { select: { id: true, title: true } } } });
  const log = existsSync('data/sync.log') ? readFileSync('data/sync.log', 'utf8').trim().split('\n').slice(-8).join('\n') : '';
  const own = channels.filter((c) => c.isOwn), comp = channels.filter((c) => !c.isOwn);
  const needsCreds = !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET;

  return (
    <div>
      <div className={styles.row}>
        <h1>Channels</h1>
        <a className={styles.btn} href="/api/oauth/start" style={{ marginLeft: 'auto' }}>Connect a YouTube channel</a>
        <form action={startSync}><button className={`${styles.btn} ${styles.btnGhost}`}>Sync all</button></form>
        <Link className={`${styles.btn} ${styles.btnGhost}`} href="/competitors">Competitors</Link>
      </div>
      {needsCreds ? (
        <div className={styles.card}>
          <h3>Setup: Google OAuth client (once)</h3>
          <ol className={styles.muted}>
            <li><a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noreferrer">APIs &amp; Services → Library</a>: enable <b>YouTube Data API v3</b> and <b>YouTube Analytics API</b>.</li>
            <li><a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noreferrer">OAuth consent screen</a>: External, add each channel&apos;s Google email as a test user, then <b>Publish app</b> (otherwise refresh tokens expire after 7 days).</li>
            <li><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Credentials</a> → Create OAuth client ID → Web application → Authorized redirect URI: <code>http://localhost:3000/api/oauth/callback</code>{process.env.PUBLIC_ORIGIN ? <> and <code>{process.env.PUBLIC_ORIGIN}/api/oauth/callback</code></> : null}.</li>
          </ol>
          <form action={saveGoogleCredsAction} className={styles.row}>
            <input className={styles.input} name="clientId" placeholder="Client ID" required style={{ minWidth: 320 }} />
            <input className={styles.input} name="clientSecret" placeholder="Client secret" type="password" required />
            <button className={styles.btn}>Save to .env</button>
          </form>
        </div>
      ) : own.length === 0 && <div className={styles.warn}>No own channel connected yet. Click &quot;Connect a YouTube channel&quot; in the browser profile that is signed in to the channel&apos;s Google account.</div>}

      <h2>Own channels</h2>
      {own.map((c) => {
        const h = hoursAgo(c.lastSyncedAt);
        return (
          <div key={c.id} className={styles.card}>
            <div className={styles.row}>
              <Link href={`/channel/${c.id}`}><strong>{c.title}</strong></Link>
              <span className={styles.muted}>{c.handle} · {n(c.subscriberCount)} subs · {c._count.videos} videos · {c._count.recommendations} open recs</span>
              <span className={h == null || h > 24 ? `${styles.badge} ${styles.orange}` : styles.muted} style={{ marginLeft: 'auto' }}>synced {h == null ? 'never' : `${h}h ago`}</span>
              <form action={startSync}><input type="hidden" name="channel" value={c.id} /><button className={`${styles.btn} ${styles.btnGhost}`}>Sync</button></form>
            </div>
            <form action={setChannelFlagsAction} className={styles.row} style={{ marginTop: 8 }}>
              <input type="hidden" name="id" value={c.id} />
              <label className={styles.muted}><input type="checkbox" name="monetized" defaultChecked={c.monetized} /> monetized (YPP)</label>
              <label className={styles.muted}>niche <input className={styles.input} name="niche" defaultValue={c.niche} /></label>
              <label className={styles.muted}>language <input className={styles.input} name="language" defaultValue={c.language} size={3} /></label>
              <button className={`${styles.btn} ${styles.btnGhost}`}>Save</button>
            </form>
          </div>
        );
      })}

      <h2>Competitors</h2>
      <div className={styles.card}>
        <form action={addCompetitorAction} className={styles.row}><input className={styles.input} name="handle" placeholder="@handle" required /><button className={styles.btn}>Add & sync</button></form>
        <div className={styles.wrap}><table className={styles.table}><thead><tr><th>Channel</th><th className={styles.num}>Subs</th><th className={styles.num}>Videos</th><th>Synced</th></tr></thead>
          <tbody>{comp.map((c) => <tr key={c.id}><td><Link href={`/channel/${c.id}`}>{c.title}</Link> <span className={styles.muted}>{c.handle}</span></td><td className={styles.num}>{n(c.subscriberCount)}</td><td className={styles.num}>{c._count.videos}</td><td>{date(c.lastSyncedAt)}</td></tr>)}</tbody></table></div>
      </div>

      <h2>Studio CSV import (impressions + CTR)</h2>
      <div className={styles.card}>
        <p className={styles.muted}>Studio → Analytics → Content → pick a date range → Export → CSV. Impressions/CTR only exist there.</p>
        <form action={importStudioAction} className={styles.row}>
          <input type="file" name="file" accept=".csv,text/csv" className={styles.input} required />
          <label className={styles.muted}>from <input type="date" name="from" className={styles.input} required /></label>
          <label className={styles.muted}>to <input type="date" name="to" className={styles.input} required /></label>
          <button className={styles.btn}>Import</button>
        </form>
      </div>

      <h2>Drafts</h2>
      <div className={styles.card}>
        {drafts.length === 0 ? <p className={styles.muted}>No drafts. Run the yt-new-video skill before your next upload.</p> : (
          <div className={styles.wrap}><table className={styles.table}><thead><tr><th>Created</th><th>Chosen title</th><th>Linked video</th></tr></thead>
            <tbody>{drafts.map((d) => <tr key={d.id}><td>{date(d.createdAt)}</td><td className={styles.text}>{d.chosenTitle ?? JSON.parse(d.output).titles?.[0]}</td><td className={styles.text}>{d.video ? <Link href={`/video/${d.video.id}`}>{d.video.title}</Link> : <span className={styles.muted}>not linked (scripts/draft.ts link)</span>}</td></tr>)}</tbody></table></div>
        )}
      </div>

      {log && <div className={styles.card}><h3>Last sync log</h3><pre className={styles.pre} style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log}</pre></div>}
    </div>
  );
}
