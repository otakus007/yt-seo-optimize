---
name: yt-new-video
description: Pre-publish optimization package for a new Manhwa/Webtoon recap video — 5 titles, description, tags, Gemini thumbnail prompt, 3 overlay texts — grounded in this channel's search terms, competitor outliers, and the playbook. Use when the owner is about to upload or asks for a title/thumbnail/description.
---

# yt-new-video

## Input (ask if missing)
Series name, 2–3 line plot hook, dominant emotion (betrayal / regression / revenge /
romance / villainess), main character look (for the thumbnail prompt), part number if a
series, and which channel (`@handle`) if more than one own channel exists.

## Steps
1. Read `.agents/skills/playbook-manhwa.md` (rules + evidence).
2. Get evidence:
   - `pnpm tsx scripts/stats.ts --channel @handle --json` → `baseline`, `outliers`
     (own videos that over-performed: copy their title structure), `channelReports.search-terms`,
     `channel.monetized` (pre-YPP → optimise for watch time; monetized → revenue).
   - `pnpm tsx scripts/keywords.ts "<series name>" --json` → `autocomplete` (exact phrases
     people type), `competitorTerms`, `ownSearchTerms`.
   - `pnpm tsx scripts/competitors.ts --json` → outlier titles for the same series/genre.
3. Produce, citing which evidence each choice comes from:
   - **5 titles** (45–65 chars, hook first, one autocomplete phrase verbatim, one mirroring
     the best own outlier, one mirroring the best competitor outlier). Mark your pick.
   - **Description**: hook line (≤150 chars) with the keyword, what happens, placeholder
     chapter timestamps for ≥10 min, series playlist line, subscribe line, 3 related recaps
     from `videos` in stats output.
   - **Tags**: 5–10, primary first.
   - **Gemini prompt** using the playbook formula, 16:9, "No text in the image".
   - **3 overlay texts** (≤5 words each, ALL CAPS ok on thumbnail only).
4. Save the draft so it can be measured later:
   ```
   pnpm tsx scripts/draft.ts save <<'JSON'
   {"channel":"@handle","input":{...},"output":{"titles":[...],"description":"...","tags":[...],"thumbnailPrompt":"...","overlays":[...]},"chosenTitle":"..."}
   JSON
   ```
   After the video is published: `pnpm tsx scripts/draft.ts link <draftId> <youtubeId>`.
5. Tell the owner: paste the prompt into Gemini, add overlay text in Canva, upload, then
   run `yt-sync` in 48h and `yt-audit` in 7 days.

## Rules
- No title without a number behind it (search term views, outlier multiple, baseline).
- Never invent series facts; use only what the owner gave you.
