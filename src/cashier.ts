import { InlineKeyboard } from "grammy";
import type { Env } from "./types";
import type { Language, PaymentMethod } from "./i18n";
import { escapeMarkdown, escapeCode } from "./utils";

/**
 * 1xBet Affiliate SubID tracking generator.
 * Attaches or updates dynamic subid parameter for campaign & conversion analytics.
 */
export function getXBetAffiliateLink(rawLink?: string, subId: string = "tele_bot_main"): string {
  const base = rawLink?.trim();
  if (!base) return "";

  try {
    const url = new URL(base);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    const cleanSubId = subId.trim();
    if (cleanSubId) url.searchParams.set("subid", cleanSubId);
    return url.toString();
  } catch {
    return "";
  }
}

/**
 * Anti-Money Laundering (AML) & Central Bank of Sri Lanka compliance warning.
 * Provides a neutral reminder to use truthful payment information and follow provider rules.
 */
export const SRI_LANKA_AML_BANK_WARNING = {
  si: "⚠️ *ගෙවීම් අනුකූලතා උපදෙස්:* බැංකුව හෝ ගෙවීම් සේවා සපයන්නා ඉල්ලා සිටින නිවැරදි තොරතුරු පමණක් භාවිත කරන්න. ගනුදෙනුවේ අරමුණ හෝ විස්තර වැරදි ලෙස සඳහන් නොකරන්න. අදාළ නීති, බැංකු නීති සහ සේවා කොන්දේසි අනුගමනය කරන්න.",
  en: "⚠️ *PAYMENT COMPLIANCE NOTICE:* Enter only accurate information requested by your bank or payment provider. Do not misrepresent the purpose or details of a transaction. Follow applicable law, bank rules, and provider terms.",
  ta: "⚠️ *கட்டண இணக்க அறிவிப்பு:* உங்கள் வங்கி அல்லது கட்டண சேவை வழங்குநர் கோரும் சரியான தகவல்களை மட்டும் பயன்படுத்தவும். பரிவர்த்தனையின் நோக்கம் அல்லது விவரங்களை தவறாக குறிப்பிட வேண்டாம். பொருந்தும் சட்டங்கள் மற்றும் சேவை விதிகளை பின்பற்றவும்.",
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
      si: "Binance Pay",
      en: "Binance Pay",
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
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _අංකය Copy කර ගැනීමට එය මත Tap කරන්න (Tap to copy)._`
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
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _අංකය Copy කර ගැනීමට එය මත Tap කරන්න (Tap to copy)._`
    );
  }

  if (m === "BINANCE_PAY") {
    const payId = env.BINANCE_PAY_ID?.trim();
    if (!payId) return "🪙 *Binance Pay:*\nThis payment method is temporarily unavailable until a verified payout identifier is configured.";
    return (
      `🪙 *Binance Pay*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *Binance Pay ID:* \`${payId}\`\n` +
      `• *Currency:* *USDT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _Tap the Pay ID above to copy it instantly._\n` +
      `⚡ Binance App එකෙන් Pay ID එකට USDT එවන්න.`
    );
  }

  if (m === "USDT_TRC20") {
    const address = env.USDT_TRC20_ADDRESS?.trim();
    if (!address) return "🪙 *USDT (TRC20):*\nThis payment method is temporarily unavailable until a verified wallet address is configured.";
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
    const address = env.USDT_BEP20_ADDRESS?.trim();
    if (!address) return "🪙 *USDT (BEP20):*\nThis payment method is temporarily unavailable until a verified wallet address is configured.";
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
  const safePromo = promoCode.trim();
  const safeLink = affiliateLink.trim();
  const offerText =
    lang === "en"
      ? "Current promotions, eligibility, fees, and wagering terms are subject to the official operator/partner terms shown at the time of registration."
      : lang === "ta"
      ? "தற்போதைய சலுகைகள், தகுதி, கட்டணங்கள் மற்றும் விதிமுறைகள் பதிவு செய்யும் நேரத்தில் அதிகாரப்பூர்வ ஆபரேட்டர்/பார்ட்னர் விதிகளுக்கு உட்பட்டவை."
      : "වත්මන් ප්‍රවර්ධන, සුදුසුකම්, ගාස්තු සහ wagering කොන්දේසි ලියාපදිංචි වන අවස්ථාවේ නිල operator/partner terms අනුව වෙනස් විය හැක.";

  const lines = [
    lang === "en" ? "🎯 *OFFICIAL REGISTRATION*" : lang === "ta" ? "🎯 *அதிகாரப்பூர்வ பதிவு*" : "🎯 *නිල ලියාපදිංචිය*",
    "━━━━━━━━━━━━━━━━━━━━━━━━━",
    offerText,
  ];

  if (safeLink) {
    lines.push(
      "",
      lang === "en" ? "🔗 *Registration Link:*" : lang === "ta" ? "🔗 *பதிவு இணைப்பு:*" : "🔗 *ලියාපදිංචි වීමේ Link එක:*",
      `[Open registration](${safeLink})`
    );
  }

  if (safePromo) {
    lines.push("", "🔑 *Promo / Partner Code:*", `\\`${safePromo}\\``);
  }

  lines.push(
    "",
    lang === "en"
      ? "⚠️ Review the operator's current age, jurisdiction, promotion, payment, and responsible-gaming terms before registering."
      : lang === "ta"
      ? "⚠️ பதிவு செய்வதற்கு முன் வயது, அதிகார வரம்பு, சலுகை, கட்டணம் மற்றும் பொறுப்பான விளையாட்டு விதிகளை சரிபார்க்கவும்."
      : "⚠️ ලියාපදිංචි වීමට පෙර වයස, නීතිමය බල ප්‍රදේශය, promotion, payment සහ responsible-gaming terms පරීක්ෂා කරන්න."
  );

  return lines.join("\n");
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
