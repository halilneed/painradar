# painradar

> Herkese açık şikayetleri (Hacker News, GitHub Issues, App Store yorumları; istenirse
> Reddit) ve **doğrulanmış gelir kanıtını** (TrustMRR) **kanıt atıflı temalara**,
> **kurucu–fırsat uyumu** sıralamasına ve **lansman planına** çevirir — Claude Code'un
> içinde. Sadece herkese açık veri çekilir; persona'n, repo'n ve sohbet geçmişin
> makinenden çıkmaz.
>
> *English summary below.*

`devpersona` **kim olduğunu** söyler. `painradar` **ne inşa etmen** ve **nasıl
satman** gerektiğini söyler — ikisi de aynı ilkeyle: kanıtı olmayan öneri rapora giremez.

## Ne yapar?

| Komut                                   | Ne verir                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/painradar:scan <konu>`             | **Şikayet Radarı**: 3–7 tema, şeffaf Sinyal puanı (1–5), ≥2 linkli kanıt/tema, çözüm yolları, içerik fikirleri          |
| `/painradar:fit`                     | **Kurucu–fırsat uyumu**: tema × para kanıtı (TrustMRR) × rekabet boşluğu × persona'n (devpersona varsa) × efor × platform riski |
| `/painradar:launch [repo\|idea]`     | **Lansman akışı**: tek birincil kanal + gerekçe, Reddit/HN/PH kuralları, SEO karşılaştırma sayfaları, TrustMRR listeleme, 30 günlük takvim, 3 içerik brief'i |

Analiz iki katmandan beslenir: `scripts/radar.mjs`'in çektiği **herkese açık kanıt**
(başlık, link, tarih, etkileşim; kullanıcı adı yok) ve Claude'un kendi oturumun içinde
yaptığı **yorum** (kümeleme, puanlama, çözüm). Para kanıtı için TrustMRR API anahtarı
opsiyoneldir; yoksa rakamlar "(doğrulanmadı)" işaretiyle herkese açık istatistik
sayfasından alınır — asla uydurulmaz.

## Gizlilik

- Tarayıcı yalnızca **herkese açık** kaynaklara gider ve çıktıya **kullanıcı adı/yazar adı
  yazmaz**; metinler kısaltılır.
- `devpersona` kartın yerelde okunur, hiçbir yere gönderilmez. Repo'n da öyle.
- Reddit varsayılan olarak **kapalıdır** (lisans ve kilitlenme riski). Açarsan 403/429'da
  durur ve raporda "engellendi" yazar. Ücretli bir ürünü Reddit kazımaya kurma.
- Erişilemeyen kaynak raporda gizlenmez; eksik kanıt yerine "sinyal zayıf" yazılır.

## Kurulum

```
# Claude Code içinde:
/plugin marketplace add hailneed/plugins
/plugin install painradar@hailneed
```

Sonra dene:

```
/painradar:scan "AI Overviews sonrası organik trafik kaybı"
```

Gereksinim: Claude Code + Node.js 18+ (tarayıcı script'i için). Opsiyonel ortam
değişkenleri: `GITHUB_TOKEN` (GitHub arama limiti), `TRUSTMRR_API_KEY` (para kanıtı;
https://trustmrr.com/dashboard-dev).

## Plugin'siz kullanım

```
git clone https://github.com/hailneed/painradar
node painradar/scripts/radar.mjs --topic "llm api bill" --github "openai bill spike" --md --lang tr
node painradar/scripts/radar.mjs --topic "supabase rls" --hn "supabase rls;lovable security" --out radar.json
node painradar/scripts/radar.mjs --selftest
```

## Nasıl çalışır?

1. `radar.mjs` HN (Algolia), GitHub Issues, App Store RSS (1–2★), opsiyonel Reddit ve
   TrustMRR'ı okur; EN+TR şikayet/niyet desenleriyle işaretler; normalize JSON yazar.
2. `scan` skill'i rubriğe göre temalar kurar, puanlar, `~/.claude/radar/<konu>-<tarih>.md`
   raporunu yazar, durum dosyasıyla **Yeni / Devam eden** ayrımını tutar.
3. `fit` skill'i temaları para kanıtı ve persona'nla çaprazlar; `launch` skill'i seçilen
   fırsat için kanıtlı kanal planı ve brief'ler üretir.

## Yol haritası (ve nasıl para kazanır)

- **v0.1 (bu repo):** 3 skill + bağımlılıksız tarayıcı, MIT.
- **v0.2:** günlük çalıştırma için durum karşılaştırması (Yeni/Büyüyen/Sönen), App Store
  yerine Google Play importu, `--gsc` ile Search Console CSV'den talep sinyali.
- **Radar Cloud (ücretli, opsiyonel):** zamanlanmış günlük taramalar, geçmiş ve grafikler,
  Telegram/Slack digest, TrustMRR verisi dahil, ekip paylaşımı, ajanslar için beyaz etiket
  rapor. Plugin ücretsiz kalır; bulut, "her sabah hazır radar" isteyenler için.

## Çıktı örneği (`--md --lang tr`)

```
# Radar ham kanıtları — supabase rls exposed — 2026-08-19
**Kaynak notu:** hackernews: 0 (engellendi) · HTTP 403 · github: 30
| Kaynak | Başlık | Tarih | Etkileşim | Yoğunluk | Link |
| github | Add an RLS role-matrix integration test suite | 2026-08-16 | 1·1 | 1 | https://github.com/... |
```

---

# English

**painradar** is a Claude Code plugin that turns public complaints (Hacker News,
GitHub Issues, App Store reviews, optional Reddit) plus verified-revenue proof (TrustMRR)
into **evidence-backed themes**, a **founder–opportunity fit** ranking and a **launch
plan** — inside Claude Code. Only public data is fetched; your persona, repo and chat
history never leave your machine.

- `/painradar:scan <topic>` — complaint radar: 3–7 themes, transparent Signal score,
  ≥2 linked items per theme, solution paths, content ideas
- `/painradar:fit` — which theme is worth building: pain × money proof × competition
  gap × your persona (from devpersona, optional) × effort × platform risk
- `/painradar:launch [repo|idea]` — one primary channel with reasons, posting rules,
  SEO comparison pages, TrustMRR listing, 30-day calendar, 3 content briefs

**Install** (inside Claude Code): `/plugin marketplace add hailneed/plugins` then
`/plugin install painradar@hailneed`. **Standalone:** `node scripts/radar.mjs --topic "…" --md`.

**Privacy:** public sources only; no usernames in output; Reddit off by default and
reported as blocked when it is; nothing private uploaded. Requires Node.js 18+.

## Lisans / License

MIT
