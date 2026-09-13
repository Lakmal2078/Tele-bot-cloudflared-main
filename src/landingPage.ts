import type { Env } from "./types";

const GITHUB_URL = "https://github.com/Lakmal2078/Tele-bot-cloudflared-main";
const BOT_URL = "https://t.me/fast_1xbetcash_bot";

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderLandingPage(env: Env, request: Request): string {
  const supportUrl = env.CHANNEL_URL?.trim() || BOT_URL;
  const supportLabel = env.CHANNEL_USERNAME?.trim() ? `@${env.CHANNEL_USERNAME.trim().replace(/^@/, "")}` : "Support channel";
  const colo = String((request as Request & { cf?: { colo?: string } }).cf?.colo || "EDGE");
  const safeSupportUrl = escapeAttribute(supportUrl);
  const safeSupportLabel = escapeAttribute(supportLabel);
  const safeColo = escapeAttribute(colo);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#07111f">
  <meta name="description" content="Fast, secure Telegram assistance powered by Cloudflare Workers at the edge.">
  <title>FastCash Bot — Your Telegram Assistant</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07111f;
      --bg-soft: #0b1728;
      --card: rgba(15, 31, 52, .72);
      --card-strong: rgba(18, 39, 65, .9);
      --line: rgba(158, 189, 224, .16);
      --text: #f6f9ff;
      --muted: #9cafc7;
      --cyan: #51d8ff;
      --blue: #4d7cff;
      --green: #66e3a5;
      --shadow: 0 24px 80px rgba(0, 0, 0, .34);
      --ease: cubic-bezier(.23, 1, .32, 1);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-width: 320px;
      background:
        radial-gradient(circle at 13% 8%, rgba(77, 124, 255, .20), transparent 28rem),
        radial-gradient(circle at 88% 28%, rgba(81, 216, 255, .12), transparent 24rem),
        linear-gradient(145deg, var(--bg), #09192c 55%, #07111f);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
      overflow-x: hidden;
    }

    body::before {
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      content: "";
      opacity: .3;
      background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: linear-gradient(to bottom, black, transparent 75%);
    }

    a { color: inherit; text-decoration: none; }
    .shell { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
    .topbar { display: flex; align-items: center; justify-content: space-between; padding: 26px 0; }
    .brand { display: inline-flex; align-items: center; gap: 12px; font-weight: 750; letter-spacing: -.02em; }
    .brand-mark {
      display: grid; place-items: center; width: 42px; height: 42px; border: 1px solid rgba(81,216,255,.28); border-radius: 14px;
      background: linear-gradient(145deg, rgba(81,216,255,.24), rgba(77,124,255,.16)); box-shadow: 0 0 28px rgba(81,216,255,.14);
    }
    .brand-mark svg { width: 23px; height: 23px; fill: none; stroke: var(--cyan); stroke-width: 1.8; }
    .brand small { display: block; margin-top: 2px; color: var(--muted); font-size: 11px; font-weight: 550; letter-spacing: .05em; text-transform: uppercase; }
    .status { display: inline-flex; align-items: center; gap: 8px; padding: 9px 13px; border: 1px solid rgba(102,227,165,.24); border-radius: 999px; background: rgba(102,227,165,.08); color: #bff7da; font-size: 12px; font-weight: 700; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 4px rgba(102,227,165,.12), 0 0 16px rgba(102,227,165,.8); }

    .hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(330px, .95fr); align-items: center; gap: 70px; min-height: 570px; padding: 62px 0 84px; }
    .eyebrow { display: inline-flex; align-items: center; gap: 9px; margin-bottom: 20px; color: var(--cyan); font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    .eyebrow::before { width: 26px; height: 1px; background: var(--cyan); content: ""; }
    h1 { max-width: 680px; margin: 0; font-size: clamp(3.1rem, 7vw, 6rem); line-height: .96; letter-spacing: -.075em; }
    h1 span { color: transparent; background: linear-gradient(100deg, #fff 14%, var(--cyan) 62%, #85a5ff 100%); -webkit-background-clip: text; background-clip: text; }
    .hero-copy { max-width: 580px; margin: 26px 0 32px; color: var(--muted); font-size: clamp(1rem, 2vw, 1.18rem); }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 52px; padding: 0 21px; border: 1px solid transparent; border-radius: 14px; font-size: 14px; font-weight: 800; transition: transform 180ms var(--ease), box-shadow 180ms var(--ease), border-color 180ms var(--ease), background 180ms var(--ease); }
    .button:hover { transform: translateY(-3px); }
    .button:active { transform: scale(.97); }
    .button-primary { color: #07111f; background: linear-gradient(115deg, #6be5ff, #7194ff); box-shadow: 0 14px 34px rgba(81,216,255,.2); }
    .button-primary:hover { box-shadow: 0 18px 44px rgba(81,216,255,.34); }
    .button-secondary { border-color: var(--line); color: var(--muted); background: rgba(255,255,255,.035); }
    .button-secondary:hover { border-color: rgba(81,216,255,.38); color: var(--text); background: rgba(81,216,255,.08); }

    .hero-visual { position: relative; }
    .glow { position: absolute; inset: 11% 8%; border-radius: 50%; background: rgba(77,124,255,.28); filter: blur(65px); }
    .terminal { position: relative; padding: 22px; border: 1px solid var(--line); border-radius: 24px; background: linear-gradient(145deg, rgba(22, 46, 77, .78), rgba(8, 20, 35, .78)); box-shadow: var(--shadow); backdrop-filter: blur(18px); }
    .terminal-head { display: flex; align-items: center; justify-content: space-between; padding-bottom: 19px; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 11px; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; }
    .terminal-lights { display: flex; gap: 6px; }
    .terminal-lights i { width: 8px; height: 8px; border-radius: 50%; background: #ff6b81; }
    .terminal-lights i:nth-child(2) { background: #ffd166; }
    .terminal-lights i:nth-child(3) { background: var(--green); }
    .pulse-card { display: grid; grid-template-columns: 56px 1fr; align-items: center; gap: 15px; margin: 22px 0; padding: 16px; border-radius: 16px; background: rgba(102,227,165,.08); }
    .pulse-icon { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 17px; background: rgba(102,227,165,.14); color: var(--green); }
    .pulse-icon svg { width: 27px; height: 27px; fill: none; stroke: currentColor; stroke-width: 1.8; }
    .pulse-card strong { display: block; font-size: 16px; }
    .pulse-card span { display: block; margin-top: 4px; color: var(--muted); font-size: 12px; }
    .code-line { display: flex; justify-content: space-between; gap: 20px; padding: 12px 0; color: var(--muted); font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .code-line b { color: var(--cyan); font-weight: 600; }
    .code-line strong { color: var(--text); font-weight: 600; }

    .section { padding: 34px 0 90px; }
    .section-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 26px; }
    .section-heading h2 { margin: 0; font-size: clamp(1.7rem, 4vw, 2.25rem); letter-spacing: -.05em; }
    .section-heading p { max-width: 430px; margin: 0; color: var(--muted); font-size: 14px; text-align: right; }
    .feature-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .feature { min-height: 188px; padding: 22px; border: 1px solid var(--line); border-radius: 18px; background: var(--card); backdrop-filter: blur(12px); transition: transform 180ms var(--ease), border-color 180ms var(--ease), background 180ms var(--ease); }
    .feature:hover { transform: translateY(-5px); border-color: rgba(81,216,255,.35); background: var(--card-strong); }
    .feature-icon { display: grid; place-items: center; width: 38px; height: 38px; margin-bottom: 20px; border-radius: 12px; color: var(--cyan); background: rgba(81,216,255,.11); }
    .feature-icon svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.8; }
    .feature h3 { margin: 0 0 8px; font-size: 15px; }
    .feature p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.6; }

    .status-panel { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; padding: 28px; border: 1px solid rgba(81,216,255,.2); border-radius: 22px; background: linear-gradient(120deg, rgba(81,216,255,.09), rgba(77,124,255,.08)); }
    .status-panel h2 { margin: 0 0 7px; font-size: 22px; letter-spacing: -.04em; }
    .status-panel p { max-width: 500px; margin: 0; color: var(--muted); font-size: 14px; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .metric { padding: 14px; border: 1px solid var(--line); border-radius: 14px; background: rgba(7,17,31,.3); }
    .metric span { display: block; margin-bottom: 7px; color: var(--muted); font-size: 11px; }
    .metric strong { display: block; font-size: 15px; }
    .about-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 14px; }
    .about-card { padding: 28px; border: 1px solid var(--line); border-radius: 20px; background: var(--card); }
    .about-card h2 { margin: 0 0 12px; font-size: clamp(1.7rem, 4vw, 2.25rem); letter-spacing: -.05em; }
    .about-card p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.75; }
    .service-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 0; padding: 0; list-style: none; }
    .service-list li { display: flex; align-items: flex-start; gap: 9px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; color: var(--muted); font-size: 13px; }
    .service-list li::before { content: "✓"; color: var(--green); font-weight: 800; }
    .about-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
    .about-meta span { padding: 7px 10px; border: 1px solid rgba(81,216,255,.2); border-radius: 999px; color: var(--cyan); background: rgba(81,216,255,.07); font-size: 11px; font-weight: 750; }
    footer { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 0 30px; color: var(--muted); font-size: 12px; }
    .footer-links { display: flex; flex-wrap: wrap; gap: 18px; }
    .footer-links a { transition: color 180ms ease; }
    .footer-links a:hover { color: var(--cyan); }
    @media (max-width: 900px) { .hero { grid-template-columns: 1fr; gap: 35px; padding-top: 35px; } .hero-visual { max-width: 620px; } .feature-grid { grid-template-columns: repeat(2, 1fr); } .about-grid, .status-panel { grid-template-columns: 1fr; } .section-heading { align-items: start; flex-direction: column; } .section-heading p { text-align: left; } }
    @media (max-width: 560px) { .shell { width: min(100% - 28px, 1120px); } .topbar { padding: 18px 0; } .brand small { display: none; } .status { padding: 8px 10px; font-size: 10px; } .hero { min-height: auto; padding: 50px 0 70px; } h1 { font-size: clamp(2.9rem, 15vw, 4.5rem); } .actions, .button { width: 100%; } .feature-grid, .service-list, .metrics { grid-template-columns: 1fr; } .about-card, .status-panel { padding: 20px; } footer { align-items: flex-start; flex-direction: column; } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; } }
  </style>
</head>
<body>
  <header class="shell topbar">
    <a class="brand" href="${BOT_URL}" aria-label="Open FastCash Bot in Telegram">
      <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m20.5 4.3-3.1 15.1c-.2 1.1-.8 1.4-1.7.9l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-8c.4-.3-.1-.5-.6-.2L5.3 13.2.7 11.8c-1-.3-1-1 .2-1.5L18.8 3c.9-.3 1.9.2 1.7 1.3Z"/></svg></span>
      <span>FastCash Bot<small>Telegram assistant</small></span>
    </a>
    <div class="status"><span class="status-dot"></span> Webhook status: active</div>
  </header>

  <main>
    <section class="shell hero">
      <div>
        <div class="eyebrow">Built for the edge</div>
        <h1>Your ultimate <span>Telegram assistant.</span></h1>
        <p class="hero-copy">Fast, secure, and always ready when you are. FastCash Bot runs on Cloudflare Workers for responsive help from the nearest edge location.</p>
        <div class="actions">
          <a class="button button-primary" href="${BOT_URL}" target="_blank" rel="noopener noreferrer">Open in Telegram <span aria-hidden="true">↗</span></a>
          <a class="button button-secondary" href="#status">View live status</a>
        </div>
      </div>
      <div class="hero-visual" aria-label="Bot operational status preview">
        <div class="glow"></div>
        <div class="terminal">
          <div class="terminal-head"><span>fastcash / system</span><span class="terminal-lights"><i></i><i></i><i></i></span></div>
          <div class="pulse-card"><div class="pulse-icon"><svg viewBox="0 0 24 24"><path d="M4 12h3l2-6 4 12 2-6h5"/></svg></div><div><strong>Everything is online</strong><span>Cloudflare edge connection is healthy</span></div></div>
          <div class="code-line"><span><b>›</b> webhook</span><strong>active</strong></div>
          <div class="code-line"><span><b>›</b> response</span><strong>&lt; 50 ms</strong></div>
          <div class="code-line"><span><b>›</b> location</span><strong>${safeColo} edge</strong></div>
          <div class="code-line"><span><b>›</b> uptime</span><strong>24 / 7</strong></div>
        </div>
      </div>
    </section>

    <section class="shell section" aria-labelledby="features-title">
      <div class="section-heading"><h2 id="features-title">Made to move at your pace.</h2><p>Reliable infrastructure and a simple Telegram-first experience, without the usual waiting.</p></div>
      <div class="feature-grid">
        <article class="feature"><div class="feature-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg></div><h3>Always available</h3><p>Designed for 24/7 access, so your assistant is ready whenever you need it.</p></article>
        <article class="feature"><div class="feature-icon"><svg viewBox="0 0 24 24"><path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z"/></svg></div><h3>Cloudflare speed</h3><p>Requests are handled close to you through Cloudflare’s global edge network.</p></article>
        <article class="feature"><div class="feature-icon"><svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg></div><h3>Secure by design</h3><p>Protected webhook routes and production-minded security controls keep the service dependable.</p></article>
        <article class="feature"><div class="feature-icon"><svg viewBox="0 0 24 24"><path d="M4 19V5m0 14h16"/><path d="m7 15 3-4 3 2 5-6"/></svg></div><h3>Clear workflows</h3><p>Get to the right action quickly with focused flows and helpful bot commands.</p></article>
      </div>
    </section>

    <section class="shell section" id="about" aria-labelledby="about-title">
      <div class="about-grid">
        <article class="about-card">
          <div class="eyebrow">About FastCash Bot</div>
          <h2 id="about-title">A simple, trusted way to manage your Telegram journey.</h2>
          <p>FastCash Bot is a Telegram-first assistant built to make everyday account and support actions easier. From guided deposits and withdrawals to referrals, history, and help, everything is organized in one familiar chat experience.</p>
          <div class="about-meta"><span>English</span><span>සිංහල</span><span>தமிழ்</span><span>Telegram-first</span></div>
        </article>
        <article class="about-card">
          <div class="eyebrow">What we offer</div>
          <ul class="service-list">
            <li>Guided deposit and withdrawal workflows</li>
            <li>Receipt submission and transaction updates</li>
            <li>Referral dashboard and account history</li>
            <li>Automated sports tips and scheduled updates</li>
            <li>Multilingual menus and helpful commands</li>
            <li>Direct help through Telegram support</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="shell section" id="status" aria-labelledby="status-title">
      <div class="status-panel">
        <div><h2 id="status-title">Live edge status</h2><p>The landing page and bot webhook are served from Cloudflare’s distributed network, helping keep response times low and availability high.</p></div>
        <div class="metrics"><div class="metric"><span>Webhook</span><strong><span class="status-dot" style="display:inline-block;margin-right:6px"></span>Online</strong></div><div class="metric"><span>Response target</span><strong>&lt; 50 ms</strong></div><div class="metric"><span>Edge location</span><strong>${safeColo}</strong></div></div>
      </div>
    </section>
  </main>

  <footer class="shell"><span>© 2026 FastCash Bot. Built on Cloudflare Workers.</span><nav class="footer-links" aria-label="Footer links"><a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">GitHub</a><a href="${safeSupportUrl}" target="_blank" rel="noopener noreferrer">${safeSupportLabel}</a><a href="${BOT_URL}" target="_blank" rel="noopener noreferrer">Telegram</a></nav></footer>
</body>
</html>`;
}

export { GITHUB_URL, BOT_URL };
