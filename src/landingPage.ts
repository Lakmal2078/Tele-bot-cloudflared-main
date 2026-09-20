import type { Env } from "./types";

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

function qrCodeSvg(): string {
  return `<svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg" class="qrSvg" aria-label="QR Code">
  <rect width="200" height="200" rx="16" fill="#ffffff"/>
  <rect x="20" y="20" width="46" height="46" rx="6" fill="#0088cc"/>
  <rect x="26" y="26" width="34" height="34" rx="4" fill="#ffffff"/>
  <rect x="33" y="33" width="20" height="20" rx="3" fill="#0088cc"/>
  <rect x="134" y="20" width="46" height="46" rx="6" fill="#0088cc"/>
  <rect x="140" y="26" width="34" height="34" rx="4" fill="#ffffff"/>
  <rect x="147" y="33" width="20" height="20" rx="3" fill="#0088cc"/>
  <rect x="20" y="134" width="46" height="46" rx="6" fill="#0088cc"/>
  <rect x="26" y="140" width="34" height="34" rx="4" fill="#ffffff"/>
  <rect x="33" y="147" width="20" height="20" rx="3" fill="#0088cc"/>
  <g fill="#1e293b">
    <rect x="76" y="24" width="6" height="6" rx="1"/>
    <rect x="90" y="24" width="6" height="6" rx="1"/>
    <rect x="104" y="24" width="6" height="6" rx="1"/>
    <rect x="118" y="24" width="6" height="6" rx="1"/>
    <rect x="24" y="76" width="6" height="6" rx="1"/>
    <rect x="24" y="90" width="6" height="6" rx="1"/>
    <rect x="24" y="104" width="6" height="6" rx="1"/>
    <rect x="24" y="118" width="6" height="6" rx="1"/>
    <rect x="76" y="40" width="6" height="6" rx="1"/>
    <rect x="90" y="40" width="6" height="6" rx="1"/>
    <rect x="104" y="40" width="6" height="6" rx="1"/>
    <rect x="118" y="40" width="6" height="6" rx="1"/>
    <rect x="76" y="56" width="6" height="6" rx="1"/>
    <rect x="104" y="56" width="6" height="6" rx="1"/>
    <rect x="118" y="56" width="6" height="6" rx="1"/>
    <rect x="76" y="72" width="6" height="6" rx="1"/>
    <rect x="90" y="72" width="6" height="6" rx="1"/>
    <rect x="118" y="72" width="6" height="6" rx="1"/>
    <rect x="40" y="76" width="6" height="6" rx="1"/>
    <rect x="54" y="76" width="6" height="6" rx="1"/>
    <rect x="40" y="90" width="6" height="6" rx="1"/>
    <rect x="54" y="104" width="6" height="6" rx="1"/>
    <rect x="40" y="118" width="6" height="6" rx="1"/>
    <rect x="140" y="76" width="6" height="6" rx="1"/>
    <rect x="154" y="76" width="6" height="6" rx="1"/>
    <rect x="168" y="76" width="6" height="6" rx="1"/>
    <rect x="140" y="90" width="6" height="6" rx="1"/>
    <rect x="168" y="90" width="6" height="6" rx="1"/>
    <rect x="154" y="104" width="6" height="6" rx="1"/>
    <rect x="140" y="118" width="6" height="6" rx="1"/>
    <rect x="168" y="118" width="6" height="6" rx="1"/>
    <rect x="76" y="134" width="6" height="6" rx="1"/>
    <rect x="90" y="134" width="6" height="6" rx="1"/>
    <rect x="118" y="134" width="6" height="6" rx="1"/>
    <rect x="140" y="134" width="6" height="6" rx="1"/>
    <rect x="154" y="134" width="6" height="6" rx="1"/>
    <rect x="168" y="134" width="6" height="6" rx="1"/>
    <rect x="76" y="148" width="6" height="6" rx="1"/>
    <rect x="104" y="148" width="6" height="6" rx="1"/>
    <rect x="140" y="148" width="6" height="6" rx="1"/>
    <rect x="168" y="148" width="6" height="6" rx="1"/>
    <rect x="76" y="162" width="6" height="6" rx="1"/>
    <rect x="90" y="162" width="6" height="6" rx="1"/>
    <rect x="104" y="162" width="6" height="6" rx="1"/>
    <rect x="118" y="162" width="6" height="6" rx="1"/>
    <rect x="154" y="162" width="6" height="6" rx="1"/>
  </g>
  <circle cx="100" cy="100" r="16" fill="#0088cc"/>
  <path d="M92 100l6 6 12-12" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;
}

const T: Record<Lang, {
  title: string;
  desc: string;
  nav: string[];
  hero: string[];
  ticker: string;
  countdown: string;
  services: string[];
  how: string[];
  pay: string[];
  security: string[];
  final: string[];
  faq: string[];
  faqAnswers: string[];
  legal: { privacy: string; terms: string };
}> = {
  si: {
    title: "Fast xBet Cash 🇱🇰 — 1xBet Sri Lanka Telegram Bot & නොමිලේ ක්‍රීඩා උපදෙස්",
    desc: "1xBet Sri Lanka Telegram Bot හරහා නොමිලේ ක්‍රීඩා උපදෙස්, eZ Cash, mCash, FriMi, iPay සහ බැංකු ගිණුම් තැන්පතු සහ මුදල් ආපසු ගැනීම්. 18+ පමණි.",
    nav: ["මුල් පිටුව", "Free Tips", "ක්‍රමය", "ගෙවීම්", "ආරක්ෂාව", "FAQ"],
    hero: [
      "ශ්‍රී ලංකාව • 1xBet Telegram Cash Desk",
      "වේගවත් tips. සරල cash. එක Telegram එකක්.",
      "නොමිලේ ක්‍රීඩා උපදෙස්, guided deposit සහ withdrawal සහාය, බහුභාෂා සේවාව — එකම Telegram bot එකක් හරහා. Extra apps අවශ්‍ය නැහැ.",
      "Telegram Bot එකට සම්බන්ධ වන්න",
      "නොමිලේ උපදෙස් ලබා ගන්න",
      "දැන් තැන්පතු කරන්න",
      "📱 Scan QR"
    ],
    ticker: "සජීවී ජයග්‍රහණ (RECENT WINS)",
    countdown: "මීළඟ Tips නිකුතුව (SL Time):",
    services: [
      "One Telegram flow",
      "ඔබට අවශ්‍ය දේ එකම Telegram flow එකක",
      "නොමිලේ ක්‍රීඩා උපදෙස් (Free Tips)",
      "තැන්පතු පහසුකම (Deposit Assistance)",
      "මුදල් ආපසු ගැනීම් (Withdrawal Support)",
      "බහුභාෂා සහාය (Multilingual Support)"
    ],
    how: [
      "ආරම්භ කරන්නේ මෙහෙමයි",
      "Telegram bot එක විවෘත කරන්න",
      "Service එක තෝරන්න",
      "Guided instructions follow කරන්න"
    ],
    pay: [
      "දේශීය ගෙවීම් ක්‍රම — තැන්පතු සහ මුදල් ආපසු ගැනීම්",
      "eZ Cash",
      "mCash",
      "FriMi",
      "iPay",
      "Bank Transfer"
    ],
    security: [
      "ආරක්ෂාව සහ දත්ත රහස්‍යතාව",
      "Cloudflare D1 සහ R2 ආරක්ෂිත යටිතල පහසුකම්",
      "Cloudflare Global Edge Network මගින් DDoS සහ SSL/TLS ආරක්ෂාව සපයයි.",
      "පරිශීලක දත්ත Cloudflare D1 සහ R2 ආරක්ෂිත පද්ධති තුළ සංකේතනය කර ඇත.",
      "කිසිදු බැංකු මුරපදයක්, PIN හෝ OTP වෙබ් අඩවියේ රඳවා නොගනී. සියලු ගනුදෙනු Telegram bot හරහා පමණක් ආරක්ෂිතව තහවුරු කෙරේ."
    ],
    final: [
      "ආරම්භ කිරීමට සූදානම්ද?",
      "Telegram bot එක විවෘත කර tips සහ support සඳහා guided flow එක අනුගමනය කරන්න."
    ],
    faq: [
      "Deposit කරන්නේ කෙසේද?",
      "Withdraw කරන්නේ කෙසේද?",
      "Free Tips මොනවාද?",
      "Referral bonus ලබාගන්නේ කෙසේද?",
      "Support ලබාගන්නේ කෙසේද?",
      "භාෂාව වෙනස් කරන්නේ කෙසේද?"
    ],
    faqAnswers: [
      "Telegram bot හි පෙන්වන പියවර අනුගමනය කරන්න. eZ Cash, mCash, FriMi, iPay හෝ Bank Transfer තෝරා තහවුරු කරන්න.",
      "Telegram bot හි withdrawal උපදෙස් අනුගමනය කරන්න. ප්‍රතිඵල හෝ ලාභ සහතික නොවේ.",
      "Free tips තොරතුරුමය පෙරදසුන් පමණි; ක්‍රීඩා ප්‍රතිඵල අවිනිශ්චිතය.",
      "Referral විකල්ප තිබේ නම් bot හි පෙන්වන නියමයන් බලන්න.",
      "Telegram bot හි support විකල්පය තෝරන්න.",
      "Bot හි language විකල්පයෙන් භාෂාව (SI, EN, TA) තෝරන්න."
    ],
    legal: {
      privacy: "අපගේ සේවාව පරිශීලක රහස්‍යතාව උපරිමයෙන් සුරකියි. කිසිදු සංවේදී බැංකු PIN හෝ කාඩ්පත් දත්ත වෙබ් අඩවියේ ගබඩා නොකෙරේ. දත්ත ආරක්ෂාව Cloudflare Edge, D1 සහ R2 යටිතල පහසුකම් මගින් සහතික කෙරේ. සේවාව 18+ පරිශීලකයින් සඳහා පමණි.",
      terms: "මෙම සේවාව තොරතුරුමය ක්‍රීඩා උපදෙස් සහ Telegram පාදක සහායක පද්ධතියකි. කිසිදු ක්‍රීඩා ප්‍රතිඵලයක් හෝ මූල්‍ය ලාභයක් සහතික නොකෙරේ. වගකීමෙන් යුතුව ක්‍රීඩා කරන්න. 18+ නීතිමය සීමාවන්ට යටත් වේ."
    }
  },
  en: {
    title: "Fast xBet Cash 🇱🇰 — 1xBet Sri Lanka Telegram Bot & Free Sports Tips",
    desc: "1xBet Sri Lanka Telegram Bot for free sports previews, eZ Cash, mCash, FriMi, iPay and bank deposits and withdrawals. 18+ only.",
    nav: ["Home", "Free Tips", "How It Works", "Payments", "Security", "FAQ"],
    hero: [
      "SRI LANKA • TELEGRAM-FIRST CASH DESK",
      "Fast tips. Simple cash. One Telegram.",
      "Free sports previews, guided deposits and withdrawals, and multilingual help — all inside one Telegram bot. No extra apps.",
      "Open Telegram Bot",
      "View free tips",
      "Deposit Now",
      "📱 Scan QR"
    ],
    ticker: "RECENT WINS (VERIFIED SLIPS)",
    countdown: "Next Tips Drop (SL Time):",
    services: [
      "One Telegram flow",
      "Everything you need, in one Telegram flow",
      "Free Sports Tips",
      "Deposit Assistance",
      "Withdrawal Support",
      "Multilingual Support"
    ],
    how: [
      "How it works",
      "Open the Telegram bot",
      "Choose your service",
      "Follow the guided instructions"
    ],
    pay: [
      "Local payment options, clearly explained",
      "eZ Cash",
      "mCash",
      "FriMi",
      "iPay",
      "Bank Transfer"
    ],
    security: [
      "Security & Data Protection",
      "Cloudflare D1 & R2 Enterprise Infrastructure",
      "Protected by Cloudflare Global Edge Network with SSL/TLS and DDoS mitigation.",
      "Data encrypted in transit and securely partitioned in Cloudflare D1 and R2 storage.",
      "No bank PINs, passwords, or card credentials are ever requested or stored on the web. Direct verification inside Telegram."
    ],
    final: [
      "Ready to get started?",
      "Open the Telegram bot and follow a guided flow for tips and support."
    ],
    faq: [
      "How do I deposit?",
      "How do I withdraw?",
      "What are the free tips?",
      "How do I get a referral bonus?",
      "How do I get support?",
      "How do I change language?"
    ],
    faqAnswers: [
      "Follow the deposit steps shown by the Telegram bot and verify the details before paying. Supports eZ Cash, mCash, FriMi, iPay, Bank Transfer.",
      "Follow the withdrawal instructions in the Telegram bot. Outcomes and profits are not guaranteed.",
      "Free tips are informational previews only; sports outcomes are uncertain.",
      "If available, review the referral terms shown in the bot.",
      "Choose the support option in the Telegram bot.",
      "Choose your language from the language option in the bot."
    ],
    legal: {
      privacy: "Your privacy is strictly safeguarded. Sensitive financial credentials (passwords, PINs, card CVVs) are never collected or stored on this website. Operations are secured through Cloudflare edge infrastructure, D1, and encrypted R2 storage. Restricted to users 18+.",
      terms: "This website serves as an informational preview and Telegram assistant. We make no guaranteed return or betting outcome claims. Gamble responsibly and within your personal means. Strictly 18+."
    }
  },
  ta: {
    title: "Fast xBet Cash 🇱🇰 — 1xBet இலங்கை Telegram Bot & இலவச Sports Tips",
    desc: "1xBet இலங்கை Telegram Bot இலவச sports tips, eZ Cash, mCash, FriMi, iPay மற்றும் வங்கி deposit, withdrawal ஆதரவு. 18+ மட்டும்.",
    nav: ["முகப்பு", "இலவச Tips", "எப்படி வேலை செய்கிறது", "கொடுப்பனவுகள்", "பாதுகாப்பு", "FAQ"],
    hero: [
      "இலங்கை • TELEGRAM-FIRST CASH DESK",
      "வேகமான tips. எளிய cash. ஒரே Telegram.",
      "Free sports previews, guided deposit மற்றும் withdrawal support, multilingual help — ஒரே Telegram bot-ல். கூடுதல் செயலிகள் தேவையில்லை.",
      "Telegram Bot திறக்கவும்",
      "Free Tips பார்க்கவும்",
      "இப்போதே Deposit செய்க",
      "📱 QR ஸ்கேன்"
    ],
    ticker: "சமீபத்திய வெற்றிகள் (RECENT WINS)",
    countdown: "அடுத்த Tips நேரம் (SL Time):",
    services: [
      "One Telegram flow",
      "தேவையான அனைத்தும் ஒரே Telegram flow-ல்",
      "Free Sports Tips",
      "Deposit Assistance",
      "Withdrawal Support",
      "Multilingual Support"
    ],
    how: [
      "எப்படி தொடங்குவது",
      "Telegram bot திறக்கவும்",
      "Service தேர்ந்தெடுக்கவும்",
      "Guided instructions பின்பற்றவும்"
    ],
    pay: [
      "உள்ளூர் கொடுப்பனவு முறைகள் — Deposit & Withdrawal",
      "eZ Cash",
      "mCash",
      "FriMi",
      "iPay",
      "Bank Transfer"
    ],
    security: [
      "பாதுகாப்பு மற்றும் தரவு ரகசியத்தன்மை",
      "Cloudflare D1 மற்றும் R2 உள்கட்டமைப்பு",
      "Cloudflare Global Edge Network மூலம் SSL/TLS மறைகுறியீடு மற்றும் DDoS பாதுகாப்பு.",
      "பயனர் தரவு Cloudflare D1 மற்றும் R2 அமைப்புகளில் பாதுகாப்பாக சேமிக்கப்படுகிறது.",
      "வங்கி கடவுச்சொற்கள் அல்லது PIN இணையதளத்தில் சேமிக்கப்படாது. Telegram bot மூலம் மட்டுமே நேரடி சரிபார்ப்பு."
    ],
    final: [
      "Ready to get started?",
      "Telegram bot திறந்து tips மற்றும் support-க்கு guided flow பின்பற்றுங்கள்."
    ],
    faq: [
      "Deposit செய்வது எப்படி?",
      "Withdraw செய்வது எப்படி?",
      "Free Tips என்றால் என்ன?",
      "Referral bonus பெறுவது எப்படி?",
      "Support பெறுவது எப்படி?",
      "மொழியை மாற்றுவது எப்படி?"
    ],
    faqAnswers: [
      "Telegram bot காட்டும் deposit படிகளைப் பின்பற்றி, பணம் செலுத்தும் முன் விவரங்களைச் சரிபார்க்கவும். eZ Cash, mCash, FriMi, iPay, வங்கி பரிமாற்றம் உள்ளன.",
      "Telegram bot-இல் காட்டப்படும் withdrawal வழிமுறைகளைப் பின்பற்றவும். முடிவுகள் அல்லது லாபம் உறுதியல்ல.",
      "Free tips தகவல் சார்ந்த முன்னோட்டங்கள் மட்டுமே; விளையாட்டு முடிவுகள் உறுதியற்றவை.",
      "இருந்தால், bot-இல் காட்டப்படும் referral விதிமுறைகளைப் பார்க்கவும்.",
      "Telegram bot-இல் support விருப்பத்தைத் தேர்ந்தெடுக்கவும்.",
      "Bot-இன் language விருப்பத்தில் மொழியைத் (SI, EN, TA) தேர்ந்தெடுக்கவும்."
    ],
    legal: {
      privacy: "பயனர் ரகசியத்தன்மை முழுமையாகப் பாதுகாக்கப்படுகிறது. வங்கி PIN அல்லது கார்டு விவரங்கள் தளத்தில் சேமிக்கப்படாது. Cloudflare Edge, D1 மற்றும் R2 மூலம் பாதுகாக்கப்படுகிறது. 18+ பயனர்களுக்கு மட்டுமே.",
      terms: "இந்த தளம் தகவல் சார்ந்த விளையாட்டு முன்னோட்டங்கள் மற்றும் Telegram உதவி அமைப்பாகும். முடிவுகள் அல்லது லாபம் உத்தரவாதமில்லை. பொறுப்புடன் விளையாடுங்கள். 18+ வயது வரம்பு பொருந்தும்."
    }
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

function paymentIcon(name: string): string {
  if (name === "eZ Cash") {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#008037"/><path d="M6 12h12M12 6v12" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><circle cx="18" cy="6" r="3.5" fill="#ED1C24"/></svg>`;
  }
  if (name === "mCash") {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#005696"/><path d="M6 17l4-10 2 6 2-6 4 10" stroke="#FF6A00" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  if (name === "FriMi") {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#E60028"/><text x="12" y="16" fill="#fff" font-size="11" font-weight="900" text-anchor="middle" font-family="system-ui,sans-serif">Fr</text></svg>`;
  }
  if (name === "iPay") {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#1C2E60"/><path d="M7 12a5 5 0 0110 0 5 5 0 01-10 0" stroke="#00C4FE" stroke-width="2.5"/></svg>`;
  }
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#0F172A"/><path d="M4 10h16M5 10v7M9 10v7M15 10v7M19 10v7M12 5l8 4H4l8-4zM3 19h18" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
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
      {
        "@type": "Organization",
        "@id": `${url}#organization`,
        name: "Fast xBet Cash",
        url,
        logo: `${url}og-image.jpg`,
        image: `${url}og-image.jpg`,
        sameAs: [channel, `https://t.me/${botName}`],
        areaServed: "LK",
        availableLanguage: ["si", "en", "ta"]
      },
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        url,
        name: "Fast xBet Cash 🇱🇰",
        publisher: { "@id": `${url}#organization` },
        inLanguage: ["si", "en", "ta"]
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: faq
      }
    ]
  }));

  const payments = c.pay.slice(1).map((p) =>
    `<article class="payment">
      <div class="payTop">
        <span class="payIcon">${paymentIcon(p)}</span>
        <span class="payBadge">⚡ After verify</span>
      </div>
      <b>${esc(p)}</b>
      <div class="payBottom">
        <span class="payFee">No service fee</span>
        <span>${paymentConfigured(env, p) ? "Available" : "via Telegram"}</span>
      </div>
    </article>`
  ).join("");

  const serviceCards = [
    ["🎯", c.services[2], "Automated sports analysis and selected informational previews.", "View preview"],
    ["💳", c.services[3], "Guided deposit workflow with configured transaction limits.", `LKR ${min.toLocaleString("en-LK")} – ${max.toLocaleString("en-LK")}`],
    ["↗", c.services[4], "Submit a withdrawal request through the bot and follow verification steps.", "Guided request"],
    ["🌐", c.services[5], "Sinhala, English and Tamil support through Telegram.", "SI · EN · TA"]
  ].map(([icon, title, body, tag]) =>
    `<article class="service">
      <div class="icon">${icon}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(body)}</p>
      <span class="tag">${esc(tag)}</span>
    </article>`
  ).join("");

  const faqHtml = c.faq.map((q, i) =>
    `<details>
      <summary>${esc(q)}</summary>
      <div class="answer">${esc(c.faqAnswers[i])}</div>
    </details>`
  ).join("");

  const analyticsToken = env.CF_BEACON_TOKEN?.trim() || env.CLOUDFLARE_ANALYTICS_TOKEN?.trim() || "";
  const cfAnalyticsScript = analyticsToken
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(analyticsToken)}"}'>${""}</script>`
    : "";

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(c.title)}</title>
<meta name="description" content="${esc(c.desc)}">
<meta name="keywords" content="1xBet Sri Lanka Telegram Bot, නොමිලේ ක්‍රීඩා උපදෙස් ශ්‍රී ලංකා, xBet cash desk Sri Lanka, 1xbet deposit Sinhala, eZ Cash 1xBet, mCash, FriMi, iPay, Telegram betting tips Sri Lanka, sports betting tips LK">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#070B12">
<meta name="color-scheme" content="dark">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.json">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700;800&family=Noto+Sans+Tamil:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="canonical" href="${ea}">
<link rel="alternate" hreflang="si" href="${ea}?lang=si">
<link rel="alternate" hreflang="en" href="${ea}?lang=en">
<link rel="alternate" hreflang="ta" href="${ea}?lang=ta">
<link rel="alternate" hreflang="x-default" href="${ea}">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/favicon.png">
<meta property="og:site_name" content="Fast xBet Cash">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(c.title)}">
<meta property="og:description" content="${esc(c.desc)}">
<meta property="og:url" content="${ea}">
<meta property="og:image" content="${esc(url + "og-image.jpg?v=3")}">
<meta property="og:image:secure_url" content="${esc(url + "og-image.jpg?v=3")}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<link rel="image_src" href="${esc(url + "og-image.jpg?v=3")}">
<meta itemprop="image" content="${esc(url + "og-image.jpg?v=3")}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(c.title)}">
<meta name="twitter:description" content="${esc(c.desc)}">
<meta name="twitter:image" content="${esc(url + "og-image.jpg?v=3")}">
<script type="application/ld+json"${n}>${ld}</script>
${cfAnalyticsScript}
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

