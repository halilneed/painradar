---
name: scan
description: Run a complaint radar for a topic, niche or audience — fetch public evidence (Hacker News, GitHub Issues, App Store reviews; Reddit only if explicitly enabled), cluster it into 3–7 ranked themes with a transparent Signal score, and write an evidence-backed report with solution paths and content ideas. Use when the user asks what people complain about, wants pain points, hot topics or unmet needs for a niche, says "run the radar", "şikayet radarı çalıştır", "insanlar neyden şikayetçi", "pain points for X", or runs /painradar:scan <topic>. Not for ranking what to build — that is painradar:fit. Not for launch/marketing plans — that is painradar:launch.
---

# Complaint radar (scan)

Turn scattered public complaints into a ranked, checkable report. Only public data is
fetched; nothing about the user's repo, persona or chat history is sent anywhere.

**Language rule: write every user-facing output in the language the user is speaking with you.**
**Evidence rule: a theme needs ≥ 2 linked items; a claim without a link does not go in the report.**

## Step 0 — Configuration

Take the topic from the argument or the conversation. If it is missing, ask exactly one
question (topic + who the user serves), then proceed. Infer 3–6 HN queries and 1–3
GitHub Issue queries in the way people actually write (e.g. `"<tool> frustrating"`,
`"<job> any tool that"`, `"<competitor> alternative"`). Reddit stays **off** unless the
user explicitly asks for it — it is licence-constrained and rate-limited (say so once).

Read `${CLAUDE_PLUGIN_ROOT}/skills/scan/references/rubric.md` before scoring.

## Step 1 — Scan

Create `~/.claude/radar/` if missing (expand the home directory yourself; never pass a
literal `~` to the script), then run:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/radar.mjs" --topic "<topic>" --days 30 \
  --hn "<q1>;<q2>;<q3>" --github "<q1>;<q2>" --out "<home>/.claude/radar/<slug>-raw.json"
```

Optional flags: `--apps <appstore ids>` (1–2★ reviews of competitor apps), `--reddit
<subs>` (only on explicit request), `--trustmrr "<Category>,<Category>"` (needs
`TRUSTMRR_API_KEY`; used by painradar:fit), `--days 7` for a daily run.

If `node` is missing, stop and say Node.js 18+ is required. Read the JSON. Check
`sources`: any `blocked: true` or `error` must appear in the report's "Kaynak notu" —
never hide a failed source and never invent items for it. If `totals.complaints < 8`,
widen: add 2–3 broader queries or `--days 90`, say you widened, rerun once.

## Step 2 — Filter

Keep an item only if it expresses a complaint, frustration, unmet need, workaround or
buying intent **and** is about the topic (`complaint: true` is a hint, you decide).
Drop promotion, generic news and duplicates. Paraphrase; quote at most a few words per
item; never include usernames, real names or personal details.

## Step 3 — Cluster and score

Group items into 3–7 themes by job-to-be-done or failure mode, not by source. Score each
theme's Signal (1–5) with the rubric and write one line of reasoning per theme. If
`~/.claude/radar/state.json` exists, tag themes **Yeni** / **Devam eden** by matching
theme keywords to `themes` in the state (reuse the old slug when it is clearly the same
theme).

## Step 4 — Solutions and content ideas

Per theme propose 2–4 solution paths of mixed type — product fix / workaround the reader
can apply today / offer someone could sell / education-content — each with effort (D/O/Y),
impact (D/O/Y) and the evidence items that motivated it. Be specific. Add 2–3 content
one-liners per theme tagged with a format (blog, linkedin, x_thread, short_video).

## Step 5 — Write

Save `~/.claude/radar/<slug>-<YYYY-MM-DD>.md` with exactly this order:

1. Title + **Kaynak notu** (timeframe, item count, which sources worked / were blocked)
2. Three-sentence summary
3. Themes table (#, theme, Signal, Yeni/Devam eden, evidence count, one line)
4. One block per theme: why this score · what people say · who it hurts · evidence links
   · solutions table · content ideas
5. Raw evidence table (source, title, date, engagement, theme, link) — keep it complete
6. Configuration & assumptions + one suggestion for the next run (a query to add/drop)

Then update `~/.claude/radar/state.json` (`runs`, `themes{slug: first_seen, last_seen,
runs_seen, peak_signal, keywords}`, `seen_urls` capped at 500). If it cannot be written,
say so in one line and continue.

## Step 6 — Reply

5–8 lines in chat: file path; top 3 themes with Signal and Yeni/Devam eden; the single
best content idea; which sources were blocked; and one line: `/painradar:fit` ranks
what is worth building from this report, `/painradar:launch` turns it into a launch plan.
If evidence was thin, say "güçlü bir sinyal yok" plainly instead of padding.
