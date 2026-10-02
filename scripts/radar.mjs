#!/usr/bin/env node
/**
 * painradar tarayıcısı — herkese açık şikayet kaynaklarını okur, şikayet/niyet
 * işaretleri koyar ve Claude'un yorumlaması için normalize JSON üretir.
 *
 * TASARIM İLKESİ: Yalnızca HERKESE AÇIK veri çekilir; kullanıcının persona'sı,
 * repo'su veya Claude Code geçmişi hiçbir yere gönderilmez. Çıktıya kullanıcı
 * adı / yazar adı yazılmaz — sadece başlık, URL, tarih, sayılar ve kısaltılmış
 * metin. Reddit varsayılan olarak KAPALIDIR (lisans/kilitlenme riski); açılırsa
 * 403/429'da durur ve "blocked" olarak raporlar. Kanıt asla uydurulmaz: bir
 * kaynak erişilemezse JSON'da `blocked: true` / `error` ile görünür.
 *
 * Kullanım:
 *   node radar.mjs --topic "ai overviews traffic" [--days 30] [--out r.json]
 *   node radar.mjs --topic "..." --md [--lang tr]      → okunur Markdown tablo
 *   node radar.mjs --topic "..." --hn "q1;q2" --github "q1;q2" --apps "id1,id2" --country us
 *   node radar.mjs --topic "..." --reddit "SaaS,indiehackers"   (opsiyonel, riskli)
 *   node radar.mjs --topic "..." --trustmrr "Marketing,Developer Tools"  (TRUSTMRR_API_KEY gerekir)
 *   node radar.mjs --selftest                         → sınıflandırıcı öz-testi (ağ yok)
 *
 * Ortam değişkenleri (opsiyonel): GITHUB_TOKEN, TRUSTMRR_API_KEY
 * Gereksinim: Node.js 18+. Bağımlılık yok.
 */

import { writeFileSync } from "node:fs";

// ---------- argümanlar ----------
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, fb = null) => { const i = argv.indexOf(n); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : fb; };
const list = (v, sep = /[;,]/) => (v ? v.split(sep).map((s) => s.trim()).filter(Boolean) : []);

const TOPIC = opt("--topic", "");
const DAYS = Math.max(1, parseInt(opt("--days", "30"), 10) || 30);
const OUT = opt("--out");
const MD = flag("--md");
const LANG = opt("--lang", "en") === "tr" ? "tr" : "en";
const HN_Q = list(opt("--hn"), /;/);
const GH_Q = list(opt("--github"), /;/);
const APPS = list(opt("--apps"));
const COUNTRY = opt("--country", "us");
const SUBS = list(opt("--reddit"));
const TM_CATS = list(opt("--trustmrr"));
const LIMIT = Math.max(5, parseInt(opt("--limit", "30"), 10) || 30);
const UA = "painradar/0.1 (+https://github.com/halilneed/painradar; public-listing research; read-only)";

// ---------- sınıflandırıcı (EN + TR, şeffaf desenler) ----------
// JS'de \b ASCII tabanlıdır ("Bugün" → "bug" eşleşir). Unicode-uyumlu sınır kullanıyoruz.
const B0 = "(?<![\\p{L}\\p{N}])", B1 = "(?![\\p{L}\\p{N}])";
const W = (en, tr) => new RegExp(`${B0}(?:${en})${B1}|${B0}(?:${tr})`, "iu"); // TR kökleri: başta sınır, sonda ek alabilir
const MILD = W("problem|issue|bug|confus\\w*|not working|doesn'?t work|slow|clunky|missing|wish (?:it|there|they)|why (?:does|is|do|are|can'?t)|struggl\\w*|painful|pain point",
               "sorun|çalışmıyor|neden|nasıl|eksik|yavaş|karışık");
const CLEAR = W("frustrat\\w*|annoy\\w*|disappoint\\w*|terrible|broken|sucks?|tired of|fed up|ridiculous|unacceptable|nightmare|worst|hate|rant|stopped working|surprise bill",
                "şikayet|bıktım|berbat|rezalet|saçma|kabul edilemez");
