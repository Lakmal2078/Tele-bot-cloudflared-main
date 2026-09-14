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

export function renderLandingPage(env: Env, request: Request): string {
  const channelUrl =
    env.CHANNEL_URL?.trim() || "https://t.me/fast_xbet_official_tips";
  const channelUsername =
    env.CHANNEL_USERNAME?.trim() || "@fast_xbet_official_tips";
  const xbetLink = env.XBET_LINK?.trim() || "#";
  const promo = env.XBET_PROMO_CODE?.trim() || "VGSL";
  const minTx = parseInt(env.MIN_TRANSACTION_LKR || "1000", 10) || 1000;
  const maxTx = parseInt(env.MAX_TRANSACTION_LKR || "500000", 10) || 500000;

  const colo = escapeText(
    String(
      (request as Request & { cf?: { colo?: string } }).cf?.colo || "EDGE"
    )
  );

  const bot = escapeAttribute(BOT_URL);
  const channel = escapeAttribute(channelUrl);
  const xbet = escapeAttribute(xbetLink);
  const channelName = escapeText(channelUsername);
  const code = escapeText(promo);
  const minAmount = escapeText(String(minTx));
  const maxAmount = escapeText(String(maxTx));

  let pageUrl = "https://fast-xbet-cash.example/";
  try {
    const u = new URL(request.url);
    pageUrl = `${u.origin}/`;
  } catch {
    /* keep fallback */
  }
  const pageUrlAttr = escapeAttribute(pageUrl);

  const jsonLd = escapeJsonForScript(
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Fast xBet Cash",
      url: pageUrl,
      sameAs: [channelUrl, BOT_URL],
      description:
        "Sri Lanka Telegram service for free betting tips and a fast cash deposit/withdraw agent. Multi-language support (Sinhala, English, Tamil).",
      areaServed: "LK",
      availableLanguage: ["si", "en", "ta"],
    })
  );

  return `<!doctype html>
<html lang="si">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Fast xBet Cash 🇱🇰 — Free Betting Tips & Cash Agent</title>
<meta name="description" content="ශ්‍රී ලංකාවේ වේගවත් Free Betting Tips & Cash Agent සේවාව. Telegram හරහා deposit, withdraw, referral සහ ස්වයංක්‍රීය betting tips ලබාගන්න. Sinhala / English / Tamil.">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#0a0e17">
<meta name="color-scheme" content="dark">
<link rel="canonical" href="${pageUrlAttr}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E">

<meta property="og:type" content="website">
<meta property="og:title" content="Fast xBet Cash 🇱🇰 — Free Betting Tips & Cash Agent">
<meta property="og:description" content="ස්වයංක්‍රීය Free Betting Tips, වේගවත් Deposit & Withdraw සේවාව — සියල්ල Telegram හරහා.">
<meta property="og:url" content="${pageUrlAttr}">
<meta property="og:locale" content="si_LK">
<meta property="og:locale:alternate" content="en_US">
<meta property="og:locale:alternate" content="ta_LK">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Fast xBet Cash 🇱🇰">
<meta name="twitter:description" content="ස්වයංක්‍රීය Free Betting Tips, වේගවත් Deposit & Withdraw — Telegram හරහා.">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">

<script type="application/ld+json">${jsonLd}</script>

<style>
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

/* ===== HERO ===== */
.hero {
  text-align: center;
  padding: 64px 20px 40px;
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
  max-width: 580px;
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

/* ===== STATS ===== */
.stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  padding: 8px 20px 44px;
  flex-wrap: wrap;
}

.stat { text-align: center; }
.stat-num {
  font-size: 2rem;
  font-weight: 800;
  color: var(--accent);
  line-height: 1.2;
}
.stat-label {
  color: var(--muted);
  font-size: 0.84rem;
  font-weight: 600;
}

/* ===== SECTIONS ===== */
.section {
  padding: 52px 20px;
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
  margin: 0 auto 36px;
  max-width: 560px;
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
  padding: 26px 22px;
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

.calc-input-group { margin-bottom: 18px; }
.calc-label {
  display: block;
  color: var(--muted);
  font-size: 0.86rem;
  margin-bottom: 8px;
  font-weight: 600;
}

.calc-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 13px 16px;
  font-size: 1.2rem;
  font-weight: 700;
  color: #fff;
  font-family: inherit;
  transition: border-color 0.2s;
}
.calc-input:focus {
  border-color: var(--accent);
  outline: none;
}

.calc-presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.calc-preset {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 5px 12px;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  font-family: inherit;
}
.calc-preset:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.calc-summary {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 14px;
  padding: 16px 18px;
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.92rem;
  color: var(--muted);
}
.calc-row span:last-child {
  font-weight: 700;
  color: var(--text);
}
.calc-row.total {
  border-top: 1px solid var(--line);
  padding-top: 10px;
  margin-top: 2px;
  font-size: 1.05rem;
}
.calc-row.total span:last-child {
  color: var(--accent);
  font-size: 1.22rem;
}

/* ===== TIPS SCHEDULE & PAYMENTS ===== */
.tips-schedule,
.pay-grid {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 22px;
}

.tip-time,
.pay-item {
  background: var(--card);
  backdrop-filter: blur(8px);
  border-radius: 14px;
  padding: 16px 22px;
  text-align: center;
  border: 1px solid rgba(0, 176, 255, 0.2);
  min-width: 120px;
  transition: transform 0.2s;
}
.tip-time:hover,
.pay-item:hover { transform: translateY(-3px); }

.tip-time-icon { font-size: 1.5rem; margin-bottom: 4px; }
.tip-time-val {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--accent2);
}
.tip-time-label {
  font-size: 0.8rem;
  color: var(--muted);
  font-weight: 600;
}

.pay-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 0.98rem;
}

/* ===== PROMO ===== */
.promo-box {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(0, 230, 118, 0.06));
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: var(--radius);
  padding: 36px 24px;
  text-align: center;
  max-width: 640px;
  margin: auto;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
}

.promo-code {
  display: inline-block;
  font-size: 2.1rem;
  font-weight: 800;
  letter-spacing: 5px;
  background: var(--gold);
  color: #0a0e17;
  padding: 10px 30px;
  border-radius: 12px;
  margin: 16px 0;
  cursor: pointer;
  user-select: all;
  border: 0;
  font-family: inherit;
  box-shadow: 0 6px 20px rgba(255, 215, 0, 0.35);
  transition: transform 0.15s;
}
.promo-code:hover { transform: scale(1.03); }

.copy-hint {
  font-size: 0.82rem;
  color: var(--muted);
  margin-top: 4px;
}

/* ===== LIMITS BOX ===== */
.limits-box {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  max-width: 720px;
  margin: 0 auto;
}

.limit-item {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 14px;
  padding: 20px 16px;
  text-align: center;
}
.limit-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--accent);
  margin-bottom: 4px;
}
.limit-label {
  font-size: 0.85rem;
  color: var(--muted);
  font-weight: 600;
}

/* ===== SECURITY ===== */
.security-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.sec-item {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 14px;
  padding: 20px 18px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.sec-icon {
  font-size: 1.6rem;
  flex-shrink: 0;
  line-height: 1;
}
.sec-item h4 {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 700;
}
.sec-item p {
  margin: 0;
  color: var(--muted);
  font-size: 0.88rem;
}

/* ===== FAQ ===== */
.faq { max-width: 740px; margin: auto; }

.faq-item {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 14px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.faq-item:hover { border-color: rgba(255, 255, 255, 0.18); }

.faq-item summary {
  padding: 16px 20px;
  cursor: pointer;
  font-weight: 700;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.faq-item summary::-webkit-details-marker { display: none; }
.faq-item summary::after {
  content: '+';
  font-size: 1.35rem;
  color: var(--accent);
  flex-shrink: 0;
  transition: transform 0.2s;
}
.faq-item[open] summary::after {
  content: '−';
  transform: rotate(180deg);
}
.faq-item p {
  padding: 0 20px 18px;
  color: var(--muted);
  margin: 0;
  font-size: 0.93rem;
}

/* ===== CTA ===== */
.cta {
  text-align: center;
  padding: 64px 20px;
  background: radial-gradient(ellipse at center, rgba(0, 230, 118, 0.12), transparent 70%);
}

.cta h2 {
  font-size: 1.9rem;
  margin: 0 0 12px;
  font-weight: 800;
}
.cta p {
  color: var(--muted);
  max-width: 480px;
  margin: 0 auto 28px;
}

/* ===== FOOTER ===== */
.footer {
  text-align: center;
  padding: 32px 20px 40px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.84rem;
}
.footer a { color: var(--accent2); }
.footer-links {
  display: flex;
  justify-content: center;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.disclaimer {
  margin: 12px auto 0;
  font-size: 0.76rem;
  color: #718096;
  max-width: 680px;
  line-height: 1.5;
}

/* ===== QR / BOT CARD ===== */
.bot-card {
  max-width: 420px;
  margin: 0 auto;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  padding: 28px 24px;
  text-align: center;
}
.bot-username {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--accent2);
  background: rgba(0, 176, 255, 0.1);
  padding: 8px 16px;
  border-radius: 10px;
  display: inline-block;
  margin: 12px 0;
  cursor: pointer;
  user-select: all;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .nav-links > a { display: none; }
  .navbar { padding: 10px 14px; }
  .hero { padding: 46px 16px 32px; }
  .section { padding: 40px 16px; }
  .stats { gap: 20px; }
  .hero-buttons { flex-direction: column; align-items: center; }
  .btn { width: 100%; max-width: 300px; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .card, .btn, .promo-code, .tip-time, .pulse,
  .step-tab-btn, .calc-btn {
    transition: none;
    animation: none;
  }
}
</style>
</head>

<body>
<a class="skip-link" href="#main" data-t="skip">ප්‍රධාන අන්තර්ගතයට යන්න</a>

<nav class="navbar" aria-label="Main navigation">
  <div class="logo">
    <span aria-hidden="true">⚡</span>
    Fast<span>xBet</span> Cash
  </div>

  <div class="nav-links">
    <a href="#how" data-t="howNav">භාවිතා කරන්නේ කෙසේද</a>
    <a href="#commands" data-t="cmdNav">Commands</a>
    <a href="#calculator" data-t="calcNav">Calculator</a>
    <a href="#features" data-t="featuresNav">විශේෂාංග</a>
    <a href="#tips" data-t="tipsNav">Free Tips</a>
    <a href="#security" data-t="secNav">ආරක්ෂාව</a>
    <a href="#faq" data-t="faqNav">FAQ</a>

    <div class="langs" role="group" aria-label="භාෂාව තෝරන්න">
      <button data-lang="si" class="active" aria-pressed="true">සිං</button>
      <button data-lang="en" aria-pressed="false">EN</button>
      <button data-lang="ta" aria-pressed="false">த</button>
    </div>
  </div>
</nav>

<main id="main">

<!-- HERO -->
<section class="hero">
  <div class="hero-badge">
    <span class="pulse" aria-hidden="true"></span>
    <span data-t="badge">🇱🇰 24/7 Active Bot & Cash Agent</span>
  </div>

  <h1>Fast xBet Cash</h1>

  <p data-t="hero">
    ස්වයංක්‍රීය Free Betting Tips, වේගවත් Deposit & Withdraw, Referral System —
    සියල්ල Telegram හරහා, ඔබේ දුරකථනයෙන්.
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

<!-- LIVE TICKER -->
<div class="live-ticker">
  <div class="ticker-card">
    <div class="ticker-left">
      <div class="ticker-dot" aria-hidden="true"></div>
      <div>
        <strong data-t="statusText">System Status: Online</strong>
        <div style="font-size:0.8rem;color:var(--muted)" data-t="statusSub">
          Telegram Bot & Processing Active · Edge: ${colo}
        </div>
      </div>
    </div>
    <div class="ticker-right">
      <span data-t="nextTipsLabel">ඊළඟ Tips:</span>
      <span class="ticker-timer" id="nextTipCountdown">--:--:--</span>
    </div>
  </div>
</div>

<!-- STATS -->
<div class="stats">
  <div class="stat">
    <div class="stat-num" aria-hidden="true">3×</div>
    <div class="stat-label" data-t="daily">දිනකට Tips</div>
  </div>
  <div class="stat">
    <div class="stat-num" aria-hidden="true">2-5m</div>
    <div class="stat-label" data-t="speed">සාමාන්‍ය කාලය</div>
  </div>
  <div class="stat">
    <div class="stat-num" aria-hidden="true">0%</div>
    <div class="stat-label" data-t="fee">ගාස්තු රහිතයි</div>
  </div>
  <div class="stat">
    <div class="stat-num" aria-hidden="true">100%</div>
    <div class="stat-label" data-t="secure">ආරක්ෂිත</div>
  </div>
</div>

<!-- HOW TO USE -->
<section class="section" id="how">
  <h2 class="section-title" data-t="howTitle">භාවිතා කරන්නේ කෙසේද?</h2>
  <p class="section-sub" data-t="howSub">මිනිත්තු කිහිපයකින් ඉතා පහසුවෙන් ගනුදෙනු සිදුකරන්න</p>

  <div class="step-tabs" role="tablist">
    <button type="button" class="step-tab-btn active" id="tabDeposit" data-t="tabDep" role="tab" aria-selected="true">💰 Deposit පියවර</button>
    <button type="button" class="step-tab-btn" id="tabWithdraw" data-t="tabWd" role="tab" aria-selected="false">💸 Withdraw පියවර</button>
  </div>

  <div class="steps-grid" id="depositSteps">
    <div class="step-card">
      <div class="step-badge">1</div>
      <div class="step-icon">🤖</div>
      <h3 data-t="step1dTitle">Bot එක ආරම්භ කරන්න</h3>
      <p data-t="step1dDesc">Telegram Bot වෙත ගොස් /deposit command එක ලබාදී ඔබේ Player ID ඇතුළත් කරන්න.</p>
    </div>
    <div class="step-card">
      <div class="step-badge">2</div>
      <div class="step-icon">📲</div>
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

  <div class="steps-grid" id="withdrawSteps" style="display:none">
    <div class="step-card">
      <div class="step-badge">1</div>
      <div class="step-icon">🤖</div>
      <h3 data-t="step1wTitle">/withdraw ආරම්භ කරන්න</h3>
      <p data-t="step1wDesc">Bot එකේ /withdraw command එක භාවිතා කර Player ID සහ මුදල් ප්‍රමාණය ඇතුළත් කරන්න.</p>
    </div>
    <div class="step-card">
      <div class="step-badge">2</div>
      <div class="step-icon">🏦</div>
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

<!-- BOT COMMANDS -->
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
      <p class="cmd-desc" data-t="cmdSafe">ආරක්ෂාව හා tips බලන්න</p>
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

<!-- LIMITS -->
<section class="section" id="limits">
  <h2 class="section-title" data-t="limTitle">ගනුදෙනු සීමා & වේලාවන්</h2>
  <p class="section-sub" data-t="limSub">පැහැදිලි සීමා සහ සාමාන්‍ය සැකසුම් වේලාවන්</p>

  <div class="limits-box">
    <div class="limit-item">
      <div class="limit-value">LKR ${minAmount}+</div>
      <div class="limit-label" data-t="limMin">අවම ගනුදෙනුව</div>
    </div>
    <div class="limit-item">
      <div class="limit-value">LKR ${maxAmount}</div>
      <div class="limit-label" data-t="limMax">උපරිම ගනුදෙනුව</div>
    </div>
    <div class="limit-item">
      <div class="limit-value">2–5 min</div>
      <div class="limit-label" data-t="limTime">සාමාන්‍ය සැකසුම් කාලය</div>
    </div>
    <div class="limit-item">
      <div class="limit-value">0%</div>
      <div class="limit-label" data-t="limFee">සේවා ගාස්තු</div>
    </div>
  </div>
</section>

<!-- CALCULATOR -->
<section class="section" id="calculator">
  <h2 class="section-title" data-t="calcTitle">ගනුදෙනු Calculator</h2>
  <p class="section-sub" data-t="calcSub">Deposit හෝ Withdraw මුදල් ඉක්මනින් ගණනය කරන්න</p>

  <div class="calc-container">
    <div class="calc-toggle" role="tablist">
      <button type="button" class="calc-btn active" id="calcDepBtn" data-t="calcDep">💰 Deposit</button>
      <button type="button" class="calc-btn" id="calcWdBtn" data-t="calcWd">💸 Withdraw</button>
    </div>

    <div class="calc-input-group">
      <label class="calc-label" for="amountInput" data-t="calcAmount">මුදල් ප්‍රමාණය (LKR)</label>
      <input type="number" id="amountInput" class="calc-input" value="5000" min="${minAmount}" max="${maxAmount}" step="100" inputmode="numeric">
      <div class="calc-presets">
        <button type="button" class="calc-preset" data-amount="1000">1,000</button>
        <button type="button" class="calc-preset" data-amount="3000">3,000</button>
        <button type="button" class="calc-preset" data-amount="5000">5,000</button>
        <button type="button" class="calc-preset" data-amount="10000">10,000</button>
        <button type="button" class="calc-preset" data-amount="25000">25,000</button>
        <button type="button" class="calc-preset" data-amount="50000">50,000</button>
      </div>
    </div>

    <div class="calc-summary">
      <div class="calc-row">
        <span data-t="calcYouSend">ඔබ යවන මුදල්</span>
        <span id="calcSend">LKR 5,000</span>
      </div>
      <div class="calc-row">
        <span data-t="calcFee">සේවා ගාස්තු</span>
        <span id="calcFee">LKR 0</span>
      </div>
      <div class="calc-row total">
        <span data-t="calcReceive">ගිණුමට ලැබෙන මුදල්</span>
        <span id="calcReceive">LKR 5,000</span>
      </div>
    </div>
  </div>
</section>

<!-- FEATURES -->
<section class="section" id="features">
  <h2 class="section-title" data-t="featTitle">ප්‍රධාන විශේෂාංග</h2>
  <p class="section-sub" data-t="featSub">ඔබට අවශ්‍ය සියලුම පහසුකම් එක තැනක</p>

  <div class="grid">
    <div class="card">
      <div class="card-icon">💳</div>
      <h3 data-t="feat1Title">වේගවත් Deposit</h3>
      <p data-t="feat1Desc">Receipt upload කර මිනිත්තු කිහිපයකින් xBet ගිණුමට මුදල් බැර වේ.</p>
    </div>
    <div class="card">
      <div class="card-icon">💸</div>
      <h3 data-t="feat2Title">පහසු Withdraw</h3>
      <p data-t="feat2Desc">Bank / eZ Cash / mCash වෙත ඉක්මනින් මුදල් ආපසු ගන්න.</p>
    </div>
    <div class="card">
      <div class="card-icon">🔗</div>
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

<!-- FREE TIPS -->
<section class="section" id="tips">
  <h2 class="section-title" data-t="tipsTitle">ස්වයංක්‍රීය Free Betting Tips</h2>
  <p class="section-sub" data-t="tipsSub">දිනකට 3 වතාවක් — ශ්‍රී ලංකා වේලාවෙන්</p>

  <div class="tips-schedule">
    <div class="tip-time">
      <div class="tip-time-icon">🌅</div>
      <div class="tip-time-val">08:00</div>
      <div class="tip-time-label" data-t="tipMorning">උදෑසන</div>
    </div>
    <div class="tip-time">
      <div class="tip-time-icon">☀️</div>
      <div class="tip-time-val">12:00</div>
      <div class="tip-time-label" data-t="tipNoon">දහවල්</div>
    </div>
    <div class="tip-time">
      <div class="tip-time-icon">🌆</div>
      <div class="tip-time-val">18:00</div>
      <div class="tip-time-label" data-t="tipEve">සවස</div>
    </div>
  </div>

  <div class="grid" style="margin-top:32px">
    <div class="card">
      <div class="card-icon">⚽</div>
      <h3>Football</h3>
      <p data-t="tipsFoot">EPL + UEFA Champions League</p>
    </div>
    <div class="card">
      <div class="card-icon">🏀</div>
      <h3>Basketball</h3>
      <p data-t="tipsNba">NBA games</p>
    </div>
    <div class="card">
      <div class="card-icon">🎾</div>
      <h3>Tennis</h3>
      <p data-t="tipsAtp">ATP Tour</p>
    </div>
  </div>

  <div style="text-align:center;margin-top:28px">
    <a href="${channel}" class="btn btn-secondary" target="_blank" rel="noopener" data-t="joinChannel">
      📢 Tips Channel එකට Join වෙන්න — ${channelName}
    </a>
  </div>
</section>

<!-- PROMO -->
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

<!-- PAYMENTS -->
<section class="section" id="payments">
  <h2 class="section-title" data-t="payTitle">ගෙවීම් ක්‍රම</h2>
  <p class="section-sub" data-t="paySub">පහසු සහ ආරක්ෂිත ගෙවීම් විකල්ප</p>

  <div class="pay-grid">
    <div class="pay-item">📱 eZ Cash</div>
    <div class="pay-item">📱 mCash</div>
    <div class="pay-item">🏦 Bank Transfer</div>
  </div>
</section>

<!-- SECURITY -->
<section class="section" id="security">
  <h2 class="section-title" data-t="secTitle">ආරක්ෂාව & විශ්වාසය</h2>
  <p class="section-sub" data-t="secSub">Production-grade security controls</p>

  <div class="security-grid">
    <div class="sec-item">
      <div class="sec-icon">🔐</div>
      <div>
        <h4 data-t="sec1Title">Webhook Protection</h4>
        <p data-t="sec1Desc">Fail-closed secret validation + request size/method checks</p>
      </div>
    </div>
    <div class="sec-item">
      <div class="sec-icon">🚫</div>
      <div>
        <h4 data-t="sec2Title">Duplicate Guard</h4>
        <p data-t="sec2Desc">Same receipt හෝ pending withdrawal එකක් දෙවරක් submit කළ නොහැක</p>
      </div>
    </div>
    <div class="sec-item">
      <div class="sec-icon">⏱️</div>
      <div>
        <h4 data-t="sec3Title">Rate Limiting</h4>
        <p data-t="sec3Desc">User & transaction level abuse protection</p>
      </div>
    </div>
    <div class="sec-item">
      <div class="sec-icon">📦</div>
      <div>
        <h4 data-t="sec4Title">R2 Receipt Backup</h4>
        <p data-t="sec4Desc">සියලුම receipts Cloudflare R2 හි ආරක්ෂිතව ගබඩා වේ</p>
      </div>
    </div>
    <div class="sec-item">
      <div class="sec-icon">🧾</div>
      <div>
        <h4 data-t="sec5Title">Financial Audit Trail</h4>
        <p data-t="sec5Desc">සෑම status change එකක්ම D1 හි log වේ</p>
      </div>
    </div>
    <div class="sec-item">
      <div class="sec-icon">🔒</div>
      <div>
        <h4 data-t="sec6Title">Atomic Transitions</h4>
        <p data-t="sec6Desc">Database-level conditional status updates</p>
      </div>
    </div>
  </div>
</section>

<!-- REFERRAL -->
<section class="section" id="referral">
  <h2 class="section-title" data-t="refTitle">Referral System</h2>
  <p class="section-sub" data-t="refSub">මිතුරන්ට ආරාධනා කර bonus ලබාගන්න</p>

  <div class="bot-card">
    <p data-t="refHow" style="margin:0 0 8px;color:var(--muted)">Bot එකේ /referrals command එක භාවිතා කර ඔබේ personal link එක ලබාගන්න</p>
    <div class="bot-username" id="botUserBtn" title="Open bot">${BOT_USERNAME}</div>
    <p style="margin:12px 0 0;font-size:0.88rem;color:var(--muted)" data-t="refNote">
      Link එක හරහා ලියාපදිංචි වූ මිතුරන්ගේ deposits සඳහා rewards ලැබේ.
    </p>
    <div style="margin-top:20px">
      <a href="${bot}" class="btn btn-primary" target="_blank" rel="noopener" data-t="getRef">
        🔗 Referral Link ගන්න
      </a>
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

<footer class="footer">
  <div class="footer-links">
    <a href="${bot}" target="_blank" rel="noopener">Telegram Bot</a>
    <a href="${channel}" target="_blank" rel="noopener">Tips Channel</a>
    <a href="#faq">FAQ</a>
  </div>
  <div>© ${new Date().getFullYear()} Fast xBet Cash · Built on Cloudflare Workers</div>
  <p class="disclaimer" data-t="disclaimer">
    මෙය නිල xBet වෙබ් අඩවියක් නොවේ. මෙය ස්වාධීන cash agent සහ free tips සේවාවකි.
    Betting හි අවදානම් අඩංගු වේ. වයස 18+ පමණි. වගකීමෙන් ක්‍රීඩා කරන්න.
  </p>
</footer>

<script>
(function () {
  "use strict";

  // ===== i18n =====
  const translations = {
    si: {
      skip: "ප්‍රධාන අන්තර්ගතයට යන්න",
      howNav: "භාවිතා කරන්නේ කෙසේද",
      cmdNav: "Commands",
      calcNav: "Calculator",
      featuresNav: "විශේෂාංග",
      tipsNav: "Free Tips",
      secNav: "ආරක්ෂාව",
      faqNav: "FAQ",
      badge: "🇱🇰 24/7 Active Bot & Cash Agent",
      hero: "ස්වයංක්‍රීය Free Betting Tips, වේගවත් Deposit & Withdraw, Referral System — සියල්ල Telegram හරහා, ඔබේ දුරකථනයෙන්.",
      start: "🚀 Bot එක පටන් ගන්න",
      channel: "📢 Tips Channel",
      seeCmds: "📋 Commands බලන්න",
      statusText: "System Status: Online",
      statusSub: "Telegram Bot & Processing Active · Edge: ${colo}",
      nextTipsLabel: "ඊළඟ Tips:",
      daily: "දිනකට Tips",
      speed: "සාමාන්‍ය කාලය",
      fee: "ගාස්තු රහිතයි",
      secure: "ආරක්ෂිත",
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
      cmdSafe: "ආරක්ෂාව හා tips බලන්න",
      cmdHelp: "උදව් හා උපදෙස් ලබාගන්න",
      openBot: "🚀 Telegram Bot විවෘත කරන්න",
      limTitle: "ගනුදෙනු සීමා & වේලාවන්",
      limSub: "පැහැදිලි සීමා සහ සාමාන්‍ය සැකසුම් වේලාවන්",
      limMin: "අවම ගනුදෙනුව",
      limMax: "උපරිම ගනුදෙනුව",
      limTime: "සාමාන්‍ය සැකසුම් කාලය",
      limFee: "සේවා ගාස්තු",
      calcTitle: "ගනුදෙනු Calculator",
      calcSub: "Deposit හෝ Withdraw මුදල් ඉක්මනින් ගණනය කරන්න",
      calcDep: "💰 Deposit",
      calcWd: "💸 Withdraw",
      calcAmount: "මුදල් ප්‍රමාණය (LKR)",
      calcYouSend: "ඔබ යවන මුදල්",
      calcFee: "සේවා ගාස්තු",
      calcReceive: "ගිණුමට ලැබෙන මුදල්",
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
      tipsTitle: "ස්වයංක්‍රීය Free Betting Tips",
      tipsSub: "දිනකට 3 වතාවක් — ශ්‍රී ලංකා වේලාවෙන්",
      tipMorning: "උදෑසන",
      tipNoon: "දහවල්",
      tipEve: "සවස",
      tipsFoot: "EPL + UEFA Champions League",
      tipsNba: "NBA games",
      tipsAtp: "ATP Tour",
      joinChannel: "📢 Tips Channel එකට Join වෙන්න — ${channelName}",
      promoTitle: "xBet Promo Code",
      promoSub: "නව ගිණුම් සඳහා special bonus code",
      promoText: "Copy කර xBet හි භාවිතා කරන්න",
      promoHint: "Click to copy",
      goXbet: "🎯 xBet වෙත යන්න",
      payTitle: "ගෙවීම් ක්‍රම",
      paySub: "පහසු සහ ආරක්ෂිත ගෙවීම් විකල්ප",
      secTitle: "ආරක්ෂාව & විශ්වාසය",
      secSub: "Production-grade security controls",
      sec1Title: "Webhook Protection",
      sec1Desc: "Fail-closed secret validation + request size/method checks",
      sec2Title: "Duplicate Guard",
      sec2Desc: "Same receipt හෝ pending withdrawal එකක් දෙවරක් submit කළ නොහැක",
      sec3Title: "Rate Limiting",
      sec3Desc: "User & transaction level abuse protection",
      sec4Title: "R2 Receipt Backup",
      sec4Desc: "සියලුම receipts Cloudflare R2 හි ආරක්ෂිතව ගබඩා වේ",
      sec5Title: "Financial Audit Trail",
      sec5Desc: "සෑම status change එකක්ම D1 හි log වේ",
      sec6Title: "Atomic Transitions",
      sec6Desc: "Database-level conditional status updates",
      refTitle: "Referral System",
      refSub: "මිතුරන්ට ආරාධනා කර bonus ලබාගන්න",
      refHow: "Bot එකේ /referrals command එක භාවිතා කර ඔබේ personal link එක ලබාගන්න",
      refNote: "Link එක හරහා ලියාපදිංචි වූ මිතුරන්ගේ deposits සඳහා rewards ලැබේ.",
      getRef: "🔗 Referral Link ගන්න",
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
      disclaimer: "මෙය නිල xBet වෙබ් අඩවියක් නොවේ. මෙය ස්වාධීන cash agent සහ free tips සේවාවකි. Betting හි අවදානම් අඩංගු වේ. වයස 18+ පමණි. වගකීමෙන් ක්‍රීඩා කරන්න."
    },
    en: {
      skip: "Skip to main content",
      howNav: "How it works",
      cmdNav: "Commands",
      calcNav: "Calculator",
      featuresNav: "Features",
      tipsNav: "Free Tips",
      secNav: "Security",
      faqNav: "FAQ",
      badge: "🇱🇰 24/7 Active Bot & Cash Agent",
      hero: "Automated Free Betting Tips, fast Deposit & Withdraw, Referral System — everything via Telegram on your phone.",
      start: "🚀 Start the Bot",
      channel: "📢 Tips Channel",
      seeCmds: "📋 View Commands",
      statusText: "System Status: Online",
      statusSub: "Telegram Bot & Processing Active · Edge: ${colo}",
      nextTipsLabel: "Next Tips:",
      daily: "Tips per day",
      speed: "Avg. time",
      fee: "Zero fees",
      secure: "Secure",
      howTitle: "How does it work?",
      howSub: "Complete transactions in just a few minutes",
      tabDep: "💰 Deposit steps",
      tabWd: "💸 Withdraw steps",
      step1dTitle: "Start the Bot",
      step1dDesc: "Open the Telegram Bot, use /deposit and enter your Player ID.",
      step2dTitle: "Pay & upload receipt",
      step2dDesc: "Pay via eZ Cash, mCash or Bank Transfer and upload the receipt photo to the bot.",
      step3dTitle: "Credited in minutes",
      step3dDesc: "Once an admin confirms, funds are instantly credited to your xBet account.",
      step1wTitle: "Start /withdraw",
      step1wDesc: "Use the /withdraw command, enter your Player ID and amount.",
      step2wTitle: "Provide payment details",
      step2wDesc: "Share your Bank / eZ Cash / mCash details. Admin will verify.",
      step3wTitle: "Receive funds",
      step3wDesc: "After confirmation, money is transferred quickly. Check status in History.",
      cmdTitle: "Bot Commands — All Features",
      cmdSub: "Every command available in the Telegram Bot",
      cmdStart: "Start the bot and see the main menu",
      cmdMenu: "Open the main menu",
      cmdDep: "Start a deposit (receipt upload)",
      cmdWd: "Submit a withdrawal request",
      cmdReg: "Register your Player ID",
      cmdRef: "View your Referral dashboard",
      cmdHist: "View transaction history",
      cmdDash: "View account overview",
      cmdTicket: "Open a support ticket",
      cmdLang: "Change language (සිං / EN / த)",
      cmdSafe: "View safety tips",
      cmdHelp: "Get help and instructions",
      openBot: "🚀 Open Telegram Bot",
      limTitle: "Limits & Timing",
      limSub: "Clear limits and typical processing times",
      limMin: "Minimum transaction",
      limMax: "Maximum transaction",
      limTime: "Typical processing time",
      limFee: "Service fee",
      calcTitle: "Transaction Calculator",
      calcSub: "Quickly calculate deposit or withdraw amounts",
      calcDep: "💰 Deposit",
      calcWd: "💸 Withdraw",
      calcAmount: "Amount (LKR)",
      calcYouSend: "You send",
      calcFee: "Service fee",
      calcReceive: "You receive",
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
      tipsTitle: "Automated Free Betting Tips",
      tipsSub: "3 times a day — Sri Lanka time",
      tipMorning: "Morning",
      tipNoon: "Noon",
      tipEve: "Evening",
      tipsFoot: "EPL + UEFA Champions League",
      tipsNba: "NBA games",
      tipsAtp: "ATP Tour",
      joinChannel: "📢 Join Tips Channel — ${channelName}",
      promoTitle: "xBet Promo Code",
      promoSub: "Special bonus code for new accounts",
      promoText: "Copy and use on xBet",
      promoHint: "Click to copy",
      goXbet: "🎯 Go to xBet",
      payTitle: "Payment Methods",
      paySub: "Convenient and secure options",
      secTitle: "Security & Trust",
      secSub: "Production-grade security controls",
      sec1Title: "Webhook Protection",
      sec1Desc: "Fail-closed secret validation + request size/method checks",
      sec2Title: "Duplicate Guard",
      sec2Desc: "Same receipt or pending withdrawal cannot be submitted twice",
      sec3Title: "Rate Limiting",
      sec3Desc: "User & transaction level abuse protection",
      sec4Title: "R2 Receipt Backup",
      sec4Desc: "All receipts stored securely on Cloudflare R2",
      sec5Title: "Financial Audit Trail",
      sec5Desc: "Every status change is logged in D1",
      sec6Title: "Atomic Transitions",
      sec6Desc: "Database-level conditional status updates",
      refTitle: "Referral System",
      refSub: "Invite friends and earn rewards",
      refHow: "Use the /referrals command in the bot to get your personal link",
      refNote: "You earn rewards when friends register via your link and deposit.",
      getRef: "🔗 Get Referral Link",
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
      disclaimer: "This is not an official xBet website. This is an independent cash agent and free tips service. Betting involves risk. 18+ only. Play responsibly."
    },
    ta: {
      skip: "முக்கிய உள்ளடக்கத்திற்கு செல்லவும்",
      howNav: "எப்படி பயன்படுத்துவது",
      cmdNav: "Commands",
      calcNav: "Calculator",
      featuresNav: "அம்சங்கள்",
      tipsNav: "Free Tips",
      secNav: "பாதுகாப்பு",
      faqNav: "FAQ",
      badge: "🇱🇰 24/7 Active Bot & Cash Agent",
      hero: "தானியங்கி Free Betting Tips, விரைவான Deposit & Withdraw, Referral System — அனைத்தும் Telegram மூலம் உங்கள் தொலைபேசியில்.",
      start: "🚀 Bot ஐ தொடங்கவும்",
      channel: "📢 Tips Channel",
      seeCmds: "📋 Commands பார்க்க",
      statusText: "System Status: Online",
      statusSub: "Telegram Bot & Processing Active · Edge: ${colo}",
      nextTipsLabel: "அடுத்த Tips:",
      daily: "நாளொன்றுக்கு Tips",
      speed: "சராசரி நேரம்",
      fee: "கட்டணம் இல்லை",
      secure: "பாதுகாப்பானது",
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
      cmdSafe: "பாதுகாப்பு குறிப்புகளை பார்க்கவும்",
      cmdHelp: "உதவி மற்றும் வழிமுறைகளை பெறவும்",
      openBot: "🚀 Telegram Bot திறக்கவும்",
      limTitle: "வரம்புகள் & நேரங்கள்",
      limSub: "தெளிவான வரம்புகள் மற்றும் சாதாரண செயலாக்க நேரங்கள்",
      limMin: "குறைந்தபட்ச பரிவர்த்தனை",
      limMax: "அதிகபட்ச பரிவர்த்தனை",
      limTime: "சாதாரண செயலாக்க நேரம்",
      limFee: "சேவை கட்டணம்",
      calcTitle: "பரிவர்த்தனை Calculator",
      calcSub: "Deposit அல்லது Withdraw தொகையை விரைவாக கணக்கிடவும்",
      calcDep: "💰 Deposit",
      calcWd: "💸 Withdraw",
      calcAmount: "தொகை (LKR)",
      calcYouSend: "நீங்கள் அனுப்புவது",
      calcFee: "சேவை கட்டணம்",
      calcReceive: "நீங்கள் பெறுவது",
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
      feat6Desc: "அனைத்து பரிவர்த்தனைகளையும் /history மூலம் எப்போதும் பார்க்கலாம்.",
      feat7Title: "Support Ticket",
      feat7Desc: "சிக்கல் இருந்தால் /ticket மூலம் நேரடியாக admin க்கு அனுப்பவும்.",
      feat8Title: "மேம்பட்ட பாதுகாப்பு",
      feat8Desc: "Duplicate protection, rate limits, audit trail மற்றும் R2 receipt backup.",
      tipsTitle: "தானியங்கி Free Betting Tips",
      tipsSub: "நாளொன்றுக்கு 3 முறை — இலங்கை நேரம்",
      tipMorning: "காலை",
      tipNoon: "மதியம்",
      tipEve: "மாலை",
      tipsFoot: "EPL + UEFA Champions League",
      tipsNba: "NBA games",
      tipsAtp: "ATP Tour",
      joinChannel: "📢 Tips Channel இல் சேரவும் — ${channelName}",
      promoTitle: "xBet Promo Code",
      promoSub: "புதிய கணக்குகளுக்கான சிறப்பு bonus code",
      promoText: "Copy செய்து xBet இல் பயன்படுத்தவும்",
      promoHint: "Click to copy",
      goXbet: "🎯 xBet க்கு செல்லவும்",
      payTitle: "பணம் செலுத்தும் முறைகள்",
      paySub: "வசதியான மற்றும் பாதுகாப்பான விருப்பங்கள்",
      secTitle: "பாதுகாப்பு & நம்பிக்கை",
      secSub: "Production-grade security controls",
      sec1Title: "Webhook Protection",
      sec1Desc: "Fail-closed secret validation + request size/method checks",
      sec2Title: "Duplicate Guard",
      sec2Desc: "அதே receipt அல்லது pending withdrawal இருமுறை submit செய்ய முடியாது",
      sec3Title: "Rate Limiting",
      sec3Desc: "User & transaction level abuse protection",
      sec4Title: "R2 Receipt Backup",
      sec4Desc: "அனைத்து receipts Cloudflare R2 இல் பாதுகாப்பாக சேமிக்கப்படும்",
      sec5Title: "Financial Audit Trail",
      sec5Desc: "ஒவ்வொரு status change உம் D1 இல் log ஆகும்",
      sec6Title: "Atomic Transitions",
      sec6Desc: "Database-level conditional status updates",
      refTitle: "Referral System",
      refSub: "நண்பர்களை அழைத்து rewards பெறவும்",
      refHow: "Bot இல் /referrals command பயன்படுத்தி உங்கள் personal link பெறவும்",
      refNote: "உங்கள் link மூலம் பதிவு செய்த நண்பர்கள் deposit செய்யும்போது உங்களுக்கு rewards கிடைக்கும்.",
      getRef: "🔗 Referral Link பெறவும்",
      faqTitle: "அடிக்கடி கேட்கப்படும் கேள்விகள்",
      faqSub: "பொதுவான கேள்விகளுக்கு விரைவான பதில்கள்",
      faq1q: "Deposit எப்படி செய்வது?",
      faq1a: "Bot ஐ திறந்து /deposit பயன்படுத்தவும். Player ID உள்ளிட்டு, பணம் செலுத்தி receipt புகைப்படத்தை upload செய்யவும். Admin உறுதிப்படுத்திய பிறகு பணம் வரவு வைக்கப்படும்.",
      faq2q: "Withdraw எவ்வளவு நேரம் எடுக்கும்?",
      faq2a: "சாதாரணமாக 2–5 நிமிடங்கள். அதிக தொகை அல்லது கூடுதல் verification தேவைப்பட்டால் அதிக நேரம் எடுக்கலாம்.",
      faq3q: "Free Tips என்றால் என்ன?",
      faq3a: "நாளொன்றுக்கு 3 முறை (08:00, 12:00, 18:00 SL time) EPL, UCL, NBA, ATP க்கான automatic tips channel இல் publish ஆகும்.",
      faq4q: "Referral bonus எப்படி பெறுவது?",
      faq4a: "/referrals மூலம் உங்கள் link பெற்று நண்பர்களுக்கு அனுப்பவும். அவர்கள் பதிவு செய்து deposit செய்யும்போது உங்களுக்கு rewards கிடைக்கும்.",
      faq5q: "சிக்கல் இருந்தால் என்ன செய்ய வேண்டும்?",
      faq5a: "/ticket command பயன்படுத்தி support ticket திறக்கவும். Admin விரைவில் பதிலளிப்பார்.",
      faq6q: "மொழியை எப்படி மாற்றுவது?",
      faq6a: "Bot இல் /language command அல்லது இந்த பக்கத்தின் மேலே உள்ள සිං / EN / த பொத்தான்களை பயன்படுத்தவும்.",
      ctaTitle: "இப்போதே தொடங்கவும்",
      ctaSub: "Telegram Bot ஐ திறந்து deposit, withdraw மற்றும் free tips அனுபவிக்கவும்",
      ctaBot: "🚀 Bot க்கு செல்லவும்",
      ctaChannel: "📢 Tips Channel",
      disclaimer: "இது அதிகாரப்பூர்வ xBet வலைத்தளம் அல்ல. இது சுயாதீன cash agent மற்றும் free tips சேவையாகும். Betting இல் ஆபத்து உள்ளது. 18+ மட்டும். பொறுப்புடன் விளையாடுங்கள்."
    }
  };

  let currentLang = "si";

  function applyLang(lang) {
    currentLang = lang;
    const t = translations[lang] || translations.si;
    document.documentElement.lang = lang === "si" ? "si" : lang === "ta" ? "ta" : "en";

    document.querySelectorAll("[data-t]").forEach((el) => {
      const key = el.getAttribute("data-t");
      if (t[key] !== undefined) {
        let text = t[key];
        // simple template replacements
        text = text.replace("\${colo}", "${colo}");
        text = text.replace("\${channelName}", "${channelName}");
        el.textContent = text;
      }
    });

    document.querySelectorAll(".langs button").forEach((btn) => {
      const isActive = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    try {
      localStorage.setItem("fxc-lang", lang);
    } catch (_) {}
  }

  // Language buttons
  document.querySelectorAll(".langs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyLang(btn.getAttribute("data-lang") || "si");
    });
  });

  // Restore saved language
  try {
    const saved = localStorage.getItem("fxc-lang");
    if (saved && translations[saved]) applyLang(saved);
  } catch (_) {}

  // ===== Deposit / Withdraw tabs =====
  const tabDep = document.getElementById("tabDeposit");
  const tabWd = document.getElementById("tabWithdraw");
  const depSteps = document.getElementById("depositSteps");
  const wdSteps = document.getElementById("withdrawSteps");

  if (tabDep && tabWd && depSteps && wdSteps) {
    tabDep.addEventListener("click", () => {
      tabDep.classList.add("active");
      tabWd.classList.remove("active");
      tabDep.setAttribute("aria-selected", "true");
      tabWd.setAttribute("aria-selected", "false");
      depSteps.style.display = "";
      wdSteps.style.display = "none";
    });
    tabWd.addEventListener("click", () => {
      tabWd.classList.add("active");
      tabDep.classList.remove("active");
      tabWd.setAttribute("aria-selected", "true");
      tabDep.setAttribute("aria-selected", "false");
      wdSteps.style.display = "";
      depSteps.style.display = "none";
    });
  }

  // ===== Calculator =====
  const amountInput = document.getElementById("amountInput");
  const calcSend = document.getElementById("calcSend");
  const calcFee = document.getElementById("calcFee");
  const calcReceive = document.getElementById("calcReceive");
  const calcDepBtn = document.getElementById("calcDepBtn");
  const calcWdBtn = document.getElementById("calcWdBtn");
  let calcMode = "deposit";

  function formatLKR(n) {
    return "LKR " + Number(n).toLocaleString("en-LK");
  }

  function updateCalc() {
    if (!amountInput || !calcSend || !calcFee || !calcReceive) return;
    let val = parseInt(amountInput.value, 10) || 0;
    const min = ${minTx};
    const max = ${maxTx};
    if (val < min) val = min;
    if (val > max) val = max;
    amountInput.value = String(val);

    // Zero fee model
    const fee = 0;
    const receive = val - fee;

    calcSend.textContent = formatLKR(val);
    calcFee.textContent = formatLKR(fee);
    calcReceive.textContent = formatLKR(receive);
  }

  if (amountInput) {
    amountInput.addEventListener("input", updateCalc);
    amountInput.addEventListener("change", updateCalc);
  }

  document.querySelectorAll(".calc-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (amountInput) {
        amountInput.value = btn.getAttribute("data-amount") || "5000";
        updateCalc();
      }
    });
  });

  if (calcDepBtn && calcWdBtn) {
    calcDepBtn.addEventListener("click", () => {
      calcMode = "deposit";
      calcDepBtn.classList.add("active");
      calcWdBtn.classList.remove("active");
      updateCalc();
    });
    calcWdBtn.addEventListener("click", () => {
      calcMode = "withdraw";
      calcWdBtn.classList.add("active");
      calcDepBtn.classList.remove("active");
      updateCalc();
    });
  }

  updateCalc();

  // ===== Promo copy =====
  const promoBtn = document.getElementById("promoCodeBtn");
  const promoHint = document.getElementById("promoCopyHint");
  if (promoBtn) {
    promoBtn.addEventListener("click", async () => {
      const text = promoBtn.textContent || "";
      try {
        await navigator.clipboard.writeText(text.trim());
        if (promoHint) {
          promoHint.textContent = currentLang === "en" ? "Copied!" : currentLang === "ta" ? "நகலெடுக்கப்பட்டது!" : "Copy වුණා!";
          setTimeout(() => {
            promoHint.textContent = translations[currentLang]?.promoHint || "Click to copy";
          }, 1800);
        }
      } catch (_) {
        // fallback
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

  // ===== Next tips countdown (SL time 08:00, 12:00, 18:00) =====
  const countdownEl = document.getElementById("nextTipCountdown");
  const tipHours = [8, 12, 18]; // Asia/Colombo

  function getNextTip() {
    const now = new Date();
    // Approximate SL offset (IST +5:30). For accuracy in production use proper TZ lib if needed.
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Colombo",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parts = formatter.formatToParts(now);
    const get = (type) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
    const y = get("year");
    const m = get("month");
    const d = get("day");
    const h = get("hour");
    const min = get("minute");
    const s = get("second");

    // Current SL seconds since midnight
    const currentSec = h * 3600 + min * 60 + s;

    let nextSec = null;
    for (const th of tipHours) {
      const target = th * 3600;
      if (target > currentSec) {
        nextSec = target;
        break;
      }
    }
    // If past last tip, next is tomorrow 08:00
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
