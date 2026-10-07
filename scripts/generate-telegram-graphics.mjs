import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const targetDir = "/root/Tele-bot-main/public/assets/telegram";

const graphics = [
  {
    filename: "01-hero-telegram-bot.jpg",
    title: "FAST XBET CASH",
    subtitle: "OFFICIAL TELEGRAM BOT &amp; 24/7 CASHIER",
    accentColor: "#00b4f8",
    secondaryColor: "#a6f800",
    badge: "SRI LANKA'S #1 TELEGRAM COMPANION",
    iconSvg: `
      <!-- Telegram Plane Icon -->
      <path d="M730 470 L715 540 L760 500 Z" fill="#00b4f8" opacity="0.8"/>
      <path d="M680 430 L870 350 L800 580 L740 500 L680 430 Z" fill="url(#gradAccent)" filter="drop-shadow(0 0 25px rgba(0,180,248,0.6))"/>
      <circle cx="800" cy="450" r="140" stroke="#00b4f8" stroke-width="2" stroke-dasharray="10 15" fill="none" opacity="0.4"/>
      <circle cx="800" cy="450" r="180" stroke="#a6f800" stroke-width="1.5" stroke-dasharray="6 20" fill="none" opacity="0.3"/>
    `
  },
  {
    filename: "02-free-tips-sports.jpg",
    title: "FREE SPORTS BETTING TIPS",
    subtitle: "DAILY AI ANALYTICS • HIGH VALUE ODDS • 80%+ WIN RATE",
    accentColor: "#a6f800",
    secondaryColor: "#00b4f8",
    badge: "SOCCER • CRICKET • BASKETBALL • TENNIS",
    iconSvg: `
      <!-- Sports & Chart Icon -->
      <circle cx="800" cy="450" r="120" stroke="#a6f800" stroke-width="3" fill="none" opacity="0.5"/>
      <path d="M720 480 L770 430 L820 460 L880 390" stroke="#a6f800" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="drop-shadow(0 0 15px rgba(166,248,0,0.8))"/>
      <circle cx="880" cy="390" r="10" fill="#a6f800" filter="drop-shadow(0 0 20px #a6f800)"/>
      <rect x="730" y="520" width="140" height="34" rx="17" fill="rgba(166,248,0,0.15)" stroke="#a6f800" stroke-width="1.5"/>
      <text x="800" y="542" fill="#a6f800" font-family="system-ui,sans-serif" font-size="14" font-weight="800" text-anchor="middle" letter-spacing="2">VALUE ODDS 1.85+</text>
    `
  },
  {
    filename: "03-deposit-withdraw.jpg",
    title: "INSTANT LOCAL CASHIER",
    subtitle: "EZ CASH • MCASH • FRIMI • IPAY • COMMERCIAL • BOC • SAMPATH",
    accentColor: "#00e676",
    secondaryColor: "#00b4f8",
    badge: "FAST DEPOSITS &amp; WITHDRAWALS • LKR 1,000 - 500,000",
    iconSvg: `
      <!-- Payment Shield & Currency -->
      <path d="M800 340 L890 380 V470 C890 535 845 585 800 600 C755 585 710 535 710 470 V380 Z" fill="rgba(0,230,118,0.1)" stroke="#00e676" stroke-width="3" filter="drop-shadow(0 0 25px rgba(0,230,118,0.5))"/>
      <text x="800" y="485" fill="#ffffff" font-family="system-ui,sans-serif" font-size="64" font-weight="900" text-anchor="middle">₨</text>
      <circle cx="750" cy="400" r="6" fill="#00b4f8"/>
      <circle cx="850" cy="400" r="6" fill="#00e676"/>
    `
  },
  {
    filename: "04-telegram-bot-ui.jpg",
    title: "TELEGRAM CHAT INTERFACE",
    subtitle: "ONE-CLICK ACTIONS • INSTANT NOTIFICATIONS • 24/7 ACCESSIBLE",
    accentColor: "#38bdf8",
    secondaryColor: "#ff477e",
    badge: "@FAST_1XBETCASH_BOT",
    iconSvg: `
      <!-- Smartphone mockup with chat bubbles -->
      <rect x="710" y="310" width="180" height="300" rx="28" fill="#0f172a" stroke="#38bdf8" stroke-width="3" filter="drop-shadow(0 0 30px rgba(56,189,248,0.4))"/>
      <rect x="735" y="355" width="100" height="26" rx="8" fill="#1e293b"/>
      <rect x="765" y="395" width="105" height="34" rx="10" fill="rgba(56,189,248,0.25)" stroke="#38bdf8" stroke-width="1"/>
      <rect x="735" y="445" width="115" height="34" rx="10" fill="rgba(166,248,0,0.2)" stroke="#a6f800" stroke-width="1"/>
      <rect x="750" y="520" width="100" height="30" rx="15" fill="#38bdf8"/>
      <text x="800" y="540" fill="#070b12" font-family="system-ui,sans-serif" font-size="12" font-weight="800" text-anchor="middle">/START</text>
    `
  },
  {
    filename: "06-security-support.jpg",
    title: "SECURITY &amp; CLOUDFLARE EDGE",
    subtitle: "CLOUDFLARE D1 • R2 SECURED • END-TO-END ENCRYPTED TRANSACTIONS",
    accentColor: "#f59e0b",
    secondaryColor: "#00b4f8",
    badge: "256-BIT ENCRYPTION • 24/7 DEDICATED SUPPORT",
    iconSvg: `
      <!-- Lock & Cloudflare Edge Nodes -->
      <rect x="745" y="430" width="110" height="90" rx="16" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" stroke-width="3" filter="drop-shadow(0 0 25px rgba(245,158,11,0.5))"/>
      <path d="M765 430 V395 C765 375 780 360 800 360 C820 360 835 375 835 395 V430" stroke="#f59e0b" stroke-width="4" fill="none"/>
      <circle cx="800" cy="470" r="8" fill="#f59e0b"/>
      <line x1="800" y1="478" x2="800" y2="496" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
    `
  }
];