/* Nav */
.nav{position:sticky;top:0;z-index:50;background:#070b12e8;backdrop-filter:blur(18px);border-bottom:1px solid var(--border)}
.navin{min-height:70px;display:flex;align-items:center;gap:18px}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:-.02em;white-space:nowrap}
.logo img,.logo svg{width:36px;height:36px;border-radius:10px;object-fit:cover}
.logo span{color:var(--signal)}
.links{display:flex;gap:2px;margin-left:auto}
.links a{padding:8px 11px;border-radius:10px;color:var(--muted);font-size:.78rem;font-weight:700}
.links a:hover{background:#ffffff08;color:var(--fg)}
.langs{display:flex;gap:3px;padding:3px;border:1px solid var(--border);border-radius:999px;background:#ffffff05}
.langs a{padding:5px 8px;color:var(--muted);font-size:.72rem;font-weight:800;border-radius:999px}
.langs a[aria-current=page]{background:#ffffff0b;color:var(--fg)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 18px;border-radius:999px;border:1px solid transparent;font-size:.82rem;font-weight:800;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
.btn:hover{transform:translateY(-1px)}
.primary{background:var(--signal);color:#071006;box-shadow:0 12px 32px #a6f80022}
.secondary{background:transparent;border-color:#dbeafe88;color:var(--fg)}
.secondary:hover{background:#ffffff0a}
.accent{background:#00b4f815;border-color:#00b4f866;color:#ccefff}
.accent:hover{background:#00b4f828}
.menu{display:none;margin-left:auto;width:44px;height:44px;border:1px solid var(--border);background:#ffffff08;color:var(--fg);border-radius:12px;cursor:pointer}
.mobile{display:none}

/* Winning Tips Ticker Bar */
.tickerBar{background:linear-gradient(90deg,#0a1320,#0e1a2b 50%,#0a1320);border-bottom:1px solid #00b4f822;overflow:hidden;padding:7px 0;position:relative}
.tickerInner{display:flex;align-items:center;gap:14px}
.tickerBadge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:6px;background:#ff477e1c;border:1px solid #ff477e44;color:#ff8ba7;font:800 .62rem ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;white-space:nowrap;flex-shrink:0}
.tickerScroll{overflow:hidden;white-space:nowrap;display:flex;flex:1;mask-image:linear-gradient(90deg,transparent,black 3%,black 97%,transparent)}
.tickerItems{display:inline-flex;gap:24px;animation:tickerScroll 32s linear infinite;will-change:transform}
.tickerItems:hover{animation-play-state:paused}
.tickerItem{display:inline-flex;align-items:center;gap:6px;color:#cbd5e1;font-size:.7rem;font-weight:600}
.tickerItem b{color:var(--signal);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.wonTag{display:inline-block;padding:1px 5px;border-radius:4px;background:#22c55e26;color:#86efac;font:800 .55rem ui-monospace,SFMono-Regular,Menlo,monospace}
@keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* Hero Section */
.hero{padding:70px 0 52px}
.heroGrid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(350px,.92fr);gap:60px;align-items:center}
.eyebrow{color:#e5edf7;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.68rem;font-weight:800;letter-spacing:.22em;text-transform:uppercase}
.hero h1{max-width:640px;margin:18px 0 22px;font-size:clamp(3.1rem,6.8vw,5.8rem);line-height:.98;letter-spacing:-.065em;font-weight:800}
.hero p{max-width:610px;color:var(--muted);font-size:1rem;margin:0}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:26px}
.pills{display:flex;gap:7px;flex-wrap:wrap;margin-top:18px}
.pill{padding:6px 11px;border:1px solid var(--border);background:#ffffff05;border-radius:999px;color:var(--muted);font-size:.66rem;font-weight:700}

/* Promo Banner */
.promoBar{display:inline-flex;align-items:center;gap:10px;margin-top:18px;padding:8px 14px;border:1px solid #a6f80033;border-radius:999px;background:#a6f8000b;flex-wrap:wrap}
.promoTag{font-size:.6rem;font-weight:900;letter-spacing:.1em;color:var(--signal);background:#a6f80018;padding:3px 7px;border-radius:6px}
.promoCodeWrap{display:inline-flex;align-items:center;gap:8px}
.promoCodeWrap strong{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85rem;color:#fff;letter-spacing:.05em}
.promoCopyBtn{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;border:1px solid #ffffff22;background:#ffffff10;color:var(--fg);font-size:.65rem;font-weight:700;cursor:pointer;transition:background .2s,border-color .2s,transform .15s}
.promoCopyBtn:hover{background:#ffffff20;border-color:var(--signal);transform:translateY(-1px)}
.promoCopyBtn.copied{background:#22c55e22;border-color:#22c55e;color:#86efac}
.promoNote{font-size:.64rem;color:var(--muted)}

/* Phone Mockup */
#edge-visual{position:relative}
.phone{width:min(380px,100%);margin:0 auto;padding:2px;border:1px solid #dbeafeaa;border-radius:34px;background:#0b121d;box-shadow:var(--shadow)}
.phoneInner{overflow:hidden;border-radius:30px;background:var(--bg2)}
.phoneTop{display:flex;justify-content:space-between;align-items:center;padding:12px 24px 7px;color:var(--muted);font:600 .62rem ui-monospace,SFMono-Regular,Menlo,monospace}
.notch{width:96px;height:16px;border-radius:999px;background:#ffffff10}
.chatHead{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--border)}
.chatHead .brand{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#050c14;border:1px solid #00b4f855;overflow:hidden}
.chatHead .brand img,.chatHead .brand svg{width:100%;height:100%;object-fit:cover}
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
.chatChips button.chatChip{padding:6px 10px;border-radius:999px;background:#ffffff08;border:1px solid #ffffff14;color:var(--muted);font-size:.62rem;cursor:pointer;transition:all .15s}
.chatChips button.chatChip:hover{background:#ffffff18;color:var(--fg)}
.chatChips button.chatChip.active{background:var(--cyan);color:#071018;font-weight:800;border-color:var(--cyan)}

/* Trust strip */
.trust{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:12px 0 25px}
.trust div{padding:17px;border:1px solid var(--border);border-radius:22px;background:#ffffff03;text-align:center}
.trust b{display:block;font:700 .62rem ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--fg)}
.trust span{display:block;margin-top:5px;color:var(--muted);font-size:.7rem}

/* Sections */
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

/* Tips preview & countdown */
.tips{overflow:hidden;border:1px solid var(--border);border-radius:24px;background:var(--surface);padding-bottom:8px}
.tipsCountdownBar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 20px;background:#0d1829;border-bottom:1px solid var(--border);flex-wrap:wrap}
.countdownLabel{display:flex;align-items:center;gap:7px;font-size:.68rem;font-weight:700;color:var(--muted)}
.countdownDot{width:8px;height:8px;border-radius:50%;background:var(--signal);box-shadow:0 0 8px var(--signal);animation:pulse 1.8s infinite ease-in-out}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}}
.countdownTimer{font:800 .92rem ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--signal);letter-spacing:.05em}
.countdownSlot{padding:3px 8px;border-radius:999px;background:#ffffff08;border:1px solid var(--border);color:var(--muted);font-size:.6rem;font-weight:700}
.tipHead{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:17px 20px;border-bottom:1px solid var(--border)}
.tipHead b{font-size:.8rem}
.previewBadge{padding:5px 10px;border-radius:999px;background:#3b82f618;border:1px solid #3b82f644;color:#93c5fd;font-size:.6rem;font-weight:800}
.tipTabs{display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px 0}
.tipTab{appearance:none;border:1px solid var(--border);background:#ffffff06;color:var(--muted);border-radius:999px;padding:7px 12px;font-size:.65rem;font-weight:700;cursor:pointer}
.tipTab.active{border-color:#00b4f855;background:#00b4f812;color:#ccefff}
.tipSummary{display:flex;gap:14px;flex-wrap:wrap;padding:10px 16px 4px;color:var(--muted);font-size:.65rem}
.tipSummary b{color:var(--fg)}
.tipCardGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:14px 16px 8px}
.tipCard{display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid #1e2a3d;border-radius:18px;background:linear-gradient(160deg,#121a26 0%,#0c131c 100%);box-shadow:0 10px 30px #0004;min-height:210px}
.tipCardTop{display:flex;justify-content:space-between;align-items:center;gap:8px}
.tipLeague{display:inline-flex;align-items:center;gap:6px;color:#9fb0c7;font-size:.62rem;font-weight:700}
.tipStatus{padding:4px 9px;border-radius:999px;font-size:.58rem;font-weight:800;border:1px solid transparent}
.tipStatus.pending{background:#3b82f618;border-color:#3b82f644;color:#93c5fd}
.tipStatus.won{background:#22c55e18;border-color:#22c55e44;color:#86efac}
.tipStatus.lost{background:#ef444418;border-color:#ef444444;color:#fca5a5}
.tipStatus.void,.tipStatus.partial{background:#f59e0b18;border-color:#f59e0b44;color:#fcd34d}
.tipTeams{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center}
.tipTeam{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.tipTeam b{font-size:.72rem;line-height:1.2;font-weight:700}
.tipAvatar{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;border:2px solid #334155;color:#e2e8f0;font-size:.72rem;font-weight:900;letter-spacing:.02em}
.tipVs{color:#64748b;font-size:.7rem;font-weight:800;letter-spacing:.08em}
.tipWhen{text-align:center;color:#94a3b8;font-size:.68rem;font-weight:600}
.tipPickRow{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;background:#0a1018;border:1px solid #1e293b}
.tipMarketTag{flex-shrink:0;padding:4px 8px;border-radius:8px;background:#22c55e22;color:#86efac;font-size:.58rem;font-weight:800}
.tipPickName{flex:1;color:#e2e8f0;font-size:.68rem;font-weight:700}
.tipOdds{color:#4ade80;font:900 .85rem ui-monospace,SFMono-Regular,Menlo,monospace}
.tipFoot{color:#64748b;font-size:.58rem;text-align:left}
.disclaimer{padding:13px 20px;background:#ff477e07;color:var(--muted);font-size:.65rem}

/* Steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.step{padding:23px;border:1px solid var(--border);border-radius:22px;background:#ffffff03}
.num{display:grid;place-items:center;width:43px;height:43px;border-radius:50%;background:#151e2b;border:1px solid #00b4f855;color:var(--cyan);font:800 .75rem ui-monospace,SFMono-Regular,Menlo,monospace}
.step h3{margin:16px 0 6px;font-size:.88rem}
.step p{margin:0;color:var(--muted);font-size:.72rem}

/* Payments */
.payments{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.payment{padding:17px;border:1px solid var(--border);border-radius:18px;background:#ffffff03;display:flex;flex-direction:column;justify-content:space-between;min-height:115px}
.payment b{font-size:.78rem}
.payment span{color:#ccefff;font-size:.6rem;font-weight:700}
.payTop{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
.payIcon{display:grid;place-items:center}
.payBadge{font-size:.56rem;font-weight:800;padding:2px 6px;border-radius:6px;background:#a6f80015;color:var(--signal);border:1px solid #a6f80033}
.payBottom{display:flex;align-items:center;justify-content:space-between;margin-top:10px;font-size:.6rem}
.payFee{color:#4ade80;font-weight:700}
.limits{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}
.limit{padding:9px 12px;border:1px solid var(--border);border-radius:15px;background:#ffffff03}
.limit small{display:block;color:var(--faint);font-size:.57rem}
.limit b{font-size:.72rem}

/* Calculator */
.calcBox{margin-top:28px;padding:24px;border:1px solid #00b4f833;border-radius:24px;background:linear-gradient(145deg,#0d1522,#09101a);box-shadow:0 15px 40px #0005}
.calcHead{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.calcIcon{font-size:1.6rem;width:48px;height:48px;display:grid;place-items:center;background:#00b4f815;border:1px solid #00b4f844;border-radius:14px}
.calcHead h3{margin:0;font-size:1.1rem;color:var(--fg)}
.calcHead p{margin:4px 0 0;font-size:.74rem;color:var(--muted)}
.calcBody{display:grid;grid-template-columns:1.2fr 1fr;gap:24px;align-items:center}
.calcSliderLabel{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:.78rem;color:var(--muted)}
.calcSliderLabel strong{font-size:1.1rem;color:var(--signal);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.calcSlider{width:100%;height:8px;border-radius:4px;background:#1e293b;outline:none;accent-color:var(--signal);cursor:pointer}
.calcPresets{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px}
.presetBtn{padding:5px 9px;border:1px solid var(--border);border-radius:8px;background:#ffffff06;color:var(--muted);font-size:.65rem;font-weight:700;cursor:pointer;transition:background .15s}
.presetBtn:hover{background:#ffffff15;color:var(--fg)}
.calcRight{padding:18px;border-radius:18px;background:#060c14;border:1px solid var(--border);display:flex;flex-direction:column;gap:10px}
.calcStat{display:flex;justify-content:space-between;align-items:center;font-size:.72rem;color:var(--muted)}
.calcStat b{color:var(--fg);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.bonusStat b{color:#4ade80}
.totalStat{padding-top:8px;border-top:1px solid var(--border);font-size:.82rem}
.totalStat b{font-size:1.15rem;color:var(--signal)}
.calcMeta{display:flex;gap:12px;font-size:.62rem;color:var(--muted);padding-top:4px}
.calcBtn{width:100%;margin-top:4px}

/* Security & Architecture Card */
.securityCard{padding:26px;border:1px solid #00b4f844;border-radius:24px;background:linear-gradient(150deg,#0a1524 0%,#08101a 100%);box-shadow:0 15px 40px #0005}
.securityHead{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.securityIcon{width:46px;height:46px;border-radius:14px;background:#00b4f815;border:1px solid #00b4f855;display:grid;place-items:center;color:var(--cyan);font-size:1.4rem}
.securityHead h3{margin:0;font-size:1.15rem;color:var(--fg)}
.securityHead p{margin:4px 0 0;font-size:.75rem;color:var(--muted)}
.securityGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.secItem{padding:16px;border:1px solid var(--border);border-radius:16px;background:#ffffff03}
.secItem b{display:block;font-size:.8rem;color:#ccefff;margin-bottom:6px}
.secItem p{margin:0;font-size:.7rem;color:var(--muted);line-height:1.45}

/* Responsible Gaming */
.responsible-gaming-box{display:grid;grid-template-columns:.8fr 1.2fr;gap:25px;padding:27px;border:1px solid #ff477e3d;border-radius:25px;background:linear-gradient(145deg,#ff477e0b,#ff6b5706)}
.responsible-gaming-box h2{margin:7px 0 8px;font-size:1.6rem;letter-spacing:-.03em}
.responsible-gaming-box p,.responsible-gaming-box li{color:var(--muted);font-size:.72rem}
.responsible-gaming-box ul{margin:0;padding:0;list-style:none;display:grid;gap:7px}
.responsible-gaming-box li{padding:9px 11px;border-radius:10px;background:#ffffff04}
.notice{grid-column:1/-1;padding-top:13px;border-top:1px solid #ff477e1c;color:#ffb5c4;font-size:.65rem}

/* FAQ */
.faq{display:grid;grid-template-columns:.8fr 1.2fr;gap:45px}
.faqs{display:grid;gap:8px}
.faqs details{border:1px solid var(--border);border-radius:15px;background:#ffffff03}
.faqs summary{cursor:pointer;padding:14px;font-weight:800;font-size:.74rem}
.answer{padding:0 14px 14px;color:var(--muted);font-size:.7rem}

/* Final */
.final{padding:15px 0 75px}
.finalBox{text-align:center;padding:48px 25px;border:1px solid #00b4f833;border-radius:28px;background:radial-gradient(circle at 78% 15%,#ff477e18,transparent 30%),linear-gradient(135deg,#111a27,#0b121d)}
.finalBox h2{margin:0;font-size:clamp(2rem,4.5vw,3.5rem);letter-spacing:-.05em}
.finalBox p{max-width:650px;margin:10px auto 20px;color:var(--muted);font-size:.85rem}

/* Footer */
.footer{padding:36px 0 80px;border-top:1px solid var(--border)}
.foot{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:30px}
.footer p,.footer a,.footer button{color:var(--muted);font-size:.67rem}
.footerLinks{display:grid;gap:6px;margin-top:8px}
.footerLinkBtn{background:none;border:none;padding:0;color:var(--muted);text-align:left;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.footerLinkBtn:hover{color:var(--fg)}
.bottom{display:flex;justify-content:space-between;gap:10px;margin-top:25px;padding-top:15px;border-top:1px solid var(--border);color:var(--faint);font-size:.61rem}

/* Desktop QR Code Modal */
.qrTriggerBtn{font-size:.82rem}
.qrModalOverlay{display:none;position:fixed;inset:0;background:#000000bb;backdrop-filter:blur(6px);z-index:100;place-items:center;padding:20px}
.qrModalOverlay.open{display:grid}
.qrModalCard{background:#0c1421;border:1px solid #00b4f844;border-radius:24px;padding:24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px #000c;position:relative}
.qrModalTop{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.qrModalTop h3{margin:0;font-size:1.05rem;color:var(--fg)}
.qrCloseBtn{background:transparent;border:none;color:var(--muted);font-size:1.4rem;cursor:pointer;line-height:1;padding:4px 8px}
.qrCloseBtn:hover{color:var(--fg)}
.qrModalDesc{font-size:.72rem;color:var(--muted);margin:0 0 16px}
.qrBox{display:grid;place-items:center;padding:12px;background:#ffffff;border-radius:18px;margin-bottom:12px}
.qrModalBot{font:700 .75rem ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--cyan);margin-bottom:14px}

/* Legal Modals (Privacy & Terms) */
.legalModalOverlay{display:none;position:fixed;inset:0;background:#000000bb;backdrop-filter:blur(6px);z-index:100;place-items:center;padding:20px}
.legalModalOverlay.open{display:grid}
.legalModalCard{background:#0c1421;border:1px solid #00b4f844;border-radius:24px;padding:24px;max-width:540px;width:100%;text-align:left;box-shadow:0 20px 60px #000c;position:relative}
.legalModalTop{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.legalModalTop h3{margin:0;font-size:1.1rem;color:var(--fg)}
.legalContent{font-size:.76rem;color:var(--muted);line-height:1.6}

/* Mobile Sticky Bar */
.mobileStickyBar{display:none}
@media(max-width:720px){
  .mobileStickyBar{display:block;position:fixed;bottom:0;left:0;right:0;z-index:45;background:#070b12f2;backdrop-filter:blur(16px);border-top:1px solid var(--border);padding:10px 16px}
  .stickyContent{display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:500px;margin:auto}
  .stickyInfo b{display:block;font-size:.75rem;color:var(--fg)}
  .stickyInfo span{display:block;font-size:.62rem;color:var(--muted)}
  .stickyBtn{min-height:38px;padding:8px 14px;font-size:.75rem}
  body{padding-bottom:60px}
}

/* Responsive queries */
@media (max-width:980px){
  .heroGrid{grid-template-columns:1fr;gap:45px}
  .hero h1{max-width:760px}
  .phone{margin:0 auto}
  .services{grid-template-columns:1fr 1fr}
  .payments{grid-template-columns:repeat(3,1fr)}
  .tipCardGrid{grid-template-columns:1fr}
  .securityGrid{grid-template-columns:1fr}
  .links a:nth-child(n+4){display:none}
}
@media (max-width:720px){
  .wrap{width:calc(100% - 24px)}
  .navin{min-height:62px}
  .links,.langs,.desktop{display:none}
  .menu{display:grid;place-items:center}
  .mobile.open{display:grid;position:absolute;right:12px;top:calc(100% + 7px);width:min(320px,calc(100vw - 24px));padding:9px;background:#0a101af7;border:1px solid var(--border);border-radius:17px;box-shadow:0 20px 50px #000b}
  .mobile a{padding:11px;color:var(--muted);font-weight:700}
  .mobile .btn{margin-top:4px;color:#071006}
  .hero{padding:52px 0 35px}
  .heroGrid{gap:30px}
  .hero h1{font-size:clamp(2.6rem,12vw,4.2rem)}
  .actions{display:grid}
  .actions .btn{width:100%}
  .trust,.services,.steps,.faq{grid-template-columns:1fr}
  .payments{grid-template-columns:1fr 1fr}
  .calcBody{grid-template-columns:1fr}
  .responsible-gaming-box{grid-template-columns:1fr}
  .notice{grid-column:auto}
  .foot{grid-template-columns:1fr 1fr}
  .bottom{display:grid}
}
@media (max-width:430px){
  .payments{grid-template-columns:1fr}
  .foot{grid-template-columns:1fr}
  .phone{border-radius:29px}
  .phoneInner{border-radius:25px}
  .chat{min-height:340px}
}
@media(prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .btn{transition:none}
  .tickerItems{animation:none}
}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="nav">
  <div class="wrap navin">
    <a class="logo" href="${ea}" aria-label="Fast xBet Cash home">
      <img src="/favicon.png" alt="Fast xBet Cash" width="36" height="36" decoding="async">
      Fast <span>xBet</span> Cash 🇱🇰
    </a>
    <nav class="links" aria-label="Primary navigation">
      <a href="#home">${esc(c.nav[0])}</a>
      <a href="#tips-preview">${esc(c.nav[1])}</a>
      <a href="#how-it-works">${esc(c.nav[2])}</a>
      <a href="#payments">${esc(c.nav[3])}</a>
      <a href="#security">${esc(c.nav[4])}</a>
      <a href="#faq">${esc(c.nav[5])}</a>
    </nav>
    <div class="langs" aria-label="Language">
      <a href="?lang=si" ${lang === "si" ? 'aria-current="page"' : ""}>SI</a>
      <a href="?lang=en" ${lang === "en" ? 'aria-current="page"' : ""}>EN</a>
      <a href="?lang=ta" ${lang === "ta" ? 'aria-current="page"' : ""}>TA</a>
    </div>
    <a class="btn primary desktop" href="${eb}" data-track-cta="nav_bot">✈ ${esc(c.hero[3])}</a>
    <button class="menu" id="menuToggle" type="button" aria-controls="mobileNav" aria-expanded="false" aria-label="Open navigation">☰</button>
    <nav class="mobile" id="mobileNav" aria-hidden="true" inert>
      <a href="#home">${esc(c.nav[0])}</a>
      <a href="#tips-preview">${esc(c.nav[1])}</a>
      <a href="#how-it-works">${esc(c.nav[2])}</a>
      <a href="#payments">${esc(c.nav[3])}</a>
      <a href="#security">${esc(c.nav[4])}</a>
      <a href="#faq">${esc(c.nav[5])}</a>
      <div style="display:flex;gap:6px;padding:8px">
        <a href="?lang=si">SI</a>
        <a href="?lang=en">EN</a>
        <a href="?lang=ta">TA</a>
      </div>
      <a class="btn primary" href="${eb}" data-track-cta="mobile_nav_bot">✈ ${esc(c.hero[3])}</a>
    </nav>
  </div>
</header>

<!-- Winning Tips Ticker Bar -->
<div class="tickerBar" aria-label="Recent Winning Tips">
  <div class="wrap tickerInner">
    <span class="tickerBadge">🔥 ${esc(c.ticker)}</span>
    <div class="tickerScroll">
      <div class="tickerItems">
        <span class="tickerItem">⚽ Arsenal Win @ <b>1.94</b> <i class="wonTag">WON</i></span>
        <span class="tickerItem">🎾 Alcaraz Win @ <b>1.75</b> <i class="wonTag">WON</i></span>
        <span class="tickerItem">⚽ Real Madrid Win @ <b>1.82</b> <i class="wonTag">WON</i></span>
        <span class="tickerItem">🏀 Celtics -4.5 @ <b>1.90</b> <i class="wonTag">WON</i></span>
        <span class="tickerItem">🏏 SL vs IND Over 310.5 @ <b>1.88</b> <i class="wonTag">WON</i></span>
        <span class="tickerItem">⚽ Man City Over 2.5 @ <b>1.85</b> <i class="wonTag">WON</i></span>
        <span class="tickerItem">⚽ Arsenal Win @ <b>1.94</b> <i class="wonTag">WON</i></span>
        <span class="tickerItem">🎾 Alcaraz Win @ <b>1.75</b> <i class="wonTag">WON</i></span>
        <span class="tickerItem">⚽ Real Madrid Win @ <b>1.82</b> <i class="wonTag">WON</i></span>
        <span class="tickerItem">🏀 Celtics -4.5 @ <b>1.90</b> <i class="wonTag">WON</i></span>
        <span class="tickerItem">🏏 SL vs IND Over 310.5 @ <b>1.88</b> <i class="wonTag">WON</i></span>
        <span class="tickerItem">⚽ Man City Over 2.5 @ <b>1.85</b> <i class="wonTag">WON</i></span>
      </div>
    </div>
  </div>
</div>

<main id="main">
<section class="hero" id="home">
  <div class="wrap heroGrid">
    <div>
      <div class="eyebrow">${esc(c.hero[0])}</div>
      <h1>${esc(c.hero[1])}</h1>
      <p>${esc(c.hero[2])}</p>
      
      <!-- Clear Above-The-Fold CTAs -->
      <div class="actions">
        <a class="btn primary" href="${eb}" data-track-cta="hero_bot">✈ ${esc(c.hero[3])}</a>
        <a class="btn secondary" href="#tips-preview">${esc(c.hero[4])}</a>
        <a class="btn accent" href="#deposit-calculator" data-track-cta="hero_deposit">💳 ${esc(c.hero[5])}</a>
        <button type="button" class="btn secondary qrTriggerBtn" id="qrOpenBtn" aria-label="Scan QR Code to open Telegram on mobile">📱 Scan QR</button>
      </div>

      <div class="promoBar">
        <span class="promoTag">1XBET PROMO</span>
        <div class="promoCodeWrap">
          <strong id="promoCodeVal">${promo}</strong>
          <button type="button" class="promoCopyBtn" id="promoCopyBtn" aria-label="Copy promo code ${promo}">
            <span id="promoCopyIcon">📋</span> <span id="promoCopyLabel">Copy Code</span>
          </button>
        </div>
        <span class="promoNote">+100% First Deposit Bonus</span>
      </div>

      <div class="pills">
        <span class="pill">🔞 18+ only</span>
        <span class="pill">🌐 Sinhala / English / Tamil</span>
        <span class="pill">⚡ Guided Telegram flow</span>
        <span class="pill">🛡️ Cloudflare Protected</span>
      </div>
    </div>

    <div id="edge-visual">
      <div class="phone" aria-label="Illustrative Telegram bot preview">
        <div class="phoneInner">
          <div class="phoneTop"><span>09:24</span><span class="notch"></span><span>LTE</span></div>
          <div class="chatHead">
            <div class="brand"><img src="/favicon.png" alt="Fast xBet Cash Bot" width="34" height="34" decoding="async"></div>
            <div class="chatTitle"><b>Fast xBet Cash</b><span>bot · replies in minutes</span></div>
            <div class="online"><i></i> Bot online</div>
          </div>
          <div class="chat" id="chatContainer">
            <div class="bubble bot">Welcome to Fast xBet Cash 🇱🇰. Choose a service to continue.</div>
            <div class="bubble user">Deposit</div>
            <div class="bubble bot">Send your 1xBet Player ID, then pick a local rail.</div>
            <div class="bubble user">Player ID 88410231</div>
            <div class="bubble bot">Limits LKR ${min.toLocaleString("en-LK")}–${max.toLocaleString("en-LK")}. Processed after receipt verification (times vary).</div>
            <div class="chatChips">
              <button type="button" class="chatChip active" data-scenario="deposit">Deposit</button>
              <button type="button" class="chatChip" data-scenario="tips">Tips</button>
              <button type="button" class="chatChip" data-scenario="withdraw">Withdraw</button>
              <button type="button" class="chatChip" data-scenario="support">Support</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="wrap" aria-label="Trust signals">
  <div class="trust">
    <div><b>⚡ Guided</b><span>Clear flow</span></div>
    <div><b>📲 Telegram</b><span>One place</span></div>
    <div><b>🛡️ Logged</b><span>Request trail</span></div>
    <div><b>💳 Local rails</b><span>Responsible use</span></div>
  </div>
</section>

<section class="section" id="services"><div class="wrap">
  <div class="head">
    <div class="kicker">${esc(c.services[0])}</div>
    <h2>${esc(c.services[1])}</h2>
    <p>Choose a service and follow the guided instructions. Sports outcomes are uncertain; no tip guarantees a win or profit.</p>
  </div>
  <div class="services">${serviceCards}</div>
</div></section>

<section class="section" id="tips-preview"><div class="wrap">
  <div class="head">
    <div class="kicker">Free Tips</div>
    <h2>Today’s Free Tips Preview</h2>
    <p>Sample fixtures are shown only as a public preview. They are not presented as live predictions.</p>
  </div>
  <div class="tips">
    <!-- Next Tips Slot Countdown Timer -->
    <div class="tipsCountdownBar" id="tipsCountdownBar">
      <div class="countdownLabel">
        <span class="countdownDot"></span>
        <span>${esc(c.countdown)}</span>
      </div>
      <strong class="countdownTimer" id="countdownTimer" aria-live="polite">--h --m --s</strong>
      <span class="countdownSlot" id="countdownSlot">Next: 08:00 SLT</span>
    </div>

    <div class="tipHead">
      <b>Sample fixtures</b>
      <span id="tipsLiveBadge" class="previewBadge">Preview only</span>
    </div>
    <div class="tipTabs" role="tablist">
      <button type="button" data-sport="all" class="tipTab active">All</button>
      <button type="button" data-sport="football" class="tipTab">Football</button>
      <button type="button" data-sport="cricket" class="tipTab">Cricket</button>
    </div>
    <div id="tipLiveSummary" class="tipSummary" style="display:none"></div>
    <div class="tipCardGrid" id="tipCardGrid" aria-live="polite">
      <article class="tipCard" data-sport="football">
        <div class="tipCardTop"><span class="tipLeague">Premier League</span><span class="tipStatus pending">Preview</span></div>
        <div class="tipTeams">
          <div class="tipTeam"><span class="tipAvatar" style="background:hsl(0 55% 28%);border-color:hsl(0 60% 42%)">AR</span><b>Arsenal</b></div>
          <div class="tipVs">VS</div>
          <div class="tipTeam"><span class="tipAvatar" style="background:hsl(220 55% 28%);border-color:hsl(220 60% 42%)">CH</span><b>Chelsea</b></div>
        </div>
        <div class="tipWhen">Today, 17:30</div>
        <div class="tipPickRow"><span class="tipMarketTag">1X2</span><span class="tipPickName">Arsenal Win</span><b class="tipOdds">1.94</b></div>
        <div class="tipFoot">Preview · Odds are illustrative</div>
      </article>
      <article class="tipCard" data-sport="football">
        <div class="tipCardTop"><span class="tipLeague">La Liga</span><span class="tipStatus pending">Preview</span></div>
        <div class="tipTeams">
          <div class="tipTeam"><span class="tipAvatar" style="background:hsl(45 55% 28%);border-color:hsl(45 60% 42%)">RM</span><b>Real Madrid</b></div>
          <div class="tipVs">VS</div>
          <div class="tipTeam"><span class="tipAvatar" style="background:hsl(0 60% 32%);border-color:hsl(0 65% 45%)">AT</span><b>Atletico Madrid</b></div>
        </div>
        <div class="tipWhen">Today, 20:00</div>
        <div class="tipPickRow"><span class="tipMarketTag">1X2</span><span class="tipPickName">Real Madrid Win</span><b class="tipOdds">1.78</b></div>
        <div class="tipFoot">Preview · Odds are illustrative</div>
      </article>
      <article class="tipCard" data-sport="football">
        <div class="tipCardTop"><span class="tipLeague">Bundesliga</span><span class="tipStatus pending">Preview</span></div>
        <div class="tipTeams">
          <div class="tipTeam"><span class="tipAvatar" style="background:hsl(0 50% 30%);border-color:hsl(0 55% 42%)">BM</span><b>Bayern Munich</b></div>
          <div class="tipVs">VS</div>
          <div class="tipTeam"><span class="tipAvatar" style="background:hsl(210 55% 28%);border-color:hsl(210 60% 42%)">PS</span><b>PSG</b></div>
        </div>
        <div class="tipWhen">Today, 22:00</div>
        <div class="tipPickRow"><span class="tipMarketTag">O/U</span><span class="tipPickName">Over 2.5 Goals</span><b class="tipOdds">1.85</b></div>
        <div class="tipFoot">Preview · Odds are illustrative</div>
      </article>
    </div>
    <div class="disclaimer" role="note">🔞 18+ only. Previews are informational — not live betting advice. Sports outcomes are uncertain; no tip guarantees a win or profit. Gamble responsibly.</div>
  </div>
</div></section>

<section class="section" id="how-it-works"><div class="wrap">
  <div class="head">
    <div class="kicker">${esc(c.how[0])}</div>
    <h2>${esc(c.how[0])}</h2>
  </div>
  <div class="steps">
    <article class="step">
      <div class="num">1</div>
      <h3>${esc(c.how[1])}</h3>
      <p>Use the Telegram CTA or QR code to open the bot.</p>
    </article>
    <article class="step">
      <div class="num">2</div>
      <h3>${esc(c.how[2])}</h3>
      <p>Choose tips, deposit, withdrawal or multilingual support.</p>
    </article>
    <article class="step">
      <div class="num">3</div>
      <h3>${esc(c.how[3])}</h3>
      <p>Provide only the information requested by the bot.</p>
    </article>
  </div>
</div></section>

<section class="section" id="payments"><div class="wrap">
  <div class="head">
    <div class="kicker">Payments</div>
    <h2>${esc(c.pay[0])}</h2>
    <p>eZ Cash, mCash, FriMi, iPay සහ බැංකු ගිණුම් හරහා තැන්පතු සහ මුදල් ආපසු ගැනීම් පහසුවෙන් සිදු කළ හැක. Sensitive credentials are never exposed on this page.</p>
  </div>
  <div class="payments">${payments}</div>
  <div class="limits">
    <div class="limit"><small>Minimum</small><b>LKR ${min.toLocaleString("en-LK")}</b></div>
    <div class="limit"><small>Maximum</small><b>LKR ${max.toLocaleString("en-LK")}</b></div>
    <div class="limit"><small>Promo</small><b>${promo}</b></div>
  </div>

  <div class="calcBox" id="deposit-calculator">
    <div class="calcHead">
      <div class="calcIcon">🧮</div>
      <div>
        <h3 style="margin:0;font-size:1.05rem;color:var(--fg)">Deposit &amp; Bonus Calculator (LKR)</h3>
        <p style="margin:3px 0 0;font-size:.72rem;color:var(--muted)">Instant bonus estimate with promo code ${promo}</p>
      </div>
    </div>
    <div class="calcBody">
      <div class="calcLeft">
        <div class="calcSliderLabel">
          <span>Deposit Amount:</span>
          <strong id="calcAmountDisplay">LKR 5,000</strong>
        </div>
        <input type="range" id="calcRange" min="${min}" max="${Math.min(max, 100000)}" step="500" value="5000" class="calcSlider" aria-label="Deposit amount slider">
        <div class="calcPresets">
          <button type="button" class="presetBtn" data-val="1000">+ LKR 1,000</button>
          <button type="button" class="presetBtn" data-val="5000">+ LKR 5,000</button>
          <button type="button" class="presetBtn" data-val="10000">+ LKR 10,000</button>
          <button type="button" class="presetBtn" data-val="25000">+ LKR 25,000</button>
          <button type="button" class="presetBtn" data-val="50000">+ LKR 50,000</button>
        </div>
      </div>
      <div class="calcRight">
        <div class="calcStat"><span>Your Deposit:</span><b id="summaryDeposit">LKR 5,000</b></div>
        <div class="calcStat bonusStat"><span>Bonus (${promo}):</span><b id="summaryBonus">+ LKR 5,000 (100%)</b></div>
        <div class="calcStat totalStat"><span>Playable Balance:</span><b id="summaryTotal" aria-live="polite">LKR 10,000</b></div>
        <div class="calcMeta">
          <span>⚡ After verification</span>
          <span>🛡️ No service fee</span>
          <span>💳 Local rails</span>
        </div>
        <a class="btn primary calcBtn" id="calcCtaBtn" href="${eb}&start=deposit" data-track-cta="calc_deposit">✈ Deposit LKR 5,000 via Telegram</a>
      </div>
    </div>
  </div>

  <div class="actions">${env.DEPOSIT_INSTRUCTIONS?.trim() ? `<details class="limit"><summary>Deposit instructions</summary><div style="color:var(--muted);font-size:.7rem;margin-top:7px">${esc(env.DEPOSIT_INSTRUCTIONS.trim())}</div></details>` : ""}</div>
</div></section>

<!-- Data Protection & Cloudflare Edge Infrastructure -->
<section class="section" id="security"><div class="wrap">
  <div class="securityCard">
    <div class="securityHead">
      <div class="securityIcon">🛡️</div>
      <div>
        <h3>${esc(c.security[0])}</h3>
        <p>${esc(c.security[1])}</p>
      </div>
    </div>
    <div class="securityGrid">
      <div class="secItem">
        <b>Cloudflare Edge &amp; SSL</b>
        <p>${esc(c.security[2])}</p>
      </div>
      <div class="secItem">
        <b>Encrypted D1 &amp; R2 Storage</b>
        <p>${esc(c.security[3])}</p>
      </div>
      <div class="secItem">
        <b>Zero Financial Retention</b>
        <p>${esc(c.security[4])}</p>
      </div>
    </div>
  </div>
</div></section>

<section class="section"><div class="wrap"><div class="responsible-gaming-box">
  <div>
    <div class="kicker">Play responsibly</div>
    <h2>🔞 18+ Responsible Gaming Notice</h2>
    <p>Free tips and previews are informational only. No guaranteed outcome, profit, or risk-free betting claim is made. This site is a Telegram cash-desk helper — not a bookmaker.</p>
  </div>
  <ul>
    <li>✓ 18+ users only.</li>
    <li>✓ Gambling involves risk and losses can occur.</li>
    <li>✓ Set limits and do not chase losses.</li>
    <li>✓ Never use money needed for essential expenses.</li>
    <li>✓ If gambling stops feeling controlled, take a break and seek appropriate support.</li>
  </ul>
  <div class="notice">Responsible use is your responsibility. Do not chase losses or use essential-expense money for gambling.</div>
</div></div></section>

<section class="section" id="faq"><div class="wrap faq">
  <div class="head">
    <div class="kicker">FAQ</div>
    <h2>Frequently Asked Questions</h2>
    <p>Clear answers for the public workflow.</p>
  </div>
  <div class="faqs">${faqHtml}</div>
</div></section>

<section class="final"><div class="wrap"><div class="finalBox">
  <h2>${esc(c.final[0])}</h2>
  <p>${esc(c.final[1])}</p>
  <div class="actions" style="justify-content:center">
    <a class="btn primary" href="${eb}" data-track-cta="final_bot">✈ ${esc(c.hero[3])}</a>
    <a class="btn secondary" href="#tips-preview">${esc(c.hero[4])}</a>
  </div>
</div></div></section>

<!-- Desktop QR Code Modal -->
<div class="qrModalOverlay" id="qrModalOverlay" aria-hidden="true" inert>
  <div class="qrModalCard" role="dialog" aria-modal="true" aria-labelledby="qrModalTitle">
    <div class="qrModalTop">
      <h3 id="qrModalTitle">📱 Open on Mobile</h3>
      <button type="button" class="qrCloseBtn" id="qrCloseBtn" aria-label="Close QR modal">&times;</button>
    </div>
    <p class="qrModalDesc">Scan with your phone camera to start the Telegram bot:</p>
    <div class="qrBox">
      ${qrCodeSvg()}
    </div>
    <div class="qrModalBot">@${esc(botName)}</div>
    <a class="btn primary" href="${eb}&start=landing_qr" target="_blank" rel="noopener" data-track-cta="qr_modal_btn">✈ Open in Telegram</a>
  </div>
</div>

<!-- Legal Modals -->
<div class="legalModalOverlay" id="privacyModalOverlay" aria-hidden="true" inert>
  <div class="legalModalCard" role="dialog" aria-modal="true" aria-labelledby="privacyModalTitle">
    <div class="legalModalTop">
      <h3 id="privacyModalTitle">Privacy Policy &amp; Data Protection</h3>
      <button type="button" class="qrCloseBtn" id="privacyCloseBtn" aria-label="Close Privacy modal">&times;</button>
    </div>
    <div class="legalContent">
      <p>${esc(c.legal.privacy)}</p>
      <p>Cloudflare D1 SQL storage and Cloudflare R2 object storage provide strict data isolation. Logs are rotated and purged automatically. No bank credentials or card information are ever requested.</p>
    </div>
  </div>
</div>

<div class="legalModalOverlay" id="termsModalOverlay" aria-hidden="true" inert>
  <div class="legalModalCard" role="dialog" aria-modal="true" aria-labelledby="termsModalTitle">
    <div class="legalModalTop">
      <h3 id="termsModalTitle">Terms of Service &amp; 18+ Disclaimer</h3>
      <button type="button" class="qrCloseBtn" id="termsCloseBtn" aria-label="Close Terms modal">&times;</button>
    </div>
    <div class="legalContent">
      <p>${esc(c.legal.terms)}</p>
      <p>Users must be at least 18 years of age. All transactions and sports previews are subject to user discretion and local regulations.</p>
    </div>
  </div>
</div>

<!-- Mobile Sticky Bottom CTA Bar -->
<aside class="mobileStickyBar" id="mobileStickyBar" aria-label="Quick Telegram Access">
  <div class="stickyContent">
    <div class="stickyInfo">
      <b>Fast xBet Cash 🇱🇰</b>
      <span>Free Tips &amp; Cash Desk</span>
    </div>
    <a class="btn primary stickyBtn" href="${eb}&start=landing_sticky" data-track-cta="mobile_sticky">✈ Open Telegram</a>
  </div>
</aside>
</main>

<footer class="footer"><div class="wrap foot">
  <div>
    <a class="logo" href="${ea}">
      <img src="/favicon.png" alt="Fast xBet Cash" width="36" height="36" decoding="async">
      Fast <span>xBet</span> Cash 🇱🇰
    </a>
    <p>Telegram-first service for public sports previews, guided support and multilingual assistance.</p>
    <b>18+ only · Gamble responsibly</b>
  </div>
  <div>
    <b>Quick links</b>
    <div class="footerLinks">
      <a href="#tips-preview">${esc(c.nav[1])}</a>
      <a href="#payments">${esc(c.nav[3])}</a>
      <a href="#security">${esc(c.nav[4])}</a>
      <a href="#faq">${esc(c.nav[5])}</a>
    </div>
  </div>
  <div>
    <b>Legal &amp; Access</b>
    <div class="footerLinks">
      <a href="${ec}">Tips Channel</a>
      <a href="${eb}" data-track-cta="footer_bot">Telegram Bot</a>
      <button type="button" class="footerLinkBtn" id="privacyLink">Privacy Policy</button>
      <button type="button" class="footerLinkBtn" id="termsLink">Terms of Service</button>
    </div>
  </div>
</div><div class="wrap bottom">
  <span>© ${new Date().getFullYear()} Fast xBet Cash</span>
  <span>18+ · Cloudflare Edge · D1 &amp; R2 Infrastructure</span>
</div></footer>

<script${n}>
(function(){
  // 1. Mobile navigation menu toggle
  var b=document.getElementById("menuToggle"),m=document.getElementById("mobileNav");
  if(b&&m){
    function close(){m.classList.remove("open");m.setAttribute("aria-hidden","true");m.setAttribute("inert","");b.setAttribute("aria-expanded","false")}
    b.addEventListener("click",function(){var open=b.getAttribute("aria-expanded")==="true";if(open)close();else{m.classList.add("open");m.setAttribute("aria-hidden","false");m.removeAttribute("inert");b.setAttribute("aria-expanded","true")}});
    m.querySelectorAll("a").forEach(function(a){a.addEventListener("click",close)});
    document.addEventListener("keydown",function(e){if(e.key==="Escape")close()});
    document.addEventListener("click",function(e){if(m.classList.contains("open")&&!m.contains(e.target)&&e.target!==b)close()});
  }

  // 2. UTM & Campaign tracking pass-through to Telegram deep links
  try {
    var params = new URLSearchParams(window.location.search);
    var source = params.get("utm_source") || params.get("utm_campaign") || params.get("ref") || params.get("tag");
    if (source) {
      var clean = source.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
      if (clean) {
        var startPayload = "landing_" + clean;
        document.querySelectorAll('a[href*="t.me/"]').forEach(function(a){
          try {
            var u = new URL(a.href);
            if (u.searchParams.has("start")) {
              u.searchParams.set("start", startPayload);
              a.href = u.toString();
            }
          } catch(err){}
        });
      }
    }
  } catch(e){}

  // 3. Language preference persistence
  try {
    var qLang = new URLSearchParams(window.location.search).get("lang");
    if (qLang && (qLang === "si" || qLang === "en" || qLang === "ta")) {
      localStorage.setItem("fast_xbet_lang", qLang);
    } else {
      var savedLang = localStorage.getItem("fast_xbet_lang");
      if (savedLang && (savedLang === "si" || savedLang === "en" || savedLang === "ta")) {
        if (savedLang !== document.documentElement.lang && window.location.pathname === "/") {
          var targetUrl = new URL(window.location.href);
          targetUrl.searchParams.set("lang", savedLang);
          window.location.replace(targetUrl.toString());
        }
      }
    }
    document.querySelectorAll(".langs a, #mobileNav a[href*='lang=']").forEach(function(la){
      la.addEventListener("click", function(){
        try {
          var target = new URL(la.href, window.location.origin).searchParams.get("lang");
          if (target) localStorage.setItem("fast_xbet_lang", target);
        } catch(err){}
      });
    });
  } catch(e){}

  // 4. Promo Code One-Click Copy
  try {
    var copyBtn = document.getElementById("promoCopyBtn");
    var codeEl = document.getElementById("promoCodeVal");
    var copyLabel = document.getElementById("promoCopyLabel");
    var copyIcon = document.getElementById("promoCopyIcon");
    if (copyBtn && codeEl) {
      copyBtn.addEventListener("click", function(){
        var code = codeEl.textContent ? codeEl.textContent.trim() : "${promo}";
        function setSuccess(){
          if (copyLabel) copyLabel.textContent = "Copied! ✓";
          if (copyIcon) copyIcon.textContent = "✓";
          copyBtn.classList.add("copied");
          setTimeout(function(){
            if (copyLabel) copyLabel.textContent = "Copy Code";
            if (copyIcon) copyIcon.textContent = "📋";
            copyBtn.classList.remove("copied");
          }, 2500);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(setSuccess).catch(function(){
            var ta = document.createElement("textarea");
            ta.value = code;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setSuccess();
          });
        } else {
          setSuccess();
        }
      });
    }
  } catch(e){}

  // 5. Deposit & Bonus Calculator (LKR Quick Calculator)
  try {
    var calcRange = document.getElementById("calcRange");
    var calcDisp = document.getElementById("calcAmountDisplay");
    var sumDep = document.getElementById("summaryDeposit");
    var sumBonus = document.getElementById("summaryBonus");
    var sumTotal = document.getElementById("summaryTotal");
    var calcCta = document.getElementById("calcCtaBtn");
    var presetBtns = document.querySelectorAll(".presetBtn");
    var baseBotUrl = "${eb}".split("?")[0];
    var minLimit = ${min};
    var maxLimit = ${max};

    function updateCalc(amount) {
      var val = Math.max(minLimit, Math.min(Number(amount) || minLimit, maxLimit));
      if (calcRange) calcRange.value = String(val);
      var formatted = "LKR " + val.toLocaleString("en-LK");
      if (calcDisp) calcDisp.textContent = formatted;
      if (sumDep) sumDep.textContent = formatted;

      var bonus = Math.min(val, 35000);
      var bonusFormatted = "+ LKR " + bonus.toLocaleString("en-LK") + " (100%)";
      if (sumBonus) sumBonus.textContent = bonusFormatted;

      var total = val + bonus;
      if (sumTotal) sumTotal.textContent = "LKR " + total.toLocaleString("en-LK");

      if (calcCta) {
        calcCta.textContent = "✈ Deposit " + formatted + " via Telegram";
        calcCta.href = baseBotUrl + "?start=dep_" + val;
      }
    }

    if (calcRange) {
      calcRange.addEventListener("input", function(){
        updateCalc(Number(this.value));
      });
    }
    presetBtns.forEach(function(btn){
      btn.addEventListener("click", function(){
        var pVal = Number(btn.getAttribute("data-val"));
        var current = Number(calcRange ? calcRange.value : minLimit);
        updateCalc(current + pVal);
      });
    });
  } catch(e){}

  // 6. Interactive Telegram Bot Chat Preview Simulation
  try {
    var chips = document.querySelectorAll(".chatChips button.chatChip");
    var chat = document.getElementById("chatContainer");
    if (chat && chips.length) {
      var scenarios = {
        deposit: [
          { role: "bot", text: "Welcome to Fast xBet Cash 🇱🇰. Choose a service to continue." },
          { role: "user", text: "Deposit" },
          { role: "bot", text: "Send your 1xBet Player ID, then pick a local rail." },
          { role: "user", text: "Player ID 88410231" },
          { role: "bot", text: "Limits LKR ${min.toLocaleString("en-LK")}–${max.toLocaleString("en-LK")}. Processed after receipt verification (times vary)." }
        ],
        tips: [
          { role: "bot", text: "🎯 Today's Selected Free Tips (Combined Odds: 3.45)" },
          { role: "user", text: "Free Tips Preview" },
          { role: "bot", text: "⚽ Arsenal vs Chelsea — Arsenal Win @ 1.94<br>⚽ Real Madrid vs Atletico — Real Win @ 1.78" },
          { role: "user", text: "Where are new tips posted?" },
          { role: "bot", text: "Free analysis is published 3x daily in our official Telegram channel!" }
        ],
        withdraw: [
          { role: "bot", text: "↗ Fast Cash Withdrawal Assistance" },
          { role: "user", text: "Withdraw to FriMi" },
          { role: "bot", text: "Enter your 1xBet Account ID & withdrawal code to confirm." },
          { role: "user", text: "ID 88410231 · Code 7819" },
          { role: "bot", text: "🔒 Request logged. Verified and transferred in 5–15 minutes." }
        ],
        support: [
          { role: "bot", text: "🌐 භාෂාව තෝරන්න / Select Language / மொழியைத் தேர்ந்தெடுக்கவும்" },
          { role: "user", text: "සිංහල (Sinhala)" },
          { role: "bot", text: "✅ භාෂාව සාර්ථකව යාවත්කාලීන විය! 24/7 සහය සඳහා අප සූදානම්." },
          { role: "user", text: "eZ Cash සහය අවශ්‍යයි" },
          { role: "bot", text: "ඔබගේ eZ Cash wallet එකෙන් ක්ෂණිකව ගෙවීම් සිදු කළ හැක. 0% ගාස්තු." }
        ]
      };

      chips.forEach(function(btn){
        btn.addEventListener("click", function(){
          chips.forEach(function(c){ c.classList.remove("active"); });
          btn.classList.add("active");
          var sKey = btn.getAttribute("data-scenario") || "deposit";
          var dialog = scenarios[sKey] || scenarios.deposit;
          var bubbles = chat.querySelectorAll(".bubble");
          bubbles.forEach(function(bubble, idx){
            if (dialog[idx]) {
              bubble.className = "bubble " + dialog[idx].role;
              bubble.innerHTML = dialog[idx].text;
              bubble.style.display = "block";
            } else {
              bubble.style.display = "none";
            }
          });
        });
      });
    }
  } catch(e){}

  // 7. Dynamic Live Tips with D1 Database API & Sport Filter Tabs
  try {
    var tipTabs = document.querySelectorAll(".tipTab");
    var tipGrid = document.getElementById("tipCardGrid");
    var liveBadge = document.getElementById("tipsLiveBadge");
    var liveSummary = document.getElementById("tipLiveSummary");

    function applySportFilter(sport) {
      if (!tipGrid) return;
      tipGrid.querySelectorAll(".tipCard").forEach(function(card){
        var cardSport = card.getAttribute("data-sport") || "football";
        card.style.display = (sport === "all" || cardSport === sport) ? "flex" : "none";
      });
    }

    tipTabs.forEach(function(tab){
      tab.addEventListener("click", function(){
        tipTabs.forEach(function(t){ t.classList.remove("active"); });
        tab.classList.add("active");
        var sport = tab.getAttribute("data-sport") || "all";
        applySportFilter(sport);
      });
    });

    fetch("/api/tips/preview", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if (!data || !Array.isArray(data.tips) || data.tips.length === 0) {
          if (liveBadge) {
            liveBadge.textContent = "Sample preview";
          }
          if (liveSummary) {
            liveSummary.style.display = "flex";
            liveSummary.innerHTML = "<span>Live feed unavailable — showing sample fixtures. Open Telegram for today’s tips.</span>";
          }
          return;
        }
        if (liveBadge) {
          liveBadge.textContent = "● Live feed (" + data.tips.length + ")";
          liveBadge.style.background = "#22c55e18";
          liveBadge.style.borderColor = "#22c55e44";
          liveBadge.style.color = "#86efac";
        }
        if (liveSummary && data.summary) {
          liveSummary.style.display = "flex";
          liveSummary.innerHTML = "<span><b>" + (data.summary.total || 0) + "</b> settled (7d)</span><span><b>" + (data.summary.won || 0) + "</b> won</span><span><b>" + (data.summary.lost || 0) + "</b> lost</span><span><b>" + (data.summary.winRate || 0) + "%</b> win rate</span>";
        }

        var liveHtml = data.tips.map(function(t){
          var resClass = t.result === "WON" ? "won" : (t.result === "LOST" ? "lost" : "pending");
          var resText = t.result || "Live";
          var mTag = (t.market || "1X2").toUpperCase();
          var oVal = t.odds ? Number(t.odds).toFixed(2) : "—";
          var hName = t.homeTeam || "Home";
          var aName = t.awayTeam || "Away";
          var sportKey = t.sport || "football";
          return '<article class="tipCard" data-sport="' + sportKey + '">' +
            '<div class="tipCardTop"><span class="tipLeague">' + (t.sportTitle || "Sports") + '</span><span class="tipStatus ' + resClass + '">' + resText + '</span></div>' +
            '<div class="tipTeams">' +
              '<div class="tipTeam"><b>' + hName + '</b></div>' +
              '<div class="tipVs">VS</div>' +
              '<div class="tipTeam"><b>' + aName + '</b></div>' +
            '</div>' +
            '<div class="tipWhen">' + (t.commenceTime ? t.commenceTime.slice(0, 16).replace("T", " ") : "Upcoming") + '</div>' +
            '<div class="tipPickRow"><span class="tipMarketTag">' + mTag + '</span><span class="tipPickName">' + (t.selection || "Pick") + '</span><b class="tipOdds">' + oVal + '</b></div>' +
            '<div class="tipFoot">Verified D1 Feed \u00b7 Informational only</div>' +
          '</article>';
        }).join("");

        if (tipGrid && liveHtml) {
          tipGrid.innerHTML = liveHtml;
          var activeTab = document.querySelector(".tipTab.active");
          if (activeTab) applySportFilter(activeTab.getAttribute("data-sport") || "all");
        }
      })
      .catch(function(){
        if (liveBadge) {
          liveBadge.textContent = "Preview only";
        }
        if (liveSummary) {
          liveSummary.style.display = "flex";
          liveSummary.innerHTML = "<span>Could not load live tips. Sample fixtures remain below — open Telegram for the latest.</span>";
        }
      });
  } catch(e){}

  // 8. Desktop QR Code Modal Toggle
  try {
    var qrBtn = document.getElementById("qrOpenBtn");
    var qrModal = document.getElementById("qrModalOverlay");
    var qrClose = document.getElementById("qrCloseBtn");
    if (qrBtn && qrModal) {
      function openQr() {
        qrModal.classList.add("open");
        qrModal.setAttribute("aria-hidden", "false");
        qrModal.removeAttribute("inert");
        if (qrClose) qrClose.focus();
      }
      function closeQr() {
        qrModal.classList.remove("open");
        qrModal.setAttribute("aria-hidden", "true");
        qrModal.setAttribute("inert", "");
        qrBtn.focus();
      }
      qrBtn.addEventListener("click", openQr);
      if (qrClose) qrClose.addEventListener("click", closeQr);
      qrModal.addEventListener("click", function(e) {
        if (e.target === qrModal) closeQr();
      });
      document.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && qrModal.classList.contains("open")) closeQr();
      });
    }
  } catch(e){}

  // 9. Next Tips Slot Countdown Timer (Sri Lanka Time UTC+05:30)
  try {
    var timerEl = document.getElementById("countdownTimer");
    var slotEl = document.getElementById("countdownSlot");
    if (timerEl && slotEl) {
      function updateTipsCountdown() {
        var now = new Date();
        var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        var slNow = new Date(utc + (330 * 60000));
        var slHours = slNow.getHours();
        var slMinutes = slNow.getMinutes();
        var slSeconds = slNow.getSeconds();
        var curSecs = slHours * 3600 + slMinutes * 60 + slSeconds;
        var slots = [
          { s: 8 * 3600, label: "08:00 SLT" },
          { s: 12 * 3600, label: "12:00 SLT" },
          { s: 18 * 3600, label: "18:00 SLT" }
        ];
        var target = null;
        for (var i = 0; i < slots.length; i++) {
          if (curSecs < slots[i].s) {
            target = slots[i];
            break;
          }
        }
        var diffSecs = 0;
        if (target) {
          diffSecs = target.s - curSecs;
        } else {
          target = slots[0];
          diffSecs = (24 * 3600 - curSecs) + slots[0].s;
        }
        var h = Math.floor(diffSecs / 3600);
        var m = Math.floor((diffSecs % 3600) / 60);
        var s = diffSecs % 60;
        var timeStr = (h < 10 ? "0" + h : h) + "h " + (m < 10 ? "0" + m : m) + "m " + (s < 10 ? "0" + s : s) + "s";
        timerEl.textContent = timeStr;
        slotEl.textContent = "Next: " + target.label;
      }
      updateTipsCountdown();
      setInterval(updateTipsCountdown, 1000);
    }
  } catch(e){}

  // 10. Legal Modals (Privacy & Terms)
  try {
    function setupModal(openBtnId, modalId, closeBtnId) {
      var btn = document.getElementById(openBtnId);
      var modal = document.getElementById(modalId);
      var closeBtn = document.getElementById(closeBtnId);
      if (!btn || !modal) return;
      function openM() {
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        modal.removeAttribute("inert");
        if (closeBtn) closeBtn.focus();
      }
      function closeM() {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        modal.setAttribute("inert", "");
        btn.focus();
      }
      btn.addEventListener("click", openM);
      if (closeBtn) closeBtn.addEventListener("click", closeM);
      modal.addEventListener("click", function(e){ if (e.target === modal) closeM(); });
      document.addEventListener("keydown", function(e){ if (e.key === "Escape" && modal.classList.contains("open")) closeM(); });
    }
    setupModal("privacyLink", "privacyModalOverlay", "privacyCloseBtn");
    setupModal("termsLink", "termsModalOverlay", "termsCloseBtn");
  } catch(e){}

  // 11. Conversion & Click-through Rate (CTR) Tracking
  try {
    document.querySelectorAll("[data-track-cta]").forEach(function(el){
      el.addEventListener("click", function(){
        try {
          var ctaName = el.getAttribute("data-track-cta") || "unknown";
          var payload = JSON.stringify({
            event: "cta_click",
            cta: ctaName,
            lang: document.documentElement.lang || "si",
            href: el.getAttribute("href") || "",
            ts: Date.now()
          });
          if (navigator.sendBeacon) {
            navigator.sendBeacon("/api/analytics/event", payload);
          } else {
            fetch("/api/analytics/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(function(){});
          }
        } catch(err){}
      });
    });
  } catch(e){}

})();
</script>
</body></html>`;
}
