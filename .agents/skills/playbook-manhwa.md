# Playbook — Manhwa/Webtoon recap (English)

Shared rules for `yt-new-video` and `yt-audit`. Every rule below must be backed by a
number from this channel's or a competitor's data; rules without evidence are marked
`[hypothesis]` and get promoted or deleted after `yt-audit` reports results.
Edits to this file are proposed to the owner in chat and only written when they say so.

## Objective by channel mode
- `monetized: false` (pre-YPP): maximise watch **hours** and subscribers. Prefer longer
  recaps (full arc / multi-chapter), subscribe CTA in first 30 s and in description,
  end screens to the next recap, playlists per series. Views matter less than minutes.
- `monetized: true`: maximise revenue = views × RPM. Rank videos by `estimatedRevenue`,
  not views. Videos ≥ 8 min get mid-rolls; check `durationSec` before shortening.

## Title
- `[hypothesis]` 45–65 characters. Studio truncates around 70 on mobile.
- Lead with the hook (betrayal / regression / revenge / villainess), series name second.
  Search terms report shows what viewers type; put the exact phrase in the title.
- Formats seen in competitor outliers (refresh with `yt-competitors`): "She/He … so …",
  "… but nobody knew …", "Full story", "[Part N]" only for continuing series.
- Avoid: ALL CAPS, "!!!", chapter numbers like "#p12" / "-chap", misspellings
  ("Manwha"), "Reup:".

## Description
- First 150 chars: hook sentence with the main keyword + what the viewer gets.
- Chapters/timestamps for videos ≥ 10 min (`no-timestamps` flag).
- Series playlist link, subscribe line, 3–5 related recaps.

## Tags
- 5–10 tags. First = primary keyword. Include series name, genre, "manhwa recap",
  romance/action subgenre, 1 misspelling variant.

## Thumbnail
- Use a screenshot panel from the edited video, not AI-generated art. Verified 2026-09-18
  against this channel's own top performers (v9-N2rkLFVc, TaAdwkEPfeM, iyjdvw8W0Ig,
  h5fZEs_FdtQ, 1olvC8jS8hM, -DfV4wp51IQ): all 6 use native manhwa panel art, none use
  custom AI art or a glowing border - the earlier Gemini/neon-border formula had no
  evidence behind it despite this file's own rule that unproven rules get [hypothesis].
- Pick the panel with ONE dominant close-up face, direct eye contact, legible emotion.
  That's what separates this channel's winners from losers, not art style: the 8
  underperformers flagged by yt-audit on 2026-09-18 mostly had distant full-body figures
  or several small fragmented panels instead of one dominant face.
- Text overlay is optional - most of the channel's top performers have none. If the video
  is part of a multi-part upload, a small corner label ("PART 1"/"PART 2") is enough to
  disambiguate; keep it small, don't let it compete with the face.
- Critique checklist for existing thumbnails: face visible? emotion legible at small
  size? is it ONE dominant close-up panel (not several small ones, not a distant shot)?
  text ≤ 5 words if any? not the same layout/colour as the previous 5 videos? matches
  the title's promise?

## What to change first (audit priority)
1. `low-ctr` with normal retention → thumbnail, then title.
2. normal CTR but `low-retention` → intro (first 30 s) and pacing; title over-promises.
3. `slow-start` → both, plus check upload time vs. audience country peak hours.
4. `no-timestamps` / `thin-description` / `no-tags` → cheap wins, batch them.

## Evidence log
(append as `yt-audit` reports change results: date, video, what changed, 7d/14d delta)