function buildSvgTemplate(item) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
      <defs>
        <radialGradient id="gradBg" cx="50%" cy="40%" r="80%">
          <stop offset="0%" stop-color="#0b1728" />
          <stop offset="60%" stop-color="#070b12" />
          <stop offset="100%" stop-color="#04060a" />
        </radialGradient>
        <radialGradient id="gradGlow" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stop-color="${item.accentColor}" stop-opacity="0.25" />
          <stop offset="100%" stop-color="${item.accentColor}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="gradAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${item.accentColor}" />
          <stop offset="100%" stop-color="${item.secondaryColor}" />
        </linearGradient>
        <linearGradient id="gradLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${item.accentColor}" stop-opacity="0" />
          <stop offset="50%" stop-color="${item.accentColor}" stop-opacity="0.8" />
          <stop offset="100%" stop-color="${item.accentColor}" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="1600" height="900" fill="url(#gradBg)"/>

      <!-- Ambient Glow -->
      <circle cx="800" cy="450" r="500" fill="url(#gradGlow)"/>

      <!-- Geometric Grid -->
      <g stroke="#ffffff" stroke-opacity="0.04" stroke-width="1">
        <line x1="0" y1="180" x2="1600" y2="180"/>
        <line x1="0" y1="360" x2="1600" y2="360"/>
        <line x1="0" y1="540" x2="1600" y2="540"/>
        <line x1="0" y1="720" x2="1600" y2="720"/>
        <line x1="320" y1="0" x2="320" y2="900"/>
        <line x1="640" y1="0" x2="640" y2="900"/>
        <line x1="960" y1="0" x2="960" y2="900"/>
        <line x1="1280" y1="0" x2="1280" y2="900"/>
      </g>

      <!-- Central Icon Graphic -->
      <g>
        ${item.iconSvg}
      </g>

      <!-- Badge Pill -->
      <g filter="drop-shadow(0 4px 12px rgba(0,0,0,0.5))">
        <rect x="520" y="160" width="560" height="38" rx="19" fill="#0f172a" stroke="url(#gradAccent)" stroke-width="1.5"/>
        <text x="800" y="184" fill="${item.accentColor}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" text-anchor="middle" letter-spacing="3">${item.badge}</text>
      </g>

      <!-- Decorative Divider -->
      <line x1="400" y1="670" x2="1200" y2="670" stroke="url(#gradLine)" stroke-width="2"/>

      <!-- Headings -->
      <text x="800" y="730" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" text-anchor="middle" letter-spacing="-1">${item.title}</text>
      <text x="800" y="775" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" text-anchor="middle" letter-spacing="2">${item.subtitle}</text>
    </svg>
  `;
}

async function main() {
  await fs.mkdir(targetDir, { recursive: true });

  for (const item of graphics) {
    const svgStr = buildSvgTemplate(item);
    const outputPath = path.join(targetDir, item.filename);

    const jpegBuffer = await sharp(Buffer.from(svgStr))
      .jpeg({
        quality: 82,
        mozjpeg: true,
        chromaSubsampling: "4:2:0"
      })
      .toBuffer();

    await fs.writeFile(outputPath, jpegBuffer);
    console.log(`Generated ${item.filename}: ${jpegBuffer.length} bytes -> ${outputPath}`);
  }
}

main().catch((err) => {
  console.error("Error generating graphics:", err);
  process.exit(1);
});
