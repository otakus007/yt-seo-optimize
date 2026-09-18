import styles from './dash.module.css';
import type { Flag } from '@/lib/stats';

export const n = (x: number | bigint | null | undefined, d = 0) => (x == null ? '–' : Number(x).toLocaleString('en-US', { maximumFractionDigits: d }));
export const pct = (x: number | null | undefined, d = 1) => (x == null ? '–' : `${Number(x).toFixed(d)}%`);
export const money = (x: number | null | undefined) => (x == null ? '–' : `$${Number(x).toFixed(2)}`);
export const date = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : '–');
export const hoursAgo = (d: Date | null | undefined) => (d ? Math.round((Date.now() - new Date(d).getTime()) / 3600000) : null);

export function Badges({ flags }: { flags: Flag[] }) {
  return <>{flags.map((f) => <span key={f.code} className={`${styles.badge} ${styles[f.severity]}`} title={f.detail}>{f.code}</span>)}</>;
}

export function Tile({ value, label }: { value: string; label: string }) {
  return <div className={styles.tile}><div className={styles.tileValue}>{value}</div><div className={styles.tileLabel}>{label}</div></div>;
}

/** Renders a parsed Analytics report (array of row objects) as a table. */
export function ReportTable({ title, rows, limit = 15 }: { title: string; rows: Record<string, string | number>[] | undefined; limit?: number }) {
  if (!rows?.length) return null;
  const cols = Object.keys(rows[0]);
  return (
    <div className={styles.card}>
      <h3>{title}</h3>
      <div className={styles.wrap}><table className={styles.table}>
        <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{rows.slice(0, limit).map((r, i) => <tr key={i}>{cols.map((c) => <td key={c} className={typeof r[c] === 'number' ? styles.num : ''}>{typeof r[c] === 'number' ? n(r[c] as number, 2) : String(r[c])}</td>)}</tr>)}</tbody>
      </table></div>
    </div>
  );
}
