---
name: launch
description: Build an evidence-based launch and marketing flow for a product, repo or chosen opportunity — channel selection with stated reasons, posting rules for Reddit / Hacker News / Product Hunt, an SEO comparison-page plan, a TrustMRR listing step, a 30-day calendar and 3 content briefs grounded in the radar evidence. Use when the user asks how to market or launch, where the first customers come from, "pazarlama akışı", "lansman planı", "nasıl duyururum", "go-to-market", "launch plan", or runs /painradar:launch [repo | idea]. Uses the latest radar/fit reports when present; asks one question when the product is unclear. Not for finding pain points — that is painradar:scan.
---

# Launch flow

A launch plan is a set of decisions with reasons, not a list of channels. Every channel
you recommend must cite either the radar evidence (where the complaints live) or the
channel notes in `${CLAUDE_PLUGIN_ROOT}/skills/launch/references/channels.md`.

**Language rule: write every user-facing output in the language the user is speaking with you.**

## Step 0 — Inputs

- Product: the argument (`repo` → read README/package manifests in the current directory
  to describe it; `idea` → take it from the latest `~/.claude/radar/*-fit-*.md`). If still
  unclear, ask one question: what it does and for whom.
- Latest radar report for that topic (run `scan` if missing): the threads, communities and
  phrasing in it are the audience map.
- Persona card if present (`~/.claude/persona/persona.md`) to match tone and capacity
  (e.g. someone who never writes long-form should not be given a 4-posts-a-week blog plan).

## Step 1 — Positioning (short)

One sentence in the complainers' own words (lift phrasing from the evidence), one
sentence on the job it does, three reasons to believe. Name the incumbent it replaces.

## Step 2 — Channel selection with reasons

Pick **one primary channel** and at most two supporting channels for the first 90 days,
following `references/channels.md`. Justify each with evidence ("the radar found 9 of 14
threads in r/X" or "revenue correlates with Domain Rating, so comparison pages"). Say
explicitly which popular channels you are *not* using and why.

## Step 3 — Rules before posting

Write the concrete rules for the chosen channels (from the reference): reply-first
period, ratio of help to promotion, what gets banned, Show HN title/body constraints,
when Product Hunt is worth it, how to list on TrustMRR and use the verified-revenue proof.

## Step 4 — 30-day calendar

Week by week: what is published where, which threads to answer (link them from the
radar), which comparison/alternative pages to write, when to launch, what to measure.
Keep it doable for the persona's capacity; fewer items done well beat a full calendar.

## Step 5 — Three content briefs

For the top 3 radar themes, one brief each (format · working title · hook · angle ·
3–6 beats · linked proof points · CTA · why now). Stop at outline level — the user writes
in their own voice.

## Step 6 — Measure

Define 5 numbers to track weekly (e.g. qualified conversations started, signups from
primary channel, comparison-page impressions, trial→paid, replies per post) and the
kill/continue rule for the primary channel at day 30 and day 90.

Save `~/.claude/radar/<slug>-launch-<date>.md`; reply with the primary channel + reason,
the first three actions this week, and the first measurement rule.
