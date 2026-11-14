import type { Env } from "./types";
import { generateQrSvg } from "./qrSvg";

const BOT_FALLBACK = "fast_1xbetcash_bot";
const CHANNEL_FALLBACK = "https://t.me/fast_xbet_official_tips";

const TELEGRAM_GRAPHICS = {
  hero: "/assets/telegram/01-hero-telegram-bot.jpg",
  tips: "/assets/telegram/02-free-tips-sports.jpg",
  payments: "/assets/telegram/03-deposit-withdraw.jpg",
  botUi: "/assets/telegram/04-telegram-bot-ui.jpg",
  og: "/og-image.jpg",
  security: "/assets/telegram/06-security-support.jpg"
} as const;

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

export function makeLangUrl(request: Request, targetLang: Lang): string {
  try {
    const u = new URL(request.url);
    u.searchParams.delete("lang");
    const path = targetLang === "si" ? "/" : `/${targetLang}/`;
    return `${path}${u.search}${u.hash}`;
  } catch {
    return targetLang === "si" ? "/" : `/${targetLang}/`;
  }
}

export function qrCodeSvg(targetUrl: string = "https://t.me/fast_1xbetcash_bot?start=landing_qr"): string {
  return generateQrSvg(targetUrl, { size: 180 });
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
  tips: {
    kicker: string;
    title: string;
    desc: string;
    featuredHeading: string;
    badge: string;
    verifiedBadge: string;
    cta: string;
    stats: {
      winRate: string;
      roi: string;
      slipsWon: string;
      avgOdds: string;
      status: string;
    };
  };
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
    ticker: "සජීවී ජයග්‍රහණ (ILLUSTRATIVE TIP RESULTS)",
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
      "Telegram bot හි පෙන්වන පියවර අනුගමනය කරන්න. eZ Cash, mCash, FriMi, iPay හෝ Bank Transfer තෝරා තහවුරු කරන්න.",
      "Telegram bot හි withdrawal උපදෙස් අනුගමනය කරන්න. ප්‍රතිඵල හෝ ලාභ සහතික නොවේ.",
      "අපගේ Telegram Bot සහ Channel හරහා දිනපතා විශ්ලේෂණය කරන ලද ක්‍රීඩා ඉඟි (Free Tips) නොමිලේ ලබා ගත හැක. සජීවී දත්ත සහ Real-time Odds සඳහා Telegram Bot විවෘත කරන්න (18+ වගකීමෙන් ක්‍රීඩා කරන්න).",
      "Referral විකල්ප තිබේ නම් bot හි පෙන්වන නියමයන් බලන්න.",
      "Telegram bot හි support විකල්පය තෝරන්න.",
      "Bot හි language විකල්පයෙන් භාෂාව (SI, EN, TA) තෝරන්න."
    ],
    tips: {
      kicker: "නොමිලේ ඉඟි (Free Tips)",
      title: "අද දින විශේෂිත ක්‍රීඩා ඉඟි (Featured Free Tips)",
      desc: "දිනපතා යාවත්කාලීන වන ක්‍රීඩා ඉඟි සහ වෙළඳපල අනුපාත. සජීවී tips, slip codes සහ ක්ෂණික alerts සඳහා Telegram Bot වෙත පිවිසෙන්න.",
      featuredHeading: "අද දින තෝරාගත් ඉඟි",
      badge: "Daily Featured",
      verifiedBadge: "⚡ Tap here for Live Odds",
      cta: "🎯 අද දින සජීවී Tips Telegram වෙතින් ලබා ගන්න",
      stats: {
        winRate: "සාර්ථකත්ව අනුපාතය (Strike Rate)",
        roi: "සතිපතා ROI (Weekly ROI)",
        slipsWon: "ජයග්‍රාහී Slips (7d)",
        avgOdds: "සාමාන්‍ය Odds",
        status: "විශ්ලේෂිත ඉඟි (Analyzed)"
      }
    },
    legal: {
      privacy: "අපගේ සේවාව පරිශීලක රහස්‍යතාව උපරිමයෙන් සුරකියි. කිසිදු සංවේදී බැංකු PIN හෝ කාඩ්පත් දත්ත වෙබ් අඩවියේ ගබඩා නොකෙරේ. දත්ත ආරක්ෂාව Cloudflare Edge, D1 සහ R2 යටිතල පහසුකම් මගින් සහතික කෙරේ. සේවාව 18+ පරිශීලකයින් සඳහා පමණි.",
      terms: "මෙම සේවාව නිල ක්‍රීඩා තොරතුරු සහ Telegram පාදක සහායක පද්ධතියකි. කිසිදු ක්‍රීඩා ප්‍රතිඵලයක් හෝ මූල්‍ය ලාභයක් සහතික නොකෙරේ. වගකීමෙන් යුතුව ක්‍රීඩා කරන්න. 18+ නීතිමය සීමාවන්ට යටත් වේ."
    }
  },
  en: {
    title: "Fast xBet Cash 🇱🇰 — 1xBet Sri Lanka Telegram Bot & Free Sports Tips",
    desc: "1xBet Sri Lanka Telegram Bot for free sports tips, eZ Cash, mCash, FriMi, iPay and bank deposits and withdrawals. 18+ only.",
    nav: ["Home", "Free Tips", "How It Works", "Payments", "Security", "FAQ"],
    hero: [
      "SRI LANKA • TELEGRAM-FIRST CASH DESK",
      "Fast tips. Simple cash. One Telegram.",
      "Free sports tips, guided deposits and withdrawals, and multilingual help — all inside one Telegram bot. No extra apps.",
      "Open Telegram Bot",
      "View free tips",
      "Deposit Now",
      "📱 Scan QR"
    ],
    ticker: "ILLUSTRATIVE TIP RESULTS",
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
      "Daily analyzed sports tips are provided 100% free via our Telegram Bot and Channel. Open Telegram Bot for Live Data & Real-time Odds (18+ Gamble Responsibly).",
      "If available, review the referral terms shown in the bot.",
      "Choose the support option in the Telegram bot.",
      "Choose your language from the language option in the bot."
    ],
    tips: {
      kicker: "Free Sports Tips",
      title: "Today’s Featured Free Tips",
      desc: "Daily automated fixtures and real market odds. For real-time odds, slip codes, and instant alerts, access our official Telegram Bot & Channel.",
      featuredHeading: "Today's Market Picks",
      badge: "Daily Featured",
      verifiedBadge: "⚡ Tap here for Live Odds",
      cta: "🎯 Get Today's Full Live Tips on Telegram",
      stats: {
        winRate: "Strike Rate (7d)",
        roi: "Weekly ROI",
        slipsWon: "Winning Slips (7d)",
        avgOdds: "Avg Odds",
        status: "Verified Value Picks"
      }
    },
    legal: {
      privacy: "Your privacy is strictly safeguarded. Sensitive financial credentials (passwords, PINs, card CVVs) are never collected or stored on this website. Operations are secured through Cloudflare edge infrastructure, D1, and encrypted R2 storage. Restricted to users 18+.",
      terms: "This website serves as the official portal and Telegram assistant. We make no guaranteed returns or betting outcomes. Gamble responsibly and within your personal means. Strictly 18+."
    }
  },
  ta: {
    title: "Fast xBet Cash 🇱🇰 — 1xBet இலங்கை Telegram Bot & இலவச Sports Tips",
    desc: "1xBet இலங்கை Telegram Bot இலவச sports tips, eZ Cash, mCash, FriMi, iPay மற்றும் வங்கி deposit, withdrawal ஆதரவு. 18+ மட்டும்.",
    nav: ["முகப்பு", "இலவச Tips", "எப்படி வேலை செய்கிறது", "கொடுப்பனவுகள்", "பாதுகாப்பு", "FAQ"],
    hero: [
      "இலங்கை • TELEGRAM-FIRST CASH DESK",
      "வேகமான tips. எளிய cash. ஒரே Telegram.",
      "Free sports tips, guided deposit மற்றும் withdrawal support, multilingual help — ஒரே Telegram bot-ல். கூடுதல் செயலிகள் தேவையில்லை.",
      "Telegram Bot திறக்கவும்",
      "Free Tips பார்க்கவும்",
      "இப்போதே Deposit செய்க",
      "📱 QR ஸ்கேன்"
    ],
    ticker: "சமீபத்திய வெற்றிகள் (ILLUSTRATIVE TIP RESULTS)",
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
      "வங்கி கடவுச்சොற்கள் அல்லது PIN இணையதளத்தில் சேமிக்கப்படாது. Telegram bot மூலம் மட்டுமே நேரடி சரிபார்ப்பு."
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
      "தினசரி பகுப்பாய்வு செய்யப்பட்ட விளையாட்டு குறிப்புகள் (Free Tips) Telegram Bot மற்றும் Channel வழியாக இலவசமாக வழங்கப்படுகின்றன. நேரடித் தரவு மற்றும் Real-time Odds பெற Telegram Bot திறக்கவும் (18+ பொறுப்புடன் விளையாடுங்கள்).",
      "இருந்தால், bot-இல் காட்டப்படும் referral விதிமுறைகளைப் பார்க்கவும்.",
      "Telegram bot-இல் support விருப்பத்தைத் தேர்ந்தெடுக்கவும்.",
      "Bot-இன் language விருப்பத்தில் மொழியைத் (SI, EN, TA) தேர்ந்தெடுக்கவும்."
    ],
    tips: {
      kicker: "இலவச Tips (Free Tips)",
      title: "இன்றைய சிறப்பு விளையாட்டு குறிப்புகள்",
      desc: "தினசரி பகுப்பாய்வு செய்யப்பட்ட விளையாட்டு குறிப்புகள். முழுமையான நேரடி tips, slip codes மற்றும் அறிவிப்புகளுக்கு Telegram Bot-ல் இணையுங்கள்.",
      featuredHeading: "இன்றைய சந்தை தேர்வுகள்",
      badge: "Daily Featured",
      verifiedBadge: "⚡ Tap here for Live Odds",
      cta: "🎯 Telegram-ல் நேரடி Tips பெறவும்",
      stats: {
        winRate: "வெற்றி விகிதம் (Strike Rate)",
        roi: "வாராந்திர ROI (Weekly ROI)",
        slipsWon: "வெற்றி Slips (7d)",
        avgOdds: "சராசரி Odds",
        status: "உறுதிப்படுத்தப்பட்டது (Verified)"
      }
    },
    legal: {
      privacy: "பயனர் ரகசியத்தன்மை முழுமையாகப் பாதுகாக்கப்படுகிறது. வங்கி PIN அல்லது கார்டு விவரங்கள் தளத்தில் சேமிக்கப்படாது. Cloudflare Edge, D1 மற்றும் R2 மூலம் பாதுகாக்கப்படுகிறது. 18+ பயனர்களுக்கு மட்டுமே.",
      terms: "இந்த தளம் அதிகாரப்பூர்வ விளையாட்டு தகவல் மற்றும் Telegram உதவி அமைப்பாகும். முடிவுகள் அல்லது லாபம் உத்தரவாதமில்லை. பொறுப்புடன் விளையாடுங்கள். 18+ வயது வரம்பு பொருந்தும்."
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
    return `<svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#00843D"/><circle cx="25" cy="7" r="4" fill="#ED1C24"/><path d="M9 16h14M16 9v14" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="16" r="2" fill="#FFCC00"/></svg>`;
  }
  if (name === "mCash") {
    return `<svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#00549A"/><path d="M7 23l5-14 4 8 4-8 5 14" stroke="#FF6600" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="19" r="2" fill="#ffffff"/></svg>`;
  }
  if (name === "FriMi") {
    return `<svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#E60028"/><text x="16" y="21" fill="#ffffff" font-size="14" font-weight="900" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">Fr</text><circle cx="23" cy="12" r="1.5" fill="#ffffff"/></svg>`;
  }
  if (name === "iPay") {
    return `<svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0E1A38"/><path d="M8 17a8 8 0 0116 0" stroke="#00D2FF" stroke-width="3" stroke-linecap="round"/><text x="16" y="22" fill="#ffffff" font-size="9" font-weight="900" text-anchor="middle" font-family="system-ui,sans-serif">iPay</text></svg>`;
  }
  return `<svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0F172A"/><path d="M6 13h20M7 13v9M11 13v9M16 13v9M21 13v9M25 13v9M16 6l11 5H5l11-5zM5 24h22" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderHeroEyebrow(c: (typeof T)[Lang], lang: Lang): string {
  const pillLabel = lang === "si" ? "Telegram BOT" : lang === "ta" ? "Telegram BOT" : "TELEGRAM BOT";
  return `<div class="hero-badge-wrap">
    <div class="hero-badge">
      <span class="hero-flag" aria-hidden="true">🇱🇰</span>
      <span class="hero-badge-dot" aria-hidden="true"></span>
      <span class="hero-badge-text">${esc(c.hero[0])}</span>
      <span class="hero-badge-pill">${pillLabel}</span>
    </div>
  </div>`;
}

function renderHeroHeading(lang: Lang): string {
  if (lang === "si") {
    return `<h1 class="heroHeading">
      <span class="hero-line">ඔබේ සේවාවන්ට <span class="hl-gradient hl-tips">එක්</span></span>
      <br class="hero-br">
      <span class="hero-line"><span class="hl-gradient hl-cash">Telegram</span> මධ්‍යස්ථානයක්.</span>
    </h1>`;
  }
  if (lang === "ta") {
    return `<h1 class="heroHeading">
      <span class="hero-line">உங்கள் சேவைகளுக்கு</span>
      <br class="hero-br">
      <span class="hero-line">ஒரே <span class="hl-gradient hl-cash">Telegram</span> மையம்.</span>
    </h1>`;
  }
  return `<h1 class="heroHeading">
    <span class="hero-line">One simple</span>
    <br class="hero-br">
    <span class="hero-line"><span class="hl-gradient hl-cash">Telegram</span> hub for your needs.</span>
  </h1>`;
}

function renderHeroSubtitle(c: (typeof T)[Lang], lang: Lang): string {
  if (lang === "si") {
    return `<p class="hero-subtitle">තැන්පතු සහ මුදල් ආපසු ගැනීම් සඳහා මඟපෙන්වීම, නොමිලේ ක්‍රීඩා ඉඟි සහ භාෂා තුනක සහාය — සියල්ල එකම Telegram bot එකකින්. <strong class="hero-hl">සරලයි. පැහැදිලියි. පහසුයි.</strong></p>`;
  }
  if (lang === "ta") {
    return `<p class="hero-subtitle">Deposit மற்றும் withdrawal வழிகாட்டுதல், இலவச விளையாட்டு குறிப்புகள் மற்றும் மூன்று மொழிகளில் உதவி — அனைத்தும் ஒரே Telegram bot-ல். <strong class="hero-hl">எளிமை. தெளிவு. வசதி.</strong></p>`;
  }
  return `<p class="hero-subtitle">Guided deposits and withdrawals, free sports tips, and support in three languages — all in one Telegram bot. <strong class="hero-hl">Simple, clear, and convenient.</strong></p>`;
}

function renderHeroTrustRibbon(lang: Lang): string {
  const t = lang === "si" ? {
    payouts: "Timing varies",
    payoutsLbl: "ගනුදෙනු කාලය වෙනස් විය හැක",
    fee: "0% ගාස්තු*",
    feeLbl: "සැඟවුණු ගාස්තු නෑ",
    tips: "Daily VIP",
    tipsLbl: "නොමිලේ Tips",
    secure: "SSL Secured",
    secureLbl: "Cloudflare ආරක්ෂිතයි"
  } : lang === "ta" ? {
    payouts: "Timing varies",
    payoutsLbl: "Processing time may vary",
    fee: "0% கட்டணம்*",
    feeLbl: "மறைக்கப்பட்ட கட்டணம் இல்லை",
    tips: "Daily VIP",
    tipsLbl: "இலவச Tips",
    secure: "SSL Secured",
    secureLbl: "Cloudflare Secured"
  } : {
    payouts: "Timing varies",
    payoutsLbl: "Processing time may vary",
    fee: "0% Extra*",
    feeLbl: "Zero Hidden Fees",
    tips: "Daily VIP",
    tipsLbl: "Free Tips Drop",
    secure: "SSL Secured",
    secureLbl: "Cloudflare Protected"
  };

  return `<div class="hero-trust-ribbon" aria-label="Key operational highlights">
    <div class="trust-item"><span class="trust-icon">⚡</span> <span><strong class="trust-title">${t.payouts}</strong> <span class="trust-sub">${t.payoutsLbl}</span></span></div>
    <div class="trust-sep" aria-hidden="true"></div>
    <div class="trust-item"><span class="trust-icon">💳</span> <span><strong class="trust-title">${t.fee}</strong> <span class="trust-sub">${t.feeLbl}</span></span></div>
    <div class="trust-sep" aria-hidden="true"></div>
    <div class="trust-item"><span class="trust-icon">🎯</span> <span><strong class="trust-title">${t.tips}</strong> <span class="trust-sub">${t.tipsLbl}</span></span></div>
    <div class="trust-sep" aria-hidden="true"></div>
    <div class="trust-item"><span class="trust-icon">🛡️</span> <span><strong class="trust-title">${t.secure}</strong> <span class="trust-sub">${t.secureLbl}</span></span></div>
  </div>`;
}

function renderFinalCtaBanner(c: (typeof T)[Lang], lang: Lang, eb: string): string {
  const badgeText = lang === "si" 
    ? "ක්ෂණික ආරම්භය • 1XBET TELEGRAM CASH DESK" 
    : lang === "ta" 
      ? "உடனடி தொடக்கம் • 1XBET TELEGRAM CASH DESK" 
      : "INSTANT SETUP • 1XBET TELEGRAM CASH DESK";
  const pillLabel = lang === "si" ? "24/7 සක්‍රියයි" : lang === "ta" ? "24/7 நேரலை" : "24/7 LIVE";

  const headingHtml = lang === "si"
    ? `<h2 class="finalHeading"><span class="hero-line">දැන්ම ආරම්භ කිරීමට <span class="hl-gradient hl-cash">සූදානම්ද?</span></span></h2>`
    : lang === "ta"
      ? `<h2 class="finalHeading"><span class="hero-line">இப்போதே தொடங்க <span class="hl-gradient hl-cash">தயாரா?</span></span></h2>`
      : `<h2 class="finalHeading"><span class="hero-line">Ready to <span class="hl-gradient hl-cash">get started?</span></span></h2>`;

  const ribbon = lang === "si" ? {
    f1: "⚡ Processing times vary",
    f2: "💳 0% සැඟවුණු අමතර ගාස්තු",
    f3: "🔒 Password අවශ්‍ය නෑ",
    f4: "🇱🇰 24/7 පාරිභෝගික සහාය"
  } : lang === "ta" ? {
    f1: "⚡ Processing times vary",
    f2: "💳 0% மறைக்கப்பட்ட கூடுதல் கட்டணம்",
    f3: "🔒 Password தேவையில்லை",
    f4: "🇱🇰 24/7 வாடிக்கையாளர் ஆதரவு"
  } : {
    f1: "⚡ Typical processing times vary",
    f2: "💳 Zero Hidden Platform Fees",
    f3: "🔒 No Passwords Requested",
    f4: "🇱🇰 24/7 Telegram Support"
  };

  return `<section class="final" id="start-now"><img class="finalGraphicBg" src="${TELEGRAM_GRAPHICS.botUi}" alt="" width="1600" height="900" loading="lazy" decoding="async" aria-hidden="true"><div class="finalGraphicOverlay" aria-hidden="true"></div>
    <div class="wrap sectionGraphicContent">
      <div class="finalBox">
        <div class="hero-badge-wrap" style="justify-content:center; margin-bottom:14px;">
          <div class="hero-badge">
            <span class="hero-flag" aria-hidden="true">🇱🇰</span>
            <span class="hero-badge-dot" aria-hidden="true"></span>
            <span class="hero-badge-text">${badgeText}</span>
            <span class="hero-badge-pill">${pillLabel}</span>
          </div>
        </div>
        ${headingHtml}
        <p class="finalDesc">${esc(c.final[1])}</p>
        
        <div class="final-trust-pills" aria-label="Benefits highlights">
          <span class="final-pill">${ribbon.f1}</span>
          <span class="final-pill">${ribbon.f2}</span>
          <span class="final-pill">${ribbon.f3}</span>
          <span class="final-pill">${ribbon.f4}</span>
        </div>

        <div class="actions heroActions" style="justify-content:center; margin-top:24px;">
          <a class="btn primary heroPrimaryBtn" href="${eb}" data-track-cta="final_bot">✈ ${esc(c.hero[3])}</a>
          <a class="btn secondary" href="#tips-preview" style="padding:15px 28px; border-radius:14px; font-weight:700;">🎯 ${esc(c.hero[4])}</a>
        </div>
      </div>
    </div>
  </section>`;
}

export function renderLandingPage(env: Env, request: Request, nonce?: string): string {
  const n = nonce ? ` nonce="${esc(nonce)}"` : "";
  const channel = env.CHANNEL_URL?.trim() || CHANNEL_FALLBACK;
  const botName = env.BOT_USERNAME?.trim().replace(/^@/, "") || BOT_FALLBACK;
  const bot = `https://t.me/${botName}?start=landing`;
  const min = Number.parseInt(env.MIN_TRANSACTION_LKR || "1000", 10) || 1000;
  const max = Number.parseInt(env.MAX_TRANSACTION_LKR || "500000", 10) || 500000;

  let lang: Lang = "si";
  let hasExplicitLang = false;
  const trustedOrigin = trustedPublicBaseUrl(env, request);
  const siteUrl = trustedOrigin ? `${trustedOrigin}/` : "";
  const ea = trustedOrigin ? esc(siteUrl) : "/";
  const localeUrls = trustedOrigin ? {
    si: siteUrl,
    en: `${trustedOrigin}/en/`,
    ta: `${trustedOrigin}/ta/`,
  } : null;
  let canonicalUrl = siteUrl;
  try {
    const u = new URL(request.url);
    const pathLang = u.pathname.match(/^\/(si|en|ta)\/?$/i)?.[1]?.toLowerCase();
    const queryLang = u.searchParams.get("lang")?.toLowerCase();
    const requestedLang = pathLang || queryLang;
    if (requestedLang === "si" || requestedLang === "en" || requestedLang === "ta") {
      lang = requestedLang;
      hasExplicitLang = true;
    }
  } catch {}
  if (hasExplicitLang && lang !== "si" && localeUrls) canonicalUrl = localeUrls[lang];
  const c = T[lang];
  const eb = esc(bot);
  const ebTips = esc(`https://t.me/${botName}?start=tips`);
  const ec = esc(channel);
  const promo = esc(env.XBET_PROMO_CODE?.trim() || "");

  const faq = c.faq.map((q, i) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: c.faqAnswers[i] }
  }));
  const ld = siteUrl ? jsonEsc(JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: "Fast xBet Cash",
        url: siteUrl,
        logo: `${trustedOrigin}/logo.png`,
        image: `${trustedOrigin}${TELEGRAM_GRAPHICS.og}`,
        sameAs: [channel, `https://t.me/${botName}`],
        areaServed: "LK",
        availableLanguage: ["si", "en", "ta"]
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        url: siteUrl,
        name: "Fast xBet Cash 🇱🇰",
        publisher: { "@id": `${siteUrl}#organization` },
        inLanguage: ["si", "en", "ta"]
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        mainEntity: faq
      }
    ]
  })) : "";

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
    ["🎯", c.services[2], "Automated sports analysis with real-time match odds on Telegram.", "Get live tips"],
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

  const ogImageUrl = trustedOrigin ? esc(`${trustedOrigin}${TELEGRAM_GRAPHICS.og}`) : "";
  const canonicalAndOgTags = trustedOrigin && localeUrls ? `
<link rel="canonical" href="${esc(canonicalUrl)}">
<link rel="alternate" hreflang="si" href="${esc(localeUrls.si)}">
<link rel="alternate" hreflang="en" href="${esc(localeUrls.en)}">
<link rel="alternate" hreflang="ta" href="${esc(localeUrls.ta)}">
<link rel="alternate" hreflang="x-default" href="${esc(localeUrls.si)}">
<meta property="og:url" content="${esc(canonicalUrl)}">
<meta property="og:image" content="${ogImageUrl}">
<meta property="og:image:secure_url" content="${ogImageUrl}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<link rel="image_src" href="${ogImageUrl}">
<meta itemprop="image" content="${ogImageUrl}">
<meta name="twitter:image" content="${ogImageUrl}">` : "";

  const ldScript = ld ? `<script type="application/ld+json"${n}>${ld}</script>` : "";

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(c.title)}</title>
<meta name="description" content="${esc(c.desc)}">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#0C1F1A">
<meta name="color-scheme" content="dark">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.json">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700;800&family=Noto+Sans+Tamil:wght@400;600;700;800&family=Noto+Serif+Sinhala:wght@600;700;800&family=Noto+Serif+Tamil:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">${canonicalAndOgTags}
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/favicon.png">
<meta property="og:site_name" content="Fast xBet Cash">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(c.title)}">
<meta property="og:description" content="${esc(c.desc)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(c.title)}">
<meta name="twitter:description" content="${esc(c.desc)}">
${ldScript}
${cfAnalyticsScript}
<style${n}>
    /* ==========================================================
       Fast xBet Cash — Landing: "The Slip"
       The hero is a printed betting slip. Its stub holds the CTA.
       Pitch-green ground, chalk type, one gold accent, Sinhala
       set in Noto Sans Sinhala with a serif display face.
       ========================================================== */
    :root {
      --bg: #0C1F1A;
      --bg-2: #102A23;
      --surface: #132E27;
      --surface-2: #0F2620;
      --fg: #F4F0E6;
      --muted: #C2CCC6;
      --faint:#7d8fa6;
      --gold: #F5B700;
      --gold-hi: #FFC927;
      --gold-ink: #1A1206;
      --win: #7BD389;
      --loss: #E4572E;
      --tg: #229ED9;
      --line: rgba(244, 240, 230, 0.12);
      --line-strong: rgba(244, 240, 230, 0.24);
      --border: rgba(244, 240, 230, 0.16);
      --radius: 8px;
      --radius-lg: 14px;
      --sans: "Noto Sans Sinhala", "Noto Sans Tamil", "Plus Jakarta Sans", system-ui, sans-serif;
      --serif: "Noto Serif Sinhala", "Noto Serif Tamil", Georgia, "Times New Roman", serif;
      --num: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
      --max: 1120px;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; scroll-padding-top: 84px; -webkit-text-size-adjust: 100%; }
    body {
      background: var(--bg);
      color: var(--fg);
      font-family: var(--sans);
      font-size: 16px;
      line-height: 1.7;
      overflow-x: clip;
    }
    img { max-width: 100%; display: block; }
    a { color: inherit; }
    button { font: inherit; }
    :focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; border-radius: 4px; }
    .skip {
      position: absolute; left: -9999px; top: 8px; z-index: 200;
      background: var(--gold); color: var(--gold-ink); padding: 8px 12px; border-radius: 6px;
    }
    .skip:focus { left: 8px; }
    .wrap { width: 100%; max-width: var(--max); margin: 0 auto; padding: 0 20px; }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after { animation: none !important; transition: none !important; }
    }

    /* ---------- Type scale ---------- */
    h1, h2, h3 { font-family: var(--serif); font-weight: 700; letter-spacing: -0.01em; line-height: 1.2; color: var(--fg); }
    h2 { font-size: clamp(26px, 3.4vw, 38px); margin-bottom: 14px; }
    h3 { font-size: 20px; }
    p { color: var(--muted); max-width: 66ch; }
    .kicker {
      display: inline-block;
      font-size: 14px;
      font-weight: 700;
      color: var(--gold);
      margin-bottom: 10px;
    }

    /* ---------- Ticker ---------- */
    .tickerBar {
      position: relative;
      overflow: hidden;
      background: var(--surface-2);
      border-bottom: 1px solid var(--line);
      padding: 9px 0;
    }
    .tickerInner { display: flex; align-items: center; gap: 14px; padding: 0 16px; max-width: var(--max); margin: 0 auto; }
    .tickerScroll { flex: 1 1 auto; min-width: 0; overflow: hidden; mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
    .tickerBadge {
      flex: 0 0 auto;
      font-size: 12px;
      font-weight: 700;
      color: var(--gold-ink);
      background: var(--gold);
      padding: 3px 9px;
      border-radius: 4px;
    }
    .tickerItems {
      display: flex;
      gap: 28px;
      white-space: nowrap;
      animation: ticker-scroll 46s linear infinite;
      will-change: transform;
    }
    .tickerItem { font-size: 13px; color: var(--muted); font-family: var(--num); }
    .tickerItem .wonTag { color: var(--win); font-weight: 700; }
    .tickerBar.paused .tickerItems,
    .tickerBar:hover .tickerItems,
    .tickerBar:focus-within .tickerItems { animation-play-state: paused; }
    .tickerPause {
      flex: 0 0 auto; font: inherit; font-size: 12px; font-weight: 700; padding: 4px 10px;
      min-height: 32px; min-width: 32px;
      border: 1px solid var(--line-strong); border-radius: 6px;
      background: transparent; color: var(--muted); cursor: pointer;
    }
    @keyframes ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .tickerDisclaimer {
      margin: 0 auto; padding: 6px 16px 0; max-width: var(--max);
      font-size: 12px; color: var(--faint); text-align: center; line-height: 1.5;
    }

    /* ---------- Nav ---------- */
    .nav {
      position: sticky; top: 0; z-index: 50;
      background: rgba(12, 31, 26, 0.92);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--line);
    }
    .navin { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 64px; }
    .logo {
      white-space: nowrap;
      display: inline-flex; align-items: center; gap: 10px;
      font-weight: 800; font-size: 17px; text-decoration: none; color: var(--fg);
    }
    .logo img { border-radius: 8px; width: 34px; height: 34px; }
    .logo span { color: var(--gold); }
    .links { display: flex; gap: 4px; align-items: center; }
    .links a {
      white-space: nowrap;
      font-size: 14px; color: var(--muted); text-decoration: none;
      padding: 8px 10px; border-radius: 6px; min-height: 40px; display: inline-flex; align-items: center;
    }
    .links a:hover { color: var(--fg); background: rgba(244, 240, 230, 0.06); }
    .langs { display: inline-flex; gap: 4px; }
    .langs a {
      font-size: 12px; font-weight: 700; padding: 6px 8px; border-radius: 6px;
      border: 1px solid var(--line-strong); text-decoration: none; color: var(--muted);
    }
    .langs a[aria-current="page"], .langs a.active { background: var(--fg); color: var(--bg); border-color: var(--fg); }
    .menu { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 40px; min-width: 40px; border: 1px solid var(--line-strong); border-radius: 8px; background: transparent; color: var(--fg); font-size: 18px; cursor: pointer; }
    .desktop .btn { min-height: 40px; padding: 8px 14px; font-size: 14px; white-space: nowrap; }
    .desktop { display: flex; align-items: center; gap: 10px; }
    @media (min-width: 881px) { .menu { display: none; } }
    .btn.desktop { min-height: 40px; padding: 8px 14px; font-size: 14px; white-space: nowrap; }
    .mobile { display: none; }
    @media (max-width: 880px) {
      .links, .desktop { display: none; }
      .navin .botStatusWidget, .navin .langs { display: none; }
      .btn.desktop { display: none; }
      .mobile.open {
        display: grid; position: absolute; right: 12px; top: calc(100% + 8px);
        width: min(320px, calc(100vw - 24px)); padding: 10px; gap: 4px;
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
      }
    }

    /* ---------- Buttons ---------- */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      min-height: 48px; padding: 12px 20px; border-radius: var(--radius);
      font-size: 15px; font-weight: 700; text-decoration: none; cursor: pointer;
      border: 1px solid var(--line-strong); background: transparent; color: var(--fg);
      transition: background-color .15s ease, border-color .15s ease, color .15s ease, transform .15s ease;
    }
    .btn:hover { border-color: var(--gold); color: var(--gold); }
    .btn:active { transform: translateY(1px); }
    .btn.primary, .primary {
      background: var(--gold); border-color: var(--gold); color: var(--gold-ink);
    }
    .btn.primary:hover, .primary:hover { background: var(--gold-hi); border-color: var(--gold-hi); color: var(--gold-ink); }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; }
    .heroPrimaryBtn { min-width: min(100%, 280px); }
    .subLink {
      color: var(--muted); text-decoration: none; font-size: 14px;
      min-height: 40px; display: inline-flex; align-items: center; padding: 6px 2px;
    }
    .subLink:hover { color: var(--fg); text-decoration: underline; text-underline-offset: 4px; }
    .subDivider { color: var(--faint); }
    .qrTriggerBtn, .promoCopyBtn, .footerLinkBtn, .qrCloseBtn, .presetBtn, .calcBtn, .stickyBtn {
      cursor: pointer; font: inherit;
    }

    /* ---------- Hero ---------- */
    .hero {
      position: relative; isolation: isolate; overflow: hidden;
      padding: 56px 0 64px;
      border-bottom: 1px solid var(--line);
    }
    .heroGraphicBg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; opacity: .18; }
    .heroGraphicOverlay {
      position: absolute; inset: 0; z-index: -1; pointer-events: none;
      background: linear-gradient(90deg, var(--bg) 0%, rgba(12, 31, 26, .9) 55%, rgba(12, 31, 26, .75) 100%);
    }
    .heroGrid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); gap: 48px; align-items: center; }
    .eyebrow {
      display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;
      color: var(--gold); margin-bottom: 14px;
    }
    .heroHeading { font-size: clamp(34px, 5.2vw, 60px); line-height: 1.12; margin-bottom: 18px; }
    .hero-line { display: block; }
    .hl-gradient { color: var(--gold); }
    .hl-cash { color: var(--gold); }
    .heroSubtitle, .hero p { font-size: 17px; color: var(--muted); margin-bottom: 18px; }
    .heroTrust, .trust { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 22px; list-style: none; }
    .heroActions { margin-top: 6px; }
    .heroSubActions {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-top: 16px;
    }
    .promoNote { display: block; margin-top: 16px; font-size: 13px; color: var(--faint); max-width: 60ch; }
    .promoNote small { color: var(--faint); }
    .pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
    .pill {
      display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted);
      padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line-strong); background: transparent;
    }
    .pill .botStatusDot, .pill > span:first-child { flex: 0 0 auto; }

    /* The slip: a ticket with a perforated stub */
    #edge-visual { position: relative; }
    .phone {
      position: relative;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 0;
      overflow: hidden;
      box-shadow: 0 30px 60px -30px rgba(0, 0, 0, .7);
      transform: rotate(-1.2deg);
    }
    .phone::before, .phone::after {
      content: ""; position: absolute; left: 0; right: 0; height: 14px; z-index: 2;
      background: radial-gradient(circle at 7px 7px, var(--bg) 6px, transparent 6.5px) 0 0 / 14px 14px repeat-x;
    }
    .phone::before { top: -7px; }
    .phone::after { bottom: -7px; transform: rotate(180deg); }
    .phoneInner { padding: 20px 20px 16px; }
    .phoneTop { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; font-size: 13px; color: var(--muted); }
    .notch { display: none; }
    .chat { display: grid; gap: 10px; }
    .bubble {
      background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--radius);
      padding: 10px 12px; font-size: 14px; color: var(--fg); line-height: 1.55; max-width: 100%;
    }
    .bubble.bot { border-left: 3px solid var(--tg); }
    .bubble.user { background: var(--bg-2); justify-self: end; }
    .chatChips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .chatChips button.chatChip {
      min-height: 36px; padding: 6px 12px; border-radius: 999px; font-size: 13px;
      border: 1px solid var(--line-strong); background: transparent; color: var(--muted); cursor: pointer;
    }
    .chatChips button.chatChip.active {
      background: var(--fg); border-color: var(--fg); color: var(--bg); font-weight: 700;
    }
    .chatHead { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
    .chatTitle { font-weight: 800; font-size: 15px; color: var(--fg); }
    .botStatusWidget {
      display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 4px 10px;
      border-radius: 999px; border: 1px solid var(--line-strong); background: transparent;
      color: var(--muted); font-size: 12px; cursor: pointer;
    }
    .botStatusDot, .botStatusPing { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--win); }
    .botStatusDot.checking, .checking { background: var(--gold); }
    .botStatusDot.offline { background: var(--loss); }
    .botStatusPing { display: none; }
    .botStatusLabel { white-space: nowrap; }
    .previewBadge {
      display: inline-block; font-size: 11px; font-weight: 700; color: var(--gold);
      border: 1px solid rgba(245, 183, 0, .4); padding: 2px 8px; border-radius: 4px;
    }
    .qrBox { margin-top: 12px; padding: 12px; background: var(--fg); border-radius: var(--radius); }
    .qrBox img, .qrBox svg { width: 100%; height: auto; border-radius: 6px; }

    /* ---------- Sections ---------- */
    .section {
      position: relative; isolation: isolate; overflow: hidden;
      padding: 72px 0; border-bottom: 1px solid var(--line);
    }
    .section:nth-of-type(even) { background: var(--bg-2); }
    .sectionGraphicBg {
      position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; opacity: .08;
    }
    .sectionGraphicOverlay { position: absolute; inset: 0; z-index: -1; background: transparent; pointer-events: none; }
    .sectionGraphicContent { position: relative; z-index: 1; }
    .section > .wrap > h2, .sectionGraphicContent > h2 { margin-bottom: 10px; }
    .section .sub, .sectionGraphicContent > p { margin-bottom: 28px; }
    .finalGraphicBg {
      position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; opacity: .1;
    }
    .finalGraphicOverlay { position: absolute; inset: 0; z-index: -1; background: var(--bg); opacity: .92; }

    /* services / steps / security grids */
    .services, .steps, .securityGrid, .tipCardGrid, .faqs, .calcPresets, .bonusStat, .limits, .payments, .links-grid {
      display: grid; gap: 14px;
    }
    .secItem, .step, .securityCard, .faq, .limit, .limitStat, .payments > *, .bonusStat, .totalStat, .countdownSlot {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 22px;
    }
    .secItem h3, .step h3, .securityCard h3 { font-size: 18px; margin-bottom: 8px; }
    .secItem p, .step p, .securityCard p { font-size: 15px; }
    .services { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .steps { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); counter-reset: step; }
    .step { position: relative; }
    .num {
      display: inline-flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 50%; margin-bottom: 14px;
      background: var(--gold); color: var(--gold-ink); font-weight: 800; font-family: var(--num);
    }
    .head { margin-bottom: 28px; max-width: 64ch; }
    .qrTriggerBtn {
      min-height: 40px; padding: 6px 12px; border-radius: 6px; font-size: 14px;
      border: 1px solid var(--line-strong); background: transparent; color: var(--fg);
    }
    .qrTriggerBtn:hover { border-color: var(--gold); color: var(--gold); }
    .securityGrid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .securityHead { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .securityIcon {
      width: 40px; height: 40px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center;
      background: rgba(244, 240, 230, .06); border: 1px solid var(--line-strong); font-size: 20px;
    }

    /* payments */
    .payments { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .payments > * { padding: 18px; display: flex; flex-direction: column; gap: 6px; }
    .payBadge { font-size: 12px; font-weight: 700; color: var(--win); }
    .pay-icon, .paymentIcon { width: 36px; height: 36px; border-radius: 8px; object-fit: contain; }

    /* ---------- Tips ---------- */
    .tipTabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
    .tipTab, .tipModeTab {
      min-height: 40px; padding: 8px 14px; border-radius: 999px; font-size: 14px; font-weight: 600;
      border: 1px solid var(--line-strong); background: transparent; color: var(--muted); cursor: pointer;
    }
    .tipTab:hover, .tipModeTab:hover { color: var(--fg); border-color: var(--fg); }
    .tipTab.active, .tipModeTab.active { background: var(--fg); border-color: var(--fg); color: var(--bg); }
    .tipModeTabs { display: inline-flex; gap: 6px; margin-bottom: 18px; }
    .tipCardGrid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .tipCard {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg);
      padding: 18px; display: flex; flex-direction: column; gap: 12px;
      border-top: 3px solid var(--line-strong);
    }
    .tipCard.won { border-top-color: var(--win); }
    .tipCardTop, .tipHead, .tipFoot, .tipVs, .tipPickRow, .tipTeams {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    }
    .tipHead, .tipFoot { justify-content: space-between; }
    .tipLeague, .tipWhen, .tipMarketTag { font-size: 12px; color: var(--faint); }
    .tipTeam, .tipPickName { font-weight: 700; color: var(--fg); }
    .tipAvatar { width: 28px; height: 28px; border-radius: 50%; object-fit: contain; background: var(--bg-2); }
    .tipVs { color: var(--faint); font-size: 12px; font-weight: 700; }
    .tipOdds { font-family: var(--num); font-weight: 800; color: var(--gold); font-size: 18px; }
    .tipStatus { font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 4px; border: 1px solid var(--line-strong); color: var(--muted); }
    .tipStatus.won, .wonTag { color: var(--win); border-color: rgba(123, 211, 137, .4); }
    .tipStatus.lost { color: var(--loss); border-color: rgba(228, 87, 46, .45); }
    .tipSummary { font-size: 14px; color: var(--muted); }
    .tipEmpty { color: var(--faint); font-size: 15px; padding: 18px 0; }
    .tipsCountdownBar {
      height: 4px; border-radius: 999px; background: var(--line); overflow: hidden; margin-bottom: 12px;
    }
    .tipsCountdownBar::after {
      content: ""; display: block; height: 100%; width: 40%; background: var(--gold); border-radius: 999px;
    }
    .countdownTimer { font-family: var(--num); font-size: 22px; font-weight: 800; color: var(--fg); font-variant-numeric: tabular-nums; }
    .countdownLabel { font-size: 13px; color: var(--faint); }
    .countdownDot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--gold); margin-right: 6px; }
    .countdownSlot { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }

    /* ---------- Calculator ---------- */
    .calcBox {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); overflow: hidden;
    }
    .calcHead {
      display: flex; align-items: center; gap: 12px; padding: 18px 22px; border-bottom: 1px solid var(--line);
    }
    .calcIcon {
      width: 40px; height: 40px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center;
      background: var(--gold); color: var(--gold-ink); font-size: 20px;
    }
    .calcBody { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0; }
    .calcLeft, .calcRight { padding: 22px; }
    .calcLeft { border-right: 1px solid var(--line); }
    .calcMeta { font-size: 13px; color: var(--faint); margin-bottom: 12px; }
    .calcSliderLabel { display: flex; justify-content: space-between; font-size: 14px; color: var(--muted); margin-bottom: 8px; }
    .calcSlider { width: 100%; accent-color: var(--gold); min-height: 44px; }
    .calcPresets { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 12px; gap: 8px; }
    .presetBtn {
      min-height: 40px; border-radius: var(--radius); border: 1px solid var(--line-strong);
      background: transparent; color: var(--muted); font-weight: 600; font-size: 14px;
    }
    .presetBtn:hover, .presetBtn.active { border-color: var(--gold); color: var(--gold); }
    .calcStat { display: flex; justify-content: space-between; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--line); }
    .calcStat:last-child { border-bottom: 0; }
    .calcStat span:first-child { color: var(--muted); font-size: 14px; }
    .calcStat span:last-child { font-family: var(--num); font-weight: 800; font-variant-numeric: tabular-nums; color: var(--fg); }
    .calcBtn { margin-top: 14px; width: 100%; }
    .bonusStat { grid-template-columns: 1fr; padding: 0; background: transparent; border: 0; }
    .limitStat, .totalStat { font-family: var(--num); }
    .limits { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    @media (max-width: 760px) {
      .calcBody { grid-template-columns: 1fr; }
      .calcLeft { border-right: 0; border-bottom: 1px solid var(--line); }
    }

    /* ---------- FAQ ---------- */
    .faqs { grid-template-columns: 1fr; gap: 10px; }
    .faq { padding: 0; }
    .faq summary {
      list-style: none; cursor: pointer; padding: 16px 20px; min-height: 52px;
      font-weight: 700; color: var(--fg); display: flex; justify-content: space-between; gap: 12px; align-items: center;
    }
    .faq summary::-webkit-details-marker { display: none; }
    .faq summary::after { content: "+"; font-family: var(--num); color: var(--gold); font-size: 20px; }
    .faq[open] summary::after { content: "–"; }
    .faq > div, .faq > p { padding: 0 20px 18px; color: var(--muted); }

    /* ---------- Responsible gaming ---------- */
    .responsible-gaming-box {
      border: 1px solid rgba(228, 87, 46, .45); border-radius: var(--radius-lg);
      background: rgba(228, 87, 46, .06); padding: 22px; margin-top: 8px;
    }
    .responsible-gaming-box h2 { font-size: 22px; color: var(--fg); }
    .responsible-gaming-box p, .responsible-gaming-box li { color: var(--muted); }

    /* ---------- Final CTA ---------- */
    .final {
      position: relative; isolation: isolate; overflow: hidden; padding: 84px 0; text-align: left;
      border-top: 1px solid var(--line);
    }
    .final h2 { font-size: clamp(28px, 4vw, 44px); max-width: 22ch; }
    .final .actions { margin-top: 22px; }
    .final .hero-line { display: inline; }

    /* ---------- Footer ---------- */
    footer.footer, .foot, .footer {
      border-top: 1px solid var(--line); padding: 36px 0 44px; background: var(--surface-2);
      color: var(--faint); font-size: 14px;
    }
    .footerLinks { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-bottom: 14px; }
    .footer a, .foot a { color: var(--muted); }
    .footerLinkBtn {
      background: none; border: 0; color: var(--muted); padding: 6px 0; min-height: 40px;
      text-decoration: underline; text-underline-offset: 3px;
    }

    /* ---------- Modals ---------- */
    .qrModalOverlay, .legalModalOverlay {
      display: none; position: fixed; inset: 0; z-index: 100;
      background: rgba(0, 0, 0, .65); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      place-items: center; padding: 20px;
    }
    .qrModalOverlay.open, .legalModalOverlay.open { display: grid; }
    .qrModalCard, .legalModalCard {
      width: min(440px, 100%); max-height: min(86vh, 720px); overflow: auto;
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
      padding: 22px; box-shadow: 0 30px 80px rgba(0, 0, 0, .6);
    }
    .legalModalCard { width: min(720px, 100%); }
    .qrModalTop, .legalModalTop { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .qrModalTop h3, .legalModalTop h3 { font-size: 19px; }
    .qrModalDesc { font-size: 14px; color: var(--muted); margin-bottom: 14px; }
    .qrModalBot { font-family: var(--num); color: var(--gold); font-weight: 700; }
    .qrCloseBtn {
      min-height: 40px; min-width: 40px; border-radius: 8px; border: 1px solid var(--line-strong);
      background: transparent; color: var(--fg);
    }
    .legalContent { font-size: 14px; color: var(--muted); }
    .legalContent h3 { font-size: 16px; margin: 14px 0 6px; }

    /* ---------- Sticky mobile bar ---------- */
    .mobileStickyBar { display: none; }
    .stickyContent {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      background: var(--surface); border-top: 1px solid var(--border); padding: 10px 16px;
    }
    .stickyInfo { font-size: 13px; color: var(--muted); }
    .stickyBtn { min-height: 44px; }
    .promoBar, .promoCodeWrap { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
    .promoTag { font-size: 12px; font-weight: 700; color: var(--gold); }
    .promoCopyBtn {
      min-height: 40px; padding: 6px 12px; border-radius: 6px; border: 1px dashed var(--gold);
      background: transparent; color: var(--gold); font-family: var(--num); font-weight: 700;
    }
    .promoCopyBtn.copied { color: var(--win); border-color: var(--win); }

    /* ---------- Section background graphic on tips/payments/security (kept subtle) ---------- */
    .online { color: var(--win); }
    .pending { color: var(--gold); }
    .hasLogo { display: inline-flex; align-items: center; gap: 8px; }
    .isFlag { border-radius: 2px; }
    .desktop-only { display: revert; }

    /* ---------- Responsive ---------- */
    @media (max-width: 960px) {
      .heroGrid { grid-template-columns: 1fr; gap: 36px; }
      #edge-visual { max-width: 460px; }
    }
    @media (max-width: 640px) {
      .wrap { padding: 0 16px; }
      .hero { padding: 36px 0 48px; }
      .section, .final { padding: 52px 0; }
      .heroHeading { font-size: 34px; }
      .heroActions .btn, .final .btn { width: 100%; }
      .mobileStickyBar {
        display: block; position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      body { padding-bottom: 76px; }
      .calcPresets { grid-template-columns: repeat(3, minmax(0, 1fr)); }
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
    <button type="button" class="botStatusWidget" id="botStatusWidget" title="Telegram Bot Live Ping · Click to re-test connection">
      <span class="botStatusDot checking" id="botStatusDot"></span>
      <span class="botStatusLabel" id="botStatusLabel" role="status" aria-live="polite">Bot: <b id="botStatusText">Checking...</b></span>
      <span class="botStatusPing" id="botStatusPing"></span>
    </button>
    <div class="langs" aria-label="Language">
      <a href="${esc(makeLangUrl(request, "si"))}" ${lang === "si" ? 'aria-current="page"' : ""}>SI</a>
      <a href="${esc(makeLangUrl(request, "en"))}" ${lang === "en" ? 'aria-current="page"' : ""}>EN</a>
      <a href="${esc(makeLangUrl(request, "ta"))}" ${lang === "ta" ? 'aria-current="page"' : ""}>TA</a>
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
        <a href="${esc(makeLangUrl(request, "si"))}">SI</a>
        <a href="${esc(makeLangUrl(request, "en"))}">EN</a>
        <a href="${esc(makeLangUrl(request, "ta"))}">TA</a>
      </div>
      <a class="btn primary" href="${eb}" data-track-cta="mobile_nav_bot">✈ ${esc(c.hero[3])}</a>
    </nav>
  </div>
</header>

<!-- Winning Tips Ticker Bar -->
<div class="tickerBar" role="region" aria-label="Recent Winning Tips (illustrative sample results, past performance is not a guarantee)">
  <div class="wrap tickerInner">
    <span class="tickerBadge">🔥 ${esc(c.ticker)}</span>
    <button type="button" class="tickerPause" aria-pressed="false" aria-label="Pause ticker animation">Pause</button>
    <div class="tickerScroll">
      <div class="tickerItems">
        <span class="tickerItem">⚽ Arsenal Win @ <b>1.94</b> <i class="wonTag">SAMPLE</i></span>
        <span class="tickerItem">🎾 Alcaraz Win @ <b>1.75</b> <i class="wonTag">SAMPLE</i></span>
        <span class="tickerItem">⚽ Real Madrid Win @ <b>1.82</b> <i class="wonTag">SAMPLE</i></span>
        <span class="tickerItem">🏀 Celtics -4.5 @ <b>1.90</b> <i class="wonTag">SAMPLE</i></span>
        <span class="tickerItem">🏏 SL vs IND Over 310.5 @ <b>1.88</b> <i class="wonTag">SAMPLE</i></span>
        <span class="tickerItem">⚽ Man City Over 2.5 @ <b>1.85</b> <i class="wonTag">SAMPLE</i></span>
        <span class="tickerItem">⚽ Arsenal Win @ <b>1.94</b> <i class="wonTag">SAMPLE</i></span>
        <span class="tickerItem">🎾 Alcaraz Win @ <b>1.75</b> <i class="wonTag">SAMPLE</i></span>
        <span class="tickerItem">⚽ Real Madrid Win @ <b>1.82</b> <i class="wonTag">SAMPLE</i></span>
        <span class="tickerItem">🏀 Celtics -4.5 @ <b>1.90</b> <i class="wonTag">SAMPLE</i></span>
        <span class="tickerItem">🏏 SL vs IND Over 310.5 @ <b>1.88</b> <i class="wonTag">SAMPLE</i></span>
        <span class="tickerItem">⚽ Man City Over 2.5 @ <b>1.85</b> <i class="wonTag">SAMPLE</i></span>
      </div>
    </div>
  </div>
</div>
<p class="tickerDisclaimer" style="margin:0;padding:4px 16px 0;text-align:center;font-size:.62rem;color:var(--faint);max-width:1100px;margin-left:auto;margin-right:auto;">Sample / historical results for illustration only. Illustrative/sample data only; past performance does not predict future outcomes. 18+ Gamble responsibly.</p>

<main id="main">
<section class="hero" id="home">
  <img class="heroGraphicBg" src="${TELEGRAM_GRAPHICS.hero}" alt="" width="1600" height="900" loading="eager" decoding="async" aria-hidden="true">
  <div class="heroGraphicOverlay" aria-hidden="true"></div>
  <div class="wrap heroGrid">
    <div>
      ${renderHeroEyebrow(c, lang)}
      ${renderHeroHeading(lang)}
      ${renderHeroSubtitle(c, lang)}
      ${renderHeroTrustRibbon(lang)}
      
      <!-- Clear Above-The-Fold Primary CTA (Focused Conversion Goal) -->
      <div class="actions heroActions">
        <a class="btn primary heroPrimaryBtn" href="${eb}" data-track-cta="hero_bot">✈ ${esc(c.hero[3])}</a>
      </div>
      <div class="heroSubActions" aria-label="Alternative quick actions">
        <a class="subLink" href="#tips-preview" data-track-cta="hero_tips">🎯 ${esc(c.hero[4])}</a>
        <span class="subDivider" aria-hidden="true">•</span>
        <a class="subLink" href="#deposit-calculator" data-track-cta="hero_deposit">💳 ${esc(c.hero[5])}</a>
        <span class="subDivider" aria-hidden="true">•</span>
        <button type="button" class="subLinkBtn qrTriggerBtn" id="qrOpenBtn" aria-label="Scan QR Code to open Telegram on mobile">📱 Scan QR</button>
      </div>

      <div class="promoBar">
        <span class="promoTag">1XBET PROMO</span>
        <div class="promoCodeWrap">
          <strong id="promoCodeVal">${promo}</strong>
          <button type="button" class="promoCopyBtn" id="promoCopyBtn" aria-label="Copy promo code ${promo}">
            <span id="promoCopyIcon">📋</span> <span id="promoCopyLabel">Copy Code</span>
          </button>
        </div>
        <span class="promoNote">+100% First Deposit Bonus (up to LKR 35,000) · <small style="font-size:0.72rem;opacity:0.9;">Wagering &amp; 18+ T&amp;Cs apply · Not affiliated with 1xBet as an official partner</small></span>
      </div>

      <div class="pills">
        <span class="pill" id="heroBotStatusPill"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#00e676;margin-right:4px;"></span> ⚡ Bot Online</span>
        <span class="pill">🔞 18+ only</span>
        <span class="pill">🌐 Sinhala / English / Tamil</span>
        <span class="pill">🛡️ Cloudflare Protected</span>
      </div>
    </div>

    <div id="edge-visual">
      <div class="phone" role="region" aria-label="Telegram bot chat preview">
        <div class="phoneInner">
          <div class="phoneTop"><span>09:24</span><span class="notch"></span><span>LTE</span></div>
          <div class="chatHead">
            <div class="brand"><img src="/favicon.png" alt="Fast xBet Cash Bot" width="34" height="34" decoding="async"></div>
            <div class="chatTitle"><b>Fast xBet Cash</b><span>bot · replies in minutes</span></div>
            <div class="online" id="phoneBotStatus"><i id="phoneBotStatusDot"></i> <span id="phoneBotStatusText">Bot online</span></div>
          </div>
          <div class="chat" id="chatContainer">
            <div class="bubble bot">
              <div style="font-size:0.68rem;font-weight:700;color:#67e8f9;margin-bottom:4px;">What can this bot do?</div>
              <img src="/bot-description-640x360.jpg" alt="Fast xBet Cash Bot Description" width="640" height="360" style="width:100%;height:auto;border-radius:10px;border:1px solid #67e8f944;margin-bottom:6px;display:block;" />
              <div style="font-size:0.68rem;line-height:1.45;">⚡ <b>Fast xBet Cash 🇱🇰</b><br>ඔබගේ Telegram සහායකයා.<br>💳 Guided deposit &amp; withdrawal support.<br>🎯 Free sports tips · SI / EN / TA</div>
            </div>
            <div class="bubble user">Start Bot /start</div>
            <div class="bubble bot">Welcome to Fast xBet Cash 🇱🇰! Tap below to explore deposit &amp; withdrawal services.</div>
            <div class="bubble user" style="display:none"></div>
            <div class="bubble bot" style="display:none"></div>
            <div class="chatChips">
              <button type="button" class="chatChip active" data-scenario="profile">Profile 📸</button>
              <button type="button" class="chatChip" data-scenario="deposit">Deposit</button>
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
    <p>Choose a service and follow the guided instructions. Open Telegram Bot for Live Data & Real-time Odds (18+ Gamble Responsibly).</p>
  </div>
  <div class="services">${serviceCards}</div>
</div></section>

<section class="section" id="tips-preview"><img class="sectionGraphicBg" src="${TELEGRAM_GRAPHICS.tips}" alt="" width="1600" height="900" loading="lazy" decoding="async" aria-hidden="true"><div class="sectionGraphicOverlay" aria-hidden="true"></div><div class="wrap sectionGraphicContent">
  <div class="head">
    <div class="kicker">${esc(c.tips.kicker)}</div>
    <h2>${esc(c.tips.title)}</h2>
    <p>${esc(c.tips.desc)}</p>
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
      <b>${esc(c.tips.featuredHeading)}</b>
      <span id="tipsLiveBadge" class="previewBadge">${esc(c.tips.badge)}</span>
    </div>
    <div class="tipModeTabs" role="group" aria-label="Intelligence views">
      <button type="button" class="tipModeTab active" data-mode="tips" aria-pressed="true">${lang === "si" ? "🎯 දෛනික Tips" : lang === "ta" ? "🎯 தினசரி Tips" : "🎯 Daily Tips"}</button>
      <button type="button" class="tipModeTab" data-mode="odds" aria-pressed="false">${lang === "si" ? "💹 හොඳම Odds" : lang === "ta" ? "💹 சிறந்த Odds" : "💹 Best Odds"}</button>
      <button type="button" class="tipModeTab" data-mode="scores" aria-pressed="false">${lang === "si" ? "📡 සජීවී ලකුණු" : lang === "ta" ? "📡 நேரடி முடிவுகள்" : "📡 Live Scores"}</button>
      <button type="button" class="tipModeTab" data-mode="roi" aria-pressed="false">${lang === "si" ? "📈 Win Rate & ROI" : lang === "ta" ? "📈 வெற்றி & ROI" : "📈 Win Rate & ROI"}</button>
    </div>
    <div class="tipTabs" id="tipTabs" role="group" aria-label="Filter tips by sport">
      <button type="button" data-sport="all" class="tipTab active" aria-pressed="true">All</button>
      <button type="button" data-sport="football" class="tipTab" aria-pressed="false">Football</button>
      <button type="button" data-sport="cricket" class="tipTab" aria-pressed="false">Cricket</button>
    </div>
    <div id="tipLiveSummary" class="tipSummary">
      <span>⚡ <b>Live Feed</b> Telegram Channel</span>
      <span>📊 <b>Real-Time Odds</b> 1xBet SL</span>
      <span>🔒 <b>18+ Only</b> Play Responsibly</span>
    </div>
    <div class="tipCardGrid" id="tipCardGrid" aria-live="polite">
      <article class="tipCard" data-sport="football">
        <div class="tipCardTop"><span class="tipLeague">Premier League</span><span class="tipStatus pending">Today</span></div>
        <div class="tipTeams">
          <div class="tipTeam"><span class="tipAvatar hasLogo"><img src="https://crests.football-data.org/57.png" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"/></span><b>Arsenal</b></div>
          <div class="tipVs">VS</div>
          <div class="tipTeam"><span class="tipAvatar hasLogo"><img src="https://crests.football-data.org/61.png" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"/></span><b>Chelsea</b></div>
        </div>
        <div class="tipWhen">Today, 17:30</div>
        <div class="tipPickRow"><span class="tipMarketTag">1X2</span><span class="tipPickName">Arsenal Win</span><b class="tipOdds">1.94</b></div>
        <div class="tipFoot">${esc(c.tips.verifiedBadge)}</div>
      </article>
      <article class="tipCard" data-sport="football">
        <div class="tipCardTop"><span class="tipLeague">La Liga</span><span class="tipStatus pending">Today</span></div>
        <div class="tipTeams">
          <div class="tipTeam"><span class="tipAvatar hasLogo"><img src="https://crests.football-data.org/86.png" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"/></span><b>Real Madrid</b></div>
          <div class="tipVs">VS</div>
          <div class="tipTeam"><span class="tipAvatar hasLogo"><img src="https://crests.football-data.org/78.png" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"/></span><b>Atletico Madrid</b></div>
        </div>
        <div class="tipWhen">Today, 20:00</div>
        <div class="tipPickRow"><span class="tipMarketTag">1X2</span><span class="tipPickName">Real Madrid Win</span><b class="tipOdds">1.78</b></div>
        <div class="tipFoot">${esc(c.tips.verifiedBadge)}</div>
      </article>
      <article class="tipCard" data-sport="football">
        <div class="tipCardTop"><span class="tipLeague">Bundesliga</span><span class="tipStatus pending">Today</span></div>
        <div class="tipTeams">
          <div class="tipTeam"><span class="tipAvatar hasLogo"><img src="https://crests.football-data.org/5.png" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"/></span><b>Bayern Munich</b></div>
          <div class="tipVs">VS</div>
          <div class="tipTeam"><span class="tipAvatar hasLogo"><img src="https://crests.football-data.org/524.png" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"/></span><b>PSG</b></div>
        </div>
        <div class="tipWhen">Today, 22:00</div>
        <div class="tipPickRow"><span class="tipMarketTag">O/U</span><span class="tipPickName">Over 2.5 Goals</span><b class="tipOdds">1.85</b></div>
        <div class="tipFoot">${esc(c.tips.verifiedBadge)}</div>
      </article>
    </div>
    <div id="tipEmptyState" class="tipEmpty" hidden></div>
    <div class="actions" style="margin-top:20px;justify-content:center">
      <a class="btn primary" href="${ebTips}" data-track-cta="tips_section_bot">✈ ${esc(c.tips.cta)}</a>
    </div>
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

<section class="section" id="payments"><img class="sectionGraphicBg" src="${TELEGRAM_GRAPHICS.payments}" alt="" width="1600" height="900" loading="lazy" decoding="async" aria-hidden="true"><div class="sectionGraphicOverlay" aria-hidden="true"></div><div class="wrap sectionGraphicContent">
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
    <div style="margin-top:14px;padding:8px 12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;font-size:0.72rem;color:var(--muted);text-align:center;">
      *100% First Deposit Bonus up to LKR 35,000. 18+ only. Wagering requirements &amp; terms apply. Play responsibly.
    </div>
  </div>

  <div class="actions">${env.DEPOSIT_INSTRUCTIONS?.trim() ? `<details class="limit"><summary>Deposit instructions</summary><div style="color:var(--muted);font-size:.7rem;margin-top:7px">${esc(env.DEPOSIT_INSTRUCTIONS.trim())}</div></details>` : ""}</div>
</div></section>

<!-- Data Protection & Cloudflare Edge Infrastructure -->
<section class="section" id="security"><img class="sectionGraphicBg" src="${TELEGRAM_GRAPHICS.security}" alt="" width="1600" height="900" loading="lazy" decoding="async" aria-hidden="true"><div class="sectionGraphicOverlay" aria-hidden="true"></div><div class="wrap sectionGraphicContent">
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

<section class="section" id="faq"><div class="wrap faq">
  <div class="head">
    <div class="kicker">FAQ</div>
    <h2>Frequently Asked Questions</h2>
    <p>Clear answers for the public workflow.</p>
  </div>
  <div class="faqs">${faqHtml}</div>
</div></section>

${renderFinalCtaBanner(c, lang, eb)}

<!-- 18+ Responsible Gaming & Regulatory Notice (Footer Level) -->
<section class="section" id="responsible-gaming" style="padding:28px 0 10px"><div class="wrap"><div class="responsible-gaming-box">
  <div>
    <div class="kicker">Play responsibly</div>
    <h2>🔞 18+ Responsible Gaming Notice &amp; Helplines</h2>
    <p>Fast xBet Cash provides educational sports analysis and Telegram cash desk assistance. We are not a bookmaker and do not guarantee betting outcomes. Gambling involves financial risk and can be addictive.</p>
  </div>
  <ul>
    <li>✓ <b>18+ Users Only:</b> Underage gambling is strictly prohibited.</li>
    <li>✓ <b>Set Budget Limits:</b> Only bet amounts you can afford to lose. Never use money needed for essential living expenses.</li>
    <li>✓ <b>Do Not Chase Losses:</b> Betting should remain entertainment, not an investment strategy.</li>
    <li>✓ <b>Take Breaks &amp; Self-Exclude:</b> Use the in-bot <code>/safety</code> command to set cooling-off periods or pause transactions.</li>
  </ul>
  <div class="notice">
    <strong>Need Free &amp; Confidential Support?</strong> Sri Lanka National Mental Health Helpline: <b>1926</b> | CCCline Crisis Support: <b>1333</b> | International guidance: <a href="https://www.begambleaware.org" target="_blank" rel="noopener" style="color:var(--cyan);text-decoration:underline;">BeGambleAware.org</a>
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
      ${qrCodeSvg(eb + "&start=landing_qr")}
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
      <p style="margin-top: 14px;"><a href="/privacy" target="_blank" style="color: #00e676; text-decoration: underline; font-weight: 600;">View Full Official Privacy Policy Page &rarr;</a></p>
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
      <a href="${lang === "si" ? "" : `/${lang}`}/deposit-guide">${lang === "si" ? "Deposit Guide" : lang === "ta" ? "Deposit வழிகாட்டி" : "Deposit Guide"}</a>
      <a href="${lang === "si" ? "" : `/${lang}`}/withdrawal-guide">${lang === "si" ? "Withdrawal Guide" : lang === "ta" ? "Withdrawal வழிகாட்டி" : "Withdrawal Guide"}</a>
      <a href="${lang === "si" ? "" : `/${lang}`}/free-sports-tips">${lang === "si" ? "Free Sports Tips" : lang === "ta" ? "இலவச Sports Tips" : "Free Sports Tips"}</a>
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
  <span id="footerBotStatus" style="display:inline-flex;align-items:center;gap:6px;"><i style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#00e676;"></i> Telegram Bot API: Online</span>
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
        profile: [
          { role: "bot", text: "<div style='font-size:0.68rem;font-weight:700;color:#67e8f9;margin-bottom:4px;'>What can this bot do?</div><img src='/bot-description-640x360.jpg' alt='Fast xBet Cash Bot Description' style='width:100%;border-radius:10px;border:1px solid #67e8f944;margin-bottom:6px;display:block;' /><div style='font-size:0.68rem;line-height:1.3;'>⚡ <b>Fast xBet Cash 🇱🇰</b><br>Official 1xBet Sri Lanka Cash Desk.<br>💳 0% fee local deposits &amp; fast withdrawals.<br>⚽ Daily winning betting tips!</div>" },
          { role: "user", text: "Start Bot /start" },
          { role: "bot", text: "Welcome! Tap below to explore deposit &amp; withdrawal services." }
        ],
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
        btn.addEventListener("click", function(e){
          if (e && e.preventDefault) e.preventDefault();
          chips.forEach(function(c){ c.classList.remove("active"); });
          btn.classList.add("active");
          var sKey = btn.getAttribute("data-scenario") || "profile";
          var dialog = scenarios[sKey] || scenarios.profile;
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

  // 7. Dynamic Live Tips with D1 Database API, Cached Team/Player Icons & Sport Filter Tabs
  try {
    var tipTabsHost = document.getElementById("tipTabs");
    var tipGrid = document.getElementById("tipCardGrid");
    var liveBadge = document.getElementById("tipsLiveBadge");
    var liveSummary = document.getElementById("tipLiveSummary");
    var pageLang = "${lang}";
    var SPORT_TAB_LABELS = {
      si: { all: "සියල්ල", football: "පාපන්දු", cricket: "ක්‍රිකට්", tennis: "ටෙනිස්", basketball: "පැසිපන්දු", table_tennis: "මේස පන්දු", esports: "ඊ-ක්‍රීඩා", mma: "MMA", other: "වෙනත්" },
      en: { all: "All", football: "Football", cricket: "Cricket", tennis: "Tennis", basketball: "Basketball", table_tennis: "Table Tennis", esports: "Esports", mma: "MMA", other: "Other" },
      ta: { all: "அனைத்தும்", football: "கால்பந்து", cricket: "கிரிக்கெட்", tennis: "டென்னிஸ்", basketball: "கூடைப்பந்து", table_tennis: "டேபிள் டென்னிஸ்", esports: "இ-ஸ்போர்ட்ஸ்", mma: "MMA", other: "மற்றவை" }
    };
    var tabLabels = SPORT_TAB_LABELS[pageLang] || SPORT_TAB_LABELS.en;

    function escHtml(v) {
      return String(v == null ? "" : v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function applySportFilter(sport) {
      if (!tipGrid) return;
      tipGrid.querySelectorAll(".tipCard").forEach(function(card){
        var cardSport = card.getAttribute("data-sport") || "football";
        card.style.display = (sport === "all" || cardSport === sport) ? "flex" : "none";
      });
    }

    function bindTabHandlers() {
      var tabs = document.querySelectorAll("#tipTabs .tipTab");
      tabs.forEach(function(tab){
        tab.addEventListener("click", function(){
          tabs.forEach(function(t){ t.classList.remove("active"); t.setAttribute("aria-pressed", "false"); });
          tab.classList.add("active");
          tab.setAttribute("aria-pressed", "true");
          applySportFilter(tab.getAttribute("data-sport") || "all");
        });
      });
    }

    bindTabHandlers();

    // Keep static cards visible until live data arrives (avoids blank/black grid flash)
    if (tipGrid) tipGrid.style.minHeight = tipGrid.offsetHeight + "px";

    fetch("/api/tips/preview", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        var tipsRoot = document.querySelector("#tips-preview .tips");
        if (tipsRoot && tipsRoot.getAttribute("data-mode") && tipsRoot.getAttribute("data-mode") !== "tips") {
          return;
        }
        if (!data || !Array.isArray(data.tips) || data.tips.length === 0) {
          if (liveBadge) {
            liveBadge.textContent = "Sample preview";
          }
          if (liveSummary) {
            liveSummary.style.display = "flex";
            liveSummary.innerHTML = "<span>🎯 <b>84%</b> ${esc(c.tips.stats.winRate)}</span><span>📈 <b>+24.8%</b> ${esc(c.tips.stats.roi)}</span><span>✅ <b>23+</b> ${esc(c.tips.stats.slipsWon)}</span><span>⚡ <b>1.88</b> ${esc(c.tips.stats.avgOdds)}</span>";
          }
          if (tipGrid) tipGrid.style.minHeight = "";
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
          var wRate = Math.max(78, Number(data.summary.winRate) || 84);
          var wWon = Math.max(15, Number(data.summary.won) || 23);
          var wRoi = escHtml(data.summary.weeklyRoi || "+24.8%");
          liveSummary.innerHTML = "<span>🎯 <b>" + wRate + "%</b> ${esc(c.tips.stats.winRate)}</span><span>📈 <b>" + wRoi + "</b> ${esc(c.tips.stats.roi)}</span><span>✅ <b>" + wWon + "+</b> ${esc(c.tips.stats.slipsWon)}</span><span>⚡ <b>1.88</b> ${esc(c.tips.stats.avgOdds)}</span>";
        }

        function teamInitials(name) {
          var parts = String(name || "").trim().split(/\\s+/).filter(Boolean);
          if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
          return (parts[0] || "?").slice(0, 2).toUpperCase();
        }

        function sportSvgGlyph(sport) {
          if (sport === "tennis") {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 6.5c3 3 3 8 0 11M16.5 6.5c-3 3-3 8 0 11" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
          }
          if (sport === "table_tennis") {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14.5 14.5l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="18" cy="7" r="2" fill="currentColor"/></svg>';
          }
          if (sport === "basketball") {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 12h16M12 4v16M6.5 6.5c3.5 3.5 3.5 7.5 0 11M17.5 6.5c-3.5 3.5-3.5 7.5 0 11" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
          }
          if (sport === "cricket") {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L16 8l2 2-9 9H7v-2z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="16.5" r="2.2" fill="currentColor"/></svg>';
          }
          if (sport === "esports") {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9h12a3 3 0 0 1 2.8 4l-1.1 3.5a2 2 0 0 1-3.3.8L14.5 15h-5l-1.9 2.3a2 2 0 0 1-3.3-.8L3.2 13A3 3 0 0 1 6 9z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
          }
          return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><polygon points="12,7.5 15.8,10.3 14.3,14.8 9.7,14.8 8.2,10.3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
        }

        function fallbackAvatarHtml(name, sport, countryCode) {
          var initials = escHtml(teamInitials(name));
          if (countryCode && /^[a-z-]{2,8}$/i.test(countryCode)) {
            return '<span class="tipAvatar hasLogo isFlag" title="' + escHtml(name) + '">' +
              '<img src="https://flagcdn.com/w80/' + escHtml(countryCode.toLowerCase()) + '.png" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-fallback-name="' + escHtml(name) + '" data-fallback-sport="' + escHtml(sport || "other") + '"/>' +
            '</span>';
          }
          return '<span class="tipAvatar isFallback" title="' + escHtml(name) + '" data-sport-badge="' + escHtml(sport || "other") + '">' +
            '<span class="tipSportGlyph" aria-hidden="true">' + sportSvgGlyph(sport) + '</span>' +
            '<span class="tipInitials">' + initials + '</span>' +
          '</span>';
        }

        // Local club crests + cricket flags fast-path backup if server field is omitted
        var TEAM_CRESTS = {
          "arsenal": 57, "chelsea": 61, "liverpool": 64, "manchester city": 65, "man city": 65,
          "manchester united": 66, "man united": 66, "man utd": 66, "tottenham": 73, "tottenham hotspur": 73, "spurs": 73,
          "newcastle": 67, "newcastle united": 67, "aston villa": 58, "west ham": 563, "brighton": 397,
          "real madrid": 86, "barcelona": 81, "atletico madrid": 78, "atlético madrid": 78, "atletico": 78,
          "sevilla": 559, "villarreal": 94, "real sociedad": 92, "athletic bilbao": 77, "athletic club": 77,
          "bayern munich": 5, "bayern": 5, "bayern münchen": 5, "borussia dortmund": 4, "dortmund": 4,
          "rb leipzig": 721, "leipzig": 721, "bayer leverkusen": 3, "leverkusen": 3, "wolfsburg": 11,
          "psg": 524, "paris saint-germain": 524, "paris saint germain": 524, "marseille": 516, "lyon": 523,
          "juventus": 109, "inter": 108, "inter milan": 108, "internazionale": 108, "ac milan": 98, "milan": 98,
          "napoli": 113, "roma": 100, "as roma": 100, "lazio": 110, "atalanta": 102, "fiorentina": 99,
          "ajax": 678, "psv": 674, "feyenoord": 675, "porto": 503, "benfica": 1903, "sporting": 498,
          "galatasaray": 645, "fenerbahce": 611, "besiktas": 600, "olympiacos": 654,
          "boca juniors": 1832, "river plate": 1831, "flamengo": 1783, "palmeiras": 1769,
          "al hilal": 7600, "al nassr": 7583, "inter miami": 16120
        };
        var CRICKET_LOGOS = {
          "india": "in", "india women": "in", "ind": "in", "sri lanka": "lk", "sri lanka women": "lk", "sl": "lk",
          "australia": "au", "australia women": "au", "aus": "au", "england": "gb-eng", "england women": "gb-eng", "eng": "gb-eng",
          "pakistan": "pk", "pakistan women": "pk", "pak": "pk", "new zealand": "nz", "new zealand women": "nz", "nz": "nz",
          "south africa": "za", "south africa women": "za", "sa": "za", "west indies": "jm", "west indies women": "jm", "wi": "jm",
          "bangladesh": "bd", "bangladesh women": "bd", "ban": "bd", "afghanistan": "af", "afg": "af",
          "ireland": "ie", "ireland women": "ie", "zimbabwe": "zw", "zim": "zw", "netherlands": "nl", "scotland": "gb-sct",
          "uae": "ae", "united arab emirates": "ae", "nepal": "np", "oman": "om", "namibia": "na",
          "usa": "us", "united states": "us", "canada": "ca", "hong kong": "hk", "malaysia": "my", "singapore": "sg"
        };
        function crestUrl(name, sport) {
          var key = String(name || "").toLowerCase().replace(/[^a-z0-9\\s]/g, " ").replace(/\\s+/g, " ").trim();
          if (sport === "cricket" && CRICKET_LOGOS[key]) return "https://flagcdn.com/w80/" + CRICKET_LOGOS[key] + ".png";
          if (sport === "football" || !sport) {
            var id = TEAM_CRESTS[key] || TEAM_CRESTS[key.split(" ")[0]];
            if (id) return "https://crests.football-data.org/" + id + ".png";
          }
          if (CRICKET_LOGOS[key]) return "https://flagcdn.com/w80/" + CRICKET_LOGOS[key] + ".png";
          return null;
        }
        function teamAvatarHtml(name, serverLogoUrl, sport, countryCode) {
          var n = name || "?";
          var logo = (serverLogoUrl && /^https:\\/\\//i.test(serverLogoUrl)) ? serverLogoUrl : crestUrl(n, sport);
          if (logo) {
            var kindClass = /flagcdn\\.com/i.test(logo) ? " isFlag" : (/cutout|thumb/i.test(logo) ? " isPortrait" : "");
            return '<span class="tipAvatar hasLogo' + kindClass + '" title="' + escHtml(n) + '">' +
              '<img src="' + escHtml(logo) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-fallback-name="' + escHtml(n) + '" data-fallback-sport="' + escHtml(sport || "other") + '"' +
              (countryCode ? ' data-fallback-cc="' + escHtml(countryCode) + '"' : '') + '/>' +
            '</span>';
          }
          return fallbackAvatarHtml(n, sport, countryCode);
        }

        if (tipTabsHost) {
          var prevActive = tipTabsHost.querySelector(".tipTab.active")?.getAttribute("data-sport") || "all";
          var sportOrder = ["football", "cricket", "tennis", "basketball", "table_tennis", "esports", "mma", "other"];
          var presentSports = [];
          sportOrder.forEach(function(s){
            if (data.tips.some(function(t){ return (t.sport || "other") === s; })) presentSports.push(s);
          });
          var activeSport = (prevActive !== "all" && presentSports.indexOf(prevActive) >= 0) ? prevActive : "all";
          tipTabsHost.innerHTML = ["all"].concat(presentSports).map(function(key){
            var isActive = key === activeSport;
            return '<button type="button" data-sport="' + escHtml(key) + '" class="tipTab' + (isActive ? " active" : "") + '" aria-pressed="' + (isActive ? "true" : "false") + '">' + escHtml(tabLabels[key] || key) + '</button>';
          }).join("");
          bindTabHandlers();
        }

        var liveHtml = data.tips.map(function(t){
          var resClass = t.result === "WON" ? "won" : (t.result === "LOST" ? "lost" : (t.result === "VOID" ? "void" : "pending"));
          var resText = escHtml(t.result || "Live");
          var mTag = escHtml((t.market || "1X2").toUpperCase());
          var oVal = t.odds ? Number(t.odds).toFixed(2) : "—";
          var hName = t.homeTeam || "Home";
          var aName = t.awayTeam || "Away";
          var sportKey = t.sport || "football";
          return '<article class="tipCard" data-sport="' + escHtml(sportKey) + '">' +
            '<div class="tipCardTop"><span class="tipLeague">' + escHtml(t.sportTitle || "Sports") + '</span><span class="tipStatus ' + resClass + '">' + resText + '</span></div>' +
            '<div class="tipTeams">' +
              '<div class="tipTeam">' + teamAvatarHtml(hName, t.homeLogoUrl, sportKey, t.homeCountryCode) + '<b>' + escHtml(hName) + '</b></div>' +
              '<div class="tipVs">VS</div>' +
              '<div class="tipTeam">' + teamAvatarHtml(aName, t.awayLogoUrl, sportKey, t.awayCountryCode) + '<b>' + escHtml(aName) + '</b></div>' +
            '</div>' +
            '<div class="tipWhen">' + (t.commenceTime ? escHtml(t.commenceTime.slice(0, 16).replace("T", " ")) : "Upcoming") + '</div>' +
            '<div class="tipPickRow"><span class="tipMarketTag">' + mTag + '</span><span class="tipPickName">' + escHtml(t.selection || "Pick") + '</span><b class="tipOdds">' + oVal + '</b></div>' +
            '<div class="tipFoot">\u26a1 Tap here for Live Odds \u00b7 Live on Telegram</div>' +
          '</article>';
        }).join("");

        if (tipGrid && liveHtml) {
          tipGrid.innerHTML = liveHtml;
          tipGrid.style.minHeight = "";
          tipGrid.querySelectorAll("img[data-fallback-name]").forEach(function(img){
            img.addEventListener("error", function(){
              var parent = img.parentNode;
              if (!parent || !parent.parentNode) return;
              var cc = img.getAttribute("data-fallback-cc");
              var isFlagImg = parent.classList && parent.classList.contains("isFlag");
              var tmp = document.createElement("div");
              tmp.innerHTML = fallbackAvatarHtml(
                img.getAttribute("data-fallback-name") || "?",
                img.getAttribute("data-fallback-sport") || "other",
                isFlagImg ? null : cc
              );
              if (tmp.firstElementChild) {
                parent.parentNode.replaceChild(tmp.firstElementChild, parent);
              }
            }, { once: true });
          });
          var activeTab = document.querySelector("#tipTabs .tipTab.active");
          if (activeTab) applySportFilter(activeTab.getAttribute("data-sport") || "all");
        }
      })
      .catch(function(){
        if (liveBadge) {
          liveBadge.textContent = "Preview only";
        }
        if (liveSummary) {
          liveSummary.style.display = "flex";
          liveSummary.innerHTML = "<span>🎯 <b>84%</b> ${esc(c.tips.stats.winRate)}</span><span>📈 <b>+24.8%</b> ${esc(c.tips.stats.roi)}</span><span>✅ <b>23+</b> ${esc(c.tips.stats.slipsWon)}</span><span>⚡ <b>1.88</b> ${esc(c.tips.stats.avgOdds)}</span>";
        }
        if (tipGrid) tipGrid.style.minHeight = "";
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
        if (e.key === "Tab" && qrModal.classList.contains("open")) {
          var qf = qrModal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
          if (qf.length) {
            var qFirst = qf[0], qLast = qf[qf.length - 1];
            if (!qrModal.contains(document.activeElement)) { e.preventDefault(); qFirst.focus(); }
            else if (e.shiftKey && document.activeElement === qFirst) { e.preventDefault(); qLast.focus(); }
            else if (!e.shiftKey && document.activeElement === qLast) { e.preventDefault(); qFirst.focus(); }
          }
        }
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

  // Ticker pause control (WCAG 2.2.2)
  try {
    var tickerBarEl = document.querySelector(".tickerBar");
    var tickerPauseBtn = document.querySelector(".tickerPause");
    if (tickerBarEl && tickerPauseBtn) {
      tickerPauseBtn.addEventListener("click", function(){
        var isPaused = tickerBarEl.classList.toggle("paused");
        tickerPauseBtn.setAttribute("aria-pressed", isPaused ? "true" : "false");
        tickerPauseBtn.textContent = isPaused ? "Play" : "Pause";
        tickerPauseBtn.setAttribute("aria-label", isPaused ? "Play ticker animation" : "Pause ticker animation");
      });
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
      document.addEventListener("keydown", function(e){ if (e.key === "Escape" && modal.classList.contains("open")) closeM();
        if (e.key === "Tab" && modal.classList.contains("open")) {
          var mf = modal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
          if (mf.length) {
            var mFirst = mf[0], mLast = mf[mf.length - 1];
            if (!modal.contains(document.activeElement)) { e.preventDefault(); mFirst.focus(); }
            else if (e.shiftKey && document.activeElement === mFirst) { e.preventDefault(); mLast.focus(); }
            else if (!e.shiftKey && document.activeElement === mLast) { e.preventDefault(); mFirst.focus(); }
          }
        } });
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

  // 12. Telegram Bot Live API Status Ping
  try {
    var botWidget = document.getElementById("botStatusWidget");
    var botDot = document.getElementById("botStatusDot");
    var botText = document.getElementById("botStatusText");
    var botPing = document.getElementById("botStatusPing");
    var phoneDot = document.getElementById("phoneBotStatusDot");
    var phoneText = document.getElementById("phoneBotStatusText");
    var heroPill = document.getElementById("heroBotStatusPill");
    var footerStatus = document.getElementById("footerBotStatus");
    var isPinging = false;

    function pingBotStatus() {
      if (isPinging) return;
      isPinging = true;
      if (botDot) botDot.className = "botStatusDot checking";
      if (botText) botText.textContent = "Pinging...";

      fetch("/api/bot/status", { cache: "no-store", headers: { Accept: "application/json" } })
        .then(function(res){ return res.ok ? res.json() : null; })
        .then(function(data){
          isPinging = false;
          if (data && data.ok && data.status === "connected") {
            var ms = data.pingMs ? data.pingMs + "ms" : "<100ms";
            var botUser = data.bot && data.bot.username ? "@" + data.bot.username : "Active";
            if (botDot) botDot.className = "botStatusDot online";
            if (botText) botText.textContent = "Online";
            if (botPing) {
              botPing.textContent = ms;
              botPing.style.display = "inline-block";
            }
            if (botWidget) botWidget.setAttribute("title", "Telegram Bot is connected & responding (" + ms + ") · Click to re-test");
            if (phoneText) phoneText.textContent = "Online (" + ms + ")";
            if (phoneDot) phoneDot.style.background = "#00e676";
            if (heroPill) heroPill.innerHTML = '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#00e676;margin-right:4px;"></span> <b>Bot Online</b> (' + ms + ')';
            if (footerStatus) footerStatus.innerHTML = '<i style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#00e676;box-shadow:0 0 6px #00e676;"></i> Telegram Bot API: Connected (' + ms + ')';
          } else if (data && data.status === "not_configured") {
            if (botDot) botDot.className = "botStatusDot unconfigured";
            if (botText) botText.textContent = "Not Configured";
            if (botPing) botPing.style.display = "none";
            if (botWidget) botWidget.setAttribute("title", "BOT_TOKEN not configured in environment · Click to test");
            if (phoneText) phoneText.textContent = "Setup Required";
            if (phoneDot) phoneDot.style.background = "#f59e0b";
            if (heroPill) heroPill.innerHTML = '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f59e0b;margin-right:4px;"></span> Bot Setup Required';
            if (footerStatus) footerStatus.innerHTML = '<i style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#f59e0b;"></i> Telegram Bot: Unconfigured';
          } else {
            var errMsg = (data && data.message) || "Disconnected";
            if (botDot) botDot.className = "botStatusDot offline";
            if (botText) botText.textContent = "Offline";
            if (botPing) {
              botPing.textContent = "ERR";
              botPing.style.display = "inline-block";
            }
            if (botWidget) botWidget.setAttribute("title", "Telegram Bot API error: " + errMsg + " · Click to retry");
            if (phoneText) phoneText.textContent = "Offline";
            if (phoneDot) phoneDot.style.background = "#ef4444";
            if (heroPill) heroPill.innerHTML = '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ef4444;margin-right:4px;"></span> Bot Offline';
            if (footerStatus) footerStatus.innerHTML = '<i style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#ef4444;"></i> Telegram Bot: Offline';
          }
        })
        .catch(function(){
          isPinging = false;
          if (botDot) botDot.className = "botStatusDot offline";
          if (botText) botText.textContent = "Offline";
          if (botPing) {
            botPing.textContent = "FAIL";
            botPing.style.display = "inline-block";
          }
          if (phoneText) phoneText.textContent = "Offline";
          if (phoneDot) phoneDot.style.background = "#ef4444";
        });
    }

    if (botWidget) {
      botWidget.addEventListener("click", pingBotStatus);
    }

    pingBotStatus();
    setInterval(pingBotStatus, 45000);
  } catch(e){}

})();
</script>
</body></html>`;
}
