import type { Env } from "./types";
import { BRAND_LOGO_SVG_COMPACT, BRAND_LOGO_FAVICON_DATA_URI } from "./brandLogo";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderPrivacyPage(env: Env, request: Request, nonce?: string): string {
  const nonceAttr = nonce ? ` nonce="${escapeHtml(nonce)}"` : "";
  const botUsername = (env.BOT_USERNAME || "@fast_1xbetcash_bot").trim();
  const rawBot = botUsername.startsWith("@") ? botUsername.slice(1) : botUsername;
  const botUrl = env.BOT_USERNAME?.startsWith("https://") ? env.BOT_USERNAME : `https://t.me/${rawBot}`;
  const channelUrl = env.CHANNEL_URL?.trim() || "https://t.me/fast_xbet_official_tips";

  // Build the absolute canonical URL for the Privacy Policy page
  let origin = "https://fast-xbet-cash.pages.dev";
  try {
    const parsed = new URL(request.url);
    if (parsed.origin && parsed.origin !== "null") {
      origin = parsed.origin;
    }
  } catch {
    // fallback
  }
  const privacyUrl = `${origin}/privacy`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy | Fast xBet Cash Telegram Bot 🇱🇰</title>
  <meta name="description" content="Official Privacy Policy and Data Protection guidelines for the Fast xBet Cash Telegram Bot (@${escapeHtml(rawBot)}) and 1xBet Sri Lanka Cash Desk.">
  <meta name="robots" content="index, follow">
  <link rel="icon" type="image/png" href="${BRAND_LOGO_FAVICON_DATA_URI}">
  <link rel="canonical" href="${escapeHtml(privacyUrl)}">

  <!-- OpenGraph Metadata -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="Privacy Policy | Fast xBet Cash Telegram Bot 🇱🇰">
  <meta property="og:description" content="Official Privacy Policy and Data Protection terms for Fast xBet Cash Telegram Bot (@${escapeHtml(rawBot)}).">
  <meta property="og:url" content="${escapeHtml(privacyUrl)}">
  <meta property="og:image" content="${escapeHtml(origin)}/api/og.png">

  <style${nonceAttr}>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    :root {
      --bg: #070b13;
      --card-bg: #0d1522;
      --border: rgba(255, 255, 255, 0.08);
      --accent: #38bdf8;
      --green: #10b981;
      --amber: #f59e0b;
      --red: #ef4444;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
    }
    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: var(--font-family);
      font-size: 15px;
      line-height: 1.65;
      min-height: 100vh;
      padding-bottom: 60px;
    }
    a {
      color: var(--accent);
      text-decoration: none;
      transition: color 0.2s ease;
    }
    a:hover {
      text-decoration: underline;
    }
    .top-nav {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(7, 11, 19, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 12px 20px;
    }
    .nav-container {
      max-width: 960px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .brand-link {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 16px;
      color: #ffffff;
      text-decoration: none;
    }
    .brand-link svg {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
      text-decoration: none;
      white-space: nowrap;
    }
    .btn-primary {
      background: #0284c7;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #0369a1;
      text-decoration: none;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      border-color: rgba(255, 255, 255, 0.12);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      text-decoration: none;
    }
    .btn-copy {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border-color: rgba(16, 185, 129, 0.3);
    }
    .btn-copy:hover {
      background: rgba(16, 185, 129, 0.25);
      text-decoration: none;
    }
    .main-wrap {
      max-width: 960px;
      margin: 32px auto 0;
      padding: 0 20px;
    }
    .botfather-banner {
      background: linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(16, 185, 129, 0.1));
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 28px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .botfather-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .botfather-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 3px 8px;
      border-radius: 4px;
    }
    .url-copy-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #05080f;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 6px 10px 6px 14px;
      overflow: hidden;
    }
    .url-text {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      color: #7dd3fc;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    .header-card {
      margin-bottom: 28px;
      padding: 24px 28px;
      background: radial-gradient(circle at 85% 15%, rgba(56, 189, 248, 0.08) 0%, transparent 60%), linear-gradient(145deg, #0d1624 0%, #08101a 100%);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 16px;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.35);
    }
    .header-title {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.25;
      margin-bottom: 8px;
    }
    .header-meta {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 13px;
      color: var(--text-muted);
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .lang-tabs {
      display: flex;
      gap: 8px;
      margin: 24px 0 20px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
    }
    .lang-tab {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .lang-tab.active {
      background: rgba(56, 189, 248, 0.15);
      border-color: #38bdf8;
      color: #ffffff;
    }
    .policy-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }
    .section-block {
      margin-bottom: 30px;
    }
    .section-block:last-child {
      margin-bottom: 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 8px;
    }
    .section-block p {
      color: #cbd5e1;
      margin-bottom: 12px;
      line-height: 1.7;
    }
    .section-block p:last-child {
      margin-bottom: 0;
    }
    .section-block ul {
      list-style-type: none;
      padding-left: 0;
      margin: 10px 0 16px;
    }
    .section-block ul li {
      position: relative;
      padding-left: 22px;
      margin-bottom: 8px;
      color: #cbd5e1;
      line-height: 1.6;
    }
    .section-block ul li::before {
      content: "•";
      position: absolute;
      left: 6px;
      color: var(--accent);
      font-weight: bold;
    }
    .alert-box {
      border-radius: 8px;
      padding: 14px 18px;
      margin: 16px 0;
      font-size: 14px;
      line-height: 1.6;
    }
    .alert-warning {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: #fbbf24;
    }
    .alert-success {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34d399;
    }
    .alert-info {
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: #7dd3fc;
    }
    .footer-note {
      text-align: center;
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
    }
    @media (max-width: 640px) {
      .policy-card {
        padding: 20px;
      }
      .header-title {
        font-size: 22px;
      }
      .nav-container {
        flex-direction: column;
        align-items: stretch;
      }
      .nav-actions {
        justify-content: flex-start;
      }
      .url-copy-box {
        flex-direction: column;
        align-items: stretch;
      }
    }
  </style>
</head>
<body>
  <!-- Top Navigation -->
  <header class="top-nav">
    <div class="nav-container">
      <a href="/" class="brand-link">
        ${BRAND_LOGO_SVG_COMPACT}
        <span>Fast <span>xBet</span> Cash 🇱🇰</span>
      </a>
      <div class="nav-actions">
        <a href="/" class="btn btn-secondary">🏠 Home</a>
        <a href="${escapeHtml(botUrl)}" target="_blank" rel="noopener" class="btn btn-primary">✈ Open Bot</a>
      </div>
    </div>
  </header>

  <main class="main-wrap">
    <!-- Telegram @BotFather Quick Integration Banner -->
    <div class="botfather-banner" id="botfather-banner">
      <div class="botfather-top">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="botfather-badge">Telegram @BotFather Ready</span>
          <span style="font-size: 13px; font-weight: 600; color: #f1f5f9;">Official Privacy Policy URL for /setprivacy</span>
        </div>
        <span style="font-size: 12px; color: #94a3b8;">Copy &amp; send this link to @BotFather</span>
      </div>
      <div class="url-copy-box">
        <span class="url-text" id="privacy-url-text">${escapeHtml(privacyUrl)}</span>
        <button type="button" id="copy-url-btn" class="btn btn-copy" style="padding: 5px 12px; font-size: 12px;">
          📋 Copy Link
        </button>
      </div>
      <div style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
        💡 <strong>How to set in @BotFather:</strong> Open <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a> on Telegram &rarr; Send <code>/setprivacy</code> &rarr; Select your bot <strong>@${escapeHtml(rawBot)}</strong> &rarr; Paste this public URL. Or send <code>/empty</code> if you wish to use Telegram's standard default template.
      </div>
    </div>

    <!-- Header info -->
    <div class="header-card">
      <h1 class="header-title">Privacy Policy &amp; Data Protection</h1>
      <p style="color: var(--text-muted); font-size: 15px;">
        Fast xBet Cash Telegram Bot (<strong>@${escapeHtml(rawBot)}</strong>) &amp; Sri Lanka Cash Desk.
      </p>
      <div class="header-meta">
        <span>📅 Effective Date: September 2026</span>
        <span>🛡️ GDPR &amp; Telegram Compliant</span>
        <span>🇱🇰 Sri Lanka Operations</span>
        <span style="color: #ef4444; font-weight: 700;">🔞 18+ Only</span>
      </div>

      <!-- Language selector tabs -->
      <div class="lang-tabs" role="tablist">
        <button type="button" class="lang-tab active" id="tab-en" role="tab" aria-selected="true" aria-controls="content-en">
          🇬🇧 English Policy (Full)
        </button>
        <button type="button" class="lang-tab" id="tab-si" role="tab" aria-selected="false" aria-controls="content-si">
          🇱🇰 සිංහල සාරාංශය (Sinhala)
        </button>
      </div>
    </div>

    <!-- English Policy Section -->
    <article class="policy-card" id="content-en" role="tabpanel" aria-labelledby="tab-en">
      <div class="section-block">
        <h2 class="section-title">1. Introduction &amp; Scope</h2>
        <p>
          This Privacy Policy outlines how Fast xBet Cash (operated via the Telegram Bot <strong>@${escapeHtml(rawBot)}</strong> and associated web services) collects, uses, protects, and handles your information. By utilizing our Telegram Bot, Web Cash Desk, or VIP channel previews, you acknowledge and agree to the practices described in this document.
        </p>
        <p>
          We operate strictly as an independent intermediary cash desk and sports preview provider for adult clients in Sri Lanka. We take the privacy and confidentiality of our community with the highest standard of technical and operational diligence.
        </p>
      </div>

      <div class="section-block">
        <h2 class="section-title">2. Information We Collect</h2>
        <p>To provide transactional routing, sports tips, and customer support, we collect minimal operational information:</p>
        <ul>
          <li><strong>Telegram Account Identifier:</strong> Your Telegram User ID, first name, and username (if set). This is required to identify your session, route payment instructions, and communicate status updates.</li>
          <li><strong>1xBet Player Account Number:</strong> Your numerical 1xBet user ID provided during deposit or withdrawal requests to ensure funds are credited or debited to the intended gaming wallet.</li>
          <li><strong>Transaction Metadata:</strong> The requested transaction amount in Sri Lankan Rupees (LKR), chosen payment channel (eZ Cash, mCash, FriMi, Bank Transfer), and user-provided bank account or mobile wallet numbers for withdrawal payouts.</li>
          <li><strong>Payment Confirmation Receipts:</strong> User-uploaded deposit payment slips or transfer screenshots submitted to verify genuine payment before manual balance credit.</li>
          <li><strong>Customer Support Correspondence:</strong> Messages, feedback, or dispute details submitted when opening a support ticket via <code>/support</code>.</li>
        </ul>
      </div>

      <div class="section-block">
        <h2 class="section-title">3. Sensitive Information We NEVER Collect</h2>
        <div class="alert-box alert-warning">
          <strong>⚠️ Zero-Credential Policy:</strong> We never request, capture, or store banking PINs, ATM passwords, online banking credentials, one-time passwords (OTPs), or credit/debit card numbers (CVVs).
        </div>
        <ul>
          <li>We will <strong>NEVER</strong> ask for your personal bank account login password or SMS OTP codes.</li>
          <li>We will <strong>NEVER</strong> ask for your 1xBet account password.</li>
          <li>Any individual claiming to represent Fast xBet Cash who requests your account passwords, OTP codes, or card PINs is fraudulent and should be immediately reported to our administration.</li>
        </ul>
      </div>

      <div class="section-block">
        <h2 class="section-title">4. How We Use Your Information</h2>
        <p>Information gathered is processed exclusively for the following legitimate purposes:</p>
        <ul>
          <li>To verify, approve, and execute 1xBet deposits and withdrawals.</li>
          <li>To transmit automated real-time status alerts (Deposit Approved, Withdrawal Completed, Verification Updates) directly to your Telegram chat.</li>
          <li>To distribute daily consensus betting previews, sports odds, and analytical fixtures.</li>
          <li>To maintain internal auditing, reconcile financial ledgers, and prevent duplicate transfer abuse or fraud.</li>
          <li>To provide 24/7 dedicated dispute resolution and customer assistance.</li>
        </ul>
      </div>

      <div class="section-block">
        <h2 class="section-title">5. Data Storage, Security &amp; Infrastructure</h2>
        <div class="alert-box alert-success">
          <strong>🔒 Cloudflare Edge Architecture:</strong> All user records, financial logs, and transactional receipts are isolated within Cloudflare D1 SQL databases and Cloudflare R2 encrypted object storage.
        </div>
        <p>
          Our services run on Cloudflare Workers edge architecture across isolated regional containers. Transaction receipt images are stored with private access permissions in Cloudflare R2 buckets, safeguarded by cryptographic access tokens. Database records are protected by stringent role-based access control (RBAC), and administrative endpoints require signed HMAC tokens and multi-tier authentication.
        </p>
      </div>

      <div class="section-block">
        <h2 class="section-title">6. Data Retention &amp; Auto-Purging</h2>
        <p>
          We retain transactional history only as long as necessary to ensure accounting accuracy, resolve user disputes, and prevent system fraud.
        </p>
        <ul>
          <li><strong>Transaction Records:</strong> Kept for standard financial reconciliation and dispute investigation purposes.</li>
          <li><strong>Audit &amp; Error Logs:</strong> Ephemeral system execution logs are automatically rotated and purged periodically via our automated cleanup jobs.</li>
          <li><strong>Receipt Images:</strong> Stored securely in private R2 storage and archived only for the duration of the operational audit cycle.</li>
        </ul>
      </div>

      <div class="section-block">
        <h2 class="section-title">7. Third-Party Sharing</h2>
        <p>
          We do not sell, rent, monetize, or trade your personal data with any third-party advertisers or external marketing networks. Data is only communicated through:
        </p>
        <ul>
          <li><strong>Telegram Bot API:</strong> Facilitating end-to-end messaging and bot command handling within the Telegram ecosystem.</li>
          <li><strong>Cloudflare Infrastructure:</strong> Cloud hosting, DNS routing, D1 relational database, and R2 storage services.</li>
          <li><strong>Official 1xBet Agent System:</strong> Submitting verified player account numbers for instant balance crediting or withdrawal verification.</li>
        </ul>
      </div>

      <div class="section-block">
        <h2 class="section-title">8. User Rights &amp; Data Deletion</h2>
        <p>
          Under international data protection standards, you maintain the following rights regarding your personal records:
        </p>
        <ul>
          <li><strong>Right to Cease Interaction:</strong> You may stop using the bot at any time by issuing the <code>/stop</code> command or blocking the bot in Telegram.</li>
          <li><strong>Right to Data Erasure:</strong> You may request the deletion of your user account profile and support history by contacting the administrator via Telegram support.</li>
          <li><strong>Right to Rectification:</strong> If your 1xBet account ID or contact information was erroneously recorded, you may update it at any time via the bot menu or through customer support.</li>
        </ul>
      </div>

      <div class="section-block">
        <h2 class="section-title">9. Age Restriction &amp; Responsible Gaming (18+)</h2>
        <div class="alert-box alert-warning">
          <strong>🔞 Strictly 18+ Only:</strong> All services provided by Fast xBet Cash are strictly intended for individuals who are at least eighteen (18) years of age or the legal age of majority in their jurisdiction.
        </div>
        <p>
          We do not knowingly collect data from or conduct business with minors. If we discover that a user under 18 years of age has registered or initiated transactions, their account will be terminated immediately and all associated records permanently purged.
        </p>
      </div>

      <div class="section-block">
        <h2 class="section-title">10. Contact &amp; Grievance Redressal</h2>
        <p>For any privacy inquiries, data deletion requests, or technical concerns, please contact our team:</p>
        <ul>
          <li><strong>Official Telegram Bot:</strong> <a href="${escapeHtml(botUrl)}" target="_blank" rel="noopener">@${escapeHtml(rawBot)}</a> (Support Menu: <code>/support</code>)</li>
          <li><strong>Official Tips Channel:</strong> <a href="${escapeHtml(channelUrl)}" target="_blank" rel="noopener">${escapeHtml(channelUrl)}</a></li>
          <li><strong>Web Cash Desk:</strong> <a href="${escapeHtml(origin)}">${escapeHtml(origin)}</a></li>
        </ul>
      </div>
    </article>

    <!-- Sinhala Policy Section -->
    <article class="policy-card" id="content-si" role="tabpanel" aria-labelledby="tab-si" style="display: none;">
      <div class="section-block">
        <h2 class="section-title">1. හැඳින්වීම සහ අරමුණ</h2>
        <p>
          Fast xBet Cash (<strong>@${escapeHtml(rawBot)}</strong> ටෙලිග්‍රෑම් බොට්) සේවාව භාවිතා කරන සියලුම ශ්‍රී ලාංකික පරිශීලකයින්ගේ පෞද්ගලික දත්ත සහ රහස්‍යභාවය සුරැකීම අපගේ ප්‍රමුඛතම වගකීම වේ. මෙම ප්‍රතිපත්තිය මඟින් අප රැස්කරන දත්ත, ඒවා ආරක්ෂා කරන ආකාරය සහ ඔබේ අයිතිවාසිකම් විස්තර කෙරේ.
        </p>
      </div>

      <div class="section-block">
        <h2 class="section-title">2. අප රැස් කරන තොරතුරු</h2>
        <p>ඔබගේ ගනුදෙනු නිවැරදිව හා ආරක්ෂිතව සිදු කිරීම සඳහා පමණක් පහත මූලික තොරතුරු භාවිත වේ:</p>
        <ul>
          <li><strong>ටෙලිග්‍රෑම් ගිණුම් විස්තර:</strong> ඔබගේ Telegram User ID, Username සහ First Name (ගනුදෙනු නිවැරදිව හඳුනා ගැනීමට).</li>
          <li><strong>1xBet ගිණුම් අංකය (Account ID):</strong> ඔබගේ තැන්පතු හෝ මුදල් ලබාගැනීම් (Withdrawals) බැර කිරීම සඳහා පමණි.</li>
          <li><strong>ගනුදෙනු මුදල සහ ක්‍රමය:</strong> තැන්පත්/ආපසු ගන්නා LKR මුදල සහ තෝරාගත් ගෙවීම් ක්‍රමය (eZ Cash, mCash, FriMi, Bank Transfer).</li>
          <li><strong>තැන්පතු රිසිට්පත්:</strong> තැන්පතු තහවුරු කිරීම සඳහා ඔබ විසින් Bot වෙත ඉදිරිපත් කරන ගෙවීම් ස්ලිප්පත් හෝ Screenshots.</li>
        </ul>
      </div>

      <div class="section-block">
        <h2 class="section-title">3. අප කිසි විටෙකත් ඉල්ලා නොසිටින සංවේදී දත්ත</h2>
        <div class="alert-box alert-warning">
          <strong>⚠️ දැඩි අවවාදයයි:</strong> ඔබගේ කිසිදු බැංකු මුරපදයක් (Passwords), Online Banking PIN, OTP කේත හෝ Debit/Credit Card CVV අංක අප කිසි විටෙකත් ඉල්ලා නොසිටිමු.
        </div>
        <p>
          Fast xBet Cash නියෝජිතයෙකු ලෙස පෙනී සිටිමින් කිසිවෙකු ඔබගේ බැංකු OTP හෝ Password ඉල්ලා සිටියහොත් එය වංචනික ක්‍රියාවකි. කිසිදු හේතුවක් මත එවැනි රහස්‍ය තොරතුරු කිසිවෙකුට ලබා නොදෙන්න.
        </p>
      </div>

      <div class="section-block">
        <h2 class="section-title">4. දත්ත ආරක්ෂාව සහ තාක්ෂණය</h2>
        <div class="alert-box alert-success">
          <strong>🔒 Cloudflare ආරක්ෂිත පද්ධතිය:</strong> අපගේ දත්ත ගබඩා කර ඇත්තේ Cloudflare D1 ආරක්ෂිත දත්ත පද්ධතිය සහ Cloudflare R2 අධිආරක්ෂිත ගබඩාව තුළය.
        </div>
        <p>
          සියලුම ගනුදෙනු ස්ලිප්පත් සහ දත්ත බාහිර අනවසර පුද්ගලයින්ට ලබාගත නොහැකි වන පරිදි සංකේතනය (Encrypted) කර ඇති අතර, නියමිත කාල සීමාවෙන් පසු පැරණි Audit Logs ස්වයංක්‍රීයව පද්ධතියෙන් ඉවත් කරනු ලැබේ.
        </p>
      </div>

      <div class="section-block">
        <h2 class="section-title">5. වයස් සීමාව සහ වගකීම (18+)</h2>
        <div class="alert-box alert-warning">
          <strong>🔞 වයස අවුරුදු 18ට වැඩි පුද්ගලයින්ට පමණි:</strong> අපගේ සේවාව දැඩි ලෙස වයස අවුරුදු 18 සම්පූර්ණ වූ පුද්ගලයින් සඳහා පමණක් සීමා වේ. වයස 18ට අඩු අයෙකුගේ ගිණුමක් හඳුනාගතහොත් එම ගිණුම වහාම අත්හිටුවනු ලැබේ.
        </div>
      </div>

      <div class="section-block">
        <h2 class="section-title">6. සම්බන්ධ කරගැනීම</h2>
        <p>ඔබගේ දත්ත ඉවත් කිරීමට හෝ වෙනත් ඕනෑම ගැටලුවක් සඳහා අපගේ නිල Telegram Bot හෝ Support Desk අමතන්න:</p>
        <ul>
          <li><strong>Telegram Bot:</strong> <a href="${escapeHtml(botUrl)}" target="_blank" rel="noopener">@${escapeHtml(rawBot)}</a></li>
          <li><strong>Tips Channel:</strong> <a href="${escapeHtml(channelUrl)}" target="_blank" rel="noopener">${escapeHtml(channelUrl)}</a></li>
        </ul>
      </div>
    </article>

    <div class="footer-note">
      <p>© ${new Date().getFullYear()} Fast xBet Cash 🇱🇰 | Official Telegram Bot Cash Desk &amp; Sports Previews.</p>
      <p style="margin-top: 4px; font-size: 12px;">All rights reserved. Strictly 18+ only. Gamble responsibly.</p>
    </div>
  </main>

  <script${nonceAttr}>
    (function() {
      // Copy URL Button Handler
      var copyBtn = document.getElementById("copy-url-btn");
      var urlText = document.getElementById("privacy-url-text");
      if (copyBtn && urlText) {
        copyBtn.addEventListener("click", function() {
          var textToCopy = urlText.textContent || window.location.href;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).then(function() {
              copyBtn.textContent = "✓ Link Copied!";
              copyBtn.style.background = "rgba(16, 185, 129, 0.35)";
              setTimeout(function() {
                copyBtn.textContent = "📋 Copy Link";
                copyBtn.style.background = "";
              }, 2500);
            }).catch(function() {
              fallbackCopy(textToCopy);
            });
          } else {
            fallbackCopy(textToCopy);
          }
        });
      }

      function fallbackCopy(text) {
        var textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          if (copyBtn) {
            copyBtn.textContent = "✓ Link Copied!";
            setTimeout(function() { copyBtn.textContent = "📋 Copy Link"; }, 2500);
          }
        } catch(e) {
          alert("Copy failed. Please copy manually: " + text);
        }
        document.body.removeChild(textArea);
      }

      // Language Switcher Tabs
      var tabEn = document.getElementById("tab-en");
      var tabSi = document.getElementById("tab-si");
      var contentEn = document.getElementById("content-en");
      var contentSi = document.getElementById("content-si");

      if (tabEn && tabSi && contentEn && contentSi) {
        tabEn.addEventListener("click", function() {
          tabEn.classList.add("active");
          tabEn.setAttribute("aria-selected", "true");
          tabSi.classList.remove("active");
          tabSi.setAttribute("aria-selected", "false");
          contentEn.style.display = "block";
          contentSi.style.display = "none";
        });

        tabSi.addEventListener("click", function() {
          tabSi.classList.add("active");
          tabSi.setAttribute("aria-selected", "true");
          tabEn.classList.remove("active");
          tabEn.setAttribute("aria-selected", "false");
          contentEn.style.display = "none";
          contentSi.style.display = "block";
        });
      }
    })();
  </script>
</body>
</html>`;
}
