/** Competitor outliers and patterns from public data. pnpm tsx scripts/competitors.ts [--json] */
import prisma from '../src/lib/db';
import { competitorReport } from '../src/lib/competitors';
import { out } from './_cli';
competitorReport().then(out).finally(() => prisma.$disconnect());
