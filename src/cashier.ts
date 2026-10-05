import { InlineKeyboard } from "grammy";
import type { Env } from "./types";
import type { Language, PaymentMethod } from "./i18n";
import { escapeMarkdown, escapeCode } from "./utils";

/**
 * 1xBet Affiliate SubID tracking generator.
 * Attaches or updates dynamic subid parameter for campaign & conversion analytics.
 */
export function getXBetAffiliateLink(rawLink?: string, subId: string = "tele_bot_main"): string {
  const base = rawLink?.trim() || "https://reffpa.com/L?tag=d_2481353m_1622c_&site=2481353&ad=1622";
  try {
    const url = new URL(base);
    url.searchParams.set("subid", subId);
    return url.toString();
  } catch {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}subid=${encodeURIComponent(subId)}`;
  }
}

/**
 * Anti-Money Laundering (AML) & Central Bank of Sri Lanka compliance warning.
 * Strictly prohibits gambling keywords in bank transfer remarks to protect user accounts.
 */
export const SRI_LANKA_AML_BANK_WARNING = {
  si: "⚠️ *වැදගත් (AML ආරක්ෂණ උපදෙස්):*\n*බැංකු Transfer එකේ Remark / Reference එකට '1xBet', 'Bet', හෝ 'Game' වැනි කිසිදු වචනයක් ලිවීමෙන් වළකින්න. 'Personal' හෝ හිස්ව තබන්න. (Account freeze වීම් වැළැක්වීමට).*",
  en: "⚠️ *CRITICAL NOTICE FOR SRI LANKAN BANK TRANSFERS:*\n*Strictly PROHIBIT writing words like '1xBet', 'Bet', or 'Game' in the transfer Remark / Reference. Leave it blank or write 'Personal' to prevent bank account restrictions or freezing.*",
  ta: "⚠️ *முக்கிய எச்சரிக்கை (AML பாதுகாப்பு):*\n*வங்கி பரிமாற்றத்தின் குறிப்பில் (Remark / Reference) '1xBet', 'Bet', அல்லது 'Game' போன்ற சொற்களை எழுதுவதைத் தவிர்க்கவும். 'Personal' என எழுதவும் அல்லது காலியாக விடவும் (கணக்கு முடக்கப்படுவதைத் தடுக்க).*",
};

export interface SriLankanPaymentOption {
  code: string;
  name: Record<Language, string>;
  category: "BANK" | "MOBILE" | "CRYPTO";
  icon: string;
}

export const SRI_LANKAN_PAYMENT_METHODS: SriLankanPaymentOption[] = [
  {
    code: "COMMERCIAL",
    category: "BANK",
    icon: "🏦",
    name: {
      si: "Commercial Bank (කොමර්ෂල්)",
      en: "Commercial Bank of Ceylon",
      ta: "Commercial Bank",
    },
  },
  {
    code: "SAMPATH",
    category: "BANK",
    icon: "🏦",
    name: {
      si: "Sampath Bank (සම්පත්)",
      en: "Sampath Bank",
      ta: "Sampath Bank",
    },
  },
  {
    code: "HNB",
    category: "BANK",
    icon: "🏦",
    name: {
      si: "Hatton National Bank (HNB)",
      en: "Hatton National Bank (HNB)",
      ta: "HNB Bank",
    },
  },
  {
    code: "BOC",
    category: "BANK",
    icon: "🏦",
    name: {
      si: "Bank of Ceylon (BOC)",
      en: "Bank of Ceylon (BOC)",
      ta: "BOC Bank",
    },
  },
  {
    code: "PEOPLES",
    category: "BANK",
    icon: "🏦",
    name: {
      si: "People's Bank (මහජන බැංකුව)",
      en: "People's Bank",
      ta: "People's Bank",
    },
  },
  {
    code: "EZCASH",
    category: "MOBILE",
    icon: "📱",
    name: {
      si: "eZ Cash (Dialog)",
      en: "eZ Cash (Dialog)",
      ta: "eZ Cash (Dialog)",
    },
  },
  {
    code: "MCASH",
    category: "MOBILE",
    icon: "📱",
    name: {
      si: "mCash (Mobitel)",
      en: "mCash (Mobitel)",
      ta: "mCash (Mobitel)",
    },
  },
  {
    code: "BINANCE_PAY",
    category: "CRYPTO",
    icon: "🪙",
    name: {
      si: "Binance Pay (0% Fee)",
      en: "Binance Pay (0% Fee)",
      ta: "Binance Pay",
    },
  },
  {
    code: "USDT_TRC20",
    category: "CRYPTO",
    icon: "🪙",
    name: {
      si: "USDT (TRC20)",
      en: "USDT (TRC20 Network)",
      ta: "USDT (TRC20)",
    },
  },
  {
    code: "USDT_BEP20",
    category: "CRYPTO",
    icon: "🪙",
    name: {
      si: "USDT (BEP20 / BSC)",
      en: "USDT (BEP20 / BSC)",
      ta: "USDT (BEP20)",
    },
  },
];

/**
 * Builds a mobile-friendly payment method selection keyboard grouped by category.
 */
export function buildCashierMethodKeyboard(prefix: "pay_dep" | "pay_wd", lang: Language = "si"): InlineKeyboard {
  const kb = new InlineKeyboard();

  // 1. Local Banks
  kb.text(`🏦 Commercial Bank`, `${prefix}:COMMERCIAL`)
    .text(`🏦 Sampath Bank`, `${prefix}:SAMPATH`)
    .row();
  kb.text(`🏦 HNB Bank`, `${prefix}:HNB`)
    .text(`🏦 BOC Bank`, `${prefix}:BOC`)
    .row();
  kb.text(`🏦 People's Bank`, `${prefix}:PEOPLES`).row();

  // 2. Mobile Wallets
  kb.text(`📱 eZ Cash (Dialog)`, `${prefix}:EZCASH`)
    .text(`📱 mCash (Mobitel)`, `${prefix}:MCASH`)
    .row();

  // 3. Crypto Options
  kb.text(`🪙 Binance Pay`, `${prefix}:BINANCE_PAY`).row();
  kb.text(`🪙 USDT (TRC20)`, `${prefix}:USDT_TRC20`)
    .text(`🪙 USDT (BEP20)`, `${prefix}:USDT_BEP20`)
    .row();

  // Navigation
  kb.text(lang === "en" ? "⬅️ Back to Main Menu" : lang === "ta" ? "⬅️ பிரதான மெனு" : "⬅️ ප්‍රධාන මෙනුව", "back");
  return kb;
}

