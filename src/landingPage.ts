import type { Env } from "./types";
import { BRAND_LOGO_SVG_COMPACT } from "./brandLogo";

const BOT_FALLBACK = "fast_1xbetcash_bot";
const CHANNEL_FALLBACK = "https://t.me/fast_xbet_official_tips";

type Lang = "si" | "en" | "ta";

export function normalizePublicBaseUrl(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function trustedPublicBaseUrl(env: Env, request: Request): string | null {
  const configured = normalizePublicBaseUrl(env.PUBLIC_BASE_URL);
  if (configured) return configured;
  if (env.BOT_MODE === "production") return null;
  try { return new URL(request.url).origin; } catch { return null; }
}

const T: Record<Lang, {
  nav: string[];
  hero: string[];
  services: string[];
  how: string[];
  pay: string[];
  final: string[];
  faq: string[];
  faqAnswers: string[];
}> = {
  si: {
    nav: ["මුල් පිටුව", "Free Tips", "ක්‍රමය", "ගෙවීම්", "FAQ"],
    hero: ["ශ්‍රී ලංකාව • Telegram-first cash desk", "වේගවත් tips. සරල cash. එක Telegram එකක්.", "Free sports previews, guided deposit සහ withdrawal support, multilingual help — එකම Telegram bot එකක් හරහා. Extra apps අවශ්‍ය නැහැ.", "Telegram Bot විවෘත කරන්න", "Free Tips බලන්න"],
    services: ["One Telegram flow", "ඔබට අවශ්‍ය දේ එකම Telegram flow එකක", "Free Sports Tips", "Deposit Assistance", "Withdrawal Support", "Multilingual Support"],
    how: ["ආරම්භ කරන්නේ මෙහෙමයි", "Telegram bot එක විවෘත කරන්න", "Service එක තෝරන්න", "Guided instructions follow කරන්න"],
    pay: ["Local payment options, clearly explained", "eZ Cash", "mCash", "FriMi", "iPay", "Bank Transfer"],
    final: ["ආරම්භ කිරීමට සූදානම්ද?", "Telegram bot එක විවෘත කර tips සහ support සඳහා guided flow එක අනුගමනය කරන්න."],
    faq: ["Deposit කරන්නේ කෙසේද?", "Withdraw කරන්නේ කෙසේද?", "Free Tips මොනවාද?", "Referral bonus ලබාගන්නේ කෙසේද?", "Support ලබාගන්නේ කෙසේද?", "භාෂාව වෙනස් කරන්නේ කෙසේද?"],
    faqAnswers: ["Telegram bot හි පෙන්වන පියවර අනුගමනය කරන්න. ගෙවීමට පෙර විස්තර තහවුරු කරන්න.", "Telegram bot හි withdrawal උපදෙස් අනුගමනය කරන්න. ප්‍රතිඵල හෝ ලාභ සහතික නොවේ.", "Free tips තොරතුරුමය පෙරදසුන් පමණි; ක්‍රීඩා ප්‍රතිඵල අවිනිශ්චිතය.", "Referral විකල්ප තිබේ නම් bot හි පෙන්වන නියමයන් බලන්න.", "Telegram bot හි support විකල්පය තෝරන්න.", "Bot හි language විකල්පයෙන් භාෂාව තෝරන්න."]
  },
  en: {
    nav: ["Home", "Free Tips", "How It Works", "Payments", "FAQ"],
    hero: ["SRI LANKA • TELEGRAM-FIRST CASH DESK", "Fast tips. Simple cash. One Telegram.", "Free sports previews, guided deposits and withdrawals, and multilingual help — all inside one Telegram bot. No extra apps.", "Open Telegram Bot", "View free tips"],
    services: ["One Telegram flow", "Everything you need, in one Telegram flow", "Free Sports Tips", "Deposit Assistance", "Withdrawal Support", "Multilingual Support"],
    how: ["How it works", "Open the Telegram bot", "Choose your service", "Follow the guided instructions"],
    pay: ["Local payment options, clearly explained", "eZ Cash", "mCash", "FriMi", "iPay", "Bank Transfer"],
    final: ["Ready to get started?", "Open the Telegram bot and follow a guided flow for tips and support."],
    faq: ["How do I deposit?", "How do I withdraw?", "What are the free tips?", "How do I get a referral bonus?", "How do I get support?", "How do I change language?"],
    faqAnswers: ["Follow the deposit steps shown by the Telegram bot and verify the details before paying.", "Follow the withdrawal instructions in the Telegram bot. Outcomes and profits are not guaranteed.", "Free tips are informational previews only; sports outcomes are uncertain.", "If available, review the referral terms shown in the bot.", "Choose the support option in the Telegram bot.", "Choose your language from the language option in the bot."]
  },
  ta: {
    nav: ["முகப்பு", "இலவச Tips", "எப்படி வேலை செய்கிறது", "கொடுப்பனவுகள்", "FAQ"],
    hero: ["இலங்கை • TELEGRAM-FIRST CASH DESK", "வேகமான tips. எளிய cash. ஒரே Telegram.", "Free sports previews, guided deposit மற்றும் withdrawal support, multilingual help — ஒரே Telegram bot-ல்.", "Telegram Bot திறக்கவும்", "Free Tips பார்க்கவும்"],
    services: ["One Telegram flow", "தேவையான அனைத்தும் ஒரே Telegram flow-ல்", "Free Sports Tips", "Deposit Assistance", "Withdrawal Support", "Multilingual Support"],
    how: ["எப்படி தொடங்குவது", "Telegram bot திறக்கவும்", "Service தேர்ந்தெடுக்கவும்", "Guided instructions பின்பற்றவும்"],
    pay: ["Local payment options, clearly explained", "eZ Cash", "mCash", "FriMi", "iPay", "Bank Transfer"],
    final: ["Ready to get started?", "Telegram bot திறந்து tips மற்றும் support-க்கு guided flow பின்பற்றுங்கள்."],
    faq: ["Deposit செய்வது எப்படி?", "Withdraw செய்வது எப்படி?", "Free Tips என்றால் என்ன?", "Referral bonus பெறுவது எப்படி?", "Support பெறுவது எப்படி?", "மொழியை மாற்றுவது எப்படி?"],
    faqAnswers: ["Telegram bot காட்டும் deposit படிகளைப் பின்பற்றி, பணம் செலுத்தும் முன் விவரங்களைச் சரிபார்க்கவும்.", "Telegram bot-இல் காட்டப்படும் withdrawal வழிமுறைகளைப் பின்பற்றவும். முடிவுகள் அல்லது லாபம் உறுதியல்ல.", "Free tips தகவல் சார்ந்த முன்னோட்டங்கள் மட்டுமே; விளையாட்டு முடிவுகள் உறுதியற்றவை.", "இருந்தால், bot-இல் காட்டப்படும் referral விதிமுறைகளைப் பார்க்கவும்.", "Telegram bot-இல் support விருப்பத்தைத் தேர்ந்தெடுக்கவும்.", "Bot-இன் language விருப்பத்தில் மொழியைத் தேர்ந்தெடுக்கவும்."]
  }
};

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function jsonEsc(v: string): string {
  return v.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function paymentConfigured(env: Env, name: string): boolean {
  if (name === "eZ Cash") return Boolean(env.EZCASH_NUMBER?.trim());
  if (name === "mCash") return Boolean(env.MCASH_NUMBER?.trim());
  if (name === "FriMi") return Boolean(env.FRIMI_NUMBER?.trim());
  if (name === "iPay") return Boolean(env.IPAY_NUMBER?.trim());
  return Boolean(env.BANK_DETAILS?.trim());
}

export function renderLandingPage(env: Env, request: Request, nonce?: string): string {
  const n = nonce ? ` nonce="${esc(nonce)}"` : "";
  const channel = env.CHANNEL_URL?.trim() || CHANNEL_FALLBACK;
  const botName = env.BOT_USERNAME?.trim().replace(/^@/, "") || BOT_FALLBACK;
  const bot = `https://t.me/${botName}?start=landing`;
  const min = Number.parseInt(env.MIN_TRANSACTION_LKR || "1000", 10) || 1000;
  const max = Number.parseInt(env.MAX_TRANSACTION_LKR || "500000", 10) || 500000;

  let lang: Lang = "si";
  const trustedOrigin = trustedPublicBaseUrl(env, request);
  const url = trustedOrigin ? `${trustedOrigin}/` : "/";
  try {
    const u = new URL(request.url);
    const q = u.searchParams.get("lang")?.toLowerCase();
    if (q === "si" || q === "en" || q === "ta") lang = q;
    else {
      const a = request.headers.get("accept-language") || "";
      if (/\bta\b/i.test(a)) lang = "ta";
      else if (/\ben\b/i.test(a)) lang = "en";
    }
  } catch {}

  const c = T[lang];
  const ea = esc(url);
  const eb = esc(bot);
  const ec = esc(channel);
  const promo = esc(env.XBET_PROMO_CODE?.trim() || "VGSL");

  const faq = c.faq.map((q, i) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: c.faqAnswers[i] }
  }));
  const ld = jsonEsc(JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${url}#organization`, name: "Fast xBet Cash", url, logo: `${url}og-image.jpg`, image: `${url}og-image.jpg`, sameAs: [channel, `https://t.me/${botName}`], areaServed: "LK", availableLanguage: ["si", "en", "ta"] },
      { "@type": "WebSite", "@id": `${url}#website`, url, name: "Fast xBet Cash 🇱🇰", publisher: { "@id": `${url}#organization` }, inLanguage: ["si", "en", "ta"] },
      { "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: faq }
    ]
  }));

  const payments = c.pay.slice(1).map((p) => `<article class="payment"><b>${esc(p)}</b><span>${paymentConfigured(env, p) ? "Configured" : "Bot flow"}</span></article>`).join("");

  const serviceCards = [
    ["🎯", c.services[2], "Automated sports analysis and selected informational previews.", "View preview"],
    ["💳", c.services[3], "Guided deposit workflow with configured transaction limits.", `LKR ${min.toLocaleString("en-LK")} – ${max.toLocaleString("en-LK")}`],
    ["↗", c.services[4], "Submit a withdrawal request through the bot and follow verification steps.", "Guided request"],
    ["🌐", c.services[5], "Sinhala, English and Tamil support through Telegram.", "SI · EN · TA"]
  ].map(([icon, title, body, tag]) => `<article class="service"><div class="icon">${icon}</div><h3>${esc(title)}</h3><p>${esc(body)}</p><span class="tag">${esc(tag)}</span></article>`).join("");

  const faqHtml = c.faq.map((q, i) => `<details><summary>${esc(q)}</summary><div class="answer">${esc(c.faqAnswers[i])}</div></details>`).join("");

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Fast xBet Cash 🇱🇰 — Free Betting Tips &amp; Cash Support</title>
<meta name="description" content="Telegram-first Fast xBet Cash service for free sports previews, guided support and multilingual assistance. 18+ only.">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#070B12">
<meta name="color-scheme" content="dark">
<link rel="canonical" href="${ea}">
<link rel="alternate" hreflang="si" href="${ea}?lang=si">
<link rel="alternate" hreflang="en" href="${ea}?lang=en">
<link rel="alternate" hreflang="ta" href="${ea}?lang=ta">
<link rel="alternate" hreflang="x-default" href="${ea}">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/favicon.png">
<meta property="og:site_name" content="Fast xBet Cash">
<meta property="og:type" content="website">
<meta property="og:title" content="Fast xBet Cash 🇱🇰 — Free Betting Tips &amp; Cash Support">
<meta property="og:description" content="Free sports previews, guided support and Telegram-first assistance. 18+ only.">
<meta property="og:url" content="${ea}">
<meta property="og:image" content="${esc(url + "og-image.jpg?v=3")}">
<meta property="og:image:secure_url" content="${esc(url + "og-image.jpg?v=3")}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<link rel="image_src" href="${esc(url + "og-image.jpg?v=3")}">
<meta itemprop="image" content="${esc(url + "og-image.jpg?v=3")}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(url + "og-image.jpg?v=3")}">
<script type="application/ld+json"${n}>${ld}</script>
<style${n}>
:root{--bg:#070b12;--bg2:#081525;--surface:#101720;--surface2:#151e2b;--fg:#f1f5f9;--muted:#94a3b8;--faint:#64748b;--signal:#a6f800;--cyan:#00b4f8;--pink:#ff477e;--border:#ffffff12;--shadow:0 25px 70px #0008}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;min-width:320px;background:radial-gradient(circle at 85% 10%,#00b4f814,transparent 32%),radial-gradient(circle at 12% 42%,#ff477e0d,transparent 30%),var(--bg);color:var(--fg);font-family:system-ui,"Noto Sans Sinhala","Noto Sans Tamil",sans-serif;line-height:1.6;overflow-x:hidden}
a{color:inherit;text-decoration:none}
button,a,summary{font:inherit}
a:focus-visible,button:focus-visible,summary:focus-visible{outline:2px solid var(--cyan);outline-offset:3px}
.wrap{width:min(1120px,calc(100% - 40px));margin:auto}
.skip{position:absolute;left:-9999px;top:0;background:var(--signal);color:#071006;padding:10px;z-index:100}
.skip:focus{left:0}
.nav{position:sticky;top:0;z-index:50;background:#070b12e8;backdrop-filter:blur(18px);border-bottom:1px solid var(--border)}
.navin{min-height:70px;display:flex;align-items:center;gap:18px}
.logo{display:flex;align-items:center;gap:8px;font-weight:800;letter-spacing:-.02em;white-space:nowrap}
.logo svg{width:36px;height:36px}
.logo span{color:var(--signal)}
.links{display:flex;gap:2px;margin-left:auto}
.links a{padding:8px 11px;border-radius:10px;color:var(--muted);font-size:.78rem;font-weight:700}
.links a:hover{background:#ffffff08;color:var(--fg)}
.langs{display:flex;gap:3px;padding:3px;border:1px solid var(--border);border-radius:999px;background:#ffffff05}
.langs a{padding:5px 8px;color:var(--muted);font-size:.72rem;font-weight:800;border-radius:999px}
.langs a[aria-current=page]{background:#ffffff0b;color:var(--fg)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 16px;border-radius:999px;border:1px solid transparent;font-size:.82rem;font-weight:800;transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
.btn:hover{transform:translateY(-1px)}
.primary{background:var(--signal);color:#071006;box-shadow:0 12px 32px #a6f80022}
.secondary{background:transparent;border-color:#dbeafe88;color:var(--fg)}
.menu{display:none;margin-left:auto;width:44px;height:44px;border:1px solid var(--border);background:#ffffff08;color:var(--fg);border-radius:12px}
.mobile{display:none}
.hero{padding:82px 0 52px}
.heroGrid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(280px,.95fr);gap:40px;align-items:center}
.eyebrow{color:#e5edf7;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.68rem;font-weight:800;letter-spacing:.22em;text-transform:uppercase}
.hero h1{max-width:620px;margin:20px 0 24px;font-size:clamp(2.6rem,6vw,4.5rem);line-height:1.05;letter-spacing:-.04em;font-weight:800}
.hero p{max-width:610px;color:var(--muted);font-size:1rem;margin:0}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}
.trust{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:24px 0}
.trust div{padding:14px;border:1px solid var(--border);border-radius:16px;background:#ffffff05}
.trust b{display:block;font-size:.78rem}
.trust span{color:var(--muted);font-size:.65rem}
.statsStrip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0 0}
.statsStrip .stat{padding:12px;border:1px solid var(--border);border-radius:14px;background:#ffffff05;text-align:center}
.statsStrip .stat b{display:block;font-size:1.1rem;color:var(--signal)}
.statsStrip .stat span{font-size:.6rem;color:var(--muted);font-weight:700}
.section{padding:48px 0}
.head{margin-bottom:22px}
.kicker{color:var(--cyan);font-size:.7rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.head h2{margin:6px 0;font-size:clamp(1.5rem,3vw,2.2rem)}
.head p{color:var(--muted);max-width:640px}
.services{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.service{padding:18px;border:1px solid var(--border);border-radius:18px;background:#ffffff03}
.service .icon{font-size:1.3rem}
.service h3{margin:8px 0 6px;font-size:.9rem}
.service p{margin:0;color:var(--muted);font-size:.72rem}
.tag{display:inline-block;margin-top:10px;padding:4px 8px;border-radius:8px;background:#ffffff08;font-size:.6rem;font-weight:700;color:var(--muted)}
.tips{border:1px solid var(--border);border-radius:22px;overflow:hidden;background:#0b121d}
.tipHead{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border)}
.previewBadge{padding:4px 9px;border-radius:999px;background:#3b82f618;color:#93c5fd;font-size:.58rem;font-weight:800}
.tipSummary{display:flex;flex-wrap:wrap;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border);color:var(--muted);font-size:.7rem}
.tipSummary b{color:var(--fg)}
.tipSkeleton{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:14px 16px}
.tipSkeleton .sk{height:160px;border-radius:18px;background:#121a26}
.tipTabs{display:flex;gap:6px;padding:10px 16px;border-bottom:1px solid var(--border)}
.tipTab{padding:6px 12px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:.7rem;font-weight:700;cursor:pointer}
.tipTab.active{background:#ffffff0b;color:var(--fg)}
.tipCardGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:14px 16px}
.tipCard{display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid #1e2a3d;border-radius:18px;background:#121a26}
.disclaimer{padding:12px 16px;color:var(--muted);font-size:.65rem}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.step{padding:20px;border:1px solid var(--border);border-radius:18px;background:#ffffff03}
.num{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--signal);color:#071006;font-weight:800;font-size:.75rem}
.step h3{margin:10px 0 6px;font-size:.85rem}
.step p{margin:0;color:var(--muted);font-size:.72rem}
.payments{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.payment{padding:14px;border:1px solid var(--border);border-radius:16px;background:#ffffff03}
.payment b{font-size:.75rem}
.payment span{display:block;margin-top:8px;color:#ccefff;font-size:.6rem;font-weight:700}
.responsible-gaming-box{display:grid;grid-template-columns:.8fr 1.2fr;gap:20px;padding:24px;border:1px solid #ff477e3d;border-radius:22px;background:linear-gradient(145deg,#ff477e0b,#ff6b5706)}
.responsible-gaming-box h2{margin:6px 0;font-size:1.4rem}
.responsible-gaming-box p,.responsible-gaming-box li{color:var(--muted);font-size:.72rem}
.faqs details{border:1px solid var(--border);border-radius:14px;background:#ffffff03;margin-bottom:8px}
.faqs summary{cursor:pointer;padding:12px;font-weight:800;font-size:.74rem}
.answer{padding:0 12px 12px;color:var(--muted);font-size:.7rem}
.finalBox{text-align:center;padding:40px 20px;border:1px solid #00b4f833;border-radius:24px;background:#111a27}
.footer{padding:32px 0;border-top:1px solid var(--border)}
.foot{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:24px}
.footer p,.footer a{color:var(--muted);font-size:.67rem}
.footerLinks{display:grid;gap:6px;margin-top:8px}
.bottom{display:flex;justify-content:space-between;margin-top:20px;padding-top:14px;border-top:1px solid var(--border);color:var(--faint);font-size:.61rem}
.stickyCta{display:none;position:fixed;left:0;right:0;bottom:0;z-index:40;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:#070b12ee;border-top:1px solid var(--border)}
.stickyCta .btn{width:100%}
@media(max-width:980px){.heroGrid,.services,.payments,.trust,.statsStrip,.tipSkeleton,.tipCardGrid,.steps{grid-template-columns:1fr 1fr}.responsible-gaming-box,.faq{grid-template-columns:1fr}}
@media(max-width:720px){.links,.langs,.desktop{display:none}.menu{display:grid;place-items:center}.mobile.open{display:grid;position:absolute;right:12px;top:calc(100% + 7px);width:min(320px,calc(100vw - 24px));padding:9px;background:#0a101af7;border:1px solid var(--border);border-radius:16px}.mobile a{padding:11px;color:var(--muted);font-weight:700}.hero h1{font-size:clamp(2.2rem,10vw,3.2rem)}.trust,.services,.steps,.payments,.statsStrip,.tipSkeleton,.tipCardGrid,.foot{grid-template-columns:1fr}.stickyCta{display:block}body{padding-bottom:72px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.btn{transition:none}}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <div class="wrap navin">
    <a class="logo" href="${ea}" aria-label="Fast xBet Cash home"><span>${BRAND_LOGO_SVG_COMPACT}</span>Fast <span>xBet</span> Cash 🇱🇰</a>
    <nav class="links" aria-label="Primary navigation">
      <a href="#home">${esc(c.nav[0])}</a><a href="#tips-preview">${esc(c.nav[1])}</a><a href="#how-it-works">${esc(c.nav[2])}</a><a href="#payments">${esc(c.nav[3])}</a><a href="#faq">${esc(c.nav[4])}</a>
    </nav>
    <div class="langs" aria-label="Language">
      <a href="?lang=si" ${lang === "si" ? 'aria-current="page"' : ""}>SI</a>
      <a href="?lang=en" ${lang === "en" ? 'aria-current="page"' : ""}>EN</a>
      <a href="?lang=ta" ${lang === "ta" ? 'aria-current="page"' : ""}>TA</a>
    </div>
    <a class="btn primary desktop" href="${eb}">✈ ${esc(c.hero[3])}</a>
    <button class="menu" id="menuToggle" type="button" aria-controls="mobileNav" aria-expanded="false" aria-label="Open navigation">☰</button>
    <nav class="mobile" id="mobileNav" aria-hidden="true" inert>
      <a href="#home">${esc(c.nav[0])}</a><a href="#tips-preview">${esc(c.nav[1])}</a><a href="#how-it-works">${esc(c.nav[2])}</a><a href="#payments">${esc(c.nav[3])}</a><a href="#faq">${esc(c.nav[4])}</a>
      <a href="?lang=si">SI</a><a href="?lang=en">EN</a><a href="?lang=ta">TA</a><a class="btn primary" href="${eb}">✈ ${esc(c.hero[3])}</a>
    </nav>
  </div>
</header>

<main id="main">
<section class="hero" id="home">
  <div class="wrap heroGrid">
    <div>
      <div class="eyebrow">${esc(c.hero[0])}</div>
      <h1>${esc(c.hero[1])}</h1>
      <p>${esc(c.hero[2])}</p>
      <div class="actions"><a class="btn primary" href="${eb}">✈ ${esc(c.hero[3])}</a><a class="btn secondary" href="#tips-preview">${esc(c.hero[4])}</a></div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:18px"><span style="padding:6px 10px;border:1px solid var(--border);border-radius:999px;color:var(--muted);font-size:.66rem;font-weight:700">18+</span><span style="padding:6px 10px;border:1px solid var(--border);border-radius:999px;color:var(--muted);font-size:.66rem;font-weight:700">Promo ${promo}</span></div>
    </div>
    <div id="edge-visual"><div style="max-width:340px;margin:0 auto;padding:16px;border:1px solid #dbeafeaa;border-radius:28px;background:#0b121d;color:var(--muted);font-size:.75rem">Telegram-first cash desk · Open the bot for guided deposit &amp; tips.</div></div>
  </div>
</section>

<section class="wrap" aria-label="Trust signals">
  <div class="trust"><div><b>⚡ Guided</b><span>Clear flow</span></div><div><b>📲 Telegram</b><span>One place</span></div><div><b>🛡️ Logged</b><span>Request trail</span></div><div><b>💳 Local rails</b><span>Responsible use</span></div></div>
  <div class="statsStrip" id="live-stats" aria-live="polite">
    <div class="stat"><b id="stat-total">—</b><span>Settled (7d)</span></div>
    <div class="stat"><b id="stat-won">—</b><span>Won</span></div>
    <div class="stat"><b id="stat-lost">—</b><span>Lost</span></div>
    <div class="stat"><b id="stat-rate">—</b><span>Win rate</span></div>
  </div>
</section>

<section class="section" id="services"><div class="wrap">
  <div class="head"><div class="kicker">${esc(c.services[0])}</div><h2>${esc(c.services[1])}</h2><p>Choose a service and follow the guided instructions. Sports outcomes are uncertain; no tip guarantees a win or profit.</p></div>
  <div class="services">${serviceCards}</div>
</div></section>

<section class="section" id="tips-preview"><div class="wrap">
  <div class="head"><div class="kicker">Free Tips</div><h2>Today’s Free Tips Preview</h2><p>Live tips load from the API. Informational previews only.</p></div>
  <div class="tips" id="tips-root">
    <div class="tipHead"><b>Loading tips…</b><span class="previewBadge">Preview only</span></div>
    <div class="tipSkeleton" aria-hidden="true"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>
    <noscript><div class="disclaimer">With JavaScript off, view live tips on the <a href="${ec}" rel="noopener noreferrer">Telegram channel</a>.</div></noscript>
    <div class="disclaimer">Informational preview only. Sports outcomes are uncertain. No tip guarantees a win or profit. 18+ only.</div>
  </div>
</div></section>

<section class="section" id="how-it-works"><div class="wrap">
  <div class="head"><div class="kicker">${esc(c.how[0])}</div><h2>${esc(c.how[0])}</h2></div>
  <div class="steps"><article class="step"><div class="num">1</div><h3>${esc(c.how[1])}</h3><p>Use the Telegram CTA to open the bot.</p></article><article class="step"><div class="num">2</div><h3>${esc(c.how[2])}</h3><p>Choose tips, deposit, withdrawal or support.</p></article><article class="step"><div class="num">3</div><h3>${esc(c.how[3])}</h3><p>Provide only the information requested by the bot.</p></article></div>
</div></section>

<section class="section" id="payments"><div class="wrap">
  <div class="head"><div class="kicker">Payments</div><h2>${esc(c.pay[0])}</h2><p>Confirm availability and exact instructions inside the bot.</p></div>
  <div class="payments">${payments}</div>
</div></section>

<section class="section" id="responsible"><div class="wrap"><div class="responsible-gaming-box">
  <div><div class="kicker">Play responsibly</div><h2>🔞 18+ Responsible Gaming Notice</h2><p>Free tips and previews are informational only. No guaranteed outcome, profit, or risk-free betting claim is made.</p></div>
  <ul><li>✓ 18+ only.</li><li>✓ Never gamble with money you cannot afford to lose.</li><li>✓ If gambling stops feeling controlled, take a break.</li></ul>
</div></div></section>

<section class="section" id="faq"><div class="wrap">
  <div class="head"><div class="kicker">FAQ</div><h2>FAQ</h2></div>
  <div class="faqs">${faqHtml}</div>
</div></section>

<section class="section"><div class="wrap"><div class="finalBox"><h2>${esc(c.final[0])}</h2><p>${esc(c.final[1])}</p><div class="actions" style="justify-content:center"><a class="btn primary" href="${eb}">✈ ${esc(c.hero[3])}</a></div></div></div></section>
</main>

<footer class="footer"><div class="wrap foot">
  <div><a class="logo" href="${ea}"><span>${BRAND_LOGO_SVG_COMPACT}</span>Fast <span>xBet</span> Cash 🇱🇰</a><p>Telegram-first service for public sports previews and guided support.</p><b>18+ only · Gamble responsibly</b></div>
  <div><b>Quick links</b><div class="footerLinks"><a href="#tips-preview">${esc(c.nav[1])}</a><a href="#payments">${esc(c.nav[3])}</a><a href="#faq">${esc(c.nav[4])}</a></div></div>
  <div><b>Access</b><div class="footerLinks"><a href="${ec}">Tips Channel</a><a href="${eb}">Telegram Bot</a><a href="#responsible">Responsible Gaming</a><a href="#faq">Terms</a><a href="#faq">Privacy</a></div></div>
</div><div class="wrap bottom"><span>© ${new Date().getFullYear()} Fast xBet Cash</span><span>18+ · Telegram-first</span></div></footer>
<div class="stickyCta"><a class="btn primary" href="${eb}">✈ ${esc(c.hero[3])}</a></div>

<script${n}>
(function(){
  var b=document.getElementById("menuToggle"),m=document.getElementById("mobileNav");
  if(b&&m){
    function close(){m.classList.remove("open");m.setAttribute("aria-hidden","true");m.setAttribute("inert","");b.setAttribute("aria-expanded","false")}
    b.addEventListener("click",function(){var open=b.getAttribute("aria-expanded")==="true";if(open)close();else{m.classList.add("open");m.setAttribute("aria-hidden","false");m.removeAttribute("inert");b.setAttribute("aria-expanded","true")}});
    m.querySelectorAll("a").forEach(function(a){a.addEventListener("click",close)});
    document.addEventListener("keydown",function(e){if(e.key==="Escape")close()});
    document.addEventListener("click",function(e){if(m.classList.contains("open")&&!m.contains(e.target)&&e.target!==b)close()});
  }
  document.querySelectorAll(".langs a").forEach(function(a){
    a.addEventListener("click",function(e){
      e.preventDefault();
      var href=a.getAttribute("href")||"";
      var u=new URL(window.location.href);
      var m2=href.match(/lang=([a-z]+)/);
      if(m2)u.searchParams.set("lang",m2[1]);
      window.location.href=u.pathname+u.search+(window.location.hash||"");
    });
  });
})();
</script>
</body></html>`;
}
