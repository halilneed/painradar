# Signal rubric (1–5)

Score each dimension 0 / 0.5 / 1, sum, round to the nearest whole number, minimum 1.
Write one line explaining the result. Never report engagement you could not observe —
treat it as 0.5 and say "engagement unknown".

| Dimension  | 0                          | 0.5                                  | 1                                                              |
|------------|----------------------------|--------------------------------------|----------------------------------------------------------------|
| Volume     | 1–2 items                  | 3–5 items                            | 6+ items                                                       |
| Engagement | mostly low or unknown      | some items with visible traction     | several high-traction items (many points/comments/votes)       |
| Intensity  | mild annoyance             | clear frustration                    | anger, "anyone else", churn/refund talk, warnings, data loss   |
| Spread     | one source                 | 2 sources                            | 3+ sources or multiple languages                               |
| Novelty    | recurring for weeks        | growing vs. last run                 | first seen today / sudden spike                                |

Interpretation: 5 = act today · 4 = strong content/solution candidate · 3 = worth watching ·
1–2 = mention only if the report is otherwise thin (and then say it is weak).

`radar.mjs` gives you per-item `intensity` (0 / 0.35 / 0.7 / 1) and `intent` flags as
hints; the theme score is your judgment, stated in one line.

## Evidence hygiene

- ≥ 2 linked items per theme; every solution cites the items that motivated it.
- Paraphrase gists; quote ≤ a few words; no usernames, names, keys or private URLs.
- Blocked sources are reported as blocked — never filled with invented items.
- Unverified numbers are marked "(doğrulanmadı)".
