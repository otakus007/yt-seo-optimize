/** Daily SQLite backup via sqlite3 .backup; keeps the newest 30. Run from cron. */
import { execFileSync } from 'child_process';
import { mkdirSync, readdirSync, unlinkSync } from 'fs';
import path from 'path';
import 'dotenv/config';

const db = path.resolve('prisma', (process.env.DATABASE_URL ?? 'file:../data/app.db').replace(/^file:/, ''));
const dir = path.resolve('data', 'backups');
mkdirSync(dir, { recursive: true });
const file = path.join(dir, `app-${new Date().toISOString().slice(0, 10)}.db`);
execFileSync('sqlite3', [db, `.backup '${file}'`]);
const old = readdirSync(dir).filter((f) => f.endsWith('.db')).sort().reverse().slice(30);
for (const f of old) unlinkSync(path.join(dir, f));
console.log(`backup written: ${file} (kept ${Math.min(30, readdirSync(dir).length)})`);
