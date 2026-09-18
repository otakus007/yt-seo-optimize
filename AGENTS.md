# yt-seo-optimize — agent entrypoint

Optimizes the owner's YouTube channels (Manhwa/Webtoon recap, English) using real
Analytics data. Read this file first. Deeper "why" lives in `docs/decisions/`.

## Run
- `pnpm install` (never npm/yarn/npx; use `pnpm dlx` / `pnpm exec`)
- `pnpm dev` — dashboard on http://localhost:3000
- `pnpm tsx scripts/<name>.ts [--json]` — every script; `--json` prints machine output for skills
- `pnpm lint && pnpm typecheck && pnpm test` — required before you call any change done
- `pnpm build` — only before deploying

## Map
- `AGENTS.md` — this file, the only instruction file to maintain. `CLAUDE.md` is just `@AGENTS.md`; `.agents/rules/repo.md` symlinks here.
- `.agents/skills/<name>/SKILL.md` — LLM procedures (Agent Skills standard). `.claude/skills` is a symlink here.
  - `yt-sync` fetch own + competitor data; `yt-new-video` pre-publish package; `yt-audit` post-publish fixes;
    `yt-competitors` outliers/patterns; `yt-niche-research` stub. Shared rules: `.agents/skills/playbook-manhwa.md`.
- `scripts/` — all deterministic logic. Skills call scripts; scripts never call an LLM.
- `src/lib/` — shared code (db, youtube data api, analytics api, oauth, crypto, auth, apply).
- `src/app/` — Next.js 16 App Router dashboard. Read-only views + Apply/Restore/Sync actions. No LLM calls.
- `prisma/schema.prisma` — SQLite. DB file `data/app.db` (gitignored). Raw analytics in `AnalyticsReport.json`.
- `data/` — DB, backups, downloaded thumbnails. Never delete.
- `docs/decisions/NNNN-*.md` — why things are the way they are. `docs/plans/active/` — multi-session work.
- `tests/` — jest. `scripts/check-harness.sh` — verifies this harness (runs in `pnpm lint`).

## Navigating code (cheapest first)
- Structure questions (who calls X, what breaks if I change X, how does A reach B, where to start a task):
  `ripwire . --for="<task>"` before opening files; `ripwire . --impact=SYM` before changing a signature;
  `--callers=SYM`, `--path=A,B`, `--exemplar=<kind>` (imitate the repo's best example). If `ripwire` is not
  installed, skip this rung. Counts are floors: it misses subprocess calls (`pnpm tsx scripts/...` from skills) and dynamic dispatch.
- Syntax-aware search and rewrite: `ast-grep --lang ts -p '<pattern>' src scripts` (e.g. `applyField($$$)`); use `-r` to rewrite.
  Never grep source files for code structure; grep is for plain text (logs, .env keys, markdown, JSON).
- Hosts with a code-graph MCP (Claude Code: `codegraph_*`) use it first for the same questions: `codegraph_context` for a task,
  `codegraph_trace` for a flow, `codegraph_impact` before changing a symbol, one `codegraph_explore` for bodies. Trust it; don't
  re-grep. "not initialized" → `codegraph init -y .`. Fall back to ripwire only when it is unavailable or stale right after big edits.

## Judgment boundaries
- Read-only question → inspect the smallest authoritative surface, answer with evidence.
- Bounded change → smallest coherent diff, run validation, done. No plan file.
- Multi-session change → `docs/plans/active/<slug>.md` first; move to `completed/` when done.
- Material ambiguity → stop, present concrete options and consequences; do not guess.
- Recommendations to the owner must cite numbers from the DB, never from intuition.
- Owner-facing text (dashboard UI, recommendation `rationale`, step `instructions`, chat replies) is Vietnamese.
  Values that get applied to YouTube (title/description/tags, Gemini prompts, thumbnail overlay text) and the
  playbook file stay in `Channel.language` (English for this channel) since that's what the audience reads.

## Rules
- Next.js here is v16: read `node_modules/next/dist/docs/` before writing app code. Middleware is `proxy.ts`. `params` are Promises.
- Prisma: change `schema.prisma` → `pnpm prisma migrate dev --name <slug>`. Never `migrate reset`, `db push --force-reset`, or `--accept-data-loss` against `data/app.db`.
- Never delete or overwrite `data/`, `.env`, or `data/backups/`. Never `git clean -x`.
- Secrets only in `.env` (see `.env.example`). Refresh tokens are encrypted with `TOKEN_KEY`; never print them.
- Applying a change to YouTube goes through `src/lib/apply.ts` so a `Change` row is always written. No ad-hoc `videos.update`.
- Playbook edits (`playbook-manhwa.md`) are proposed to the owner, never written unasked.
- Match existing style: server components, CSS modules, no UI libraries, no new dependencies without asking.
- Guard hook (`scripts/hooks/guard.sh`, wired for Claude/Cursor/Codex/Antigravity/Grok) blocks destructive commands by matching
  the command text; if it blocks a doc write, put the forbidden text inside a heredoc body.
