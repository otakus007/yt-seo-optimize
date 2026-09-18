import Link from 'next/link';
import styles from './dash.module.css';
import { applyStepAction, dismissRecommendationAction, restoreChangeAction, skipStepAction, uploadThumbnailAction } from './actions';
import { date, n, pct } from './fmt';

type Step = { id: string; order: number; kind: string; field: string | null; payload: string | null; instructions: string; status: string };
type Rec = { id: string; title: string; rationale: string; priority: number; status: string; source: string; steps: Step[]; video?: { id: string; title: string } | null };

export function Recommendations({ recs, canApply }: { recs: Rec[]; canApply: boolean }) {
  if (!recs.length) return <p className={styles.muted}>No open recommendations. Run the yt-audit skill to generate some.</p>;
  return <>{recs.sort((a, b) => a.priority - b.priority).map((r) => (
    <div key={r.id} className={styles.card}>
      <div className={styles.row}>
        <strong>P{r.priority} · {r.title}</strong>
        {r.video && <Link href={`/video/${r.video.id}`} className={styles.muted}>{r.video.title}</Link>}
        <span className={styles.muted}>{r.source}</span>
        <form action={dismissRecommendationAction} style={{ marginLeft: 'auto' }}><input type="hidden" name="id" value={r.id} /><button className={`${styles.btn} ${styles.btnGhost}`}>Dismiss</button></form>
      </div>
      <p className={styles.pre}>{r.rationale}</p>
      {r.steps.sort((a, b) => a.order - b.order).map((s) => <StepRow key={s.id} step={s} canApply={canApply && !!r.video} />)}
    </div>
  ))}</>;
}

function StepRow({ step: s, canApply }: { step: Step; canApply: boolean }) {
  const needsFile = s.kind === 'api' && s.field === 'thumbnail' && !s.payload;
  const payload = s.payload ? JSON.parse(s.payload) : null;
  return (
    <div className={styles.step}>
      <div className={styles.row}>
        <span className={`${styles.badge} ${s.status === 'applied' ? styles.green : s.status === 'skipped' ? styles.orange : ''}`}>{s.order}. {s.kind}{s.field ? ` · ${s.field}` : ''} · {s.status}</span>
        {s.status === 'pending' && (
          <>
            {needsFile ? (
              <form action={uploadThumbnailAction} className={styles.row}><input type="hidden" name="stepId" value={s.id} /><input type="file" name="file" accept="image/jpeg" className={styles.input} /><button className={styles.btn}>Upload thumbnail</button></form>
            ) : (
              <form action={applyStepAction}><input type="hidden" name="stepId" value={s.id} /><button className={styles.btn} disabled={s.kind === 'api' && !canApply}>{s.kind === 'api' ? 'Apply via API' : 'Mark done'}</button></form>
            )}
            <form action={skipStepAction}><input type="hidden" name="stepId" value={s.id} /><button className={`${styles.btn} ${styles.btnGhost}`}>Skip</button></form>
          </>
        )}
      </div>
      <p className={styles.pre}>{s.instructions}</p>
      {payload != null && <p className={styles.pre}><span className={styles.muted}>new value: </span>{typeof payload === 'string' ? payload : JSON.stringify(payload)}</p>}
    </div>
  );
}

type Cmp = { days: number; viewsPerDayBefore: number; viewsPerDayAfter: number; ctrBefore: number | null; ctrAfter: number | null; complete: boolean };
type ChangeRow = { id: string; field: string; before: string; after: string; appliedAt: Date; restoresChangeId: string | null; beforeThumbnailPath: string | null; d7: Cmp; d14: Cmp; video?: { id: string; title: string } };

export function Changes({ changes }: { changes: ChangeRow[] }) {
  if (!changes.length) return <p className={styles.muted}>No changes applied yet.</p>;
  const cell = (c: Cmp) => `${n(c.viewsPerDayBefore, 1)} → ${n(c.viewsPerDayAfter, 1)}${c.complete ? '' : ' (partial)'}`;
  return (
    <div className={styles.wrap}><table className={styles.table}>
      <thead><tr>{changes[0].video && <th>Video</th>}<th>Applied</th><th>Field</th><th>Before → After</th><th>Views/day 7d</th><th>Views/day 14d</th><th>CTR before → after</th><th></th></tr></thead>
      <tbody>{changes.map((c) => (
        <tr key={c.id}>
          {c.video && <td className={styles.text}><Link href={`/video/${c.video.id}`}>{c.video.title}</Link></td>}
          <td>{date(c.appliedAt)}{c.restoresChangeId && <span className={`${styles.badge} ${styles.orange}`}>restore</span>}</td>
          <td>{c.field}</td>
          <td className={styles.text}>{short(c.before)} → {short(c.after)}</td>
          <td>{cell(c.d7)}</td><td>{cell(c.d14)}</td>
          <td>{pct(c.d7.ctrBefore)} → {pct(c.d14.ctrAfter ?? c.d7.ctrAfter)}</td>
          <td>{c.field !== 'playlist' && !c.restoresChangeId && <form action={restoreChangeAction}><input type="hidden" name="changeId" value={c.id} /><button className={`${styles.btn} ${styles.btnGhost}`}>Restore</button></form>}</td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}
const short = (j: string) => { const v = JSON.parse(j); const s = typeof v === 'string' ? v : JSON.stringify(v); return s.length > 90 ? s.slice(0, 90) + '…' : s; };
