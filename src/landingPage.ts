import type { Env } from "./types";

const GITHUB_URL = "https://github.com/Lakmal2078/Tele-bot-cloudflared-main";
const BOT_URL = "https://t.me/fast_1xbetcash_bot";

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeText(value: string): string { return escapeAttribute(value); }

function escapeJsonForScript(value: string): string {
  return value.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function renderLandingPage(env: Env, request: Request): string {
  const channelUrl = env.CHANNEL_URL?.trim() || "https://t.me/fast_xbet_official_tips";
  const channelUsername = env.CHANNEL_USERNAME?.trim() || "@fast_xbet_official_tips";
  const xbetLink = env.XBET_LINK?.trim() || "#";
  const promo = env.XBET_PROMO_CODE?.trim() || "VGSL";
  const minTx = parseInt(env.MIN_TRANSACTION_LKR || "1000", 10) || 1000;
  const maxTx = parseInt(env.MAX_TRANSACTION_LKR || "500000", 10) || 500000;

  const colo = escapeText(String((request as Request & { cf?: { colo?: string } }).cf?.colo || "EDGE"));
  const bot = escapeAttribute(BOT_URL);
  const channel = escapeAttribute(channelUrl);
  const xbet = escapeAttribute(xbetLink);
  const channelName = escapeText(channelUsername);
  const code = escapeText(promo);

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
        "Sri Lanka Telegram service for free betting tips and a fast cash deposit/withdraw agent.",
    })
  );

  return `<!doctype html><html lang="si"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Fast xBet Cash 🇱🇰 — Free Betting Tips & Cash Agent</title><meta name="description" content="ශ්‍රී ලංකාවේ වේගවත් Free Betting Tips & Cash Agent සේවාව. Telegram හරහා deposit, withdraw, සහ ස්වයංක්‍රීය betting tips ලබාගන්න."><meta name="robots" content="index, follow"><meta name="theme-color" content="#0a0e17"><link rel="canonical" href="${pageUrlAttr}"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E"><meta property="og:type" content="website"><meta property="og:title" content="Fast xBet Cash 🇱🇰 — Free Betting Tips & Cash Agent"><meta property="og:description" content="ස්වයංක්‍රීය Free Betting Tips, වේගවත් Deposit & Withdraw සේවාව — සියල්ල Telegram හරහා."><meta property="og:url" content="${pageUrlAttr}"><meta property="og:locale" content="si_LK"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="Fast xBet Cash 🇱🇰"><meta name="twitter:description" content="ස්වයංක්‍රීය Free Betting Tips, වේගවත් Deposit & Withdraw — Telegram හරහා."><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet"><script type="application/ld+json">${jsonLd}</script><style>
:root{--bg:#070b12;--bg2:#0f172a;--card:rgba(26,34,53,0.7);--card-border:rgba(255,255,255,0.08);--accent:#00e676;--accent-glow:rgba(0,230,118,0.25);--accent2:#00b0ff;--accent2-glow:rgba(0,176,255,0.25);--gold:#ffd700;--text:#f1f5f9;--muted:#94a3b8;--line:rgba(255,255,255,0.08);--radius:18px;--radius-sm:12px}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:'Noto Sans Sinhala','Plus Jakarta Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;overflow-x:hidden}a{color:inherit;text-decoration:none}a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid var(--accent2);outline-offset:2px}.skip-link{position:absolute;left:-9999px;top:0;background:var(--accent);color:#000;padding:10px 16px;border-radius:0 0 8px 0;z-index:99;font-weight:700}.skip-link:focus{left:0}.navbar{position:sticky;top:0;z-index:50;background:rgba(7,11,18,0.85);backdrop-filter:blur(16px);border-bottom:1px solid var(--line);padding:14px 24px;display:flex;align-items:center;justify-content:space-between}.logo{font-size:1.35rem;font-weight:800;display:flex;align-items:center;gap:8px}.logo span{color:var(--accent)}.nav-links{display:flex;gap:22px;align-items:center}.nav-links a{color:var(--muted);font-size:.92rem;font-weight:600;transition:color .2s}.nav-links a:hover{color:var(--text)}.langs{display:flex;gap:6px}.langs button{border:1px solid var(--card-border);background:rgba(255,255,255,0.05);color:var(--muted);border-radius:999px;padding:5px 11px;cursor:pointer;font-weight:600;font-size:.82rem;transition:all .2s}.langs button.active{background:var(--accent);color:#000;border-color:var(--accent)}.hero{text-align:center;padding:70px 20px 48px;background:radial-gradient(ellipse at 50% -10%,rgba(0,230,118,0.18),transparent 70%),radial-gradient(ellipse at 80% 20%,rgba(0,176,255,0.12),transparent 50%)}.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(0,230,118,0.1);border:1px solid rgba(0,230,118,0.3);color:var(--accent);padding:6px 16px;border-radius:999px;font-size:.82rem;font-weight:700;margin-bottom:20px}.hero-badge .pulse{width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent);animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}.hero h1{font-size:clamp(2.4rem,7vw,4.2rem);margin:0 0 16px;background:linear-gradient(135deg,#ffffff 20%,var(--accent) 70%,var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;letter-spacing:-0.5px}.hero p{color:var(--muted);font-size:1.15rem;max-width:580px;margin:0 auto 32px}.hero-buttons{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 30px;border-radius:999px;font-weight:700;font-size:1rem;border:0;transition:transform .18s cubic-bezier(0.16,1,0.3,1),box-shadow .2s;cursor:pointer}.btn:hover{transform:translateY(-2px)}.btn-primary{background:linear-gradient(135deg,var(--accent),#00c853);color:#061b0d;box-shadow:0 6px 24px var(--accent-glow)}.btn-primary:hover{box-shadow:0 8px 30px rgba(0,230,118,0.4)}.btn-secondary{background:rgba(255,255,255,0.06);color:var(--text);border:1px solid rgba(255,255,255,0.14);backdrop-filter:blur(8px)}.btn-secondary:hover{background:rgba(255,255,255,0.1)}.live-ticker{max-width:960px;margin:0 auto 30px;padding:0 20px}.ticker-card{background:linear-gradient(135deg,rgba(0,230,118,0.06),rgba(0,176,255,0.06));border:1px solid rgba(0,230,118,0.2);border-radius:var(--radius-sm);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;box-shadow:0 8px 24px rgba(0,0,0,0.3)}.ticker-left{display:flex;align-items:center;gap:12px}.ticker-dot{width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent);animation:pulse 1.8s infinite}.ticker-right{display:flex;align-items:center;gap:10px;font-size:.9rem;color:var(--muted)}.ticker-timer{font-weight:800;color:var(--accent2);background:rgba(0,176,255,0.12);padding:4px 10px;border-radius:8px;font-variant-numeric:tabular-nums}.stats{display:flex;justify-content:center;gap:36px;padding:10px 20px 48px;flex-wrap:wrap}.stat{text-align:center}.stat-num{font-size:2.1rem;font-weight:800;color:var(--accent)}.stat-label{color:var(--muted);font-size:.85rem;font-weight:600}.section{padding:54px 20px;max-width:980px;margin:auto}.section-title{text-align:center;font-size:2rem;margin:0 0 8px;font-weight:800}.section-sub{text-align:center;color:var(--muted);margin:0 auto 40px;max-width:540px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:22px}.card{background:var(--card);backdrop-filter:blur(12px);border-radius:var(--radius);padding:28px 24px;border:1px solid var(--card-border);transition:transform .2s,border-color .2s,box-shadow .2s}.card:hover{transform:translateY(-4px);border-color:rgba(0,230,118,0.3);box-shadow:0 12px 30px rgba(0,0,0,0.4)}.card-icon{font-size:2.2rem}.card h3{font-size:1.18rem;margin:14px 0 8px;font-weight:700}.card p{color:var(--muted);font-size:.92rem;margin:0}.steps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:20px}.step-card{background:var(--card);backdrop-filter:blur(10px);border:1px solid var(--card-border);border-radius:var(--radius);padding:28px 24px;position:relative;overflow:hidden}.step-badge{position:absolute;top:16px;right:18px;font-size:2.6rem;font-weight:800;color:rgba(255,255,255,0.06);line-height:1}.step-icon{font-size:2rem;margin-bottom:12px}.step-card h3{font-size:1.15rem;margin:0 0 8px;font-weight:700}.step-card p{color:var(--muted);font-size:.9rem;margin:0}.step-tabs{display:flex;justify-content:center;gap:10px;margin-bottom:28px}.step-tab-btn{background:rgba(255,255,255,0.05);border:1px solid var(--card-border);color:var(--muted);padding:9px 22px;border-radius:999px;font-weight:700;font-size:.95rem;cursor:pointer;transition:all .2s}.step-tab-btn.active{background:linear-gradient(135deg,var(--accent2),#0084c8);color:#fff;border-color:transparent}.calc-container{max-width:620px;margin:0 auto;background:var(--card);backdrop-filter:blur(16px);border:1px solid var(--card-border);border-radius:var(--radius);padding:34px 28px;box-shadow:0 16px 40px rgba(0,0,0,0.4)}.calc-toggle{display:flex;background:rgba(255,255,255,0.04);border-radius:12px;padding:4px;gap:4px;margin-bottom:22px}.calc-btn{flex:1;padding:10px;border-radius:10px;border:0;background:transparent;color:var(--muted);font-weight:700;cursor:pointer;font-size:.95rem;transition:all .2s}.calc-btn.active{background:var(--accent);color:#061b0d;box-shadow:0 4px 16px var(--accent-glow)}.calc-input-group{margin-bottom:20px}.calc-label{display:block;color:var(--muted);font-size:.88rem;margin-bottom:8px;font-weight:600}.calc-input{width:100%;background:rgba(0,0,0,0.3);border:1px solid var(--card-border);border-radius:12px;padding:14px 18px;font-size:1.25rem;font-weight:700;color:#fff;font-family:inherit;transition:border-color .2s}.calc-input:focus{border-color:var(--accent);outline:none}.calc-presets{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.calc-preset{background:rgba(255,255,255,0.05);border:1px solid var(--card-border);border-radius:8px;padding:5px 12px;color:var(--muted);font-size:.82rem;font-weight:600;cursor:pointer;transition:background .2s}.calc-preset:hover{background:rgba(255,255,255,0.12);color:#fff}.calc-summary{background:rgba(0,0,0,0.25);border-radius:14px;padding:18px 20px;margin-top:20px;display:flex;flex-direction:column;gap:10px}.calc-row{display:flex;justify-content:space-between;align-items:center;font-size:.92rem;color:var(--muted)}.calc-row span:last-child{font-weight:700;color:var(--text)}.calc-row.total{border-top:1px solid var(--line);padding-top:10px;margin-top:2px;font-size:1.05rem}.calc-row.total span:last-child{color:var(--accent);font-size:1.25rem}.tips-schedule,.pay-grid{display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-top:24px}.tip-time,.pay-item{background:var(--card);backdrop-filter:blur(8px);border-radius:14px;padding:18px 26px;text-align:center;border:1px solid rgba(0,176,255,0.2);min-width:125px;transition:transform .2s}.tip-time:hover,.pay-item:hover{transform:translateY(-3px)}.tip-time-icon{font-size:1.6rem;margin-bottom:4px}.tip-time-val{font-size:1.4rem;font-weight:800;color:var(--accent2)}.tip-time-label{font-size:.82rem;color:var(--muted);font-weight:600}.pay-item{display:flex;align-items:center;gap:10px;font-weight:700;font-size:1rem}.promo-box{background:linear-gradient(135deg,rgba(255,215,0,0.08),rgba(0,230,118,0.06));border:1px solid rgba(255,215,0,0.3);border-radius:var(--radius);padding:40px 24px;text-align:center;max-width:640px;margin:auto;box-shadow:0 12px 36px rgba(0,0,0,0.35)}.promo-code{display:inline-block;font-size:2.2rem;font-weight:800;letter-spacing:5px;background:var(--gold);color:#0a0e17;padding:10px 32px;border-radius:12px;margin:18px 0;cursor:pointer;user-select:all;border:0;font-family:inherit;box-shadow:0 6px 20px rgba(255,215,0,0.35);transition:transform .15s}.promo-code:hover{transform:scale(1.03)}.faq{max-width:740px;margin:auto}.faq-item{background:var(--card);border:1px solid var(--card-border);border-radius:14px;margin-bottom:12px;overflow:hidden;transition:border-color .2s}.faq-item:hover{border-color:rgba(255,255,255,0.18)}.faq-item summary{padding:18px 22px;cursor:pointer;font-weight:700;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px}.faq-item summary::-webkit-details-marker{display:none}.faq-item summary::after{content:'+';font-size:1.4rem;color:var(--accent);flex-shrink:0;transition:transform .2s}.faq-item[open] summary::after{content:'−';transform:rotate(180deg)}.faq-item p{padding:0 22px 20px;color:var(--muted);margin:0;font-size:.94rem}.cta{text-align:center;padding:70px 20px;background:radial-gradient(ellipse at center,rgba(0,230,118,0.14),transparent 70%)}.footer{text-align:center;padding:36px 20px 90px;border-top:1px solid var(--line);color:var(--muted);font-size:.85rem}.footer a{color:var(--accent2)}.disclaimer{margin:14px auto 0;font-size:.78rem;color:#718096;max-width:680px}.mobile-bar{display:none;position:fixed;bottom:0;left:0;right:0;z-index:90;background:rgba(7,11,18,0.92);backdrop-filter:blur(18px);border-top:1px solid var(--line);padding:10px 16px;box-shadow:0 -6px 24px rgba(0,0,0,0.5)}.mobile-bar-inner{display:flex;gap:10px;max-width:480px;margin:auto}.mobile-bar .btn{flex:1;padding:12px 14px;font-size:.9rem}@media(max-width:768px){.mobile-bar{display:block}.nav-links>a{display:none}.navbar{padding:12px 16px}.hero{padding:50px 16px 36px}.section{padding:42px 16px}.stats{gap:22px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.card,.btn,.promo-code,.tip-time,.pulse{transition:none;animation:none}}
</style></head><body><a class="skip-link" href="#main">ප්‍රධාන අන්තර්ගතයට යන්න</a><nav class="navbar" aria-label="ප්‍රධාන navigation"><div class="logo"><span aria-hidden="true">⚡</span> Fast<span>xBet</span> Cash</div><div class="nav-links"><a href="#how" data-t="howNav">භාවිතා කරන්නේ කෙසේද</a><a href="#calculator" data-t="calcNav">Calculator</a><a href="#features" data-t="featuresNav">විශේෂාංග</a><a href="#tips" data-t="tipsNav">Free Tips</a><a href="#promo" data-t="promoNav">Promo Code</a><a href="#payments" data-t="paymentsNav">Payments</a><div class="langs" role="group" aria-label="භාෂාව තෝරන්න"><button data-lang="si" class="active" aria-pressed="true">සිං</button><button data-lang="en" aria-pressed="false">EN</button><button data-lang="ta" aria-pressed="false">த</button></div></div></nav><main id="main"><section class="hero"><div class="hero-badge"><span class="pulse"></span><span data-t="badge">🇱🇰 24/7 Active Bot & Cash Agent</span></div><h1>Fast xBet Cash</h1><p data-t="hero">ස්වයංක්‍රීය Free Betting Tips, වේගවත් Deposit & Withdraw සේවාව — සියල්ල Telegram හරහා, ඔබේ දුරකථනයෙන්.</p><div class="hero-buttons"><a href="${bot}" class="btn btn-primary" target="_blank" rel="noopener" data-t="start">🚀 Bot එක පටන් ගන්න</a><a href="${channel}" class="btn btn-secondary" target="_blank" rel="noopener" data-t="channel">📢 Tips Channel</a></div></section><div class="live-ticker"><div class="ticker-card"><div class="ticker-left"><div class="ticker-dot"></div><div><strong data-t="statusText">System Status: Online</strong><div style="font-size:0.8rem;color:var(--muted)" data-t="statusSub">Telegram Bot & Processing Active</div></div></div><div class="ticker-right"><span data-t="nextTipsLabel">ඊළඟ Tips:</span><span class="ticker-timer" id="nextTipCountdown">00:00:00</span></div></div></div><div class="stats"><div class="stat"><div class="stat-num" aria-hidden="true">3×</div><div class="stat-label" data-t="daily">දිනකට Tips</div></div><div class="stat"><div class="stat-num" aria-hidden="true">2-5m</div><div class="stat-label" data-t="speed">සාමාන්‍ය කාලය</div></div><div class="stat"><div class="stat-num" aria-hidden="true">0%</div><div class="stat-label" data-t="fee">ගාස්තු රහිතයි</div></div><div class="stat"><div class="stat-num" aria-hidden="true">100%</div><div class="stat-label" data-t="secure">ආරක්ෂිත</div></div></div><section class="section" id="how"><h2 class="section-title" data-t="howTitle">භාවිතා කරන්නේ කෙසේද?</h2><p class="section-sub" data-t="howSub">මිනිත්තු කිහිපයකින් ඉතා පහසුවෙන් ගනුදෙනු සිදුකරන්න</p><div class="step-tabs"><button type="button" class="step-tab-btn active" id="tabDeposit" data-t="tabDep">💰 Deposit පියවර</button><button type="button" class="step-tab-btn" id="tabWithdraw" data-t="tabWd">💸 Withdraw පියවර</button></div><div class="steps-grid" id="depositSteps"><div class="step-card"><div class="step-badge">1</div><div class="step-icon">🤖</div><h3 data-t="step1dTitle">Bot එක ආරම්භ කරන්න</h3><p data-t="step1dDesc">Telegram Bot වෙත ගොස් /deposit command එක ලබාදී ඔබේ Player ID ඇතුළත් කරන්න.</p></div><div class="step-card"><div class="step-badge">2</div><div class="step-icon">📲</div><h3 data-t="step2dTitle">මුදල් ගෙවා Receipt එක එවන්න</h3><p data-t="step2dDesc">eZ Cash, mCash හෝ Bank Transfer මගින් ගෙවා රිසිට්පතේ ඡායාරූපය bot වෙත upload කරන්න.</p></div><div class="step-card"><div class="step-badge">3</div><div class="step-icon">⚡</div><h3 data-t="step3dTitle">මිනිත්තු 5න් ගිණුමට</h3><p data-t="step3dDesc">Admin විසින් තහවුරු කළ වහාම ඔබේ xBet ගිණුමට මුදල් ක්ෂණිකව බැර වේ.</p></div></div><div class="steps-grid" id="withdrawSteps" style="display:none"><div class="step-card"><div class="step-badge">1</div><div class="step-icon">📝</div><h3 data-t="step1wTitle">Withdraw ඉල්ලීම යොමු කරන්න</h3><p data-t="step1wDesc">Bot හි /withdraw තෝරා Player ID, අවශ්‍ය මුදල සහ ගෙවිය යුතු ගිණුම් අංකය ඇතුළත් කරන්න.</p></div><div class="step-card"><div class="step-badge">2</div><div class="step-icon">🔒</div><h3 data-t="step2wTitle">Security Code එක ලබාදෙන්න</h3><p data-t="step2wDesc">ආරක්ෂාව තහවුරු කිරීම සඳහා xBet වෙතින් ලැබෙන withdrawal security code එක ඇතුළත් කරන්න.</p></div><div class="step-card"><div class="step-badge">3</div><div class="step-icon">🎉</div><h3 data-t="step3wTitle">මුදල් ඔබේ අතට</h3><p data-t="step3wDesc">මිනිත්තු කිහිපයක් ඇතුළත ඔබේ බැංකු ගිණුමට හෝ wallet එකට මුදල් බැර වේ.</p></div></div></section><section class="section" id="calculator"><h2 class="section-title" data-t="calcTitle">ගනුදෙනු Calculator</h2><p class="section-sub" data-t="calcSub">ඔබේ මුදල ඇතුළත් කර ගනුදෙනු සීමාවන් සහ විස්තර පරීක්ෂා කරන්න</p><div class="calc-container"><div class="calc-toggle"><button type="button" class="calc-btn active" id="calcDepBtn" data-t="calcDep">Deposit</button><button type="button" class="calc-btn" id="calcWdBtn" data-t="calcWd">Withdraw</button></div><div class="calc-input-group"><label for="calcAmount" class="calc-label" data-t="calcInputLabel">මුදල (LKR වලින්):</label><input type="number" id="calcAmount" class="calc-input" value="5000" min="${minTx}" max="${maxTx}" step="500"><div class="calc-presets"><button type="button" class="calc-preset" data-val="1000">Rs. 1,000</button><button type="button" class="calc-preset" data-val="5000">Rs. 5,000</button><button type="button" class="calc-preset" data-val="10000">Rs. 10,000</button><button type="button" class="calc-preset" data-val="50000">Rs. 50,000</button></div></div><div class="calc-summary"><div class="calc-row"><span data-t="calcMin">අවම සීමාව:</span><span>Rs. ${minTx.toLocaleString()}</span></div><div class="calc-row"><span data-t="calcMax">උපරිම සීමාව:</span><span>Rs. ${maxTx.toLocaleString()}</span></div><div class="calc-row"><span data-t="calcFee">සේවා ගාස්තුව (Fee):</span><span style="color:var(--accent)">0.00 LKR (නොමිලේ)</span></div><div class="calc-row"><span data-t="calcTime">ඇස්තමේන්තුගත කාලය:</span><span style="color:var(--accent2)">මිනිත්තු 2 - 5</span></div><div class="calc-row total"><span data-t="calcTotal">මුළු ගනුදෙනු වටිනාකම:</span><span id="calcTotalVal">Rs. 5,000</span></div></div><div style="text-align:center;margin-top:20px"><a href="${bot}" class="btn btn-primary" target="_blank" rel="noopener" style="width:100%" data-t="calcAction">⚡ Bot එකෙන් දැන්ම කරගන්න</a></div></div></section><section class="section" id="features"><h2 class="section-title" data-t="featuresTitle">විශේෂාංග</h2><p class="section-sub" data-t="featuresSub">අපගේ Bot එක ඔබට ලබා දෙන සියලු සේවාවන්</p><div class="grid"><article class="card"><div class="card-icon" aria-hidden="true">⚽</div><h3 data-t="f1t">Free Betting Tips</h3><p data-t="f1p">EPL, Champions League, NBA, ATP Tennis — විශ්ලේෂණය කළ tips දිනකට 3 වරයි.</p></article><article class="card"><div class="card-icon" aria-hidden="true">💰</div><h3 data-t="f2t">Deposit & Withdraw</h3><p data-t="f2p">Rs. ${minTx.toLocaleString()} සිට Rs. ${maxTx.toLocaleString()} දක්වා — වේගවත් හා ආරක්ෂිත ගනුදෙනු.</p></article><article class="card"><div class="card-icon" aria-hidden="true">📸</div><h3 data-t="f3t">Receipt Upload</h3><p data-t="f3p">Payment receipt screenshot එකක් එවීමෙන් deposit එක තහවුරු කරගන්න.</p></article><article class="card"><div class="card-icon" aria-hidden="true">🎫</div><h3 data-t="f4t">User Dashboard & Support</h3><p data-t="f4p">Transaction status, support tickets, referrals සහ account details එක තැනකින් බලන්න.</p></article><article class="card"><div class="card-icon" aria-hidden="true">🔔</div><h3 data-t="f5t">Auto Notifications</h3><p data-t="f5p">නව tips, transaction updates සහ වැදගත් දැන්වීම් ස්වයංක්‍රීයව ලබාගන්න.</p></article><article class="card"><div class="card-icon" aria-hidden="true">🛡️</div><h3 data-t="f6t">Responsible Gaming</h3><p data-t="f6p">18+ පමණි. Limits, self-exclusion සහ promotional opt-out support සමඟ වගකීමෙන් භාවිතා කරන්න.</p></article></div></section><section class="section" id="tips"><h2 class="section-title" data-t="tipsTitle">Free Betting Tips වේලාවන්</h2><p class="section-sub" data-t="tipsSub">ශ්‍රී ලංකා කාලය අනුව Official Channel එකට tips</p><div class="tips-schedule"><div class="tip-time"><div class="tip-time-icon" aria-hidden="true">🌅</div><div class="tip-time-val">08:00</div><div class="tip-time-label" data-t="morning">උදය</div></div><div class="tip-time"><div class="tip-time-icon" aria-hidden="true">☀️</div><div class="tip-time-val">12:00</div><div class="tip-time-label" data-t="noon">දවල්</div></div><div class="tip-time"><div class="tip-time-icon" aria-hidden="true">🌆</div><div class="tip-time-val">18:00</div><div class="tip-time-label" data-t="evening">සවස</div></div></div><div style="text-align:center;margin-top:24px"><a href="${channel}" class="btn btn-secondary" target="_blank" rel="noopener" data-t="joinChannel">📢 Channel එකට එකතු වන්න</a></div></section><section class="section" id="promo"><h2 class="section-title" data-t="promoTitle">🎁 විශේෂ Promo Code</h2><p class="section-sub" data-t="promoSub">xBet හි register වීමේදී මෙම code එක භාවිතා කරන්න</p><div class="promo-box"><p style="color:var(--muted)" data-t="promoLabel">ඔබේ Promo Code</p><button type="button" class="promo-code" id="promoCode" aria-label="Promo code copy කරන්න">${code}</button><p style="color:var(--muted);font-size:.85rem" id="copyMsg" data-t="copyHint">ක්ලික් කර copy කරගන්න</p><a href="${xbet}" class="btn btn-primary" target="_blank" rel="noopener" style="margin-top:16px" data-t="registerBtn">🎲 xBet හි Register වන්න</a></div></section><section class="section" id="payments"><h2 class="section-title" data-t="paymentsTitle">💳 ගෙවීමේ ක්‍රම</h2><p class="section-sub" data-t="paymentsSub">Deposit & Withdraw සඳහා පහත ක්‍රම භාවිතා කළ හැක</p><div class="pay-grid"><div class="pay-item">💬 WhatsApp</div><div class="pay-item">💵 eZ Cash</div><div class="pay-item">🏦 Bank</div><div class="pay-item">📱 mCash</div></div></section><section class="section faq" id="faq"><h2 class="section-title" data-t="faqTitle">❓ නිතර අසන ප්‍රශ්න</h2><details class="faq-item"><summary data-t="faq1q">Deposit එකක් කරන්නේ කොහොමද?</summary><p data-t="faq1a">Bot එකේ /deposit command එක භාවිතා කර, ගෙවීම් ක්‍රමය තෝරා, receipt screenshot එක upload කරන්න.</p></details><details class="faq-item"><summary data-t="faq2q">Withdrawal එකක් process වෙන්න කොපමණ වෙලාවක් ගතවෙයිද?</summary><p data-t="faq2a">සාමාන්‍යයෙන් විනාඩි 2ත් 5ත් අතර කාලයකදී admin විසින් සත්‍යාපනය කර process කරනු ලැබේ.</p></details><details class="faq-item"><summary data-t="faq3q">Promo code එක අනිවාර්යද?</summary><p data-t="faq3a">නැත, නමුත් register වීමේදී එය භාවිතා කිරීමෙන් අමතර ප්‍රතිලාභ ලබාගත හැක.</p></details><details class="faq-item"><summary data-t="faq4q">අවම සහ උපරිම ගනුදෙනු සීමාවන් මොනවාද?</summary><p data-t="faq4a">අවම සහ උපරිම නියමිත සීමාවන් තුළ ඔබට පහසුවෙන් ගනුදෙනු සිදුකළ හැක.</p></details></section><section class="cta"><h2 data-t="ctaTitle">දැන්ම පටන් ගන්න! 🚀</h2><p data-t="ctaSub">Telegram Bot එක හරහා සියලු සේවාවන් ලබාගන්න — වේගවත්, ආරක්ෂිත, පහසු.</p><a href="${bot}" class="btn btn-primary" target="_blank" rel="noopener" data-t="ctaBtn">🤖 Bot එක ආරම්භ කරන්න</a></section></main><div class="mobile-bar"><div class="mobile-bar-inner"><a href="${bot}" class="btn btn-primary" target="_blank" rel="noopener" data-t="start">🤖 Open Bot</a><a href="${channel}" class="btn btn-secondary" target="_blank" rel="noopener" data-t="channel">📢 Tips Channel</a></div></div><footer class="footer"><p><span aria-hidden="true">⚡</span> <strong>Fast xBet Cash</strong> — <span data-t="footerTag">🇱🇰 Telegram Tips & Cash Agent</span></p><p><span data-t="footerTelegram">Telegram:</span> <a href="${channel}" target="_blank" rel="noopener">${channelName}</a> · Edge: ${colo}</p><p class="disclaimer" data-t="disclaimer">⚠️ මෙම සේවාව 18+ පුද්ගලයන් සඳහා පමණි. ඔට්ටු ඇල්ලීම අවදානම් සහිතය; වගකීමෙන් භාවිතා කරන්න. කිසිදු ජයග්‍රහණයක් සහතික නොවේ.</p></footer><script>
(function(){
var translations={
en:{
  howNav:'How It Works',calcNav:'Calculator',featuresNav:'Features',tipsNav:'Free Tips',promoNav:'Promo Code',paymentsNav:'Payments',
  badge:'🇱🇰 24/7 Active Bot & Cash Agent',hero:'Automated free betting tips and fast deposit & withdrawal — all through Telegram.',start:'🚀 Start the Bot',channel:'📢 Tips Channel',
  statusText:'System Status: Online',statusSub:'Telegram Bot & Processing Active',nextTipsLabel:'Next Tips in:',
  daily:'Tips per day',speed:'Average Speed',fee:'Zero Fees',secure:'100% Secure',
  howTitle:'How It Works',howSub:'Complete deposits and withdrawals in just a few minutes',
  tabDep:'💰 Deposit Steps',tabWd:'💸 Withdraw Steps',
  step1dTitle:'Start the Bot',step1dDesc:'Open the Telegram Bot, type /deposit and enter your Player ID.',
  step2dTitle:'Pay & Upload Receipt',step2dDesc:'Pay via eZ Cash, mCash, or Bank Transfer and upload the receipt screenshot.',
  step3dTitle:'Credited in 5 Mins',step3dDesc:'Your xBet account is instantly credited once verified by the admin.',
  step1wTitle:'Request Withdrawal',step1wDesc:'Select /withdraw in the bot, enter your Player ID, amount, and payout destination.',
  step2wTitle:'Provide Security Code',step2wDesc:'Enter the security confirmation code sent by xBet for verification.',
  step3wTitle:'Receive Your Cash',step3wDesc:'Funds are sent directly to your bank account or mobile wallet within minutes.',
  calcTitle:'Transaction Calculator',calcSub:'Enter an amount to check transaction limits and details',
  calcDep:'Deposit',calcWd:'Withdraw',calcInputLabel:'Amount (in LKR):',
  calcMin:'Minimum Limit:',calcMax:'Maximum Limit:',calcFee:'Service Fee:',calcTime:'Estimated Time:',calcTotal:'Total Transaction Value:',
  calcAction:'⚡ Perform via Bot Now',
  featuresTitle:'Features',featuresSub:'Everything our bot offers you',
  f1t:'Free Betting Tips',f1p:'EPL, Champions League, NBA, ATP Tennis — analysed tips, 3 times a day.',
  f2t:'Deposit & Withdraw',f2p:'Fast, reliable transactions with 0% extra commissions.',
  f3t:'Receipt Upload',f3p:'Confirm your deposit by sending a payment receipt screenshot.',
  f4t:'User Dashboard & Support',f4p:'Check transaction status, support tickets, referrals and account details in one place.',
  f5t:'Auto Notifications',f5p:'Get new tips, transaction updates and important announcements automatically.',
  f6t:'Responsible Gaming',f6p:'18+ only. Use responsibly, with limits, self-exclusion and promotional opt-out support.',
  tipsTitle:'Free Betting Tips Schedule',tipsSub:'Tips posted to the official channel, Sri Lanka time',morning:'Morning',noon:'Noon',evening:'Evening',joinChannel:'📢 Join the Channel',
  promoTitle:'🎁 Special Promo Code',promoSub:'Use this code when you register on xBet',promoLabel:'Your Promo Code',copyHint:'Click to copy',registerBtn:'🎲 Register on xBet',
  paymentsTitle:'💳 Payment Methods',paymentsSub:'Use any of the following for deposits & withdrawals',
  faqTitle:'❓ Frequently Asked Questions',
  faq1q:'How do I make a deposit?',faq1a:'Use the /deposit command in the bot, choose a payment method, and upload a receipt screenshot.',
  faq2q:'How long does a withdrawal take to process?',faq2a:'It is usually verified and processed within 2 to 5 minutes.',
  faq3q:'Is the promo code required?',faq3a:'No, but using it at registration gives you extra deposit bonuses.',
  faq4q:'What are the transaction limits?',faq4a:'Transactions are supported within standard minimum and maximum limits.',
  ctaTitle:'Get Started Now! 🚀',ctaSub:'Get every service through the Telegram Bot — fast, secure, easy.',ctaBtn:'🤖 Start the Bot',
  footerTag:'🇱🇰 Telegram Tips & Cash Agent',footerTelegram:'Telegram:',disclaimer:'⚠️ This service is for 18+ only. Betting involves risk; please play responsibly. No winnings are guaranteed.'
},
ta:{
  howNav:'எப்படி பயன்படுத்துவது',calcNav:'Calculator',featuresNav:'அம்சங்கள்',tipsNav:'Free Tips',promoNav:'Promo Code',paymentsNav:'Payments',
  badge:'🇱🇰 24/7 Active Bot & Cash Agent',hero:'தானியங்கி இலவச betting tips, வேகமான deposit & withdraw — அனைத்தும் Telegram மூலம்.',start:'🚀 Bot தொடங்கவும்',channel:'📢 Tips Channel',
  statusText:'System Status: Online',statusSub:'Telegram Bot & Processing Active',nextTipsLabel:'அடுத்த Tips:',
  daily:'ஒரு நாளின் Tips',speed:'சராசரி வேகம்',fee:'கட்டணமில்லை',secure:'100% பாதுகாப்பு',
  howTitle:'எப்படி பயன்படுத்துவது?',howSub:'சில நிமிடங்களில் மிக எளிதாக பண பரிவர்த்தனைகளை செய்யவும்',
  tabDep:'💰 Deposit படிகள்',tabWd:'💸 Withdraw படிகள்',
  step1dTitle:'Bot-ஐ தொடங்கவும்',step1dDesc:'Telegram Bot-இல் /deposit கட்டளையை தட்டச்சு செய்து உங்கள் Player ID ஐ உள்ளிடவும்.',
  step2dTitle:'பணம் செலுத்தி ரசீதை அனுப்பவும்',step2dDesc:'eZ Cash, mCash அல்லது Bank Transfer மூலம் செலுத்தி ரசீது screenshot ஐ அனுப்பவும்.',
  step3dTitle:'5 நிமிடங்களில் கணக்கில்',step3dDesc:'Admin சரிபார்த்தவுடன் உங்கள் xBet கணக்கில் பணம் உடனடியாக வரவு வைக்கப்படும்.',
  step1wTitle:'Withdrawal கோரிக்கை அனுப்பவும்',step1wDesc:'Bot-இல் /withdraw தெரிவு செய்து, Player ID, தொகை மற்றும் கணக்கு எண்ணை உள்ளிடவும்.',
  step2wTitle:'Security Code வழங்கவும்',step2wDesc:'பாதுகாப்பை உறுதிப்படுத்த xBet இலிருந்து பெறப்பட்ட security code ஐ உள்ளிடவும்.',
  step3wTitle:'பணம் உங்கள் கைகளில்',step3wDesc:'சில நிமிடங்களில் உங்கள் வங்கி கணக்கு அல்லது wallet-க்கு பணம் வந்து சேரும்.',
  calcTitle:'பரிவர்த்தனை Calculator',calcSub:'உங்கள் தொகையை உள்ளிட்டு வரம்புகள் மற்றும் விவரங்களை சரிபார்க்கவும்',
  calcDep:'Deposit',calcWd:'Withdraw',calcInputLabel:'தொகை (LKR):',
  calcMin:'குறைந்தபட்ச வரம்பு:',calcMax:'அதிகபட்ச வரம்பு:',calcFee:'சேவைக் கட்டணம்:',calcTime:'மதிப்பிடப்பட்ட நேரம்:',calcTotal:'மொத்த பரிவர்த்தனை மதிப்பு:',
  calcAction:'⚡ Bot மூலம் உடனே செய்யவும்',
  featuresTitle:'அம்சங்கள்',featuresSub:'எங்கள் Bot வழங்கும் சேவைகள்',
  f1t:'இலவச Betting Tips',f1p:'EPL, Champions League, NBA, ATP Tennis — பகுப்பாய்வு செய்யப்பட்ட tips, நாளொன்றுக்கு 3 முறை.',
  f2t:'Deposit & Withdraw',f2p:'கூடுதல் கட்டணங்கள் இன்றி நம்பகமான, வேகமான பரிவர்த்தனைகள்.',
  f3t:'ரசீது Upload',f3p:'Payment receipt screenshot ஒன்றை அனுப்பி deposit-ஐ உறுதிப்படுத்தவும்.',
  f4t:'User Dashboard & Support',f4p:'Transaction status, support tickets, referrals மற்றும் account விவரங்களை ஒரே இடத்தில் காணலாம்.',
  f5t:'தானியங்கி அறிவிப்புகள்',f5p:'புதிய tips, transaction updates மற்றும் முக்கிய அறிவிப்புகளை தானாகவே பெறுங்கள்.',
  f6t:'பொறுப்பான விளையாட்டு',f6p:'18+ மட்டும். Limits, self-exclusion மற்றும் promotional opt-out support உடன் பொறுப்புடன் பயன்படுத்தவும்.',
  tipsTitle:'Free Betting Tips நேரங்கள்',tipsSub:'இலங்கை நேரப்படி official channel-க்கு tips',morning:'காலை',noon:'மதியம்',evening:'மாலை',joinChannel:'📢 Channel-ஐ இணையுங்கள்',
  promoTitle:'🎁 சிறப்பு Promo Code',promoSub:'xBet-இல் register செய்யும் போது இந்த code-ஐ பயன்படுத்தவும்',promoLabel:'உங்கள் Promo Code',copyHint:'Click செய்து copy செய்யவும்',registerBtn:'🎲 xBet-இல் Register செய்யவும்',
  paymentsTitle:'💳 கட்டண முறைகள்',paymentsSub:'Deposit & Withdraw செய்ய பின்வரும் முறைகளைப் பயன்படுத்தலாம்',
  faqTitle:'❓ அடிக்கடி கேட்கப்படும் கேள்விகள்',
  faq1q:'Deposit ஒன்றை எப்படி செய்வது?',faq1a:'Bot-இல் /deposit command-ஐ பயன்படுத்தி, கட்டண முறையைத் தேர்ந்தெடுத்து, ரசீது screenshot-ஐ பதிவேற்றவும்.',
  faq2q:'Withdrawal process ஆக எவ்வளவு நேரம் ஆகும்?',faq2a:'பொதுவாக 2 முதல் 5 நிமிடங்களுக்குள் சரிபார்க்கப்பட்டு process செய்யப்படும்.',
  faq3q:'Promo code கட்டாயமா?',faq3a:'இல்லை, ஆனால் register செய்யும் போது அதைப் பயன்படுத்தினால் கூடுதல் போனஸ் கிடைக்கும்.',
  faq4q:'பரிவர்த்தனை வரம்புகள் என்ன?',faq4a:'அனைத்து நிலையான குறைந்தபட்ச மற்றும் அதிகபட்ச வரம்புகளுக்குள் பரிவர்த்தனைகள் செய்ய முடியும்.',
  ctaTitle:'இப்போதே தொடங்குங்கள்! 🚀',ctaSub:'Telegram Bot மூலம் அனைத்து சேවைகளையும் பெறுங்கள் — வேகமாக, பாதுகாப்பாக, எளிதாக.',ctaBtn:'🤖 Bot-ஐ தொடங்கவும்',
  footerTag:'🇱🇰 Telegram Tips & Cash Agent',footerTelegram:'Telegram:',disclaimer:'⚠️ இந்த சேவை 18+ நபர்களுக்கு மட்டுமே. Betting அபாயம் நிறைந்தது; பொறுப்புடன் பயன்படுத்தவும். எந்த வெற்றியும் உத்தரவாதம் இல்லை.'
},
si:{
  howNav:'භාවිතා කරන්නේ කෙසේද',calcNav:'Calculator',featuresNav:'විශේෂාංග',tipsNav:'Free Tips',promoNav:'Promo Code',paymentsNav:'Payments',
  badge:'🇱🇰 24/7 Active Bot & Cash Agent',hero:'ස්වයංක්‍රීය Free Betting Tips, වේගවත් Deposit & Withdraw සේවාව — සියල්ල Telegram හරහා, ඔබේ දුරකථනයෙන්.',start:'🚀 Bot එක පටන් ගන්න',channel:'📢 Tips Channel',
  statusText:'System Status: Online',statusSub:'Telegram Bot & Processing Active',nextTipsLabel:'ඊළඟ Tips:',
  daily:'දිනකට Tips',speed:'සාමාන්‍ය කාලය',fee:'ගාස්තු රහිතයි',secure:'100% ආරක්ෂිත',
  howTitle:'භාවිතා කරන්නේ කෙසේද?',howSub:'මිනිත්තු කිහිපයකින් ඉතා පහසුවෙන් ගනුදෙනු සිදුකරන්න',
  tabDep:'💰 Deposit පියවර',tabWd:'💸 Withdraw පියවර',
  step1dTitle:'Bot එක ආරම්භ කරන්න',step1dDesc:'Telegram Bot වෙත ගොස් /deposit command එක ලබාදී ඔබේ Player ID ඇතුළත් කරන්න.',
  step2dTitle:'මුදල් ගෙවා Receipt එක එවන්න',step2dDesc:'eZ Cash, mCash හෝ Bank Transfer මගින් ගෙවා රිසිට්පතේ ඡායාරූපය bot වෙත upload කරන්න.',
  step3dTitle:'මිනිත්තු 5න් ගිණුමට',step3dDesc:'Admin විසින් තහවුරු කළ වහාම ඔබේ xBet ගිණුමට මුදල් ක්ෂණිකව බැර වේ.',
  step1wTitle:'Withdraw ඉල්ලීම යොමු කරන්න',step1wDesc:'Bot හි /withdraw තෝරා Player ID, අවශ්‍ය මුදල සහ ගෙවිය යුතු ගිණුම් අංකය ඇතුළත් කරන්න.',
  step2wTitle:'Security Code එක ලබාදෙන්න',step2wDesc:'ආරක්ෂාව තහවුරු කිරීම සඳහා xBet වෙතින් ලැබෙන withdrawal security code එක ඇතුළත් කරන්න.',
  step3wTitle:'මුදල් ඔබේ අතට',step3wDesc:'මිනිත්තු කිහිපයක් ඇතුළත ඔබේ බැංකු ගිණුමට හෝ wallet එකට මුදල් බැර වේ.',
  calcTitle:'ගනුදෙනු Calculator',calcSub:'ඔබේ මුදල ඇතුළත් කර ගනුදෙනු සීමාවන් සහ විස්තර පරීක්ෂා කරන්න',
  calcDep:'Deposit',calcWd:'Withdraw',calcInputLabel:'මුදල (LKR වලින්):',
  calcMin:'අවම සීමාව:',calcMax:'උපරිම සීමාව:',calcFee:'සේවා ගාස්තුව (Fee):',calcTime:'ඇස්තමේන්තුගත කාලය:',calcTotal:'මුළු ගනුදෙනු වටිනාකම:',
  calcAction:'⚡ Bot එකෙන් දැන්ම කරගන්න',
  featuresTitle:'විශේෂාංග',featuresSub:'අපගේ Bot එක ඔබට ලබා දෙන සියලු සේවාවන්',
  f1t:'Free Betting Tips',f1p:'EPL, Champions League, NBA, ATP Tennis — විශ්ලේෂණය කළ tips දිනකට 3 වරයි.',
  f2t:'Deposit & Withdraw',f2p:'අමතර කිසිදු ගාස්තුවක් රහිතව, වේගවත් හා සුරක්ෂිත ගනුදෙනු.',
  f3t:'Receipt Upload',f3p:'Payment receipt screenshot එකක් එවීමෙන් deposit එක තහවුරු කරගන්න.',
  f4t:'User Dashboard & Support',f4p:'Transaction status, support tickets, referrals සහ account details එක තැනකින් බලන්න.',
  f5t:'Auto Notifications',f5p:'නව tips, transaction updates සහ වැදගත් දැන්වීම් ස්වයංක්‍රීයව ලබාගන්න.',
  f6t:'Responsible Gaming',f6p:'18+ පමණි. Limits, self-exclusion සහ promotional opt-out support සමඟ වගකීමෙන් භාවිතා කරන්න.',
  tipsTitle:'Free Betting Tips වේලාවන්',tipsSub:'ශ්‍රී ලංකා කාලය අනුව Official Channel එකට tips',morning:'උදය',noon:'දවල්',evening:'සවස',joinChannel:'📢 Channel එකට එකතු වන්න',
  promoTitle:'🎁 විශේෂ Promo Code',promoSub:'xBet හි register වීමේදී මෙම code එක භාවිතා කරන්න',promoLabel:'ඔබේ Promo Code',copyHint:'ක්ලික් කර copy කරගන්න',registerBtn:'🎲 xBet හි Register වන්න',
  paymentsTitle:'💳 ගෙවීමේ ක්‍රම',paymentsSub:'Deposit & Withdraw සඳහා පහත ක්‍රම භාවිතා කළ හැක',
  faqTitle:'❓ නිතර අසන ප්‍රශ්න',
  faq1q:'Deposit එකක් කරන්නේ කොහොමද?',faq1a:'Bot එකේ /deposit command එක භාවිතා කර, ගෙවීම් ක්‍රමය තෝරා, receipt screenshot එක upload කරන්න.',
  faq2q:'Withdrawal එකක් process වෙන්න කොපමණ වෙලාවක් ගතවෙයිද?',faq2a:'සාමාන්‍යයෙන් විනාඩි 2ත් 5ත් අතර කාලයකදී admin විසින් සත්‍යාපනය කර process කරනු ලැබේ.',
  faq3q:'Promo code එක අනිවාර්යද?',faq3a:'නැත, නමුත් register වීමේදී එය භාවිතා කිරීමෙන් අමතර ප්‍රතිලාභ ලබාගත හැක.',
  faq4q:'අවම සහ උපරිම ගනුදෙනු සීමාවන් මොනවාද?',faq4a:'අවම සහ උපරිම නියමිත සීමාවන් තුළ ඔබට පහසුවෙන් ගනුදෙනු සිදුකළ හැක.',
  ctaTitle:'දැන්ම පටන් ගන්න! 🚀',ctaSub:'Telegram Bot එක හරහා සියලු සේවාවන් ලබාගන්න — වේගවත්, ආරක්ෂිත, පහසු.',ctaBtn:'🤖 Bot එක ආරම්භ කරන්න',
  footerTag:'🇱🇰 Telegram Tips & Cash Agent',footerTelegram:'Telegram:',disclaimer:'⚠️ මෙම සේවාව 18+ පුද්ගලයන් සඳහා පමණි. ඔට්ටු ඇල්ලීම අවදානම් සහිතය; වගකීමෙන් භාවිතා කරන්න. කිසිදු ජයග්‍රහණයක් සහතික නොවේ.'
}
};
function setLang(lang){
  var d=translations[lang]||translations.si;
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-t]').forEach(function(e){ if(d[e.dataset.t]) e.textContent=d[e.dataset.t]; });
  document.querySelectorAll('[data-lang]').forEach(function(e){ var on=e.dataset.lang===lang; e.classList.toggle('active',on); e.setAttribute('aria-pressed',on?'true':'false'); });
  try{ localStorage.setItem('fastcash-lang',lang); }catch(e){}
}
document.querySelectorAll('[data-lang]').forEach(function(e){ e.addEventListener('click',function(){ setLang(e.dataset.lang); }); });
var savedLang='si';
try{ savedLang=localStorage.getItem('fastcash-lang')||'si'; }catch(e){}
setLang(savedLang);

/* Promo Code Copy */
var promoBtn=document.getElementById('promoCode');
var copyMsg=document.getElementById('copyMsg');
promoBtn.addEventListener('click',function(){
  var text=promoBtn.textContent;
  function showCopied(){
    var d=translations[document.documentElement.lang]||translations.si;
    copyMsg.textContent = '✅ ' + text + ' (Copied!)';
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(showCopied).catch(function(){ legacyCopy(text, showCopied); });
  } else {
    legacyCopy(text, showCopied);
  }
});
function legacyCopy(text, onDone){
  try{
    var ta=document.createElement('textarea');
    ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    onDone();
  }catch(e){}
}

/* Step Tabs */
var tabDep=document.getElementById('tabDeposit');
var tabWd=document.getElementById('tabWithdraw');
var depSteps=document.getElementById('depositSteps');
var wdSteps=document.getElementById('withdrawSteps');
tabDep.addEventListener('click', function(){
  tabDep.classList.add('active'); tabWd.classList.remove('active');
  depSteps.style.display='grid'; wdSteps.style.display='none';
});
tabWd.addEventListener('click', function(){
  tabWd.classList.add('active'); tabDep.classList.remove('active');
  wdSteps.style.display='grid'; depSteps.style.display='none';
});

/* Calculator */
var calcAmount=document.getElementById('calcAmount');
var calcTotalVal=document.getElementById('calcTotalVal');
var calcDepBtn=document.getElementById('calcDepBtn');
var calcWdBtn=document.getElementById('calcWdBtn');
function updateCalc(){
  var val = parseFloat(calcAmount.value) || 0;
  calcTotalVal.textContent = 'Rs. ' + val.toLocaleString();
}
calcAmount.addEventListener('input', updateCalc);
document.querySelectorAll('.calc-preset').forEach(function(btn){
  btn.addEventListener('click', function(){
    calcAmount.value = btn.dataset.val;
    updateCalc();
  });
});
calcDepBtn.addEventListener('click', function(){
  calcDepBtn.classList.add('active'); calcWdBtn.classList.remove('active');
});
calcWdBtn.addEventListener('click', function(){
  calcWdBtn.classList.add('active'); calcDepBtn.classList.remove('active');
});
updateCalc();

/* Next Tips Countdown (Sri Lanka time UTC+5:30 -> 08:00, 12:00, 18:00) */
function updateTipCountdown(){
  var timerEl = document.getElementById('nextTipCountdown');
  if(!timerEl) return;
  var now = new Date();
  var slOffset = 5.5 * 60;
  var localOffset = now.getTimezoneOffset();
  var slNow = new Date(now.getTime() + (slOffset + localOffset)*60*1000);

  var targetHours = [8, 12, 18];
  var currentHour = slNow.getHours();
  var currentMin = slNow.getMinutes();
  var currentSec = slNow.getSeconds();
  var currentTotalSec = currentHour*3600 + currentMin*60 + currentSec;

  var nextTargetSec = null;
  for(var i=0; i<targetHours.length; i++){
    var tSec = targetHours[i] * 3600;
    if(tSec > currentTotalSec){
      nextTargetSec = tSec;
      break;
    }
  }
  if(nextTargetSec === null){
    nextTargetSec = (24 + 8) * 3600;
  }
  var diffSec = nextTargetSec - currentTotalSec;
  var h = Math.floor(diffSec / 3600);
  var m = Math.floor((diffSec % 3600) / 60);
  var s = diffSec % 60;
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  timerEl.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
}
setInterval(updateTipCountdown, 1000);
updateTipCountdown();

})();
</script></body></html>`;
}
export { GITHUB_URL, BOT_URL };