/**
 * Dynamically resolves account details for a selected payment method and formats
 * with copyable backticks and mandatory Sri Lanka AML warnings.
 */
export function getPaymentMethodAccountDetails(method: string, env: Env, lang: Language = "si"): string {
  const m = String(method).toUpperCase();
  const isBank = ["COMMERCIAL", "SAMPATH", "HNB", "BOC", "PEOPLES", "LOLC", "BANK"].includes(m);
  const amlNotice = isBank ? `\n\n${SRI_LANKA_AML_BANK_WARNING[lang] || SRI_LANKA_AML_BANK_WARNING.si}` : "";

  const bankDetailsMap: Record<string, string | undefined> = {
    COMMERCIAL: env.COMMERCIAL_DETAILS,
    SAMPATH: env.SAMPATH_DETAILS,
    HNB: env.HNB_DETAILS,
    BOC: env.BOC_DETAILS,
    PEOPLES: env.PEOPLES_DETAILS,
    LOLC: env.LOLC_DETAILS,
    BANK: env.BANK_DETAILS,
  };

  if (isBank) {
    const configuredDetails = (bankDetailsMap[m] || env.BANK_DETAILS)?.trim();
    if (!configuredDetails) {
      if (lang === "en") return "🏦 *Bank Transfer:*\nThis payment method is temporarily unavailable." + amlNotice;
      if (lang === "ta") return "🏦 *வங்கி பரிமாற்றம்:*\nஇந்த கட்டண முறை தற்காலிகமாக கிடைக்கவில்லை." + amlNotice;
      return "🏦 *බැංකු තැන්පතු:*\nමෙම ගෙවීම් ක්‍රමය තාවකාලිකව ලබා ගත නොහැක." + amlNotice;
    }

    const bankTitles: Record<string, Record<Language, string>> = {
      COMMERCIAL: {
        si: "🏦 *Commercial Bank of Ceylon (කොමර්ෂල් බැංකුව)*",
        en: "🏦 *Commercial Bank of Ceylon*",
        ta: "🏦 *Commercial Bank*",
      },
      SAMPATH: {
        si: "🏦 *Sampath Bank (සම්පත් බැංකුව)*",
        en: "🏦 *Sampath Bank*",
        ta: "🏦 *Sampath Bank*",
      },
      HNB: {
        si: "🏦 *Hatton National Bank - HNB (හැටන් නැෂනල්)*",
        en: "🏦 *Hatton National Bank (HNB)*",
        ta: "🏦 *HNB Bank*",
      },
      BOC: {
        si: "🏦 *Bank of Ceylon - BOC (ලංකා බැංකුව)*",
        en: "🏦 *Bank of Ceylon (BOC)*",
        ta: "🏦 *BOC Bank*",
      },
      PEOPLES: {
        si: "🏦 *People's Bank (මහජන බැංකුව)*",
        en: "🏦 *People's Bank*",
        ta: "🏦 *People's Bank*",
      },
      LOLC: {
        si: "🏦 *LOLC Bank / Finance*",
        en: "🏦 *LOLC Bank / Finance*",
        ta: "🏦 *LOLC Bank*",
      },
      BANK: {
        si: "🏦 *Bank Transfer (බැංකු තැන්පතු)*",
        en: "🏦 *Bank Transfer*",
        ta: "🏦 *வங்கி பரிமாற்றம்*",
      },
    };

    const title = bankTitles[m]?.[lang] || "🏦 *Bank Transfer*";
    return `${title}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${configuredDetails}${amlNotice}`;
  }

  if (m === "EZCASH") {
    const ezNumber = env.EZCASH_NUMBER?.trim();
    if (!ezNumber) {
      if (lang === "en") return "📱 *eZ Cash:*\nThis payment method is temporarily unavailable.";
      if (lang === "ta") return "📱 *eZ Cash:*\nஇந்த கட்டண முறை தற்காலிகமாக கிடைக்கவில்லை.";
      return "📱 *eZ Cash:*\nමෙම ගෙවීම් ක්‍රමය තාවකාලිකව ලබා ගත නොහැක.";
    }
    return (
      `📱 *eZ Cash Mobile Wallet (Dialog)*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *eZ Cash Number:* \`${ezNumber}\`\n` +
      `• *Merchant / Holder:* *Fast Cashier LK*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _අංකය Copy කර ගැනීමට එය මත Tap කරන්න (Tap to copy)._\n` +
      `⚠️ *සටහන (Note):* Reference එකට කිසිවක් නොලියා හිස්ව තබන්න (Leave reference blank).`
    );
  }

  if (m === "MCASH") {
    const mcashNumber = env.MCASH_NUMBER?.trim();
    if (!mcashNumber) {
      if (lang === "en") return "📱 *mCash:*\nThis payment method is temporarily unavailable.";
      if (lang === "ta") return "📱 *mCash:*\nஇந்த கட்டண முறை தற்காலிகமாக கிடைக்கவில்லை.";
      return "📱 *mCash:*\nමෙම ගෙවීම් ක්‍රමය තාවකාලිකව ලබා ගත නොහැක.";
    }
    return (
      `📱 *mCash Mobile Wallet (Mobitel)*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *mCash Number:* \`${mcashNumber}\`\n` +
      `• *Merchant / Holder:* *Fast Cashier LK*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _අංකය Copy කර ගැනීමට එය මත Tap කරන්න (Tap to copy)._\n` +
      `⚠️ *සටහන (Note):* Reference එකට කිසිවක් නොලියා හිස්ව තබන්න (Leave reference blank).`
    );
  }

  if (m === "BINANCE_PAY") {
    const payId = env.BINANCE_PAY_ID?.trim() || "876543210";
    return (
      `🪙 *Binance Pay (Instant & 0% Fee)*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *Binance Pay ID:* \`${payId}\`\n` +
      `• *Currency:* *USDT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _Tap the Pay ID above to copy it instantly._\n` +
      `⚡ Binance App එකෙන් Pay ID එකට USDT එවන්න.`
    );
  }

  if (m === "USDT_TRC20") {
    const address = env.USDT_TRC20_ADDRESS?.trim() || "TLaSy8abcdefghijklmnopqrstuvwxyz123456";
    return (
      `🪙 *USDT Deposit (TRC20 Network)*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *Wallet Address:* \`${address}\`\n` +
      `• *Network:* *TRON (TRC20)*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _Tap the address above to copy it instantly._\n` +
      `⚠️ *අවවාදයයි:* කරුණාකර TRC20 network එකෙන් පමණක් මුදල් එවන්න (TRC20 only).`
    );
  }

  if (m === "USDT_BEP20") {
    const address = env.USDT_BEP20_ADDRESS?.trim() || "0x1234567890abcdef1234567890abcdef12345678";
    return (
      `🪙 *USDT Deposit (BEP20 / BSC Network)*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *Wallet Address:* \`${address}\`\n` +
      `• *Network:* *BNB Smart Chain (BEP20)*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _Tap the address above to copy it instantly._\n` +
      `⚠️ *අවවාදයයි:* කරුණාකර BEP20 network එකෙන් පමණක් මුදල් එවන්න (BEP20 only).`
    );
  }

  if (m === "IPAY") {
    const ipayNumber = env.IPAY_NUMBER?.trim();
    if (!ipayNumber) return "📱 *iPay:* Temporarily unavailable.";
    return `📱 *iPay Mobile:*\n\`${ipayNumber}\``;
  }

  if (m === "FRIMI") {
    const frimiNumber = env.FRIMI_NUMBER?.trim();
    if (!frimiNumber) return "💳 *FriMi:* Temporarily unavailable.";
    return `💳 *FriMi Number / ID:*\n\`${frimiNumber}\``;
  }

  return "🏦 *Payment Method:* Available upon request via human support.";
}

