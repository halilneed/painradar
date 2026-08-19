---
name: fit
description: Rank what is worth building from a radar report — cross each complaint theme with verified-revenue proof (TrustMRR) and, when available, the developer's own persona card from devpersona (stack, strengths, risk patterns) to produce a founder–opportunity fit ranking with MVP scope and first-10-users source. Use when the user asks which idea to build, what would pay, "ne inşa etmeliyim", "hangisi para eder", "bana uygun fırsat", "rank these opportunities", or runs /painradar:fit. Requires a radar report from painradar:scan and runs it first if missing. Not for the complaint report itself — that is painradar:scan. Not for marketing — that is painradar:launch.
---

# Founder–opportunity fit

Answer one question per theme: *is there pain, is anyone paying, and is this person the
right one to build it?* Every score must point at evidence. No evidence, no ranking.

**Language rule: write every user-facing output in the language the user is speaking with you.**

## Step 0 — Load inputs

1. Latest `~/.claude/radar/<slug>-<date>.md` (+ `<slug>-raw.json`). If none or older than
   14 days, run the `scan` skill of this plugin first.
2. **Persona (optional, local):** `~/.claude/persona/persona.md` written by devpersona.
   If present, read stack, strengths, risk patterns. If absent, say fit is estimated
   without a persona and suggest `/devpersona:analyze` — do not guess the user's skills.
3. **Money proof:** if `TRUSTMRR_API_KEY` is set, run
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/radar.mjs" --topic "<topic>" --trustmrr "<Category>,<Category>" --out "<home>/.claude/radar/<slug>-money.json"`
   and use `trustmrr` median MRR / growth per category. Without a key, fall back to the
   public stats page (https://trustmrr.com/stats) and mark figures "(doğrulanmadı)" — never
   invent numbers. Map each theme to the closest TrustMRR category (Marketing, Developer
   Tools, Analytics, Security, Sales, Content Creation, …).

## Step 1 — Score (0–5 each, one line of evidence per score)

| Dimension        | What counts                                                                        |
|------------------|------------------------------------------------------------------------------------|
| Pain             | the theme's Signal from the radar report                                           |
| Money proof      | verified startups earning in the adjacent category; median MRR; 30-day growth      |
| Competition gap  | how many tools already serve it; is there a free/OSS incumbent or big vendor       |
| Founder fit      | persona stack & strengths match the MVP; risk patterns that would hurt here        |
| Effort           | 5 = MVP in ≤ 2 weeks solo, 1 = months or a team                                    |
| Platform risk    | 5 = owns its data/channel, 1 = depends on one API/licence that may change          |

Fit = weighted: Pain 25 % · Money 20 % · Gap 20 % · Founder 15 % · Effort 10 % · Risk 10 %.
State the weights in the report so the user can override them.

## Step 2 — Write `~/.claude/radar/<slug>-fit-<date>.md`

1. Ranking table (theme, Fit 0–100, the six scores).
2. For the top 3: one-paragraph thesis · MVP scope (the *one* job it does, 3–5 bullets) ·
   what to leave out · pricing hypothesis with comparable verified products (linked) ·
   where the first 10 users are (specific communities/threads from the evidence) ·
   the riskiest assumption and a ≤ 1-week test for it · evidence links.
3. "Do not build" notes: themes that are real pain but saturated (name the incumbents).
4. Persona notes: which persona traits helped or hurt each score (or "persona yok").

## Step 3 — Reply

Chat: the top 3 with Fit score and a one-line why; the single riskiest assumption of #1;
then `/painradar:launch` for the go-to-market plan of the chosen one.