const SEVERE = W("scam\\w*|ripoff|refund|cancel(?:l?ed|ing)?|switch(?:ed|ing)? (?:from|to|away)|never again|avoid|warning|psa|data (?:loss|breach|leak)|exposed|hacked|shut(?:ting)? down|anyone else|is it just me",
                 "mağdur|iade|iptal|dolandır|uyarı|sızdı|kapatıyor");
const INTENT = W("looking for (?:a|an|any)?\\s*(?:tool|app|service|alternative|way)|any (?:tool|app|service) that|alternatives?(?: to)?|recommend(?:ation)?s?|what do you use|is there (?:a|any)|willing to pay|i'?d pay|take my money",
                 "öner|tavsiye|alternatif|var mı|hangi (?:uygulama|araç|program)|öderim");
const PROMO = new RegExp(`^show hn|${B0}(?:we just launched|introducing|now available|sign up today|we are hiring|who is hiring|promo code|\\d+% off)${B1}|${B0}(?:lansman|indirim kodu)`, "iu");

export function classify(text) {
  const t = text || "";
  const promo = PROMO.test(t);
  let intensity = SEVERE.test(t) ? 1 : CLEAR.test(t) ? 0.7 : MILD.test(t) ? 0.35 : 0;
  const intent = INTENT.test(t) && !promo;
  let complaint = intensity > 0 && !(promo && intensity < 0.7);
  if (intent) { complaint = true; intensity = Math.max(intensity, 0.35); }
  return { complaint, intensity, intent, promo };
}

// ---------- yardımcılar ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isoDate = (v) => { if (!v) return ""; const d = typeof v === "number" ? new Date(v * (v < 1e12 ? 1000 : 1)) : new Date(v); return isNaN(d) ? "" : d.toISOString().slice(0, 10); };
const strip = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const cut = (s, n) => (s && s.length > n ? s.slice(0, n) + "…" : s || "");

async function getJSON(url, headers = {}) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json", ...headers } });
  if (r.status === 403 || r.status === 429) { const e = new Error(`HTTP ${r.status}`); e.blocked = true; throw e; }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function mkItem(source, title, url, text, date, score, comments, extra = {}) {
  const c = classify(`${title}\n${text}`);
  return { source, title: cut(strip(title), 200), url, text: cut(strip(text), 600), date, score: score ?? null, comments: comments ?? null, ...c, extra };
}

// ---------- kaynaklar ----------
async function hn(queries, days) {
  const res = { source: "hackernews", items: [], blocked: false, error: null };
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const seen = new Set();
  for (const q of queries) {
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=${encodeURIComponent("(story,comment)")}&numericFilters=created_at_i>${since}&hitsPerPage=${LIMIT}`;
    try {
      const d = await getJSON(url);
      for (const h of d.hits || []) {
        if (seen.has(h.objectID)) continue; seen.add(h.objectID);
        const text = h.comment_text || h.story_text || "";
        res.items.push(mkItem("hackernews", h.title || h.story_title || cut(strip(text), 80), `https://news.ycombinator.com/item?id=${h.objectID}`, text, isoDate(h.created_at_i), h.points, h.num_comments, { query: q, kind: h.comment_text ? "comment" : "story" }));
      }
    } catch (e) { if (e.blocked) { res.blocked = true; res.error = e.message; break; } res.error = e.message; }
    await sleep(400);
  }
  return res;
}

async function github(queries, days) {
  const res = { source: "github", items: [], blocked: false, error: null };
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  for (const q of queries) {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(`${q} is:issue created:>=${since}`)}&sort=reactions&order=desc&per_page=${Math.min(LIMIT, 100)}`;
    try {
      const d = await getJSON(url, headers);
      for (const it of d.items || []) res.items.push(mkItem("github", it.title, it.html_url, it.body || "", (it.created_at || "").slice(0, 10), it.reactions?.total_count, it.comments, { query: q, repo: (it.repository_url || "").split("/repos/")[1] || "" }));
    } catch (e) { if (e.blocked) { res.blocked = true; res.error = e.message; break; } res.error = e.message; }
    await sleep(process.env.GITHUB_TOKEN ? 700 : 2000);
  }
  return res;
}

async function appstore(ids, country) {
  const res = { source: "appstore", items: [], blocked: false, error: null };
  for (const id of ids) {
    const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${id}/sortBy=mostRecent/json`;
    try {
      const d = await getJSON(url);
      let entries = d.feed?.entry || []; if (!Array.isArray(entries)) entries = [entries];
      for (const e of entries) {
        const stars = parseInt(e["im:rating"]?.label || "5", 10);
        if (stars > 2) continue; // yalnızca 1-2 yıldız: saf şikayet
        res.items.push(mkItem("appstore", e.title?.label, e.link?.attributes?.href || url, e.content?.label, (e.updated?.label || "").slice(0, 10), parseInt(e["im:voteSum"]?.label || "0", 10) || null, null, { app_id: id, stars, country }));
      }
    } catch (e) { if (e.blocked) { res.blocked = true; res.error = e.message; break; } res.error = e.message; }
    await sleep(800);
  }
  return res;
}