/**
 * Builds the Telegram message for the /register command and xbet action.
 */
export function buildRegistrationView(promoCode: string, affiliateLink: string, lang: Language = "si"): string {
  return [
    `🎁 *1XBET OFFICIAL REGISTRATION (ලියාපදිංචි වීම)*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Use Promo Code \`${promoCode}\` to claim a *130% Welcome Bonus* + *0% Cashier Deposit Fees*!`,
    ``,
    `👉 *Official Affiliate Registration Link:*`,
    `[Click Here to Register on 1xBet](${affiliateLink})`,
    ``,
    `🔑 *Official VIP Promo Code:*`,
    `\`${promoCode}\``,
    `_(Tap the code above to copy it instantly / Code එක Copy කර ගැනීමට එය මත Tap කරන්න)_`,
    ``,
    `🔥 *Exclusive VIP Benefits:*`,
    `• 🎁 *130% Welcome Bonus* on your First Deposit (up to LKR 45,000+)`,
    `• ⚡ *0% Cashier Fees* on all deposits through our local Cashier Bot!`,
    `• 🏏 *Free Cricket & Sports VIP Tips* (IPL, International, Soccer)`,
    `• 🚀 *Instant local deposit & withdrawal approvals (5-15 mins)*`,
    ``,
    `📌 *Simple Registration Guide:*`,
    `1️⃣ Click the Registration Link above.`,
    `2️⃣ Choose "One-Click" or "By Phone" registration.`,
    `3️⃣ Enter Promo Code \`${promoCode}\` in the promo field.`,
    `4️⃣ Select *Sports Bonus (130%)*.`,
    `5️⃣ Finish registration, copy your *1xBet Player ID*, and return to this bot to deposit with 0% fee!`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⚠️ *Benefit:* Use Promo Code \`${promoCode}\` to claim a 130% Welcome Bonus + 0% Cashier Deposit Fees!`,
  ].join("\n");
}

