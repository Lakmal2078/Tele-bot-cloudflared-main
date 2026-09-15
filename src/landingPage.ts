import type { Env } from "./types";

const BOT_URL = "https://t.me/fast_1xbetcash_bot";
const BOT_USERNAME = "@fast_1xbetcash_bot";

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(value: string): string {
  return escapeAttribute(value);
}

function escapeJsonForScript(value: string): string {
  return value
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function renderLandingPage(env: Env, request: Request, nonce?: string): string {
  const nonceAttr = nonce ? ` nonce="${escapeAttribute(nonce)}"` : "";
  const channelUrl = env.CHANNEL_URL?.trim() || "https://t.me/fast_xbet_official_tips";
  const channelUsername = env.CHANNEL_USERNAME?.trim() || "@fast_xbet_official_tips";
  const xbetLink = env.XBET_LINK?.trim() || "#";
  const promo = env.XBET_PROMO_CODE?.trim() || "VGSL";
  const minTx = parseInt(env.MIN_TRANSACTION_LKR || "1000", 10) || 1000;
  const maxTx = parseInt(env.MAX_TRANSACTION_LKR || "500000", 10) || 500000;

  const colo = escapeText(
    String((request as Request & { cf?: { colo?: string } }).cf?.colo || "EDGE")
  );

  // Deep linked bot CTAs
  const botDeepLink = `${BOT_URL}?start=landing`;
  const botStickyLink = `${BOT_URL}?start=landing_sticky`;

  const bot = escapeAttribute(botDeepLink);
  const botSticky = escapeAttribute(botStickyLink);
  const channel = escapeAttribute(channelUrl);
  const xbet = escapeAttribute(xbetLink);
  const channelName = escapeText(channelUsername);
  const code = escapeText(promo);
  const minAmount = escapeText(String(minTx));
  const maxAmount = escapeText(String(maxTx));

  // Determine server-side initial language from query or accept-language
  let initialLang: "si" | "en" | "ta" = "si";
  let pageUrl = "https://fast-xbet-cash.example/";
  try {
    const u = new URL(request.url);
    pageUrl = `${u.origin}/`;
    const qLang = u.searchParams.get("lang")?.toLowerCase();
    if (qLang === "en" || qLang === "ta" || qLang === "si") {
      initialLang = qLang;
    } else {
      const accept = request.headers.get("accept-language") || "";
      if (/\bta\b/i.test(accept)) initialLang = "ta";
      else if (/\ben\b/i.test(accept)) initialLang = "en";
    }
  } catch {
    /* keep fallback */
  }

  const pageUrlAttr = escapeAttribute(pageUrl);
  const ogImageUrl = `${pageUrl}og-image.svg`;
  const ogImageUrlAttr = escapeAttribute(ogImageUrl);

  // Multi-schema JSON-LD: Organization, WebSite, and FAQPage (for Google rich results)
  const jsonLd = escapeJsonForScript(
    JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${pageUrl}#organization`,
          name: "Fast xBet Cash",
          url: pageUrl,
          logo: `${pageUrl}og-image.svg`,
          sameAs: [channelUrl, BOT_URL],
          description:
            "Sri Lanka Telegram service for free betting tips and a fast cash deposit/withdraw agent. Multi-language support (Sinhala, English, Tamil).",
          areaServed: "LK",
          availableLanguage: ["si", "en", "ta"],
        },
        {
          "@type": "WebSite",
          "@id": `${pageUrl}#website`,
          url: pageUrl,
          name: "Fast xBet Cash 🇱🇰",
          publisher: { "@id": `${pageUrl}#organization` },
          inLanguage: ["si", "en", "ta"],
        },
        {
          "@type": "FAQPage",
          "@id": `${pageUrl}#faq`,
          mainEntity: [
            {
              "@type": "Question",
              name: "Deposit කරන්නේ කෙසේද? (How to Deposit?)",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Bot එක විවෘත කර /deposit භාවිතා කරන්න. Player ID ඇතුළත් කර, eZ Cash / mCash හෝ Bank Transfer මගින් මුදල් ගෙවා receipt ඡායාරූපය upload කරන්න. Admin තහවුරු කළ පසු මිනිත්තු කිහිපයකින් මුදල් ගිණුමට බැර වේ.",
              },
            },
            {
              "@type": "Question",
              name: "Withdraw කොපමණ කාලයක් ගතවේද? (How long does withdrawal take?)",
              acceptedAnswer: {
                "@type": "Answer",
                text: "සාමාන්‍යයෙන් මිනිත්තු 2–5ක් ඇතුළත. ඉහළ මුදල් හෝ අමතර verification අවශ්‍ය වූ විට සුළු කාලයක් ගතවිය හැක.",
              },
            },
            {
              "@type": "Question",
              name: "Free Tips මොනවාද? (What are the free betting tips?)",
              acceptedAnswer: {
                "@type": "Answer",
                text: "දිනකට 3 වතාවක් (08:00, 12:00, 18:00 ශ්‍රී ලංකා වේලාවෙන්) EPL, UCL, NBA, ATP තරග සඳහා විශ්ලේෂණය කළ automatic free tips අපගේ Telegram channel එකට publish කෙරේ.",
              },
            },
            {
              "@type": "Question",
              name: "Referral bonus ලබාගන්නේ කෙසේද? (How to get referral bonuses?)",
              acceptedAnswer: {
                "@type": "Answer",
                text: "/referrals මගින් ඔබේ personal referral link එක ලබාගෙන මිතුරන්ට යවන්න. ඔවුන් ලියාපදිංචි වී deposit කරන සෑම විටම ඔබට rewards ලැබේ.",
              },
            },
            {
              "@type": "Question",
              name: "ගැටලුවක් තිබේ නම් කුමක් කළ යුතුද? (What if I need support?)",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Telegram Bot හි /ticket command එක භාවිතා කර support ticket එකක් විවෘත කරන්න. අපගේ 24/7 Admin කණ්ඩායම ඉතා ඉක්මනින් ප්‍රතිචාර දක්වයි.",
              },
            },
            {
              "@type": "Question",
              name: "භාෂාව වෙනස් කරන්නේ කෙසේද? (How to switch language?)",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Bot එකේ /language command එක හෝ මෙම වෙබ් අඩවියේ ඉහළ ඇති සිං / EN / த බොත්තම් භාවිතා කර ඕනෑම වේලාවක භාෂාව වෙනස් කළ හැක.",
              },
            },
          ],
        },
      ],
    })
  );

  return `<!doctype html>
<html lang="${initialLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Fast xBet Cash 🇱🇰 — Free Betting Tips &amp; Cash Agent</title>
<meta name="description" content="ශ්‍රී ලංකාවේ වේගවත් Free Betting Tips &amp; Cash Agent සේවාව. Telegram හරහා deposit, withdraw, referral සහ ස්වයංක්‍රීය betting tips ලබාගන්න. Sinhala / English / Tamil.">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#0a0e17">
<meta name="color-scheme" content="dark">
<link rel="canonical" href="${pageUrlAttr}">

<!-- Hreflang Tags (SEO & Localization) -->
<link rel="alternate" hreflang="si" href="${pageUrlAttr}?lang=si">
<link rel="alternate" hreflang="en" href="${pageUrlAttr}?lang=en">
<link rel="alternate" hreflang="ta" href="${pageUrlAttr}?lang=ta">
<link rel="alternate" hreflang="x-default" href="${pageUrlAttr}">

<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E">

<!-- OpenGraph Social Preview (P0 #1) -->
<meta property="og:type" content="website">
<meta property="og:title" content="Fast xBet Cash 🇱🇰 — Free Betting Tips &amp; Cash Agent">
<meta property="og:description" content="ස්වයංක්‍රීය Free Betting Tips, වේගවත් Deposit &amp; Withdraw සේවාව — සියල්ල Telegram හරහා. 18+ Only.">
<meta property="og:url" content="${pageUrlAttr}">
<meta property="og:image" content="${ogImageUrlAttr}">
<meta property="og:image:type" content="image/svg+xml">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Fast xBet Cash 🇱🇰 — Free Betting Tips &amp; Cash Agent">
<meta property="og:locale" content="si_LK">
<meta property="og:locale:alternate" content="en_US">
<meta property="og:locale:alternate" content="ta_LK">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Fast xBet Cash 🇱🇰 — Free Betting Tips &amp; Cash Agent">
<meta name="twitter:description" content="ස්වයංක්‍රීය Free Betting Tips, වේගවත් Deposit &amp; Withdraw — Telegram හරහා.">
<meta name="twitter:image" content="${ogImageUrlAttr}">

<!-- Performance: Optimized Variable Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400..800&family=Plus+Jakarta+Sans:wght@400..800&display=swap" rel="stylesheet">

<script type="application/ld+json"${nonceAttr}>${jsonLd}</script>

<style${nonceAttr}>
:root {
  --bg: #070b12;
  --bg2: #0f172a;
  --card: rgba(26, 34, 53, 0.72);
  --card-border: rgba(255, 255, 255, 0.08);
  --accent: #00e676;
  --accent-glow: rgba(0, 230, 118, 0.25);
  --accent2: #00b0ff;
  --accent2-glow: rgba(0, 176, 255, 0.25);
  --gold: #ffd700;
  --text: #f1f5f9;
  --muted: #94a3b8;
  --line: rgba(255, 255, 255, 0.08);
  --radius: 18px;
  --radius-sm: 12px;
  --danger: #ff5252;
  --warning: #ffab00;
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  font-family: 'Noto Sans Sinhala', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.65;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  padding-bottom: 72px; /* Space for mobile sticky CTA bar */
}

@media (min-width: 769px) {
  body { padding-bottom: 0; }
}

a { color: inherit; text-decoration: none; }

a:focus-visible,
button:focus-visible,
input:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--accent2);
  outline-offset: 2px;
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  background: var(--accent);
  color: #000;
  padding: 10px 16px;
  border-radius: 0 0 8px 0;
  z-index: 100;
  font-weight: 700;
}
.skip-link:focus { left: 0; }

/* ===== NAVBAR ===== */
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(7, 11, 18, 0.88);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--line);
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.logo {
  font-size: 1.3rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.logo span { color: var(--accent); }

.badge-18 {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 82, 82, 0.12);
  border: 1px solid rgba(255, 82, 82, 0.35);
  color: #ff5252;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  margin-left: 6px;
}

.nav-links {
  display: flex;
  gap: 18px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.nav-links a {
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 600;
  transition: color 0.2s;
}
.nav-links a:hover { color: var(--text); }

.langs {
  display: flex;
  gap: 5px;
  margin-left: 6px;
}

.langs button {
  border: 1px solid var(--card-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--muted);
  border-radius: 999px;
  padding: 5px 11px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8rem;
  transition: all 0.2s;
  font-family: inherit;
}
.langs button.active {
  background: var(--accent);
  color: #000;
  border-color: var(--accent);
}

/* Offline notice banner */
#offlineBanner {
  display: none;
  background: #ff5252;
  color: #fff;
  text-align: center;
  padding: 8px 16px;
  font-size: 0.88rem;
  font-weight: 700;
  position: sticky;
  top: 60px;
  z-index: 60;
}

/* ===== HERO ===== */
.hero {
  text-align: center;
  padding: 64px 20px 36px;
  background:
    radial-gradient(ellipse at 50% -10%, rgba(0, 230, 118, 0.16), transparent 70%),
    radial-gradient(ellipse at 80% 20%, rgba(0, 176, 255, 0.1), transparent 50%);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 230, 118, 0.1);
  border: 1px solid rgba(0, 230, 118, 0.3);
  color: var(--accent);
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  margin-bottom: 18px;
}

.hero-badge .pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.hero h1 {
  font-size: clamp(2.3rem, 7vw, 4rem);
  margin: 0 0 14px;
  background: linear-gradient(135deg, #ffffff 20%, var(--accent) 70%, var(--accent2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.15;
}

.hero p {
  color: var(--muted);
  font-size: 1.12rem;
  max-width: 620px;
  margin: 0 auto 28px;
}

.hero-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 26px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.98rem;
  border: 0;
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
  cursor: pointer;
  font-family: inherit;
}
.btn:hover { transform: translateY(-2px); }

.btn-primary {
  background: linear-gradient(135deg, var(--accent), #00c853);
  color: #061b0d;
  box-shadow: 0 6px 24px var(--accent-glow);
}
.btn-primary:hover { box-shadow: 0 8px 30px rgba(0, 230, 118, 0.4); }

.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(8px);
}
.btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }

.btn-outline {
  background: transparent;
  color: var(--accent2);
  border: 1px solid rgba(0, 176, 255, 0.4);
}
.btn-outline:hover { background: rgba(0, 176, 255, 0.1); }

/* ===== LIVE TICKER ===== */
.live-ticker {
  max-width: 960px;
  margin: 0 auto 28px;
  padding: 0 20px;
}

.ticker-card {
  background: linear-gradient(135deg, rgba(0, 230, 118, 0.06), rgba(0, 176, 255, 0.06));
  border: 1px solid rgba(0, 230, 118, 0.2);
  border-radius: var(--radius-sm);
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.ticker-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ticker-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
  animation: pulse 1.8s infinite;
  flex-shrink: 0;
}

.ticker-right {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--muted);
}

.ticker-timer {
  font-weight: 800;
  color: var(--accent2);
  background: rgba(0, 176, 255, 0.12);
  padding: 4px 10px;
  border-radius: 8px;
  font-variant-numeric: tabular-nums;
}

/* ===== TRUST SIGNALS STRIP (P0 #4) ===== */
.trust-strip {
  max-width: 1000px;
  margin: 0 auto 24px;
  padding: 0 20px;
}

.trust-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}

.trust-card {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-sm);
  padding: 18px;
  text-align: center;
  transition: transform 0.2s, border-color 0.2s;
}
.trust-card:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 230, 118, 0.3);
}

.trust-num {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--accent);
  line-height: 1.2;
}
.trust-label {
  color: var(--text);
  font-size: 0.88rem;
  font-weight: 700;
  margin-top: 4px;
}
.trust-sub {
  color: var(--muted);
  font-size: 0.8rem;
  margin-top: 2px;
}

/* Payment badges strip */
.payment-strip {
  max-width: 1000px;
  margin: 0 auto 36px;
  padding: 0 20px;
  text-align: center;
}

.payment-pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 10px;
}

.payment-pill {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--card-border);
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ===== SECTIONS ===== */
.section {
  padding: 48px 20px;
  max-width: 1000px;
  margin: auto;
}

.section-title {
  text-align: center;
  font-size: 1.9rem;
  margin: 0 0 8px;
  font-weight: 800;
}

.section-sub {
  text-align: center;
  color: var(--muted);
  margin: 0 auto 32px;
  max-width: 580px;
  font-size: 1rem;
}

/* ===== GRID & CARDS ===== */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.card {
  background: var(--card);
  backdrop-filter: blur(12px);
  border-radius: var(--radius);
  padding: 24px 20px;
  border: 1px solid var(--card-border);
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.card:hover {
  transform: translateY(-4px);
  border-color: rgba(0, 230, 118, 0.3);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}

.card-icon { font-size: 2.1rem; margin-bottom: 4px; }
.card h3 {
  font-size: 1.12rem;
  margin: 10px 0 8px;
  font-weight: 700;
}
.card p {
  color: var(--muted);
  font-size: 0.91rem;
  margin: 0;
}

/* ===== LIVE TIPS PREVIEW (P1 #6) ===== */
.tips-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 18px;
  margin-bottom: 24px;
}

.tip-match-card {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s, border-color 0.2s;
}
.tip-match-card:hover {
  transform: translateY(-3px);
  border-color: rgba(0, 176, 255, 0.35);
}

.tip-match-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.tip-sport-tag {
  background: rgba(0, 176, 255, 0.12);
  color: var(--accent2);
  padding: 4px 10px;
  border-radius: 999px;
}

.tip-status-tag {
  background: rgba(0, 230, 118, 0.12);
  color: var(--accent);
  padding: 4px 10px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.tip-teams {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0 0 10px;
  color: var(--text);
}

.tip-prediction-box {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tip-label {
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 600;
}

.tip-val {
  font-weight: 800;
  color: var(--accent);
  font-size: 1rem;
}

.tip-odds {
  font-weight: 800;
  color: var(--gold);
  font-size: 1.1rem;
}

/* ===== STEPS ===== */
.step-tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 26px;
  flex-wrap: wrap;
}

.step-tab-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--card-border);
  color: var(--muted);
  padding: 9px 20px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.93rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.step-tab-btn.active {
  background: linear-gradient(135deg, var(--accent2), #0084c8);
  color: #fff;
  border-color: transparent;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}

.step-card {
  background: var(--card);
  backdrop-filter: blur(10px);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  padding: 26px 22px;
  position: relative;
  overflow: hidden;
}

.step-badge {
  position: absolute;
  top: 14px;
  right: 16px;
  font-size: 2.4rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.06);
  line-height: 1;
}

.step-icon { font-size: 1.9rem; margin-bottom: 10px; }
.step-card h3 {
  font-size: 1.1rem;
  margin: 0 0 8px;
  font-weight: 700;
}
.step-card p {
  color: var(--muted);
  font-size: 0.9rem;
  margin: 0;
}

/* ===== COMMANDS ===== */
.commands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.cmd-item {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  transition: border-color 0.2s;
}
.cmd-item:hover { border-color: rgba(0, 176, 255, 0.35); }

.cmd-code {
  background: rgba(0, 176, 255, 0.12);
  color: var(--accent2);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}

.cmd-desc {
  color: var(--muted);
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.45;
}

/* ===== CALCULATOR ===== */
.calc-container {
  max-width: 620px;
  margin: 0 auto;
  background: var(--card);
  backdrop-filter: blur(16px);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  padding: 32px 26px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
}

.calc-toggle {
  display: flex;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
  margin-bottom: 22px;
}

.calc-btn {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-weight: 700;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
  font-family: inherit;
}
.calc-btn.active {
  background: var(--accent);
  color: #061b0d;
  box-shadow: 0 4px 16px var(--accent-glow);
}

.calc-presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.calc-preset {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--card-border);
  color: var(--text);
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.calc-preset:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent);
}

.calc-input-group {
  margin-bottom: 20px;
}
.calc-input-group label {
  display: block;
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 8px;
  font-weight: 600;
}
.calc-input-wrap {
  display: flex;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  align-items: center;
  transition: border-color 0.2s;
}
.calc-input-wrap:focus-within {
  border-color: var(--accent);
}
.calc-input-wrap span {
  padding: 0 16px;
  color: var(--muted);
  font-weight: 700;
  font-size: 0.95rem;
}
.calc-input-wrap input {
  flex: 1;
  background: transparent;
  border: 0;
  padding: 14px 16px 14px 0;
  color: #fff;
  font-size: 1.25rem;
  font-weight: 700;
  outline: none;
  font-family: inherit;
}

.calc-warning {
  display: none;
  background: rgba(255, 171, 0, 0.1);
  border: 1px solid rgba(255, 171, 0, 0.3);
  color: var(--warning);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 16px;
  font-weight: 600;
}

.calc-results {
  background: rgba(0, 0, 0, 0.28);
  border-radius: var(--radius-sm);
  padding: 16px;
  border: 1px solid var(--line);
}
.calc-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 0.92rem;
}
.calc-row.total {
  border-top: 1px solid var(--line);
  margin-top: 8px;
  padding-top: 12px;
  font-size: 1.1rem;
  font-weight: 800;
}
.calc-row.total .val {
  color: var(--accent);
  font-size: 1.25rem;
}

/* ===== PROMO & RESPONSIBLE GAMING ===== */
.promo-box {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(0, 230, 118, 0.08));
  border: 1px dashed rgba(255, 215, 0, 0.4);
  border-radius: var(--radius);
  padding: 36px 20px;
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.promo-code {
  display: inline-block;
  font-size: 2.2rem;
  font-weight: 900;
  letter-spacing: 4px;
  color: var(--gold);
  background: rgba(0, 0, 0, 0.4);
  padding: 12px 28px;
  border-radius: 12px;
  border: 1px solid rgba(255, 215, 0, 0.3);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  margin: 12px 0;
}
.promo-code:hover {
  transform: scale(1.03);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.copy-hint {
  font-size: 0.82rem;
  color: var(--muted);
}

/* Responsible Gaming Callout Banner (P0 #3) */
.responsible-gaming-box {
  background: rgba(255, 82, 82, 0.06);
  border: 1px solid rgba(255, 82, 82, 0.3);
  border-radius: var(--radius);
  padding: 24px;
  margin: 36px auto;
  max-width: 1000px;
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.responsible-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.responsible-text h4 {
  margin: 0 0 6px;
  color: #ff5252;
  font-size: 1.1rem;
  font-weight: 800;
}

.responsible-text p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.55;
}

/* ===== FAQ ===== */
.faq {
  max-width: 780px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-item {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: border-color 0.2s;
}
.faq-item[open] {
  border-color: rgba(0, 230, 118, 0.3);
}

.faq-item summary {
  padding: 16px 20px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.faq-item summary::-webkit-details-marker { display: none; }
.faq-item summary::after {
  content: "+";
  font-size: 1.3rem;
  color: var(--accent);
  transition: transform 0.2s;
}
.faq-item[open] summary::after {
  content: "−";
}

.faq-item p {
  padding: 0 20px 18px;
  margin: 0;
  color: var(--muted);
  font-size: 0.94rem;
  line-height: 1.6;
}

/* ===== FINAL CTA ===== */
.cta {
  text-align: center;
  padding: 60px 20px;
  background: radial-gradient(ellipse at 50% 100%, rgba(0, 230, 118, 0.12), transparent 70%);
}

.cta h2 {
  font-size: 2.2rem;
  font-weight: 800;
  margin: 0 0 12px;
}
.cta p {
  color: var(--muted);
  font-size: 1.05rem;
  max-width: 500px;
  margin: 0 auto 28px;
}

/* ===== FOOTER ===== */
.footer {
  border-top: 1px solid var(--line);
  padding: 40px 20px 32px;
  text-align: center;
  color: var(--muted);
  font-size: 0.88rem;
}
.footer-links {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.footer-links a:hover { color: var(--text); }

.footer-disclaimer {
  margin: 18px auto 0;
  max-width: 740px;
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.5;
}

/* ===== MOBILE STICKY CTA BAR (P1 #5) ===== */
.mobile-sticky-cta {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99;
  background: rgba(7, 11, 18, 0.94);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 230, 118, 0.25);
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  gap: 10px;
  align-items: center;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.6);
}

.sticky-btn-primary {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, var(--accent), #00c853);
  color: #061b0d;
  font-weight: 800;
  font-size: 0.95rem;
  padding: 12px 18px;
  border-radius: 999px;
  box-shadow: 0 4px 16px var(--accent-glow);
  white-space: nowrap;
}

.sticky-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--card-border);
  color: var(--text);
  font-weight: 700;
  font-size: 0.88rem;
  padding: 12px 16px;
  border-radius: 999px;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .mobile-sticky-cta { display: flex; }
  .nav-links { display: none; }
  .hero { padding: 48px 16px 28px; }
  .hero h1 { font-size: 2.2rem; }
  .stats { gap: 18px; }
  .stat-num { font-size: 1.6rem; }
  .calc-container { padding: 22px 16px; }
}
</style>
</head>

<body>
<a href="#main-content" class="skip-link" data-t="skip">ප්‍රධාන අන්තර්ගතයට යන්න</a>

<div id="offlineBanner" data-t="offlineNotice">
  ⚠️ ඔබ දැනට Offline වේ. අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කරන්න.
</div>

<!-- NAVBAR -->
<header class="navbar">
  <div class="logo">
    ⚡ Fast <span>xBet</span> Cash 🇱🇰
    <span class="badge-18">🔞 18+</span>
  </div>

  <nav class="nav-links" aria-label="Main Navigation">
    <a href="#how-it-works" data-t="howNav">භාවිතා කරන්නේ කෙසේද</a>
    <a href="#tips-preview" data-t="tipsNav">Free Tips 🔥</a>
    <a href="#commands" data-t="cmdNav">Commands</a>
    <a href="#calculator" data-t="calcNav">Calculator</a>
    <a href="#features" data-t="featuresNav">විශේෂාංග</a>
    <a href="#security" data-t="secNav">ආරක්ෂාව</a>
    <a href="#faq" data-t="faqNav">FAQ</a>
  </nav>

  <div class="langs" role="group" aria-label="Language selector">
    <button type="button" id="btn-lang-si" data-lang="si" class="${initialLang === "si" ? "active" : ""}">සිං</button>
    <button type="button" id="btn-lang-en" data-lang="en" class="${initialLang === "en" ? "active" : ""}">EN</button>
    <button type="button" id="btn-lang-ta" data-lang="ta" class="${initialLang === "ta" ? "active" : ""}">த</button>
  </div>
</header>

<main id="main-content">

<!-- HERO -->
<section class="hero">
  <div class="hero-badge">
    <span class="pulse"></span>
    <span data-t="badge">🇱🇰 24/7 Active Bot &amp; Cash Agent · 🔞 18+ Only</span>
  </div>

  <h1>Fast xBet Cash 🇱🇰</h1>

  <p data-t="hero">
    ස්වයංක්‍රීය Free Betting Tips, වේගවත් Deposit &amp; Withdraw, Referral System — සියල්ල Telegram හරහා, ඔබේ දුරකථනයෙන්.
  </p>

  <div class="hero-buttons">
    <a href="${bot}" class="btn btn-primary" target="_blank" rel="noopener" data-t="start">
      🚀 Bot එක පටන් ගන්න
    </a>
    <a href="${channel}" class="btn btn-secondary" target="_blank" rel="noopener" data-t="channel">
      📢 Tips Channel
    </a>
    <a href="#commands" class="btn btn-outline" data-t="seeCmds">
      📋 Commands බලන්න
    </a>
  </div>
</section>

<!-- LIVE STATUS TICKER -->
<div class="live-ticker">
  <div class="ticker-card">
    <div class="ticker-left">
      <span class="ticker-dot"></span>
      <div>
        <div style="font-weight:700;font-size:0.95rem" data-t="statusText">System Status: Online</div>
        <div style="font-size:0.8rem;color:var(--muted)" data-t="statusSub">Telegram Bot &amp; Processing Active · Edge: ${colo}</div>
      </div>
    </div>
    <div class="ticker-right">
      <span data-t="nextTipsLabel">ඊළඟ Tips:</span>
      <span class="ticker-timer" id="nextTipCountdown">--:--:--</span>
    </div>
  </div>
</div>

<!-- TRUST SIGNALS STRIP (P0 #4) -->
<section class="trust-strip">
  <div class="trust-grid">
    <div class="trust-card">
      <div class="trust-num">⚡ 2–5 Min</div>
      <div class="trust-label" data-t="trustSpeedTitle">වේගවත් සැකසුම් කාලය</div>
      <div class="trust-sub" data-t="trustSpeedSub">Instant Player Account Credit</div>
    </div>
    <div class="trust-card">
      <div class="trust-num">👥 10,000+</div>
      <div class="trust-label" data-t="trustUsersTitle">ක්‍රියාකාරී සාමාජිකයින්</div>
      <div class="trust-sub" data-t="trustUsersSub">Sri Lanka Telegram Community</div>
    </div>
    <div class="trust-card">
      <div class="trust-num">🛡️ 99.9%</div>
      <div class="trust-label" data-t="trustSuccessTitle">සාර්ථකත්ව අනුපාතය</div>
      <div class="trust-sub" data-t="trustSuccessSub">Automated Fraud Verification</div>
    </div>
    <div class="trust-card">
      <div class="trust-num">💰 0% Fee</div>
      <div class="trust-label" data-t="trustFeeTitle">අමතර ගාස්තු නැත</div>
      <div class="trust-sub" data-t="trustFeeSub">Zero Hidden Deductions</div>
    </div>
  </div>
</section>

<!-- PAYMENTS STRIP -->
<div class="payment-strip">
  <div style="font-size:0.85rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px" data-t="supportedPay">
    පිළිගත් ආරක්ෂිත ගෙවීම් ක්‍රම (Supported Payment Rails)
  </div>
  <div class="payment-pill-list">
    <div class="payment-pill">📱 eZ Cash</div>
    <div class="payment-pill">📱 mCash</div>
    <div class="payment-pill">💳 FriMi</div>
    <div class="payment-pill">🏦 Commercial Bank</div>
    <div class="payment-pill">🏦 Sampath Bank</div>
    <div class="payment-pill">🏦 BOC / HNB</div>
  </div>
</div>

<!-- TODAY'S FREE TIPS PREVIEW (P1 #6) -->
<section class="section" id="tips-preview">
  <h2 class="section-title" data-t="tipsPreviewTitle">🔥 අද දවසේ විශේෂ Free Betting Tips</h2>
  <p class="section-sub" data-t="tipsPreviewSub">
    අපගේ AI සහ ක්‍රීඩා විශ්ලේෂණ පද්ධතිය මගින් දිනකට 3 වතාවක් (08:00, 12:00, 18:00 SL Time) නිකුත් කෙරෙන නොමිලේ Tips preview එකක්.
  </p>

  <div class="tips-preview-grid">
    <!-- Match 1 -->
    <div class="tip-match-card">
      <div class="tip-match-header">
        <span class="tip-sport-tag">⚽ Premier League</span>
        <span class="tip-status-tag"><span>●</span> 94% Confidence</span>
      </div>
      <div class="tip-teams">Arsenal vs Chelsea</div>
      <div class="tip-prediction-box">
        <div>
          <div class="tip-label">Prediction</div>
          <div class="tip-val">Over 2.5 Goals</div>
        </div>
        <div style="text-align:right">
          <div class="tip-label">Odds</div>
          <div class="tip-odds">1.88</div>
        </div>
      </div>
    </div>

    <!-- Match 2 -->
    <div class="tip-match-card">
      <div class="tip-match-header">
        <span class="tip-sport-tag">⚽ La Liga</span>
        <span class="tip-status-tag"><span>●</span> High Confidence</span>
      </div>
      <div class="tip-teams">Real Madrid vs Atletico</div>
      <div class="tip-prediction-box">
        <div>
          <div class="tip-label">Prediction</div>
          <div class="tip-val">Home Win (1)</div>
        </div>
        <div style="text-align:right">
          <div class="tip-label">Odds</div>
          <div class="tip-odds">1.95</div>
        </div>
      </div>
    </div>

    <!-- Match 3 -->
    <div class="tip-match-card">
      <div class="tip-match-header">
        <span class="tip-sport-tag">⚽ Champions League</span>
        <span class="tip-status-tag"><span>●</span> Verified AI Pick</span>
      </div>
      <div class="tip-teams">Bayern Munich vs PSG</div>
      <div class="tip-prediction-box">
        <div>
          <div class="tip-label">Prediction</div>
          <div class="tip-val">Both Teams To Score (BTTS)</div>
        </div>
        <div style="text-align:right">
          <div class="tip-label">Odds</div>
          <div class="tip-odds">1.72</div>
        </div>
      </div>
    </div>
  </div>

  <div style="text-align:center">
    <a href="${channel}" class="btn btn-secondary" target="_blank" rel="noopener" data-t="joinChannelCta">
      📢 සියලුම Betting Slips Telegram Channel එකෙන් නොමිලේ ගන්න
    </a>
  </div>
</section>

<!-- HOW IT WORKS -->
<section class="section" id="how-it-works">
  <h2 class="section-title" data-t="howTitle">භාවිතා කරන්නේ කෙසේද?</h2>
  <p class="section-sub" data-t="howSub">මිනිත්තු කිහිපයකින් ඉතා පහසුවෙන් ගනුදෙනු සිදුකරන්න</p>

  <div class="step-tabs">
    <button type="button" class="step-tab-btn active" id="tabDepBtn" data-t="tabDep">💰 Deposit පියවර</button>
    <button type="button" class="step-tab-btn" id="tabWdBtn" data-t="tabWd">💸 Withdraw පියවර</button>
  </div>

  <!-- Deposit Steps -->
  <div class="steps-grid" id="depSteps">
    <div class="step-card">
      <div class="step-badge">1</div>
      <div class="step-icon">🤖</div>
      <h3 data-t="step1dTitle">Bot එක ආරම්භ කරන්න</h3>
      <p data-t="step1dDesc">Telegram Bot වෙත ගොස් /deposit command එක ලබාදී ඔබේ Player ID ඇතුළත් කරන්න.</p>
    </div>
    <div class="step-card">
      <div class="step-badge">2</div>
      <div class="step-icon">📸</div>
      <h3 data-t="step2dTitle">මුදල් ගෙවා Receipt එක එවන්න</h3>
      <p data-t="step2dDesc">eZ Cash, mCash හෝ Bank Transfer මගින් ගෙවා රිසිට්පතේ ඡායාරූපය bot වෙත upload කරන්න.</p>
    </div>
    <div class="step-card">
      <div class="step-badge">3</div>
      <div class="step-icon">⚡</div>
      <h3 data-t="step3dTitle">මිනිත්තු 5න් ගිණුමට</h3>
      <p data-t="step3dDesc">Admin විසින් තහවුරු කළ වහාම ඔබේ xBet ගිණුමට මුදල් ක්ෂණිකව බැර වේ.</p>
    </div>
  </div>

  <!-- Withdraw Steps -->
  <div class="steps-grid" id="wdSteps" style="display:none">
    <div class="step-card">
      <div class="step-badge">1</div>
      <div class="step-icon">💸</div>
      <h3 data-t="step1wTitle">/withdraw ආරම්භ කරන්න</h3>
      <p data-t="step1wDesc">Bot එකේ /withdraw command එක භාවිතා කර Player ID සහ මුදල් ප්‍රමාණය ඇතුළත් කරන්න.</p>
    </div>
    <div class="step-card">
      <div class="step-badge">2</div>
      <div class="step-icon">📝</div>
      <h3 data-t="step2wTitle">ගෙවීම් විස්තර ලබාදෙන්න</h3>
      <p data-t="step2wDesc">ඔබේ Bank / eZ Cash / mCash විස්තර ලබාදෙන්න. Admin විසින් සත්‍යාපනය කරයි.</p>
    </div>
    <div class="step-card">
      <div class="step-badge">3</div>
      <div class="step-icon">✅</div>
      <h3 data-t="step3wTitle">මුදල් ලැබේ</h3>
      <p data-t="step3wDesc">තහවුරු වූ පසු ඉක්මනින් ඔබේ ගිණුමට මුදල් මාරු වේ. History එකෙන් තත්වය බලන්න.</p>
    </div>
  </div>
</section>

<!-- COMMANDS -->
<section class="section" id="commands">
  <h2 class="section-title" data-t="cmdTitle">Bot Commands — සියලුම පහසුකම්</h2>
  <p class="section-sub" data-t="cmdSub">Telegram Bot එකේ භාවිතා කළ හැකි සියලුම commands</p>

  <div class="commands-grid">
    <div class="cmd-item">
      <span class="cmd-code">/start</span>
      <p class="cmd-desc" data-t="cmdStart">Bot එක ආරම්භ කර මුල් මෙනුව බලන්න</p>
    </div>
    <div class="cmd-item">
      <span class="cmd-code">/menu</span>
      <p class="cmd-desc" data-t="cmdMenu">ප්‍රධාන මෙනුව විවෘත කරන්න</p>
    </div>
    <div class="cmd-item">
      <span class="cmd-code">/deposit</span>
      <p class="cmd-desc" data-t="cmdDep">Deposit ආරම්භ කරන්න (receipt upload)</p>
    </div>
    <div class="cmd-item">
      <span class="cmd-code">/withdraw</span>
      <p class="cmd-desc" data-t="cmdWd">Withdrawal request එකක් යවන්න</p>
    </div>
    <div class="cmd-item">
      <span class="cmd-code">/register</span>
      <p class="cmd-desc" data-t="cmdReg">Player ID ලියාපදිංචි කරන්න</p>
    </div>
    <div class="cmd-item">
      <span class="cmd-code">/referrals</span>
      <p class="cmd-desc" data-t="cmdRef">ඔබේ Referral dashboard බලන්න</p>
    </div>
    <div class="cmd-item">
      <span class="cmd-code">/history</span>
      <p class="cmd-desc" data-t="cmdHist">ගනුදෙනු ඉතිහාසය බලන්න</p>
    </div>
    <div class="cmd-item">
      <span class="cmd-code">/dashboard</span>
      <p class="cmd-desc" data-t="cmdDash">Account overview බලන්න</p>
    </div>
    <div class="cmd-item">
      <span class="cmd-code">/ticket</span>
      <p class="cmd-desc" data-t="cmdTicket">Support ticket එකක් විවෘත කරන්න</p>
    </div>
    <div class="cmd-item">
      <span class="cmd-code">/language</span>
      <p class="cmd-desc" data-t="cmdLang">භාෂාව වෙනස් කරන්න (සිං / EN / த)</p>
    </div>
    <div class="cmd-item">
      <span class="cmd-code">/safety</span>
      <p class="cmd-desc" data-t="cmdSafe">ආරක්ෂාව හා responsible gaming tips</p>
    </div>
    <div class="cmd-item">
      <span class="cmd-code">/help</span>
      <p class="cmd-desc" data-t="cmdHelp">උදව් හා උපදෙස් ලබාගන්න</p>
    </div>
  </div>

  <div style="text-align:center;margin-top:28px">
    <a href="${bot}" class="btn btn-primary" target="_blank" rel="noopener" data-t="openBot">
      🚀 Telegram Bot විවෘත කරන්න
    </a>
  </div>
</section>

<!-- CALCULATOR (P1 #9) -->
<section class="section" id="calculator">
  <h2 class="section-title" data-t="calcTitle">ගනුදෙනු Calculator</h2>
  <p class="section-sub" data-t="calcSub">Deposit හෝ Withdraw මුදල් ඉක්මනින් ගණනය කරන්න</p>

  <div class="calc-container">
    <div class="calc-toggle">
      <button type="button" class="calc-btn active" id="calcDepBtn" data-t="calcDep">💰 Deposit</button>
      <button type="button" class="calc-btn" id="calcWdBtn" data-t="calcWd">💸 Withdraw</button>
    </div>

    <div class="calc-presets">
      <button type="button" class="calc-preset" data-amount="2000">රු. 2,000</button>
      <button type="button" class="calc-preset" data-amount="5000">රු. 5,000</button>
      <button type="button" class="calc-preset" data-amount="10000">රු. 10,000</button>
      <button type="button" class="calc-preset" data-amount="25000">රු. 25,000</button>
      <button type="button" class="calc-preset" data-amount="50000">රු. 50,000</button>
    </div>

    <div class="calc-input-group">
      <label for="amountInput" data-t="calcAmount">මුදල් ප්‍රමාණය (LKR)</label>
      <div class="calc-input-wrap">
        <span>LKR</span>
        <input type="number" id="amountInput" value="5000" min="${minAmount}" max="${maxAmount}" step="500" aria-label="Amount in LKR">
      </div>
    </div>

    <div class="calc-warning" id="calcWarning" data-t="calcLimitWarn">
      ⚠️ අවම ගනුදෙනුව රු. ${minAmount} සහ උපරිම ගනුදෙනුව රු. ${maxAmount} වේ.
    </div>

    <div class="calc-results">
      <div class="calc-row">
        <span style="color:var(--muted)" data-t="calcYouSend">ඔබ යවන මුදල්</span>
        <span style="font-weight:700" id="calcSend">රු. 5,000.00</span>
      </div>
      <div class="calc-row">
        <span style="color:var(--muted)" data-t="calcFee">සේවා ගාස්තු</span>
        <span style="font-weight:700;color:var(--accent)" id="calcFee">රු. 0.00 (Free)</span>
      </div>
      <div class="calc-row total">
        <span data-t="calcReceive">ගිණුමට ලැබෙන මුදල්</span>
        <span class="val" id="calcReceive">රු. 5,000.00</span>
      </div>
    </div>

    <div style="margin-top:22px;text-align:center">
      <a href="${bot}" class="btn btn-primary" target="_blank" rel="noopener" data-t="proceedBot">
        🚀 Bot එකෙන් ගනුදෙනුව කරන්න
      </a>
    </div>
  </div>
</section>

<!-- FEATURES -->
<section class="section" id="features">
  <h2 class="section-title" data-t="featTitle">ප්‍රධාන විශේෂාංග</h2>
  <p class="section-sub" data-t="featSub">ඔබට අවශ්‍ය සියලුම පහසුකම් එක තැනක</p>

  <div class="grid">
    <div class="card">
      <div class="card-icon">⚡</div>
      <h3 data-t="feat1Title">වේගවත් Deposit</h3>
      <p data-t="feat1Desc">Receipt upload කර මිනිත්තු කිහිපයකින් xBet ගිණුමට මුදල් බැර වේ.</p>
    </div>
    <div class="card">
      <div class="card-icon">💸</div>
      <h3 data-t="feat2Title">පහසු Withdraw</h3>
      <p data-t="feat2Desc">Bank / eZ Cash / mCash වෙත ඉක්මනින් මුදල් ආපසු ගන්න.</p>
    </div>
    <div class="card">
      <div class="card-icon">👥</div>
      <h3 data-t="feat3Title">Referral System</h3>
      <p data-t="feat3Desc">මිතුරන්ට ආරාධනා කර bonus ලබාගන්න. /referrals මගින් dashboard බලන්න.</p>
    </div>
    <div class="card">
      <div class="card-icon">🤖</div>
      <h3 data-t="feat4Title">ස්වයංක්‍රීය Free Tips</h3>
      <p data-t="feat4Desc">EPL, UCL, NBA, ATP — දිනකට 3 වතාවක් automatic tips.</p>
    </div>
    <div class="card">
      <div class="card-icon">🌐</div>
      <h3 data-t="feat5Title">භාෂා 3කින්</h3>
      <p data-t="feat5Desc">Sinhala, English, Tamil — /language මගින් ඕනෑම වේලාවක වෙනස් කරන්න.</p>
    </div>
    <div class="card">
      <div class="card-icon">📜</div>
      <h3 data-t="feat6Title">Transaction History</h3>
      <p data-t="feat6Desc">සියලුම ගනුදෙනු /history මගින් ඕනෑම වේලාවක බලන්න.</p>
    </div>
    <div class="card">
      <div class="card-icon">🎫</div>
      <h3 data-t="feat7Title">Support Ticket</h3>
      <p data-t="feat7Desc">ගැටලුවක් තිබේ නම් /ticket මගින් කෙලින්ම admin ට යවන්න.</p>
    </div>
    <div class="card">
      <div class="card-icon">🛡️</div>
      <h3 data-t="feat8Title">උසස් ආරක්ෂාව</h3>
      <p data-t="feat8Desc">Duplicate protection, rate limits, audit trail සහ R2 receipt backup.</p>
    </div>
  </div>
</section>

<!-- PROMO CODE -->
<section class="section" id="promo">
  <h2 class="section-title" data-t="promoTitle">xBet Promo Code</h2>
  <p class="section-sub" data-t="promoSub">නව ගිණුම් සඳහා special bonus code</p>

  <div class="promo-box">
    <p data-t="promoText" style="margin:0 0 8px;color:var(--muted)">Copy කර xBet හි භාවිතා කරන්න</p>
    <button type="button" class="promo-code" id="promoCodeBtn" title="Click to copy">${code}</button>
    <div class="copy-hint" id="promoCopyHint" data-t="promoHint">Click to copy</div>
    <div style="margin-top:20px">
      <a href="${xbet}" class="btn btn-primary" target="_blank" rel="noopener" data-t="goXbet" ${xbet === "#" ? 'style="pointer-events:none;opacity:0.6"' : ""}>
        🎯 xBet වෙත යන්න
      </a>
    </div>
  </div>
</section>

<!-- RESPONSIBLE GAMING BANNER (P0 #3) -->
<section class="section" style="padding-top:0">
  <div class="responsible-gaming-box">
    <div class="responsible-icon">🔞</div>
    <div class="responsible-text">
      <h4 data-t="respTitle">වගකීමෙන් යුතුව ක්‍රීඩා කරන්න (Responsible Gaming Notice)</h4>
      <p data-t="respDesc">
        ඔට්ටු ඇල්ලීම (Betting) මූල්‍යමය අවදානම් සහ ඇබ්බැහිවීම් ඇති කළ හැක. වයස අවුරුදු 18ට අඩු පුද්ගලයින් සඳහා මෙම සේවාව භාවිතය දැඩිව තහනම් වේ. කිසිවිටෙකත් ඔබට දරාගත නොහැකි මුදල් ඔට්ටු සඳහා යොදවන්න එපා.
      </p>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="section" id="faq">
  <h2 class="section-title" data-t="faqTitle">නිතර අසන ප්‍රශ්න</h2>
  <p class="section-sub" data-t="faqSub">ඔබේ ප්‍රශ්නවලට ඉක්මන් පිළිතුරු</p>

  <div class="faq">
    <details class="faq-item">
      <summary data-t="faq1q">Deposit කරන්නේ කෙසේද?</summary>
      <p data-t="faq1a">Bot එක විවෘත කර /deposit භාවිතා කරන්න. Player ID ඇතුළත් කර, මුදල් ගෙවා receipt ඡායාරූපය upload කරන්න. Admin තහවුරු කළ පසු මුදල් ගිණුමට බැර වේ.</p>
    </details>
    <details class="faq-item">
      <summary data-t="faq2q">Withdraw කොපමණ කාලයක් ගතවේද?</summary>
      <p data-t="faq2a">සාමාන්‍යයෙන් මිනිත්තු 2–5ක් ඇතුළත. ඉහළ මුදල් හෝ verification අවශ්‍ය විට තවත් කාලයක් ගතවිය හැක.</p>
    </details>
    <details class="faq-item">
      <summary data-t="faq3q">Free Tips මොනවාද?</summary>
      <p data-t="faq3a">දිනකට 3 වතාවක් (08:00, 12:00, 18:00 SL time) EPL, UCL, NBA, ATP සඳහා automatic tips channel එකට publish වේ.</p>
    </details>
    <details class="faq-item">
      <summary data-t="faq4q">Referral bonus ලබාගන්නේ කෙසේද?</summary>
      <p data-t="faq4a">/referrals මගින් ඔබේ link එක ගෙන මිතුරන්ට යවන්න. ඔවුන් ලියාපදිංචි වී deposit කළ විට ඔබට rewards ලැබේ.</p>
    </details>
    <details class="faq-item">
      <summary data-t="faq5q">ගැටලුවක් තිබේ නම් කුමක් කළ යුතුද?</summary>
      <p data-t="faq5a">/ticket command එක භාවිතා කර support ticket එකක් විවෘත කරන්න. Admin කෙනෙක් ඉක්මනින් ප්‍රතිචාර දක්වයි.</p>
    </details>
    <details class="faq-item">
      <summary data-t="faq6q">භාෂාව වෙනස් කරන්නේ කෙසේද?</summary>
      <p data-t="faq6a">Bot එකේ /language command එක හෝ මෙම වෙබ් අඩවියේ ඉහළ ඇති සිං / EN / த buttons භාවිතා කරන්න.</p>
    </details>
  </div>
</section>

<!-- FINAL CTA -->
<section class="cta">
  <h2 data-t="ctaTitle">දැන්ම ආරම්භ කරන්න</h2>
  <p data-t="ctaSub">Telegram Bot එක විවෘත කර deposit, withdraw සහ free tips භුක්ති විඳින්න</p>
  <div class="hero-buttons">
    <a href="${bot}" class="btn btn-primary" target="_blank" rel="noopener" data-t="ctaBot">
      🚀 Bot එකට යන්න
    </a>
    <a href="${channel}" class="btn btn-secondary" target="_blank" rel="noopener" data-t="ctaChannel">
      📢 Tips Channel
    </a>
  </div>
</section>

</main>

<!-- FOOTER -->
<footer class="footer">
  <div class="footer-links">
    <a href="${bot}" target="_blank" rel="noopener">Telegram Bot</a>
    <a href="${channel}" target="_blank" rel="noopener">Tips Channel</a>
    <a href="#how-it-works">How It Works</a>
    <a href="#faq">FAQ</a>
    <a href="#security">Security</a>
  </div>
  <div>
    © ${new Date().getFullYear()} Fast xBet Cash · Built for Sri Lanka 🇱🇰
  </div>
  <p class="footer-disclaimer" data-t="disclaimer">
    මෙය නිල xBet වෙබ් අඩවියක් නොවේ. මෙය ස්වාධීන cash agent සහ free betting tips සේවාවකි.
    ඔට්ටු ඇල්ලීම අවදානම් සහිතයි. වයස 18+ පමණි. වගකීමෙන් යුතුව ක්‍රීඩා කරන්න.
  </p>
</footer>

<!-- MOBILE STICKY BOTTOM CTA BAR (P1 #5) -->
<div class="mobile-sticky-cta" id="mobileStickyCta">
  <a href="${botSticky}" class="sticky-btn-primary" target="_blank" rel="noopener">
    <span>⚡</span>
    <span data-t="stickyBot">Bot එක විවෘත කරන්න</span>
  </a>
  <a href="${channel}" class="sticky-btn-secondary" target="_blank" rel="noopener">
    <span>📢</span>
    <span data-t="stickyTips">Tips</span>
  </a>
</div>

<!-- CLIENT JAVASCRIPT (WITH NONCE SUPPORT) -->
<script${nonceAttr}>
(function () {
  "use strict";

  const minLimit = ${minTx};
  const maxLimit = ${maxTx};

  // ===== i18n Translations =====
  const translations = {
    si: {
      skip: "ප්‍රධාන අන්තර්ගතයට යන්න",
      offlineNotice: "⚠️ ඔබ දැනට Offline වේ. අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කරන්න.",
      howNav: "භාවිතා කරන්නේ කෙසේද",
      cmdNav: "Commands",
      calcNav: "Calculator",
      featuresNav: "විශේෂාංග",
      tipsNav: "Free Tips 🔥",
      secNav: "ආරක්ෂාව",
      faqNav: "FAQ",
      badge: "🇱🇰 24/7 Active Bot & Cash Agent · 🔞 18+ Only",
      hero: "ස්වයංක්‍රීය Free Betting Tips, වේගවත් Deposit & Withdraw, Referral System — සියල්ල Telegram හරහා, ඔබේ දුරකථනයෙන්.",
      start: "🚀 Bot එක පටන් ගන්න",
      channel: "📢 Tips Channel",
      seeCmds: "📋 Commands බලන්න",
      statusText: "System Status: Online",
      statusSub: "Telegram Bot & Processing Active · Edge: ${colo}",
      nextTipsLabel: "ඊළඟ Tips:",
      trustSpeedTitle: "වේගවත් සැකසුම් කාලය",
      trustSpeedSub: "Instant Player Account Credit",
      trustUsersTitle: "ක්‍රියාකාරී සාමාජිකයින්",
      trustUsersSub: "Sri Lanka Telegram Community",
      trustSuccessTitle: "සාර්ථකත්ව අනුපාතය",
      trustSuccessSub: "Automated Fraud Verification",
      trustFeeTitle: "අමතර ගාස්තු නැත",
      trustFeeSub: "Zero Hidden Deductions",
      supportedPay: "පිළිගත් ආරක්ෂිත ගෙවීම් ක්‍රම (Supported Payment Rails)",
      tipsPreviewTitle: "🔥 අද දවසේ විශේෂ Free Betting Tips",
      tipsPreviewSub: "අපගේ AI සහ ක්‍රීඩා විශ්ලේෂණ පද්ධතිය මගින් දිනකට 3 වතාවක් (08:00, 12:00, 18:00 SL Time) නිකුත් කෙරෙන නොමිලේ Tips preview එකක්.",
      joinChannelCta: "📢 සියලුම Betting Slips Telegram Channel එකෙන් නොමිලේ ගන්න",
      howTitle: "භාවිතා කරන්නේ කෙසේද?",
      howSub: "මිනිත්තු කිහිපයකින් ඉතා පහසුවෙන් ගනුදෙනු සිදුකරන්න",
      tabDep: "💰 Deposit පියවර",
      tabWd: "💸 Withdraw පියවර",
      step1dTitle: "Bot එක ආරම්භ කරන්න",
      step1dDesc: "Telegram Bot වෙත ගොස් /deposit command එක ලබාදී ඔබේ Player ID ඇතුළත් කරන්න.",
      step2dTitle: "මුදල් ගෙවා Receipt එක එවන්න",
      step2dDesc: "eZ Cash, mCash හෝ Bank Transfer මගින් ගෙවා රිසිට්පතේ ඡායාරූපය bot වෙත upload කරන්න.",
      step3dTitle: "මිනිත්තු 5න් ගිණුමට",
      step3dDesc: "Admin විසින් තහවුරු කළ වහාම ඔබේ xBet ගිණුමට මුදල් ක්ෂණිකව බැර වේ.",
      step1wTitle: "/withdraw ආරම්භ කරන්න",
      step1wDesc: "Bot එකේ /withdraw command එක භාවිතා කර Player ID සහ මුදල් ප්‍රමාණය ඇතුළත් කරන්න.",
      step2wTitle: "ගෙවීම් විස්තර ලබාදෙන්න",
      step2wDesc: "ඔබේ Bank / eZ Cash / mCash විස්තර ලබාදෙන්න. Admin විසින් සත්‍යාපනය කරයි.",
      step3wTitle: "මුදල් ලැබේ",
      step3wDesc: "තහවුරු වූ පසු ඉක්මනින් ඔබේ ගිණුමට මුදල් මාරු වේ. History එකෙන් තත්වය බලන්න.",
      cmdTitle: "Bot Commands — සියලුම පහසුකම්",
      cmdSub: "Telegram Bot එකේ භාවිතා කළ හැකි සියලුම commands",
      cmdStart: "Bot එක ආරම්භ කර මුල් මෙනුව බලන්න",
      cmdMenu: "ප්‍රධාන මෙනුව විවෘත කරන්න",
      cmdDep: "Deposit ආරම්භ කරන්න (receipt upload)",
      cmdWd: "Withdrawal request එකක් යවන්න",
      cmdReg: "Player ID ලියාපදිංචි කරන්න",
      cmdRef: "ඔබේ Referral dashboard බලන්න",
      cmdHist: "ගනුදෙනු ඉතිහාසය බලන්න",
      cmdDash: "Account overview බලන්න",
      cmdTicket: "Support ticket එකක් විවෘත කරන්න",
      cmdLang: "භාෂාව වෙනස් කරන්න (සිං / EN / த)",
      cmdSafe: "ආරක්ෂාව හා responsible gaming tips",
      cmdHelp: "උදව් හා උපදෙස් ලබාගන්න",
      openBot: "🚀 Telegram Bot විවෘත කරන්න",
      calcTitle: "ගනුදෙනු Calculator",
      calcSub: "Deposit හෝ Withdraw මුදල් ඉක්මනින් ගණනය කරන්න",
      calcDep: "💰 Deposit",
      calcWd: "💸 Withdraw",
      calcAmount: "මුදල් ප්‍රමාණය (LKR)",
      calcLimitWarn: "⚠️ අවම ගනුදෙනුව රු. " + minLimit + " සහ උපරිම ගනුදෙනුව රු. " + maxLimit + " වේ.",
      calcYouSend: "ඔබ යවන මුදල්",
      calcFee: "සේවා ගාස්තු",
      calcReceive: "ගිණුමට ලැබෙන මුදල්",
      proceedBot: "🚀 Bot එකෙන් ගනුදෙනුව කරන්න",
      featTitle: "ප්‍රධාන විශේෂාංග",
      featSub: "ඔබට අවශ්‍ය සියලුම පහසුකම් එක තැනක",
      feat1Title: "වේගවත් Deposit",
      feat1Desc: "Receipt upload කර මිනිත්තු කිහිපයකින් xBet ගිණුමට මුදල් බැර වේ.",
      feat2Title: "පහසු Withdraw",
      feat2Desc: "Bank / eZ Cash / mCash වෙත ඉක්මනින් මුදල් ආපසු ගන්න.",
      feat3Title: "Referral System",
      feat3Desc: "මිතුරන්ට ආරාධනා කර bonus ලබාගන්න. /referrals මගින් dashboard බලන්න.",
      feat4Title: "ස්වයංක්‍රීය Free Tips",
      feat4Desc: "EPL, UCL, NBA, ATP — දිනකට 3 වතාවක් automatic tips.",
      feat5Title: "භාෂා 3කින්",
      feat5Desc: "Sinhala, English, Tamil — /language මගින් ඕනෑම වේලාවක වෙනස් කරන්න.",
      feat6Title: "Transaction History",
      feat6Desc: "සියලුම ගනුදෙනු /history මගින් ඕනෑම වේලාවක බලන්න.",
      feat7Title: "Support Ticket",
      feat7Desc: "ගැටලුවක් තිබේ නම් /ticket මගින් කෙලින්ම admin ට යවන්න.",
      feat8Title: "උසස් ආරක්ෂාව",
      feat8Desc: "Duplicate protection, rate limits, audit trail සහ R2 receipt backup.",
      promoTitle: "xBet Promo Code",
      promoSub: "නව ගිණුම් සඳහා special bonus code",
      promoText: "Copy කර xBet හි භාවිතා කරන්න",
      promoHint: "Click to copy",
      goXbet: "🎯 xBet වෙත යන්න",
      respTitle: "වගකීමෙන් යුතුව ක්‍රීඩා කරන්න (Responsible Gaming Notice)",
      respDesc: "ඔට්ටු ඇල්ලීම (Betting) මූල්‍යමය අවදානම් සහ ඇබ්බැහිවීම් ඇති කළ හැක. වයස අවුරුදු 18ට අඩු පුද්ගලයින් සඳහා මෙම සේවාව භාවිතය දැඩිව තහනම් වේ. කිසිවිටෙකත් ඔබට දරාගත නොහැකි මුදල් ඔට්ටු සඳහා යොදවන්න එපා.",
      faqTitle: "නිතර අසන ප්‍රශ්න",
      faqSub: "ඔබේ ප්‍රශ්නවලට ඉක්මන් පිළිතුරු",
      faq1q: "Deposit කරන්නේ කෙසේද?",
      faq1a: "Bot එක විවෘත කර /deposit භාවිතා කරන්න. Player ID ඇතුළත් කර, මුදල් ගෙවා receipt ඡායාරූපය upload කරන්න. Admin තහවුරු කළ පසු මුදල් ගිණුමට බැර වේ.",
      faq2q: "Withdraw කොපමණ කාලයක් ගතවේද?",
      faq2a: "සාමාන්‍යයෙන් මිනිත්තු 2–5ක් ඇතුළත. ඉහළ මුදල් හෝ verification අවශ්‍ය විට තවත් කාලයක් ගතවිය හැක.",
      faq3q: "Free Tips මොනවාද?",
      faq3a: "දිනකට 3 වතාවක් (08:00, 12:00, 18:00 SL time) EPL, UCL, NBA, ATP සඳහා automatic tips channel එකට publish වේ.",
      faq4q: "Referral bonus ලබාගන්නේ කෙසේද?",
      faq4a: "/referrals මගින් ඔබේ link එක ගෙන මිතුරන්ට යවන්න. ඔවුන් ලියාපදිංචි වී deposit කළ විට ඔබට rewards ලැබේ.",
      faq5q: "ගැටලුවක් තිබේ නම් කුමක් කළ යුතුද?",
      faq5a: "/ticket command එක භාවිතා කර support ticket එකක් විවෘත කරන්න. Admin කෙනෙක් ඉක්මනින් ප්‍රතිචාර දක්වයි.",
      faq6q: "භාෂාව වෙනස් කරන්නේ කෙසේද?",
      faq6a: "Bot එකේ /language command එක හෝ මෙම වෙබ් අඩවියේ ඉහළ ඇති සිං / EN / த buttons භාවිතා කරන්න.",
      ctaTitle: "දැන්ම ආරම්භ කරන්න",
      ctaSub: "Telegram Bot එක විවෘත කර deposit, withdraw සහ free tips භුක්ති විඳින්න",
      ctaBot: "🚀 Bot එකට යන්න",
      ctaChannel: "📢 Tips Channel",
      disclaimer: "මෙය නිල xBet වෙබ් අඩවියක් නොවේ. මෙය ස්වාධීන cash agent සහ free betting tips සේවාවකි. ඔට්ටු ඇල්ලීම අවදානම් සහිතයි. වයස 18+ පමණි. වගකීමෙන් යුතුව ක්‍රීඩා කරන්න.",
      stickyBot: "Bot එක විවෘත කරන්න",
      stickyTips: "Tips"
    },
    en: {
      skip: "Skip to main content",
      offlineNotice: "⚠️ You are currently offline. Please check your internet connection.",
      howNav: "How it works",
      cmdNav: "Commands",
      calcNav: "Calculator",
      featuresNav: "Features",
      tipsNav: "Free Tips 🔥",
      secNav: "Security",
      faqNav: "FAQ",
      badge: "🇱🇰 24/7 Active Bot & Cash Agent · 🔞 18+ Only",
      hero: "Automated Free Betting Tips, fast Deposit & Withdraw, Referral System — everything via Telegram on your phone.",
      start: "🚀 Start the Bot",
      channel: "📢 Tips Channel",
      seeCmds: "📋 View Commands",
      statusText: "System Status: Online",
      statusSub: "Telegram Bot & Processing Active · Edge: ${colo}",
      nextTipsLabel: "Next Tips:",
      trustSpeedTitle: "Fast Processing",
      trustSpeedSub: "Instant Player Account Credit",
      trustUsersTitle: "Active Community",
      trustUsersSub: "Sri Lanka Telegram Community",
      trustSuccessTitle: "Success Rate",
      trustSuccessSub: "Automated Fraud Verification",
      trustFeeTitle: "Zero Extra Fees",
      trustFeeSub: "Zero Hidden Deductions",
      supportedPay: "Supported Payment Rails",
      tipsPreviewTitle: "🔥 Today's Featured Free Betting Tips",
      tipsPreviewSub: "AI & sports analyst generated tips published 3 times daily (08:00, 12:00, 18:00 Sri Lanka Time).",
      joinChannelCta: "📢 Get Full Free Betting Slips on Telegram Channel",
      howTitle: "How It Works",
      howSub: "Complete transactions easily within minutes",
      tabDep: "💰 Deposit Steps",
      tabWd: "💸 Withdraw Steps",
      step1dTitle: "Start the Bot",
      step1dDesc: "Go to the Telegram Bot, send /deposit and enter your Player ID.",
      step2dTitle: "Pay & Send Receipt",
      step2dDesc: "Pay via eZ Cash, mCash or Bank Transfer and upload the receipt photo to the bot.",
      step3dTitle: "Credited in Minutes",
      step3dDesc: "Once verified by admin, funds are credited to your xBet account instantly.",
      step1wTitle: "Request /withdraw",
      step1wDesc: "Send /withdraw in the bot and provide your Player ID and desired amount.",
      step2wTitle: "Provide Payout Info",
      step2wDesc: "Enter your Bank or eZ Cash / mCash details for admin verification.",
      step3wTitle: "Receive Funds",
      step3wDesc: "Funds are transferred quickly upon confirmation. Check status via /history.",
      cmdTitle: "Bot Commands — All Features",
      cmdSub: "All available commands in the Telegram bot",
      cmdStart: "Start bot and open main menu",
      cmdMenu: "Open main navigation menu",
      cmdDep: "Start deposit (receipt upload)",
      cmdWd: "Request withdrawal",
      cmdReg: "Register Player ID",
      cmdRef: "View referral dashboard",
      cmdHist: "View transaction history",
      cmdDash: "View account overview",
      cmdTicket: "Open support ticket",
      cmdLang: "Switch language (සිං / EN / த)",
      cmdSafe: "Security & responsible gaming tips",
      cmdHelp: "Get help and guidance",
      openBot: "🚀 Open Telegram Bot",
      calcTitle: "Transaction Calculator",
      calcSub: "Quickly calculate deposit or withdrawal amounts",
      calcDep: "💰 Deposit",
      calcWd: "💸 Withdraw",
      calcAmount: "Amount (LKR)",
      calcLimitWarn: "⚠️ Minimum transaction is LKR " + minLimit + " and maximum is LKR " + maxLimit + ".",
      calcYouSend: "You Send",
      calcFee: "Service Fee",
      calcReceive: "Amount Received",
      proceedBot: "🚀 Proceed in Telegram Bot",
      featTitle: "Key Features",
      featSub: "Everything you need in one place",
      feat1Title: "Fast Deposit",
      feat1Desc: "Upload receipt and get funds credited to your xBet account in minutes.",
      feat2Title: "Easy Withdraw",
      feat2Desc: "Withdraw quickly to Bank / eZ Cash / mCash.",
      feat3Title: "Referral System",
      feat3Desc: "Invite friends and earn rewards. Check dashboard with /referrals.",
      feat4Title: "Automated Free Tips",
      feat4Desc: "EPL, UCL, NBA, ATP — 3 times daily automatic tips.",
      feat5Title: "3 Languages",
      feat5Desc: "Sinhala, English, Tamil — switch anytime with /language.",
      feat6Title: "Transaction History",
      feat6Desc: "View all transactions anytime with /history.",
      feat7Title: "Support Ticket",
      feat7Desc: "Open a ticket with /ticket and reach an admin directly.",
      feat8Title: "Advanced Security",
      feat8Desc: "Duplicate protection, rate limits, audit trail and R2 receipt backup.",
      promoTitle: "xBet Promo Code",
      promoSub: "Special bonus code for new accounts",
      promoText: "Copy and use on xBet",
      promoHint: "Click to copy",
      goXbet: "🎯 Go to xBet",
      respTitle: "Responsible Gaming Notice (18+ Only)",
      respDesc: "Betting involves financial risk and can be addictive. This service is strictly restricted to individuals aged 18 and older. Never bet money you cannot afford to lose.",
      faqTitle: "Frequently Asked Questions",
      faqSub: "Quick answers to common questions",
      faq1q: "How do I deposit?",
      faq1a: "Open the bot and use /deposit. Enter your Player ID, pay, and upload the receipt photo. Funds are credited after admin confirmation.",
      faq2q: "How long does a withdrawal take?",
      faq2a: "Usually 2–5 minutes. Larger amounts or extra verification may take longer.",
      faq3q: "What are Free Tips?",
      faq3a: "3 times daily (08:00, 12:00, 18:00 SL time) automatic tips for EPL, UCL, NBA and ATP are published to the channel.",
      faq4q: "How do I get referral bonus?",
      faq4a: "Get your link with /referrals and share it. When friends register and deposit you earn rewards.",
      faq5q: "What if I have a problem?",
      faq5a: "Use the /ticket command to open a support ticket. An admin will respond quickly.",
      faq6q: "How do I change language?",
      faq6a: "Use /language in the bot or the සිං / EN / த buttons at the top of this page.",
      ctaTitle: "Get started now",
      ctaSub: "Open the Telegram Bot for deposits, withdrawals and free tips",
      ctaBot: "🚀 Go to Bot",
      ctaChannel: "📢 Tips Channel",
      disclaimer: "This is not an official xBet website. This is an independent cash agent and free betting tips service. Betting involves risk. 18+ only. Play responsibly.",
      stickyBot: "Open Telegram Bot",
      stickyTips: "Tips"
    },
    ta: {
      skip: "முக்கிய உள்ளடக்கத்திற்கு செல்லவும்",
      offlineNotice: "⚠️ நீங்கள் தற்போது Offline இல் உள்ளீர்கள். இணைய இணைப்பை சரிபார்க்கவும்.",
      howNav: "எப்படி பயன்படுத்துவது",
      cmdNav: "Commands",
      calcNav: "Calculator",
      featuresNav: "அம்சங்கள்",
      tipsNav: "Free Tips 🔥",
      secNav: "பாதுகாப்பு",
      faqNav: "FAQ",
      badge: "🇱🇰 24/7 Active Bot & Cash Agent · 🔞 18+ Only",
      hero: "தானியங்கி Free Betting Tips, விரைவான Deposit & Withdraw, Referral System — அனைத்தும் Telegram மூலம் உங்கள் தொலைபேசியில்.",
      start: "🚀 Bot ஐ தொடங்கவும்",
      channel: "📢 Tips Channel",
      seeCmds: "📋 Commands பார்க்க",
      statusText: "System Status: Online",
      statusSub: "Telegram Bot & Processing Active · Edge: ${colo}",
      nextTipsLabel: "அடுத்த Tips:",
      trustSpeedTitle: "விரைவான நேரம்",
      trustSpeedSub: "Instant Player Account Credit",
      trustUsersTitle: "செயலில் உள்ள பயனர்கள்",
      trustUsersSub: "Sri Lanka Telegram Community",
      trustSuccessTitle: "வெற்றி விகிதம்",
      trustSuccessSub: "Automated Fraud Verification",
      trustFeeTitle: "கூடுதல் கட்டணம் இல்லை",
      trustFeeSub: "Zero Hidden Deductions",
      supportedPay: "ஆதரிக்கப்படும் பணம் செலுத்தும் முறைகள்",
      tipsPreviewTitle: "🔥 இன்றைய சிறப்பு Free Betting Tips",
      tipsPreviewSub: "எங்கள் AI மற்றும் விளையாட்டு ஆய்வாளர் அமைப்பு மூலம் நாளொன்றுக்கு 3 முறை (08:00, 12:00, 18:00 SL Time) வெளியிடப்படும் Tips.",
      joinChannelCta: "📢 முழுமையான Betting Slips ஐ Telegram Channel இல் இலவசமாக பெறவும்",
      howTitle: "எப்படி வேலை செய்கிறது?",
      howSub: "சில நிமிடங்களில் பரிவர்த்தனைகளை முடிக்கவும்",
      tabDep: "💰 Deposit படிகள்",
      tabWd: "💸 Withdraw படிகள்",
      step1dTitle: "Bot ஐ தொடங்கவும்",
      step1dDesc: "Telegram Bot க்கு சென்று /deposit command கொடுத்து உங்கள் Player ID ஐ உள்ளிடவும்.",
      step2dTitle: "பணம் செலுத்தி Receipt அனுப்பவும்",
      step2dDesc: "eZ Cash, mCash அல்லது Bank Transfer மூலம் செலுத்தி receipt புகைப்படத்தை bot க்கு upload செய்யவும்.",
      step3dTitle: "நிமிடங்களில் கணக்கில்",
      step3dDesc: "Admin உறுதிப்படுத்திய உடன் உங்கள் xBet கணக்கில் பணம் உடனடியாக வரவு வைக்கப்படும்.",
      step1wTitle: "/withdraw தொடங்கவும்",
      step1wDesc: "Bot இல் /withdraw command பயன்படுத்தி Player ID மற்றும் தொகையை உள்ளிடவும்.",
      step2wTitle: "பணம் விவரங்களை கொடுக்கவும்",
      step2wDesc: "உங்கள் Bank / eZ Cash / mCash விவரங்களை கொடுக்கவும். Admin சரிபார்ப்பார்.",
      step3wTitle: "பணம் கிடைக்கும்",
      step3wDesc: "உறுதிப்படுத்திய பிறகு விரைவாக உங்கள் கணக்கிற்கு பணம் மாற்றப்படும். History இல் நிலையை பார்க்கவும்.",
      cmdTitle: "Bot Commands — அனைத்து வசதிகளும்",
      cmdSub: "Telegram Bot இல் கிடைக்கும் அனைத்து commands",
      cmdStart: "Bot ஐ தொடங்கி முக்கிய மெனுவை பார்க்கவும்",
      cmdMenu: "முக்கிய மெனுவை திறக்கவும்",
      cmdDep: "Deposit தொடங்கவும் (receipt upload)",
      cmdWd: "Withdrawal கோரிக்கை அனுப்பவும்",
      cmdReg: "Player ID பதிவு செய்யவும்",
      cmdRef: "உங்கள் Referral dashboard பார்க்கவும்",
      cmdHist: "பரிவர்த்தனை வரலாற்றை பார்க்கவும்",
      cmdDash: "கணக்கு கண்ணோட்டம் பார்க்கவும்",
      cmdTicket: "Support ticket திறக்கவும்",
      cmdLang: "மொழியை மாற்றவும் (සිං / EN / த)",
      cmdSafe: "பாதுகாப்பு & பொறுப்பான விளையாட்டு",
      cmdHelp: "உதவி மற்றும் வழிமுறைகளை பெறவும்",
      openBot: "🚀 Telegram Bot திறக்கவும்",
      calcTitle: "பரிவர்த்தனை Calculator",
      calcSub: "Deposit அல்லது Withdraw தொகையை விரைவாக கணக்கிடவும்",
      calcDep: "💰 Deposit",
      calcWd: "💸 Withdraw",
      calcAmount: "தொகை (LKR)",
      calcLimitWarn: "⚠️ குறைந்தபட்ச பரிவர்த்தனை LKR " + minLimit + " மற்றும் அதிகபட்சம் LKR " + maxLimit + " ஆகும்.",
      calcYouSend: "நீங்கள் அனுப்புவது",
      calcFee: "சேவை கட்டணம்",
      calcReceive: "நீங்கள் பெறுவது",
      proceedBot: "🚀 Telegram Bot இல் தொடரவும்",
      featTitle: "முக்கிய அம்சங்கள்",
      featSub: "உங்களுக்கு தேவையான அனைத்தும் ஒரே இடத்தில்",
      feat1Title: "விரைவான Deposit",
      feat1Desc: "Receipt upload செய்து நிமிடங்களில் xBet கணக்கில் பணம் வரவு.",
      feat2Title: "எளிய Withdraw",
      feat2Desc: "Bank / eZ Cash / mCash க்கு விரைவாக பணம் திரும்பப் பெறவும்.",
      feat3Title: "Referral System",
      feat3Desc: "நண்பர்களை அழைத்து bonus பெறவும். /referrals மூலம் dashboard பார்க்கவும்.",
      feat4Title: "தானியங்கி Free Tips",
      feat4Desc: "EPL, UCL, NBA, ATP — நாளொன்றுக்கு 3 முறை automatic tips.",
      feat5Title: "3 மொழிகள்",
      feat5Desc: "Sinhala, English, Tamil — /language மூலம் எப்போதும் மாற்றலாம்.",
      feat6Title: "Transaction History",
      feat6Desc: "அனைத்து பரிவர்த்தனைகளையும் /history மூலம் பார்க்கவும்.",
      feat7Title: "Support Ticket",
      feat7Desc: "/ticket மூலம் admin ஐ நேரடியாக தொடர்பு கொள்ளவும்.",
      feat8Title: "மேம்பட்ட பாதுகாப்பு",
      feat8Desc: "Duplicate protection, rate limits, audit trail மற்றும் R2 receipt backup.",
      promoTitle: "xBet Promo Code",
      promoSub: "புதிய கணக்குகளுக்கான சிறப்பு bonus code",
      promoText: "நகலெடுத்து xBet இல் பயன்படுத்தவும்",
      promoHint: "நகலெடுக்க கிளிக் செய்யவும்",
      goXbet: "🎯 xBet க்கு செல்லவும்",
      respTitle: "பொறுப்பான விளையாட்டு அறிவிப்பு (18+ மட்டும்)",
      respDesc: "பந்தயம் கட்டுதல் நிதி ஆபத்து மற்றும் பழக்கத்தை ஏற்படுத்தலாம். இந்த சேவை 18 வயது அல்லது அதற்கு மேற்பட்டவர்களுக்கு மட்டுமே. நீங்கள் இழக்க முடியாத பணத்தை பந்தயம் கட்ட வேண்டாம்.",
      faqTitle: "அடிக்கடி கேட்கப்படும் கேள்விகள்",
      faqSub: "பொதுவான கேள்விகளுக்கான விரைவான பதில்கள்",
      faq1q: "Deposit செய்வது எப்படி?",
      faq1a: "Bot ஐ திறந்து /deposit command கொடுக்கவும். Player ID உள்ளிட்டு, பணம் செலுத்தி receipt புகைப்படத்தை upload செய்யவும்.",
      faq2q: "Withdrawal எவ்வளவு நேரம் எடுக்கும்?",
      faq2a: "பொதுவாக 2–5 நிமிடங்கள். அதிக தொகை அல்லது கூடுதல் சரிபார்ப்புக்கு சிறிது நேரம் ஆகலாம்.",
      faq3q: "Free Tips என்றால் என்ன?",
      faq3a: "நாளொன்றுக்கு 3 முறை (08:00, 12:00, 18:00 SL நேரம்) EPL, UCL, NBA, ATP தானியங்கி tips channel இல் வெளியாகும்.",
      faq4q: "Referral bonus பெறுவது எப்படி?",
      faq4a: "/referrals மூலம் உங்கள் link ஐ பெற்று நண்பர்களுக்கு அனுப்பவும். அவர்கள் பதிவு செய்து deposit செய்யும்போது உங்களுக்கு பரிசு கிடைக்கும்.",
      faq5q: "பிரச்சனை ஏற்பட்டால் என்ன செய்வது?",
      faq5a: "/ticket command பயன்படுத்தி support ticket திறக்கவும். Admin விரைவாக பதிலளிப்பார்.",
      faq6q: "மொழியை மாற்றுவது எப்படி?",
      faq6a: "Bot இல் /language அல்லது இந்த தளத்தின் மேலே உள்ள සිං / EN / த பொத்தான்களைப் பயன்படுத்தவும்.",
      ctaTitle: "இப்போதே தொடங்குங்கள்",
      ctaSub: "Deposit, withdraw மற்றும் free tips பெற Telegram Bot ஐ திறக்கவும்",
      ctaBot: "🚀 Bot க்கு செல்லவும்",
      ctaChannel: "📢 Tips Channel",
      disclaimer: "இது உத்தியோகபூர்வ xBet தளம் அல்ல. இது ஒரு சுயாதீன cash agent மற்றும் free tips சேவையாகும். பந்தயம் கட்டுவதில் ஆபத்து உள்ளது. 18+ மட்டும். பொறுப்புடன் விளையாடுங்கள்.",
      stickyBot: "Telegram Bot ஐ திறக்கவும்",
      stickyTips: "Tips"
    }
  };

  let currentLang = "${initialLang}";

  function applyLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    document.documentElement.lang = lang;

    const dict = translations[lang];
    document.querySelectorAll("[data-t]").forEach(function (el) {
      const key = el.getAttribute("data-t");
      if (key && dict[key]) {
        el.textContent = dict[key];
      }
    });

    document.querySelectorAll(".langs button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === lang);
    });

    // Update URL query parameter seamlessly
    if (window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState(null, "", url.toString());
    }
  }

  document.querySelectorAll(".langs button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const lang = btn.getAttribute("data-lang");
      if (lang) applyLanguage(lang);
    });
  });

  // Apply initial language
  if (currentLang !== "si") {
    applyLanguage(currentLang);
  }

  // ===== Offline / Online Detection (P1 #9) =====
  const offlineBanner = document.getElementById("offlineBanner");
  function updateOnlineStatus() {
    if (offlineBanner) {
      offlineBanner.style.display = navigator.onLine ? "none" : "block";
    }
  }
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();

  // ===== Step Tabs =====
  const tabDepBtn = document.getElementById("tabDepBtn");
  const tabWdBtn = document.getElementById("tabWdBtn");
  const depSteps = document.getElementById("depSteps");
  const wdSteps = document.getElementById("wdSteps");

  if (tabDepBtn && tabWdBtn && depSteps && wdSteps) {
    tabDepBtn.addEventListener("click", function () {
      tabDepBtn.classList.add("active");
      tabWdBtn.classList.remove("active");
      depSteps.style.display = "grid";
      wdSteps.style.display = "none";
    });
    tabWdBtn.addEventListener("click", function () {
      tabWdBtn.classList.add("active");
      tabDepBtn.classList.remove("active");
      wdSteps.style.display = "grid";
      depSteps.style.display = "none";
    });
  }

  // ===== Calculator =====
  let calcMode = "deposit";
  const amountInput = document.getElementById("amountInput");
  const calcSend = document.getElementById("calcSend");
  const calcFee = document.getElementById("calcFee");
  const calcReceive = document.getElementById("calcReceive");
  const calcWarning = document.getElementById("calcWarning");
  const calcDepBtn = document.getElementById("calcDepBtn");
  const calcWdBtn = document.getElementById("calcWdBtn");

  function formatLKR(num) {
    return "රු. " + Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function updateCalc() {
    if (!amountInput || !calcSend || !calcFee || !calcReceive) return;
    let val = parseFloat(amountInput.value) || 0;

    if (val < minLimit || val > maxLimit) {
      if (calcWarning) calcWarning.style.display = "block";
    } else {
      if (calcWarning) calcWarning.style.display = "none";
    }

    const fee = 0;
    const receive = Math.max(0, val - fee);

    calcSend.textContent = formatLKR(val);
    calcFee.textContent = formatLKR(fee) + " (Free)";
    calcReceive.textContent = formatLKR(receive);
  }

  if (amountInput) {
    amountInput.addEventListener("input", updateCalc);
    amountInput.addEventListener("change", updateCalc);
  }

  document.querySelectorAll(".calc-preset").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (amountInput) {
        amountInput.value = btn.getAttribute("data-amount") || "5000";
        updateCalc();
      }
    });
  });

  if (calcDepBtn && calcWdBtn) {
    calcDepBtn.addEventListener("click", function () {
      calcMode = "deposit";
      calcDepBtn.classList.add("active");
      calcWdBtn.classList.remove("active");
      updateCalc();
    });
    calcWdBtn.addEventListener("click", function () {
      calcMode = "withdraw";
      calcWdBtn.classList.add("active");
      calcDepBtn.classList.remove("active");
      updateCalc();
    });
  }

  updateCalc();

  // ===== Promo Copy =====
  const promoBtn = document.getElementById("promoCodeBtn");
  const promoHint = document.getElementById("promoCopyHint");
  if (promoBtn) {
    promoBtn.addEventListener("click", async function () {
      const text = (promoBtn.textContent || "").trim();
      try {
        await navigator.clipboard.writeText(text);
        if (promoHint) {
          promoHint.textContent = currentLang === "en" ? "Copied!" : currentLang === "ta" ? "நகலெடுக்கப்பட்டது!" : "Copy වුණා!";
          setTimeout(function () {
            promoHint.textContent = translations[currentLang]?.promoHint || "Click to copy";
          }, 1800);
        }
      } catch (_) {
        const range = document.createRange();
        range.selectNode(promoBtn);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    });
  }

  // ===== Next Tips Countdown (SL Time: 08:00, 12:00, 18:00) =====
  const countdownEl = document.getElementById("nextTipCountdown");
  const tipHours = [8, 12, 18]; // Asia/Colombo

  function getNextTip() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Colombo",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const get = (type) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
    const h = get("hour");
    const min = get("minute");
    const s = get("second");

    const currentSec = h * 3600 + min * 60 + s;

    let nextSec = null;
    for (const th of tipHours) {
      const target = th * 3600;
      if (target > currentSec) {
        nextSec = target;
        break;
      }
    }
    if (nextSec === null) {
      nextSec = tipHours[0] * 3600 + 24 * 3600;
    }

    const diff = nextSec - currentSec;
    const hh = Math.floor(diff / 3600);
    const mm = Math.floor((diff % 3600) / 60);
    const ss = diff % 60;
    return (
      String(hh).padStart(2, "0") +
      ":" +
      String(mm).padStart(2, "0") +
      ":" +
      String(ss).padStart(2, "0")
    );
  }

  function tickCountdown() {
    if (countdownEl) {
      countdownEl.textContent = getNextTip();
    }
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);
})();
</script>
</body>
</html>`;
}
