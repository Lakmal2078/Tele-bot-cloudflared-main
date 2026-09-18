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
body{margin:0;min-width:320px;background:radial-gradient(circle at 85% 10%,#00b4f814,transparent 32%),radial-gradient(circle at 12% 42%,#ff477e0d,transparent 30%),var(--bg);color:var(--fg);font-family:"Plus Jakarta Sans","Noto Sans Sinhala","Noto Sans Tamil",system-ui,sans-serif;line-height:1.6;overflow-x:hidden}
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
.heroGrid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr);gap:70px;align-items:center}
.eyebrow{color:#e5edf7;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.68rem;font-weight:800;letter-spacing:.22em;text-transform:uppercase}
.hero h1{max-width:620px;margin:20px 0 24px;font-size:clamp(3.3rem,7vw,6.2rem);line-height:.98;letter-spacing:-.065em;font-weight:800}
.hero p{max-width:610px;color:var(--muted);font-size:1rem;margin:0}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}
.pills{display:flex;gap:7px;flex-wrap:wrap;margin-top:18px}
.pill{padding:6px 10px;border:1px solid var(--border);background:#ffffff05;border-radius:999px;color:var(--muted);font-size:.66rem;font-weight:700}
#edge-visual{position:relative}
.phone{width:min(380px,100%);margin:0 auto;padding:2px;border:1px solid #dbeafeaa;border-radius:34px;background:#0b121d;box-shadow:var(--shadow)}
.phoneInner{overflow:hidden;border-radius:30px;background:var(--bg2)}
.phoneTop{display:flex;justify-content:space-between;align-items:center;padding:12px 24px 7px;color:var(--muted);font:600 .62rem ui-monospace,SFMono-Regular,Menlo,monospace}
.notch{width:96px;height:16px;border-radius:999px;background:#ffffff10}
.chatHead{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--border)}
.chatHead .brand{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#050c14;border:1px solid #00b4f855;overflow:hidden}
.chatHead .brand svg{width:27px;height:27px}
.chatTitle{min-width:0}
.chatTitle b{display:block;font-size:.75rem}
.chatTitle span{display:block;color:var(--muted);font-size:.6rem}
.online{margin-left:auto;display:flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:#a6f80016;color:var(--signal);font-size:.6rem;font-weight:800}
.online i{width:7px;height:7px;border-radius:50%;background:var(--signal);box-shadow:0 0 10px var(--signal)}
.chat{display:flex;flex-direction:column;gap:10px;padding:16px 18px 20px;min-height:390px}
.bubble{max-width:88%;padding:10px 13px;border-radius:22px;background:#151d29;border:1px solid #ffffff0b;font-size:.78rem;line-height:1.35}
.bubble.bot{border-bottom-left-radius:5px;align-self:flex-start}
.bubble.user{border-bottom-right-radius:5px;align-self:flex-end;background:#101923;color:#d9e7f4;text-align:right}
.chatChips{display:flex;flex-wrap:wrap;gap:5px;margin-top:auto}
.chatChip{padding:6px 9px;border-radius:999px;background:#ffffff06;border:1px solid #ffffff0c;color:var(--muted);font-size:.6rem}
.trust{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:12px 0 25px}
.trust div{padding:17px;border:1px solid var(--border);border-radius:22px;background:#ffffff03;text-align:center}
.trust b{display:block;font:700 .62rem ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--fg)}
.trust span{display:block;margin-top:5px;color:var(--muted);font-size:.7rem}
.section{padding:70px 0}
.head{max-width:740px;margin-bottom:28px}
.kicker{color:var(--cyan);font:800 .68rem ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.2em;text-transform:uppercase}
.head h2{margin:10px 0 8px;font-size:clamp(2rem,4.3vw,3.4rem);line-height:1.05;letter-spacing:-.045em}
.head p{margin:0;color:var(--muted);font-size:.9rem}
.services{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.service{display:flex;flex-direction:column;min-height:215px;padding:21px;border:1px solid var(--border);border-radius:22px;background:linear-gradient(145deg,#151d29,#0d131d);box-shadow:0 12px 40px #0004}
.icon{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#a6f80010;color:var(--signal);font-size:1.05rem}
.service h3{margin:15px 0 7px;font-size:.9rem}
.service p{flex:1;margin:0;color:var(--muted);font-size:.72rem}
.tag{display:inline-flex;align-self:flex-start;margin-top:16px;padding:6px 9px;border:1px solid #00b4f833;border-radius:999px;background:#00b4f80b;color:#ccefff;font-size:.61rem;font-weight:800}
.tips{overflow:hidden;border:1px solid var(--border);border-radius:24px;background:var(--surface)}
.tipHead{display:flex;justify-content:space-between;gap:12px;padding:17px 20px;border-bottom:1px solid var(--border)}
.tipHead b{font-size:.8rem}
.previewBadge{padding:5px 8px;border-radius:999px;background:#ff477e12;border:1px solid #ff477e33;color:#ff9db7;font-size:.6rem;font-weight:800}
.tip{display:grid;grid-template-columns:1fr 1.5fr .8fr .5fr auto;gap:12px;align-items:center;padding:15px 20px;border-bottom:1px solid #ffffff0b}
.tip:last-of-type{border-bottom:0}
.tip small{color:var(--faint);font-size:.59rem}
.tip strong{font-size:.72rem}
.market{color:var(--muted);font-size:.65rem}
.odds{color:var(--signal);font:900 .75rem ui-monospace,SFMono-Regular,Menlo,monospace}
.tip .btn{min-height:38px;font-size:.63rem;padding:8px 12px}
.disclaimer{padding:13px 20px;background:#ff477e07;color:var(--muted);font-size:.65rem}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.step{padding:23px;border:1px solid var(--border);border-radius:22px;background:#ffffff03}
.num{display:grid;place-items:center;width:43px;height:43px;border-radius:50%;background:#151e2b;border:1px solid #00b4f855;color:var(--cyan);font:800 .75rem ui-monospace,SFMono-Regular,Menlo,monospace}
.step h3{margin:16px 0 6px;font-size:.88rem}
.step p{margin:0;color:var(--muted);font-size:.72rem}
.payments{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.payment{padding:17px;border:1px solid var(--border);border-radius:18px;background:#ffffff03}
.payment b{font-size:.75rem}
.payment span{display:block;margin-top:10px;color:#ccefff;font-size:.6rem;font-weight:700}
.limits{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}
.limit{padding:9px 12px;border:1px solid var(--border);border-radius:15px;background:#ffffff03}
.limit small{display:block;color:var(--faint);font-size:.57rem}
.limit b{font-size:.72rem}
.responsible-gaming-box{display:grid;grid-template-columns:.8fr 1.2fr;gap:25px;padding:27px;border:1px solid #ff477e3d;border-radius:25px;background:linear-gradient(145deg,#ff477e0b,#ff6b5706)}
.responsible-gaming-box h2{margin:7px 0 8px;font-size:1.6rem;letter-spacing:-.03em}
.responsible-gaming-box p,.responsible-gaming-box li{color:var(--muted);font-size:.72rem}
.responsible-gaming-box ul{margin:0;padding:0;list-style:none;display:grid;gap:7px}
.responsible-gaming-box li{padding:9px 11px;border-radius:10px;background:#ffffff04}
.notice{grid-column:1/-1;padding-top:13px;border-top:1px solid #ff477e1c;color:#ffb5c4;font-size:.65rem}
.faq{display:grid;grid-template-columns:.8fr 1.2fr;gap:45px}
.faqs{display:grid;gap:8px}
.faqs details{border:1px solid var(--border);border-radius:15px;background:#ffffff03}
.faqs summary{cursor:pointer;padding:14px;font-weight:800;font-size:.74rem}
.answer{padding:0 14px 14px;color:var(--muted);font-size:.7rem}
.final{padding:15px 0 75px}
.finalBox{text-align:center;padding:48px 25px;border:1px solid #00b4f833;border-radius:28px;background:radial-gradient(circle at 78% 15%,#ff477e18,transparent 30%),linear-gradient(135deg,#111a27,#0b121d)}
.finalBox h2{margin:0;font-size:clamp(2rem,4.5vw,3.5rem);letter-spacing:-.05em}
.finalBox p{max-width:650px;margin:10px auto 20px;color:var(--muted);font-size:.85rem}
.footer{padding:36px 0;border-top:1px solid var(--border)}
.foot{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:30px}
.footer p,.footer a{color:var(--muted);font-size:.67rem}
.footerLinks{display:grid;gap:6px;margin-top:8px}
.bottom{display:flex;justify-content:space-between;gap:10px;margin-top:25px;padding-top:15px;border-top:1px solid var(--border);color:var(--faint);font-size:.61rem}
@media(max-width:980px){.heroGrid{grid-template-columns:1fr;gap:45px}.hero h1{max-width:760px}.phone{margin:0 auto}.services{grid-template-columns:1fr 1fr}.payments{grid-template-columns:repeat(3,1fr)}.links a:nth-child(n+4){display:none}}
@media(max-width:720px){.wrap{width:calc(100% - 24px)}.navin{min-height:62px}.links,.langs,.desktop{display:none}.menu{display:grid;place-items:center}.mobile.open{display:grid;position:absolute;right:12px;top:calc(100% + 7px);width:min(320px,calc(100vw - 24px));padding:9px;background:#0a101af7;border:1px solid var(--border);border-radius:17px;box-shadow:0 20px 50px #000b}.mobile a{padding:11px;color:var(--muted);font-weight:700}.mobile .btn{margin-top:4px;color:#071006}.hero{padding:52px 0 35px}.heroGrid{gap:30px}.hero h1{font-size:clamp(2.8rem,14vw,4.2rem)}.actions{display:grid}.actions .btn{width:100%}.trust,.services,.steps,.faq{grid-template-columns:1fr}.payments{grid-template-columns:1fr 1fr}.tip{grid-template-columns:1fr auto}.tip .market{grid-column:1}.tip .odds{grid-column:2;grid-row:1}.tip .cta{grid-column:1/-1;width:100%}.responsible-gaming-box{grid-template-columns:1fr}.notice{grid-column:auto}.foot{grid-template-columns:1fr 1fr}.bottom{display:grid}}
@media(max-width:430px){.payments{grid-template-columns:1fr}.foot{grid-template-columns:1fr}.phone{border-radius:29px}.phoneInner{border-radius:25px}.chat{min-height:340px}}
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
      <div class="pills"><span class="pill">🔞 18+ only</span><span class="pill">🌐 Sinhala / English / Tamil</span><span class="pill">⚡ Guided Telegram flow</span></div>
    </div>

    <div id="edge-visual">
      <div class="phone" aria-label="Illustrative Telegram bot preview">
        <div class="phoneInner">
          <div class="phoneTop"><span>09:24</span><span class="notch"></span><span>LTE</span></div>
          <div class="chatHead">
            <div class="brand"><span>${BRAND_LOGO_SVG_COMPACT}</span></div>
            <div class="chatTitle"><b>Fast xBet Cash</b><span>bot · replies in minutes</span></div>
            <div class="online"><i></i> Bot online</div>
          </div>
          <div class="chat">
            <div class="bubble bot">Welcome. Choose a service to continue.</div>
            <div class="bubble user">Deposit</div>
            <div class="bubble bot">Send your 1xBet Player ID, then pick a local rail.</div>
            <div class="bubble user">Player ID 88410231</div>
            <div class="bubble bot">Limits LKR ${min.toLocaleString("en-LK")}–${max.toLocaleString("en-LK")}. Typical completion 2–5 minutes after receipt.</div>
            <div class="chatChips"><span class="chatChip">Tips</span><span class="chatChip">Deposit</span><span class="chatChip">Withdraw</span><span class="chatChip">Support</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="wrap" aria-label="Trust signals">
  <div class="trust"><div><b>Guided</b><span>Clear flow</span></div><div><b>Telegram</b><span>One place</span></div><div><b>Logged</b><span>Request trail</span></div><div><b>18+</b><span>Responsible use</span></div></div>
</section>

<section class="section" id="services"><div class="wrap">
  <div class="head"><div class="kicker">${esc(c.services[0])}</div><h2>${esc(c.services[1])}</h2><p>Choose a service and follow the guided instructions. Sports outcomes are uncertain; no tip guarantees a win or profit.</p></div>
  <div class="services">${serviceCards}</div>
</div></section>

<section class="section" id="tips-preview"><div class="wrap">
  <div class="head"><div class="kicker">Free Tips</div><h2>Today’s Free Tips Preview</h2><p>Sample fixtures are shown only as a public preview. They are not presented as live predictions.</p></div>
  <div class="tips">
    <div class="tipHead"><b>Sample fixtures</b><span class="previewBadge">Preview only</span></div>
    <div class="tip"><small>Premier League</small><strong>Arsenal vs Chelsea</strong><span class="market">Preview market</span><b class="odds">1.82</b><a class="btn secondary cta" href="${eb}">${esc(c.hero[3])}</a></div>
    <div class="tip"><small>La Liga</small><strong>Real Madrid vs Atletico</strong><span class="market">Preview market</span><b class="odds">1.74</b><a class="btn secondary cta" href="${eb}">${esc(c.hero[3])}</a></div>
    <div class="tip"><small>Champions League</small><strong>Bayern Munich vs PSG</strong><span class="market">Preview market</span><b class="odds">1.91</b><a class="btn secondary cta" href="${eb}">${esc(c.hero[3])}</a></div>
    <div class="disclaimer">These previews are illustrative. Sports outcomes are uncertain. No tip guarantees a win or profit.</div>
  </div>
</div></section>

<section class="section" id="how-it-works"><div class="wrap">
  <div class="head"><div class="kicker">${esc(c.how[0])}</div><h2>${esc(c.how[0])}</h2></div>
  <div class="steps"><article class="step"><div class="num">1</div><h3>${esc(c.how[1])}</h3><p>Use the Telegram CTA to open the bot.</p></article><article class="step"><div class="num">2</div><h3>${esc(c.how[2])}</h3><p>Choose tips, deposit, withdrawal or support.</p></article><article class="step"><div class="num">3</div><h3>${esc(c.how[3])}</h3><p>Provide only the information requested by the bot.</p></article></div>
</div></section>

<section class="section" id="payments"><div class="wrap">
  <div class="head"><div class="kicker">Payments</div><h2>${esc(c.pay[0])}</h2><p>Confirm availability and exact instructions inside the bot. Sensitive payment credentials are not exposed on this page.</p></div>
  <div class="payments">${payments}</div>
  <div class="limits"><div class="limit"><small>Minimum</small><b>LKR ${min.toLocaleString("en-LK")}</b></div><div class="limit"><small>Maximum</small><b>LKR ${max.toLocaleString("en-LK")}</b></div><div class="limit"><small>Promo</small><b>${promo}</b></div></div>
  <div class="actions">${env.DEPOSIT_INSTRUCTIONS?.trim() ? `<details class="limit"><summary>Deposit instructions</summary><div style="color:var(--muted);font-size:.7rem;margin-top:7px">${esc(env.DEPOSIT_INSTRUCTIONS.trim())}</div></details>` : ""}</div>
</div></section>

<section class="section"><div class="wrap"><div class="responsible-gaming-box">
  <div><div class="kicker">Play responsibly</div><h2>🔞 18+ Responsible Gaming Notice</h2><p>Free tips and previews are informational only. No guaranteed outcome, profit, or risk-free betting claim is made.</p></div>
  <ul><li>✓ 18+ users only.</li><li>✓ Gambling involves risk and losses can occur.</li><li>✓ Set limits and do not chase losses.</li><li>✓ Never use money needed for essential expenses.</li><li>✓ If gambling stops feeling controlled, take a break and seek appropriate support.</li></ul>
  <div class="notice">Responsible use is your responsibility. Do not chase losses or use essential-expense money for gambling.</div>
</div></div></section>

<section class="section" id="faq"><div class="wrap faq">
  <div class="head"><div class="kicker">FAQ</div><h2>Frequently Asked Questions</h2><p>Clear answers for the public workflow.</p></div>
  <div class="faqs">${faqHtml}</div>
</div></section>

<section class="final"><div class="wrap"><div class="finalBox"><h2>${esc(c.final[0])}</h2><p>${esc(c.final[1])}</p><div class="actions" style="justify-content:center"><a class="btn primary" href="${eb}">✈ ${esc(c.hero[3])}</a><a class="btn secondary" href="#tips-preview">${esc(c.hero[4])}</a></div></div></div></section>
</main>

<footer class="footer"><div class="wrap foot">
  <div><a class="logo" href="${ea}"><span>${BRAND_LOGO_SVG_COMPACT}</span>Fast <span>xBet</span> Cash 🇱🇰</a><p>Telegram-first service for public sports previews, guided support and multilingual assistance.</p><b>18+ only · Gamble responsibly</b></div>
  <div><b>Quick links</b><div class="footerLinks"><a href="#tips-preview">${esc(c.nav[1])}</a><a href="#payments">${esc(c.nav[3])}</a><a href="#faq">${esc(c.nav[4])}</a></div></div>
  <div><b>Access</b><div class="footerLinks"><a href="${ec}">Tips Channel</a><a href="${eb}">Telegram Bot</a><a href="#faq">Responsible gaming</a></div></div>
</div><div class="wrap bottom"><span>© ${new Date().getFullYear()} Fast xBet Cash</span><span>18+ · Telegram-first · Edge service</span></div></footer>

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
})();
</script>
</body></html>`;
}