/**
 * Formats admin alert for newly submitted deposit slip.
 */
export function formatDepositAdminSlipAlert(params: {
  depositId: number;
  userId: number;
  username: string | null;
  firstName?: string | null;
  playerId: string;
  amount: number;
  paymentMethod: string;
  timestamp?: string;
  r2Key?: string | null;
}): string {
  const userDisplay = escapeMarkdown(params.firstName || "User");
  const usernameDisplay = params.username ? `@${escapeMarkdown(params.username)}` : "no_username";
  const time = params.timestamp || new Date().toLocaleString("si-LK", { timeZone: "Asia/Colombo" });

  return [
    `📸 *NEW DEPOSIT SLIP SUBMITTED (#${params.depositId})*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *User:* ${userDisplay} (${usernameDisplay})`,
    `🆔 *User ID:* \`${params.userId}\``,
    `🎮 *1xBet Player ID:* \`${escapeCode(params.playerId)}\``,
    `💰 *Amount:* LKR *${params.amount.toLocaleString()}*`,
    `💳 *Payment Method:* ${escapeMarkdown(params.paymentMethod)}`,
    `📅 *Timestamp:* ${time}`,
    params.r2Key ? `📁 *R2 Receipt Key:* \`${escapeCode(params.r2Key)}\`` : "",
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👇 පහත බොත්තම් මඟින් තැන්පතුව Approve හෝ Reject කරන්න:`,
  ].filter(Boolean).join("\n");
}

/**
 * Formats admin alert for newly submitted withdrawal request.
 */
export function formatWithdrawalAdminAlert(params: {
  withdrawalId: number;
  userId: number;
  username: string | null;
  firstName?: string | null;
  playerId: string;
  amount: number;
  paymentMethod: string;
  destinationAccount: string;
  maskedCode: string;
  timestamp?: string;
}): string {
  const userDisplay = escapeMarkdown(params.firstName || "User");
  const usernameDisplay = params.username ? `@${escapeMarkdown(params.username)}` : "no_username";
  const time = params.timestamp || new Date().toLocaleString("si-LK", { timeZone: "Asia/Colombo" });

  return [
    `📤 *NEW WITHDRAWAL REQUEST (#${params.withdrawalId})*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *User:* ${userDisplay} (${usernameDisplay})`,
    `🆔 *User ID:* \`${params.userId}\``,
    `🎮 *1xBet Player ID:* \`${escapeCode(params.playerId)}\``,
    `💰 *Amount:* LKR *${params.amount.toLocaleString()}*`,
    `💳 *Payment Method:* ${escapeMarkdown(params.paymentMethod)}`,
    `🏦 *Payout Destination:* \`${escapeCode(params.destinationAccount)}\``,
    `🔐 *Withdrawal Code:* \`${escapeCode(params.maskedCode)}\``,
    `📅 *Timestamp:* ${time}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👇 මුදල් යවා ගෙවීම තහවුරු කරන්න:`,
  ].join("\n");
}
