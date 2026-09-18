/** YouTube Studio 'Content' CSV export parsing — the only source of thumbnail impressions + CTR. */
export function parseStudioCsv(text: string) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const cols = splitCsv(lines[0]).map((c) => c.trim().toLowerCase());
  const col = (...names: string[]) => cols.findIndex((c) => names.some((n) => c === n || c.startsWith(n)));
  const iId = col('content', 'video'), iImp = col('impressions'), iCtr = col('impressions click-through rate', 'impressions ctr', 'click-through');
  const iViews = col('views'), iAvd = col('average view duration');
  if (iId < 0 || iImp < 0 || iCtr < 0) throw new Error(`CSV needs Content, Impressions, Impressions click-through rate columns; got: ${cols.join(' | ')}`);
  return lines.slice(1).map(splitCsv).filter((r) => /^[\w-]{11}$/.test(r[iId] ?? '')).map((r) => ({
    youtubeId: r[iId], impressions: Math.round(Number(r[iImp]) || 0), ctr: Number(String(r[iCtr]).replace('%', '')) || 0,
    views: iViews >= 0 ? Math.round(Number(r[iViews]) || 0) : null, avdSec: iAvd >= 0 ? hms(r[iAvd]) : null,
  }));
}
function splitCsv(line: string) { return (line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? []).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')).slice(0, -1); }
function hms(s: string | undefined) { if (!s) return null; const p = s.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : Number(s) || null; }

