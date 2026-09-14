import type { Env } from "./types";

// GitHub URL removed as requested
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

  // Fixed variable name 'colo' and type assertion
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

  // Removed GITHUB_URL from sameAs
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

  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="si">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fast xBet Cash - Sri Lanka's #1 Telegram Betting Agent</title>
    <meta name="description" content="Fastest Deposit & Withdraw service for 1xBet in Sri Lanka. Free daily betting tips, 24/7 support via Telegram. Sinhala, English, Tamil supported.">
    <meta name="keywords" content="1xBet Sri Lanka, xBet cash agent, deposit 1xBet ez cash, withdraw 1xBet mcash, free betting tips sinhala">
    <meta property="og:title" content="Fast xBet Cash - Instant Deposits & Free Tips">
    <meta property="og:description" content="Join thousands of users getting instant deposits, withdrawals, and free daily tips via our Telegram Bot.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${pageUrlAttr}">
    <link rel="canonical" href="${pageUrlAttr}">
    <script type="application/ld+json">${jsonLd}</script>
    <style>
        :root {
            --primary: #0088cc; /* Telegram Blue */
            --secondary: #1a1a1a;
            --accent: #00c853; /* Green for money/success */
            --bg: #f5f7fa;
            --text: #333;
            --card-bg: #ffffff;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: var(--text);
            background-color: var(--bg);
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
        }
        header {
            background: linear-gradient(135deg, #0088cc 0%, #005f8f 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
            border-radius: 0 0 20px 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        h1 { margin: 0; font-size: 2.5rem; }
        h2 { color: var(--secondary); border-bottom: 2px solid var(--primary); display: inline-block; padding-bottom: 5px; margin-top: 40px; }
        h3 { color: var(--primary); }
        
        .btn {
            display: inline-block;
            background-color: var(--accent);
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            transition: transform 0.2s, box-shadow 0.2s;
            margin: 10px;
            border: none;
            cursor: pointer;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,200,83,0.4);
        }
        .btn-secondary {
            background-color: white;
            color: var(--primary);
            border: 2px solid var(--primary);
        }
        
        .status-bar {
            background: #e3f2fd;
            color: #0d47a1;
            padding: 10px;
            text-align: center;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 0.9rem;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .card {
            background: var(--card-bg);
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            transition: transform 0.2s;
        }
        .card:hover { transform: translateY(-5px); }
        
        .step-list { list-style: none; padding: 0; }
        .step-list li {
            position: relative;
            padding-left: 40px;
            margin-bottom: 15px;
        }
        .step-list li::before {
            content: counter(step-counter);
            counter-increment: step-counter;
            position: absolute;
            left: 0;
            top: 0;
            width: 30px;
            height: 30px;
            background: var(--primary);
            color: white;
            border-radius: 50%;
            text-align: center;
            line-height: 30px;
            font-weight: bold;
        }
        .step-list { counter-reset: step-counter; }

        .promo-box {
            background: #fff3e0;
            border: 2px dashed #ff9800;
            padding: 20px;
            text-align: center;
            border-radius: 10px;
            margin: 20px 0;
        }
        .code-display {
            font-family: monospace;
            font-size: 1.5rem;
            background: white;
            padding: 10px 20px;
            border-radius: 5px;
            border: 1px solid #ddd;
            margin: 10px 0;
            display: inline-block;
            cursor: pointer;
        }

        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; color: var(--secondary); }

        footer {
            text-align: center;
            padding: 40px 20px;
            color: #666;
            font-size: 0.9rem;
            border-top: 1px solid #eee;
            margin-top: 50px;
        }
        
        .lang-switch { float: right; font-size: 0.9rem; }
        .lang-switch a { color: white; text-decoration: none; margin-left: 10px; opacity: 0.8; }
        .lang-switch a:hover { opacity: 1; text-decoration: underline; }

        @media (max-width: 600px) {
            h1 { font-size: 1.8rem; }
            .grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>

<header>
    <div class="container">
        <div class="lang-switch">
            <a href="#">සිං</a> | <a href="#">EN</a> | <a href="#">த</a>
        </div>
        <h1>⚡ Fast xBet Cash</h1>
        <p>ශ්‍රී ලංකාවේ වේගවත්ම Telegram Cash Agent සහ Free Betting Tips සේවාව</p>
        <div style="margin-top: 20px;">
            <a href="${bot}" class="btn">🚀 Bot එක පටන් ගන්න</a>
            <a href="${channel}" class="btn btn-secondary">📢 Tips Channel</a>
        </div>
    </div>
</header>

<div class="container">
    
    <div class="status-bar">
        🟢 System Status: Online | Telegram Bot Active | Edge Server: ${colo}
    </div>

    <section id="features">
        <div class="grid">
            <div class="card">
                <h3>💰 වේගවත් Deposit</h3>
                <p>eZ Cash, mCash හෝ Bank Transfer මගින් මුදල් ගෙවා රිසිට්පත යවන්න. මිනිත්තු 5ක් ඇතුළත ගිණුමට බැර වේ.</p>
            </div>
            <div class="card">
                <h3>💸 ආරක්ෂිත Withdraw</h3>
                <p>ඔබේ දිනුම් ඉක්මනින් ලබාගන්න. අපගේ automated system එක මගින් ආරක්ෂිත ගෙවීම් සිදුකෙරේ.</p>
            </div>
            <div class="card">
                <h3>🎯 Free Daily Tips</h3>
                <p>දිනකට 3 වතාවක් (උදේ, දහවල්, සවස) EPL, NBA සහ Tennis සඳහා නිදහස් උපදෙස්.</p>
            </div>
        </div>
    </section>

    <section id="how-it-works">
        <h2>භාවිතා කරන්නේ කෙසේද?</h2>
        <div class="grid">
            <div class="card">
                <h3>💰 Deposit පියවර</h3>
                <ol class="step-list">
                    <li><strong>Bot එක ආරම්භ කරන්න:</strong> <a href="${bot}">Telegram Bot</a> වෙත ගොස් /deposit command එක ලබාදී ඔබේ Player ID ඇතුළත් කරන්න.</li>
                    <li><strong>මුදල් ගෙවා Receipt එක එවන්න:</strong> eZ Cash, mCash හෝ Bank Transfer මගින් ගෙවා රිසිට්පතේ ඡායාරූපය bot වෙත upload කරන්න.</li>
                    <li><strong>මිනිත්තු 5න් ගිණුමට:</strong> Admin විසින් තහවුරු කළ වහාම ඔබේ xBet ගිණුමට මුදල් ක්ෂණිකව බැර වේ.</li>
                </ol>
            </div>
            <div class="card">
                <h3>💸 Withdraw පියවර</h3>
                <ol class="step-list">
                    <li><strong>/withdraw ආරම්භ කරන්න:</strong> Bot එකේ /withdraw command එක භාවිතා කර Player ID සහ මුදල් ප්‍රමාණය ඇතුළත් කරන්න.</li>
                    <li><strong>ගෙවීම් විස්තර ලබාදෙන්න:</strong> ඔබේ Bank / eZ Cash / mCash විස්තර ලබාදෙන්න.</li>
                    <li><strong>මුදල් ලැබේ:</strong> තහවුරු වූ පසු ඉක්මනින් ඔබේ ගිණුමට මුදල් මාරු වේ.</li>
                </ol>
            </div>
        </div>
    </section>

    <section id="limits">
        <h2>ගනුදෙනු සීමා & වේලාවන්</h2>
        <table>
            <tr>
                <th>විස්තරය</th>
                <th>අගය</th>
            </tr>
            <tr>
                <td>අවම ගනුදෙනුව</td>
                <td>LKR ${minAmount}</td>
            </tr>
            <tr>
                <td>උපරිම ගනුදෙනුව</td>
                <td>LKR ${maxAmount}</td>
            </tr>
            <tr>
                <td>සාමාන්‍ය සැකසුම් කාලය</td>
                <td>2–5 මිනිත්තු</td>
            </tr>
            <tr>
                <td>සේවා ගාස්තු</td>
                <td>0% (ගාස්තු රහිත)</td>
            </tr>
        </table>
    </section>

    <section id="promo">
        <h2>xBet Promo Code</h2>
        <div class="promo-box">
            <p>නව ගිණුම් සඳහා විශේෂ බෝනස් කෝඩ් එක</p>
            <div class="code-display" onclick="copyToClipboard('${code}')" title="Click to Copy">${code}</div>
            <br>
            <small>Click code to copy</small>
            <br><br>
            <a href="${xbet}" target="_blank" rel="noopener noreferrer" class="btn">🎯 xBet වෙත යන්න</a>
        </div>
    </section>

    <section id="commands">
        <h2>Bot Commands</h2>
        <p>Telegram Bot එකේ භාවිතා කළ හැකි ප්‍රධාන commands:</p>
        <ul>
            <li><code>/start</code> - Bot එක ආරම්භ කරන්න</li>
            <li><code>/deposit</code> - Deposit ආරම්භ කරන්න</li>
            <li><code>/withdraw</code> - Withdrawal request එකක් යවන්න</li>
            <li><code>/history</code> - ගනුදෙනු ඉතිහාසය බලන්න</li>
            <li><code>/tips</code> - දිනකට 3 වතාවක් free tips ලබාගන්න</li>
            <li><code>/language</code> - භාෂාව වෙනස් කරන්න (සිං/EN/த)</li>
        </ul>
    </section>

    <section id="security">
        <h2>ආරක්ෂාව & විශ්වාසය</h2>
        <div class="grid">
            <div class="card">
                <h4>🔐 Webhook Protection</h4>
                <p>Fail-closed secret validation සහ request size checks මගින් ආරක්ෂාව තහවුරු කරයි.</p>
            </div>
            <div class="card">
                <h4>🚫 Duplicate Guard</h4>
                <p>එකම receipt එකක් දෙවරක් භාවිතා කිරීම වැළැක්වීමේ පද්ධතිය.</p>
            </div>
            <div class="card">
                <h4>📦 R2 Receipt Backup</h4>
                <p>සියලුම ගනුදෙනු සාක්ෂි Cloudflare R2 හි ආරක්ෂිතව ගබඩා වේ.</p>
            </div>
        </div>
    </section>

    <section id="faq">
        <h2>නිතර අසන ප්‍රශ්න (FAQ)</h2>
        <details>
            <summary><strong>Deposit කරන්නේ කෙසේද?</strong></summary>
            <p>Bot එක විවෘත කර /deposit භාවිතා කරන්න. Player ID ඇතුළත් කර, මුදල් ගෙවා receipt ඡායාරූපය upload කරන්න.</p>
        </details>
        <details>
            <summary><strong>Withdraw කොපමණ කාලයක් ගතවේද?</strong></summary>
            <p>සාමාන්‍යයෙන් මිනිත්තු 2–5ක් ඇතුළත. ඉහළ මුදල් හෝ verification අවශ්‍ය විට තවත් කාලයක් ගතවිය හැක.</p>
        </details>
        <details>
            <summary><strong>මෙය නිල 1xBet අඩවියක් ද?</strong></summary>
            <p>නැත, මෙය ස්වාධීන cash agent සහ free tips සේවාවකි. අපි 1xBet හි නිල නියෝජිතයින් නොවේ.</p>
        </details>
    </section>

    <div style="text-align: center; margin-top: 50px;">
        <h2>දැන්ම ආරම්භ කරන්න</h2>
        <a href="${bot}" class="btn" style="font-size: 1.2rem; padding: 15px 40px;">🚀 Telegram Bot එක විවෘත කරන්න</a>
    </div>

</div>

<footer>
    <p>© ${currentYear} Fast xBet Cash · Built on Cloudflare Workers</p>
    <p><small>මෙය නිල xBet වෙබ් අඩවියක් නොවේ. මෙය ස්වාධීන cash agent සහ free tips සේවාවකි.<br>
    Betting හි අවදානම් අඩංගු වේ. වයස 18+ පමණි. වගකීමෙන් ක්‍රීඩා කරන්න.</small></p>
</footer>

<script>
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(function() {
            alert('Promo Code copied: ' + text);
        }, function(err) {
            console.error('Could not copy text: ', err);
        });
    }
</script>

</body>
</html>`;
}