async function reddit(subs, topic, days) {
  const res = { source: "reddit", items: [], blocked: false, error: null, note: "best-effort public JSON; no licence — do not build a paid product on this" };
  const t = days > 7 ? "month" : "week";
  const urls = subs.map((s) => [`https://www.reddit.com/r/${s}/top.json?t=${t}&limit=${LIMIT}`, `r/${s}`]);
  if (topic) urls.push([`https://www.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=new&t=${t}&limit=${LIMIT}`, `search`]);
  const seen = new Set();
  for (const [url, via] of urls) {
    try {
      const d = await getJSON(url);
      for (const c of d.data?.children || []) {
        const x = c.data || {}; if (!x.id || seen.has(x.id)) continue; seen.add(x.id);
        res.items.push(mkItem("reddit", x.title, `https://www.reddit.com${x.permalink || ""}`, x.selftext || "", isoDate(x.created_utc), x.score, x.num_comments, { subreddit: x.subreddit, via }));
      }
    } catch (e) { if (e.blocked) { res.blocked = true; res.error = `${e.message} — Reddit blocked/rate-limited`; break; } res.error = e.message; }
    await sleep(1500);
  }
  return res;
}

async function trustmrr(categories) {
  // Resmi API: https://trustmrr.com/docs/api (bearer `tmrr_…`, ~20 istek/dk). Şema değişebilir → savunmacı okuma.
  const res = { source: "trustmrr", stats: {}, blocked: false, error: null };
  const key = process.env.TRUSTMRR_API_KEY;
  if (!key) { res.error = "TRUSTMRR_API_KEY yok — para kanıtı için dashboard-dev'den anahtar al"; return res; }
  const num = (r, keys) => { for (const k of keys) { const v = r?.[k]; if (typeof v === "number") return v; if (typeof v === "string" && v.replace(/[$,%]/g, "") !== "" && !isNaN(+v.replace(/[$,%]/g, ""))) return +v.replace(/[$,%]/g, ""); } return null; };
  const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  for (const cat of categories) {
    try {
      const d = await getJSON(`https://trustmrr.com/api/v1/startups?category=${encodeURIComponent(cat.toLowerCase().replace(/\s+/g, "-"))}&limit=100`, { Authorization: `Bearer ${key}` });
      const rows = Array.isArray(d) ? d : d.data || d.startups || d.items || d.results || [];
      const mrr = rows.map((r) => num(r, ["mrr", "monthly_revenue", "revenue_mrr"])).filter((v) => v > 0);
      const growth = rows.map((r) => num(r, ["growth_mom", "mom_growth", "growth_30d", "growth"])).filter((v) => v !== null);
      res.stats[cat] = { median_mrr: median(mrr), growth_30d_pct: median(growth), n: rows.length };
    } catch (e) { if (e.blocked) { res.blocked = true; res.error = e.message; break; } res.error = e.message; }
    await sleep(3200);
  }
  return res;
}

