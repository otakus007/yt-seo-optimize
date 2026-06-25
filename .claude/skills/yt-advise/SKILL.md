---
name: yt-advise
description: Generate YouTube SEO and monetization improvement recommendations. Use this skill to analyze video titles/descriptions/tags, suggest rewrites, identify CTR and watch-time issues, optimize upload schedule, and propose monetization tactics. Always use when generating improvement suggestions, SEO audits, title rewrites, or growth strategies for YouTube.
---

# YT Advise Skill

## Overview

Analyze video metadata from DB and produce prioritized SEO recommendations. Output is `_workspace/03_seo_recommendations.json`.

## Title Optimization Rules

### Length
- Optimal: 40-60 characters (shows fully in search results)
- < 30 chars: too short, missing keyword opportunities
- > 70 chars: truncated in most surfaces

### High-Performing Title Patterns
| Pattern | Example |
|---------|---------|
| Number + topic | "7 Ways to..." |
| Question | "Why Does X Happen?" |
| Curiosity gap | "I Tried X for 30 Days..." |
| How-to | "How to X in Y Minutes" |
| Contrast | "X vs Y: Which Is Better?" |

### What to Avoid
- Clickbait without substance (hurts session time when viewers leave)
- ALL CAPS (spam signal)
- Excessive punctuation: !!!
- Keyword stuffing (natural language performs better since 2022)

## Description Optimization

First 150 characters show before "Show More" — most important real estate:
```
[Hook sentence with main keyword] [What viewer will learn/get] 
Subscribe for more: [channel URL]
```

Full description should include:
- Timestamps for longer videos (improves AVD)
- Links to related videos/playlists (session time)
- Social links and channel subscription CTA
- Relevant keywords naturally woven in (not stuffed)

## Tags Strategy

YouTube uses tags as secondary signals (less important since 2020 but still relevant):
- 5-8 tags total
- Mix: exact match title keywords + broader category + 1-2 misspellings/variants
- First tag = most important (treated like primary keyword)

## Upload Schedule Advice Logic

Compare channel's actual pattern vs ideal:
- Consistency > frequency: same day/time every week beats random burst uploads
- Recommend based on where their current top-performing videos fall in the week
- For monetization focus: Tue-Thu uploads tend to get ads before weekend CPM peaks

## Monetization Levers

### Immediate
- End screens (last 20 seconds): link to highest-performing related video
- Cards: add mid-video link at point where viewers most likely to click (after hook)
- Playlists: group related videos → increases session watch time → more ad impressions

### Strategic
- YouTube Shorts from existing long-form content: zero extra production, new audience funnel
- Community posts: high-performing content deserves a post to resurface it
- Chapters (timestamps in description): improves AVD signal, eligible for chapter thumbnails in search

## Prioritization Framework

Score each recommendation:
```
impact = (reach × ctr_lift × time_saved_effort)
```
Roughly:
- **High impact, low effort**: Fix truncated titles, add descriptions, fix upload day
- **High impact, high effort**: Thumbnail redesign, series restructuring
- **Low impact, low effort**: Add tags, fix end screens
- **Low impact, high effort**: Skip or deprioritize

## Output

Write `_workspace/03_seo_recommendations.json` — see yt-seo-advisor agent definition for schema.
Include at minimum 3 quick wins and 2 strategic changes.