// ---------- çıktı ----------
function toMarkdown(out, lang) {
  const L = lang === "tr"
    ? { h: "Radar ham kanıtları", src: "Kaynak", title: "Başlık", date: "Tarih", eng: "Etkileşim", int: "Yoğunluk", link: "Link", note: "Kaynak notu", blocked: "engellendi", none: "Şikayet/niyet taşıyan kanıt bulunamadı." }
    : { h: "Radar raw evidence", src: "Source", title: "Title", date: "Date", eng: "Engagement", int: "Intensity", link: "Link", note: "Source note", blocked: "blocked", none: "No complaint/intent evidence found." };
  const lines = [`# ${L.h} — ${out.topic} — ${out.date}`, ""];
  lines.push(`**${L.note}:** ` + Object.entries(out.sources).map(([k, v]) => `${k}: ${v.items ?? Object.keys(v.stats || {}).length}${v.blocked ? ` (${L.blocked})` : ""}${v.error ? ` · ${v.error}` : ""}`).join(" · "), "");
  const ev = out.items.filter((i) => i.complaint);
  if (!ev.length) { lines.push(L.none); return lines.join("\n"); }
  lines.push(`| ${L.src} | ${L.title} | ${L.date} | ${L.eng} | ${L.int} | ${L.link} |`, "|---|---|---|---|---|---|");
  for (const i of ev) lines.push(`| ${i.source} | ${i.title.replace(/\|/g, "/")} | ${i.date} | ${i.score ?? "-"}·${i.comments ?? "-"} | ${i.intensity}${i.intent ? " +niyet" : ""} | ${i.url} |`);
  return lines.join("\n");
}

function selftest() {
  const cases = [
    ["Anyone else's organic traffic down 40% since AI Overviews?", true],
    ["Looking for a tool that tracks LLM spend per customer", true],
    ["Show HN: I built a thing, now available", false],
    ["Supabase RLS was off and users could read each other's data — warning", true],
    ["Bu uygulama sürekli çalışmıyor, iade istiyorum", true],
    ["Bugün hava güzel", false],
  ];
  let ok = 0;
  for (const [t, exp] of cases) { const c = classify(t); const pass = c.complaint === exp; ok += pass; console.log(`${pass ? "ok " : "FAIL"} ${JSON.stringify(c)}  ← ${t}`); }
  console.log(`${ok}/${cases.length} passed`);
  process.exit(ok === cases.length ? 0 : 1);
}

async function main() {
  if (flag("--selftest")) return selftest();
  if (!TOPIC) { console.error("Kullanım: node radar.mjs --topic \"<konu>\" [--hn q1;q2] [--github q1;q2] [--apps id,id] [--reddit sub,sub] [--trustmrr Cat,Cat] [--days 30] [--md] [--lang tr] [--out r.json]"); process.exit(2); }
  const hnQ = HN_Q.length ? HN_Q : [TOPIC];
  const out = { topic: TOPIC, date: new Date().toISOString().slice(0, 10), days: DAYS, sources: {}, items: [], trustmrr: null, privacy: "public data only; no usernames stored; nothing private uploaded" };
  const runs = [hn(hnQ, DAYS)];
  if (GH_Q.length) runs.push(github(GH_Q, DAYS));
  if (APPS.length) runs.push(appstore(APPS, COUNTRY));
  if (SUBS.length) runs.push(reddit(SUBS, TOPIC, DAYS));
  for (const r of await Promise.all(runs)) { out.sources[r.source] = { items: r.items.length, blocked: r.blocked, error: r.error, note: r.note || "" }; out.items.push(...r.items); }
  if (TM_CATS.length) { const t = await trustmrr(TM_CATS); out.trustmrr = t.stats; out.sources.trustmrr = { items: Object.keys(t.stats).length, blocked: t.blocked, error: t.error }; }
  // tekrarları at
  const seen = new Set(); out.items = out.items.filter((i) => (seen.has(i.url) ? false : seen.add(i.url)));
  out.totals = { collected: out.items.length, complaints: out.items.filter((i) => i.complaint).length, intent: out.items.filter((i) => i.intent).length };
  const text = MD ? toMarkdown(out, LANG) : JSON.stringify(out, null, 2);
  if (OUT) { writeFileSync(OUT, JSON.stringify(out, null, 2)); if (MD) console.log(text); else console.error(`yazıldı → ${OUT} (${out.totals.complaints} kanıt / ${out.totals.collected} toplanan)`); }
  else console.log(text);
}

main().catch((e) => { console.error("radar.mjs hata:", e.message); process.exit(1); });
