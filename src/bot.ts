import { Bot, Context, InlineKeyboard, GrammyError, HttpError } from "grammy";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Env, SystemStats } from "./types";
import * as db from "./db";
import { t, Language, PaymentMethod, PAYMENT_METHOD_NAMES } from "./i18n";
import { backupReceiptToR2, R2FileMetadata } from "./r2";
import { escapeMarkdown, escapeCode } from "./utils";
import { logTransactionAudit, logBotError } from "./logger";
import { cleanupOldR2Logs } from "./logCleanup";
import * as fraud from "./fraud";

export const executionContextStorage = new AsyncLocalStorage<{
  waitUntil?: (promise: Promise<unknown>) => void;
}>();

export type MyContext = Context & {
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function getMethodDisplayName(method: string | null | undefined, lang: Language): string {
  if (!method) return "BANK";
  const m = method as PaymentMethod;
  if (PAYMENT_METHOD_NAMES[m] && PAYMENT_METHOD_NAMES[m][lang]) {
    return PAYMENT_METHOD_NAMES[m][lang];
  }
  return method;
}

function parseAdminIds(raw: string): Set<number> {
  return new Set(
    raw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))
  );
}

function cancelKeyboard(lang: Language = "si") {
  const dict = t(lang);
  return new InlineKeyboard().text(dict.cancelBtn, "cancel_flow");
}

function quickAmountKeyboard(prefix: "dep_amt" | "wd_amt", lang: Language = "si") {
  const dict = t(lang);
  return new InlineKeyboard()
    .text("1,000", `${prefix}:1000`)
    .text("2,000", `${prefix}:2000`)
    .text("5,000", `${prefix}:5000`)
    .row()
    .text("10,000", `${prefix}:10000`)
    .text("25,000", `${prefix}:25000`)
    .text("50,000", `${prefix}:50000`)
    .row()
    .text(dict.cancelBtn, "cancel_flow");
}

function languageKeyboard() {
  return new InlineKeyboard()
    .text("🇱🇰 සිංහල (Sinhala)", "lang:si")
    .row()
    .text("🇬🇧 English", "lang:en")
    .row()
    .text("🇮🇳 தமிழ் (Tamil)", "lang:ta")
    .row()
    .text("⬅️ Back / ආපසු", "back");
}

function paymentMethodKeyboard(prefix: "pay_dep" | "pay_wd", lang: Language = "si") {
  const kb = new InlineKeyboard();
  kb.text(PAYMENT_METHOD_NAMES.BOC[lang], `${prefix}:BOC`).row();
  kb.text(PAYMENT_METHOD_NAMES.PEOPLES[lang], `${prefix}:PEOPLES`).row();
  kb.text(PAYMENT_METHOD_NAMES.SAMPATH[lang], `${prefix}:SAMPATH`).row();
  kb.text(PAYMENT_METHOD_NAMES.LOLC[lang], `${prefix}:LOLC`).row();
  kb.text(PAYMENT_METHOD_NAMES.IPAY[lang], `${prefix}:IPAY`).row();
  kb.text(PAYMENT_METHOD_NAMES.EZCASH[lang], `${prefix}:EZCASH`).row();
  if (prefix === "pay_wd") {
    kb.text(PAYMENT_METHOD_NAMES.BANK[lang], `${prefix}:BANK`).row();
  }
  kb.text(t(lang).cancelBtn, "cancel_flow");
  return kb;
}

function depositStepKeyboard(lang: Language = "si") {
  const dict = t(lang);
  const changeMethodText =
    lang === "en"
      ? "🔄 Change Payment Method"
      : lang === "ta"
      ? "🔄 கணக்கு முறையை மாற்றவும்"
      : "🔄 වෙනත් ගිණුමක් තෝරන්න";
  return new InlineKeyboard()
    .text(changeMethodText, "deposit")
    .row()
    .text(dict.cancelBtn, "cancel_flow");
}

function confirmDepositKeyboard(lang: Language = "si") {
  const dict = t(lang);
  const kb = new InlineKeyboard();
  kb.text(PAYMENT_METHOD_NAMES.BOC[lang], "conf_dep:BOC").row();
  kb.text(PAYMENT_METHOD_NAMES.PEOPLES[lang], "conf_dep:PEOPLES").row();
  kb.text(PAYMENT_METHOD_NAMES.SAMPATH[lang], "conf_dep:SAMPATH").row();
  kb.text(PAYMENT_METHOD_NAMES.LOLC[lang], "conf_dep:LOLC").row();
  kb.text(PAYMENT_METHOD_NAMES.IPAY[lang], "conf_dep:IPAY").row();
  kb.text(PAYMENT_METHOD_NAMES.EZCASH[lang], "conf_dep:EZCASH").row();
  kb.text(dict.cancelBtn, "cancel_flow");
  return kb;
}

function faqMenuKeyboard(lang: Language, env: Env): InlineKeyboard {
  const dict = t(lang);
  const kb = new InlineKeyboard()
    .text(dict.faqBtnRegister, "faq:register")
    .row()
    .text(dict.faqBtnLimits, "faq:limits")
    .row()
    .text(dict.faqBtnDeposit, "faq:deposit")
    .row()
    .text(dict.faqBtnWithdraw, "faq:withdraw")
    .row()
    .text(dict.faqBtnPlayerId, "faq:playerid")
    .row()
    .text(dict.faqBtnProcessingTime, "faq:time");

  if (env.WHATSAPP_NUMBER) {
    const cleanPhone = env.WHATSAPP_NUMBER.replace(/[^0-9]/g, "");
    kb.row().url(dict.faqBtnContactSupport, `https://wa.me/${cleanPhone}`);
  }
  if (env.CHANNEL_URL && env.CHANNEL_URL.startsWith("http")) {
    kb.row().url("📢 Official Channel", env.CHANNEL_URL);
  }
  kb.row().text(dict.btnBack, "back");
  return kb;
}

async function getUserLang(database: import("./types").D1Database, userId: number): Promise<Language> {
  const user = await db.getUser(database, userId);
  return (user?.language as Language) || "si";
}

function getPaymentMethodInstructions(method: PaymentMethod, env: Env, lang: Language): string {
  if (method === "BOC") {
    if (lang === "en") {
      return (
        `🏦 *Bank of Ceylon (BOC)*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• *Account Number:* \`95645895\`\n` +
        `• *Account Holder:* *VGS Lakmal*\n` +
        `• *Branch:* *Walasmulla*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _Tap the account number above to copy it instantly._`
      );
    }
    if (lang === "ta") {
      return (
        `🏦 *BOC வங்கி (Bank of Ceylon)*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• *கணக்கு எண்:* \`95645895\`\n` +
        `• *கணக்கு உரிமையாளர்:* *VGS Lakmal*\n` +
        `• *கிளை (Branch):* *Walasmulla*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _நகலெடுக்க கணக்கு எண்ணைத் தொடவும் (Tap to copy)._`
      );
    }
    return (
      `🏦 *BOC (Bank of Ceylon - Walasmulla)*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *ගිණුම් අංකය:* \`95645895\`\n` +
      `• *ගිණුම් හිමියා:* *VGS Lakmal*\n` +
      `• *ශාඛාව (Branch):* *Walasmulla*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _ගිණුම් අංකය Copy කර ගැනීමට එය මත Tap කරන්න._`
    );
  }

  if (method === "PEOPLES") {
    if (lang === "en") {
      return (
        `🏦 *People's Bank*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• *Account Number:* \`120200380030196\`\n` +
        `• *Account Holder:* *VGS Lakmal*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _Tap the account number above to copy it instantly._`
      );
    }
    if (lang === "ta") {
      return (
        `🏦 *மக்கள் வங்கி (People's Bank)*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• *கணக்கு எண்:* \`120200380030196\`\n` +
        `• *கணக்கு உரிமையாளர்:* *VGS Lakmal*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _நகலெடுக்க கணக்கு எண்ணைத் தொடவும் (Tap to copy)._`
      );
    }
    return (
      `🏦 *PEOPLE'S BANK (මහජන බැංකුව)*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *ගිණුම් අංකය:* \`120200380030196\`\n` +
      `• *ගිණුම් හිමියා:* *VGS Lakmal*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _ගිණුම් අංකය Copy කර ගැනීමට එය මත Tap කරන්න._`
    );
  }

  if (method === "SAMPATH") {
    if (lang === "en") {
      return (
        `🏦 *Sampath Bank*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• *Account Number:* \`105456146706\`\n` +
        `• *Account Holder:* *NKS Oshadhi*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _Tap the account number above to copy it instantly._`
      );
    }
    if (lang === "ta") {
      return (
        `🏦 *சம்பத் வங்கி (Sampath Bank)*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• *கணக்கு எண்:* \`105456146706\`\n` +
        `• *கணக்கு உரிமையாளர்:* *NKS Oshadhi*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _நகலெடுக்க கணக்கு எண்ணைத் தொடவும் (Tap to copy)._`
      );
    }
    return (
      `🏦 *SAMPATH BANK (සම්පත් බැංකුව)*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *ගිණුම් අංකය:* \`105456146706\`\n` +
      `• *ගිණුම් හිමියා:* *NKS Oshadhi*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _ගිණුම් අංකය Copy කර ගැනීමට එය මත Tap කරන්න._`
    );
  }

  if (method === "LOLC") {
    if (lang === "en") {
      return (
        `🏦 *LOLC Bank / Finance*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• *Account Number:* \`01210012722\`\n` +
        `• *Account Holder:* *VGS Lakmal*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _Tap the account number above to copy it instantly._`
      );
    }
    if (lang === "ta") {
      return (
        `🏦 *LOLC வங்கி (LOLC Bank)*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• *கணக்கு எண்:* \`01210012722\`\n` +
        `• *கணக்கு உரிமையாளர்:* *VGS Lakmal*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _நகலெடுக்க கணக்கு எண்ணைத் தொடவும் (Tap to copy)._`
      );
    }
    return (
      `🏦 *LOLC BANK / FINANCE*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *ගිණුම් අංකය:* \`01210012722\`\n` +
      `• *ගිණුම් හිමියා:* *VGS Lakmal*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _ගිණුම් අංකය Copy කර ගැනීමට එය මත Tap කරන්න._`
    );
  }

  if (method === "IPAY") {
    if (lang === "en") {
      return (
        `📱 *iPay Mobile 1*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• *iPay Mobile Number:* \`0740452530\`\n` +
        `• *Account Holder:* *VGS Lakmal*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _Tap the number above to copy it instantly._`
      );
    }
    if (lang === "ta") {
      return (
        `📱 *iPay Mobile 1*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• *iPay Mobile எண்:* \`0740452530\`\n` +
        `• *கணக்கு உரிமையாளர்:* *VGS Lakmal*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _நகலெடுக்க எண்ணைத் தொடவும் (Tap to copy)._`
      );
    }
    return (
      `📱 *iPay Mobile 1*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *iPay Mobile අංකය:* \`0740452530\`\n` +
      `• *ගිණුම් හිමියා:* *VGS Lakmal*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _අංකය Copy කර ගැනීමට එය මත Tap කරන්න._`
    );
  }

  if (method === "EZCASH") {
    const ezNumber = env.EZCASH_NUMBER || "0703346455";
    if (lang === "en") {
      return (
        `📱 *eZ Cash Mobile 2*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• *eZ Cash Wallet Number:* \`${ezNumber}\`\n` +
        `• *Account Holder:* *VGS Lakmal*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _Tap the number above to copy it instantly._`
      );
    }
    if (lang === "ta") {
      return (
        `📱 *eZ Cash Mobile 2*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• *eZ Cash எண்:* \`${ezNumber}\`\n` +
        `• *கணக்கு உரிமையாளர்:* *VGS Lakmal*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _நகலெடுக்க எண்ணைத் தொடவும் (Tap to copy)._`
      );
    }
    return (
      `📱 *Ezcash Mobile 2*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *eZ Cash අංකය:* \`${ezNumber}\`\n` +
      `• *ගිණුම් හිමියා:* *VGS Lakmal*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _අංකය Copy කර ගැනීමට එය මත Tap කරන්න._`
    );
  }

  if (method === "BANK") {
    if (env.BANK_DETAILS && env.BANK_DETAILS.trim() !== "") {
      return `🏦 *Bank Account Details:*\n\`${env.BANK_DETAILS}\``;
    }
    if (lang === "en") return "🏦 *Bank Transfer:*\nPlease transfer to active official bank account details.";
    if (lang === "ta") return "🏦 *வங்கி பரிமாற்றம்:*\nசெயலில் உள்ள வங்கி விவரங்களுக்கு தொகையை மாற்றவும்.";
    return "🏦 *බැංකු තැන්පතු:*\nකරුණාකර නිල බැංකු ගිණුම් විස්තර වෙත මුදල් තැන්පත් කරන්න.";
  }

  if (method === "MCASH") {
    if (env.MCASH_NUMBER && env.MCASH_NUMBER.trim() !== "") {
      return `📲 *mCash Number:*\n\`${env.MCASH_NUMBER}\``;
    }
    if (lang === "en") return "📲 *mCash:*\nSend funds to the official cashier mCash wallet number.";
    if (lang === "ta") return "📲 *mCash:*\nஅதிகாரப்பூர்வ mCash எண்ணிற்கு பணம் அனுப்பவும்.";
    return "📲 *mCash (Mobitel):*\nනිල cashier mCash අංකයට මුදල් transfer කරන්න.";
  }

  if (method === "FRIMI") {
    if (env.FRIMI_NUMBER && env.FRIMI_NUMBER.trim() !== "") {
      return `💳 *FriMi Number / ID:*\n\`${env.FRIMI_NUMBER}\``;
    }
    if (lang === "en") return "💳 *FriMi:*\nSend funds via FriMi app to the official cashier account.";
    if (lang === "ta") return "💳 *FriMi:*\nFriMi செயலி மூலம் பணம் அனுப்பவும்.";
    return "💳 *FriMi (NTB):*\nFriMi app එක හරහා නිල cashier ගිණුමට මුදල් transfer කරන්න.";
  }

  return env.DEPOSIT_INSTRUCTIONS || "කරුණාකර payment receipt screenshot එක එවන්න.";
}

export function createBot(env: Env) {
  const bot = new Bot<MyContext>(env.BOT_TOKEN);
  const adminIds = parseAdminIds(env.ADMIN_IDS || "");

  // Attach env and waitUntil to context
  bot.use(async (ctx, next) => {
    ctx.env = env;
    const workerCtx = executionContextStorage.getStore();
    ctx.waitUntil = (promise: Promise<unknown>) => {
      if (workerCtx && typeof workerCtx.waitUntil === "function") {
        workerCtx.waitUntil(promise);
      } else {
        promise.catch((err) => console.error("[Background Task Error]:", err));
      }
    };
    await next();
  });

  // ========== Command & Message Processing Middleware ==========
  // Ensures ALL commands (e.g. /start, /menu, /help, /deposit, /withdraw, /cancel, /language, etc.)
  // are reliably detected, normalized, and executed:
  // 1. Handles mobile keyboard auto-capitalization (e.g. /Start, /MENU, /Deposit, /Help)
  // 2. Trims leading whitespace (e.g. "  /start")
  // 3. Normalizes bot mention suffixes in private chats or when directed to this bot (e.g. /start@fastxbetcash_bot)
  // 4. Injects bot_command entity at offset 0 so grammY's command routers always match
  // 5. Clears active user form state when a slash command is sent so users are never trapped in a multi-step form
  bot.use(async (ctx, next) => {
    if (ctx.message?.text) {
      const rawText = ctx.message.text;
      const trimmed = rawText.trimStart();
      if (trimmed.startsWith("/")) {
        const match = trimmed.match(/^(\/[a-zA-Z0-9_]+)(@\w+)?(\s.*)?$/s);
        if (match) {
          const cmdName = match[1].toLowerCase();
          const atPart = match[2] ? match[2].toLowerCase() : "";
          const restArgs = match[3] || "";

          let normalizedCommand = cmdName;
          let myUsername: string | undefined;
          try {
            myUsername = ctx.me?.username?.toLowerCase();
          } catch {}

          if (atPart) {
            if (ctx.chat?.type === "private" || (myUsername && atPart.slice(1) === myUsername)) {
              normalizedCommand = cmdName;
            } else {
              normalizedCommand = cmdName + atPart;
            }
          }

          const normalizedFullText = normalizedCommand + restArgs;
          ctx.message.text = normalizedFullText;

          const cmdLength = normalizedCommand.length;
          const otherEntities = (ctx.message.entities || []).filter(
            (e) => e.type !== "bot_command" && e.offset >= rawText.length - restArgs.length
          );
          ctx.message.entities = [
            { type: "bot_command", offset: 0, length: cmdLength },
            ...otherEntities,
          ];

          // Clear any active multi-step input form state so commands are not intercepted by form listeners
          if (ctx.from) {
            try {
              await db.clearUserState(env.DB, ctx.from.id);
            } catch (err) {
              console.warn("[Middleware] Warning clearing user state:", err);
            }
          }
        }
      }
    }
    await next();
  });

  // Helper: safely check channel membership, accounting for Telegram 400 'member not found'
  async function checkChannelMembership(
    channelUsername: string | undefined,
    userId: number
  ): Promise<{ isMember: boolean }> {
    if (!channelUsername || channelUsername.trim() === "") {
      return { isMember: true };
    }

    let clean = channelUsername.trim();
    // If clean username is accidentally set to a bot username (e.g. ends with _bot), bypass check
    if (clean.toLowerCase().endsWith("_bot")) {
      console.warn(`[Force-Join] "${clean}" is a bot username, not a channel. Bypassing check.`);
      return { isMember: true };
    }

    if (!clean.startsWith("@") && !/^-?\d+$/.test(clean)) {
      clean = `@${clean}`;
    }

    try {
      const chat = await bot.api.getChat(clean);
      if (chat.type === "private") {
        console.warn(`[Force-Join] "${clean}" is a private chat, not a channel/group. Bypassing check.`);
        return { isMember: true };
      }
      const member = await bot.api.getChatMember(clean, userId);
      if (["creator", "administrator", "member"].includes(member.status)) {
        return { isMember: true };
      }
      if (member.status === "restricted" && (member as any).is_member) {
        return { isMember: true };
      }
      // Explicitly left or kicked
      return { isMember: false };
    } catch (err: any) {
      const desc = (err?.description || err?.message || String(err)).toLowerCase();

      // Telegram Bot API returns 400 "member not found" or "user not found" when the user is NOT a subscriber of the channel
      if (
        desc.includes("member not found") ||
        desc.includes("user not found") ||
        desc.includes("participant_id_invalid")
      ) {
        return { isMember: false };
      }

      // If bot lacks admin rights in channel, chat is not found, or other Telegram configuration issue:
      // Gracefully allow access with a warning so users aren't locked out
      console.warn(`[Force-Join] Could not verify channel membership for ${clean} (${err?.description || err?.message || err}). Bypassing.`);
      return { isMember: true };
    }
  }

  // ========== /start ==========
  bot.command("start", async (ctx) => {
    const user = ctx.from;
    if (!user) return;

    let lang = await getUserLang(env.DB, user.id);
    let dict = t(lang);

    // Force join check (Admins bypass automatically)
    if (!adminIds.has(user.id)) {
      const check = await checkChannelMembership(env.CHANNEL_USERNAME, user.id);
      if (!check.isMember) {
        const channelLink = env.CHANNEL_URL || "https://t.me/fast_xbet_cash";
        const kb = new InlineKeyboard()
          .url(dict.joinChannelBtn, channelLink)
          .row()
          .text(dict.checkJoinBtn, "check_channel_join");
        await ctx.reply(dict.forceJoinMsg, { reply_markup: kb });
        return;
      }
    }

    // Referral
    let referredBy: number | null = null;
    const payload = ctx.match;
    if (payload && payload.startsWith("ref") && /^\d+$/.test(payload.slice(3))) {
      referredBy = parseInt(payload.slice(3), 10);
    }

    await db.saveUser(env.DB, user.id, user.username || null, user.first_name || null, referredBy, lang);
    if (referredBy && referredBy !== user.id) {
      await db.addReferral(env.DB, referredBy, user.id);
    }

    await db.clearUserState(env.DB, user.id);

    await ctx.reply(dict.welcome(escapeMarkdown(user.first_name || "Member")), {
      reply_markup: mainMenu(user.id, adminIds, lang),
    });
  });

  // ========== Callback: Check Channel Join ==========
  bot.callbackQuery("check_channel_join", async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    const lang = await getUserLang(env.DB, user.id);
    const dict = t(lang);

    const check = await checkChannelMembership(env.CHANNEL_USERNAME, user.id);
    if (!check.isMember) {
      await ctx.answerCallbackQuery({
        text: dict.notJoinedAlert,
        show_alert: true,
      });
      return;
    }

    await ctx.answerCallbackQuery();
    try {
      await ctx.deleteMessage();
    } catch {}

    await db.saveUser(env.DB, user.id, user.username || null, user.first_name || null, null, lang);
    await db.clearUserState(env.DB, user.id);

    await ctx.reply(dict.welcome(escapeMarkdown(user.first_name || "Member")), {
      reply_markup: mainMenu(user.id, adminIds, lang),
    });
  });

  // ========== /cancel command ==========
  bot.command("cancel", async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    const lang = await getUserLang(env.DB, user.id);
    const dict = t(lang);
    await db.clearUserState(env.DB, user.id);
    await ctx.reply(dict.cancelled, {
      reply_markup: mainMenu(user.id, adminIds, lang),
    });
  });

  // ========== /language command ==========
  bot.command(["language", "lang"], async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    const dict = t(lang);
    await ctx.reply(dict.chooseLanguage, {
      reply_markup: languageKeyboard(),
    });
  });

  // ========== /menu command ==========
  bot.command("menu", async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    const dict = t(lang);
    await ctx.reply(dict.mainMenuHeader, {
      reply_markup: mainMenu(user.id, adminIds, lang),
    });
  });

  // Helper: Show Automated FAQ Menu
  async function showFaqMenu(ctx: Context, lang: Language, isEdit = false) {
    const dict = t(lang);
    const text = dict.faqMenuHeader;
    const kb = faqMenuKeyboard(lang, env);
    if (isEdit) {
      try {
        await ctx.editMessageText(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
          link_preview_options: { is_disabled: true },
        });
        return;
      } catch {}
    }
    await ctx.reply(text, {
      parse_mode: "Markdown",
      reply_markup: kb,
      link_preview_options: { is_disabled: true },
    });
  }

  // ========== /help, /support, /faq commands ==========
  bot.command(["help", "support", "faq"], async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    await showFaqMenu(ctx, lang, false);
  });

  // ========== /deposit command ==========
  bot.command("deposit", async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    const dict = t(lang);
    await ctx.reply(dict.selectDepositMethod, {
      parse_mode: "Markdown",
      reply_markup: paymentMethodKeyboard("pay_dep", lang),
    });
  });

  // ========== /confirm_deposit and /confirm commands ==========
  bot.command(["confirm_deposit", "confirm"], async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    const dict = t(lang);

    // If user uploaded a screenshot photo with the command as caption
    if (ctx.message?.photo && ctx.message.photo.length > 0) {
      const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

      // Upload screenshot to R2 and send notification to ADMIN_CHANNEL_ID
      const r2Meta = await backupReceiptToR2(env, env.BOT_TOKEN, fileId, `conf_${user.id}_${Date.now()}`);
      if (r2Meta) {
        await notifyR2ScreenshotUploadToAdminChannel(ctx, user, r2Meta, { photoFileId: fileId });
      }

      await db.setUserState(env.DB, user.id, "confirm_deposit_player_id", {
        method: "BOC",
        photo: fileId,
        r2Meta,
        r2Url: r2Meta?.r2Url || null,
        isConfirmationWorkflow: true,
      });
      await ctx.reply(dict.photoReceived, {
        parse_mode: "Markdown",
        reply_markup: cancelKeyboard(lang),
      });
      return;
    }

    await db.setUserState(env.DB, user.id, "confirm_deposit_photo", {
      method: "BOC",
      isConfirmationWorkflow: true,
    });
    await ctx.reply(dict.confirmDepositPrompt, {
      parse_mode: "Markdown",
      reply_markup: confirmDepositKeyboard(lang),
    });
  });

  // ========== /withdraw command ==========
  bot.command("withdraw", async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    const dict = t(lang);
    await ctx.reply(dict.selectWithdrawMethod, {
      parse_mode: "Markdown",
      reply_markup: paymentMethodKeyboard("pay_wd", lang),
    });
  });

  // ========== /register and /xbet command ==========
  bot.command(["register", "xbet"], async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    const dict = t(lang);

    const link = env.XBET_LINK || "https://reffpa.com/L?tag=d_2481353m_1622c_&site=2481353&ad=1622";
    const promo = escapeCode(env.XBET_PROMO_CODE || "VGSL");
    const text = `${dict.registrationHeader}\n\n${dict.registrationInstructions(promo)}`;

    const kb = new InlineKeyboard();
    if (link && link.startsWith("http")) {
      kb.url(dict.btnRegisterNow, link).row();
    }
    kb.text(dict.btnBack, "back");

    await ctx.reply(text, {
      parse_mode: "Markdown",
      reply_markup: kb,
      link_preview_options: { is_disabled: true },
    });
  });

  // ========== /history and /transactions command ==========
  bot.command(["history", "transactions"], async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    const dict = t(lang);
    const history = await db.getUserHistory(env.DB, user.id);
    const format = (rows: any[]) =>
      rows.length
        ? rows
            .map(
              (r) =>
                `• ${r.status === "APPROVED" ? "✅" : r.status === "REJECTED" ? "❌" : "⏳"} ${r.status} — LKR ${Number(
                  r.amount
                ).toLocaleString()} [${r.payment_method || "BANK"}] (${String(r.created_at).slice(0, 10)})`
            )
            .join("\n")
        : "_No records found_";
    const text = `📜 *${dict.btnHistory}*\n\n*💰 Deposits:*\n${format(
      history.deposits
    )}\n\n*💸 Withdrawals:*\n${format(history.withdrawals)}`;
    const kb = new InlineKeyboard()
      .text("🔄 Refresh", "history")
      .text(dict.btnBack, "back");
    await ctx.reply(text, {
      parse_mode: "Markdown",
      reply_markup: kb,
    });
  });

  async function notifyR2ScreenshotUploadToAdminChannel(
    ctx: MyContext,
    userInfo: { id: number; username?: string | null; first_name?: string | null },
    r2Meta: R2FileMetadata,
    extra?: {
      requestId?: number;
      playerId?: string;
      amount?: number;
      methodName?: string;
      photoFileId?: string;
    }
  ) {
    const adminChannel = (env.ADMIN_CHANNEL_ID || env.CHANNEL_USERNAME || "").trim();
    if (!adminChannel) {
      console.warn("[Admin Channel] Neither ADMIN_CHANNEL_ID nor CHANNEL_USERNAME is set for R2 upload notification.");
      return;
    }

    const timeColombo = new Date().toLocaleString("si-LK", { timeZone: "Asia/Colombo" });
    const formattedSize = formatBytes(r2Meta.fileSize);

    const notificationText =
      `☁️ *R2 SCREENSHOT UPLOAD NOTIFICATION*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 *User ID:* \`${userInfo.id}\`\n` +
      `👤 *User:* ${escapeMarkdown(userInfo.first_name || "User")} (@${escapeMarkdown(userInfo.username || "none")})\n` +
      `🔖 *Workflow:* \`/confirm_deposit\`\n` +
      (extra?.requestId ? `🔖 *Deposit Request ID:* #${extra.requestId}\n` : "") +
      (extra?.playerId ? `🎮 *Player ID:* \`${escapeCode(extra.playerId)}\`\n` : "") +
      (extra?.amount ? `💰 *Amount:* LKR *${extra.amount.toLocaleString()}*\n` : "") +
      (extra?.methodName ? `💳 *Payment Method:* *${escapeMarkdown(extra.methodName)}*\n` : "") +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📁 *FILE METADATA:*\n` +
      `• *R2 Key:* \`${escapeCode(r2Meta.r2Key)}\`\n` +
      `• *Bucket:* \`${escapeCode(r2Meta.bucket)}\`\n` +
      `• *File Size:* *${formattedSize}* (${r2Meta.fileSize.toLocaleString()} bytes)\n` +
      `• *MIME Type:* \`${escapeCode(r2Meta.mimeType)}\`\n` +
      (r2Meta.telegramFilePath ? `• *Telegram File Path:* \`${escapeCode(r2Meta.telegramFilePath)}\`\n` : "") +
      `• *Uploaded At:* ${timeColombo}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔗 *Direct R2 URL:*\n${r2Meta.r2Url}`;

    const linkKb = new InlineKeyboard().url("☁️ View Receipt on Cloudflare R2", r2Meta.r2Url);

    try {
      if (extra?.photoFileId && notificationText.length <= 1024) {
        await ctx.api.sendPhoto(adminChannel, extra.photoFileId, {
          caption: notificationText,
          parse_mode: "Markdown",
          reply_markup: linkKb,
        });
      } else {
        await ctx.api.sendMessage(adminChannel, notificationText, {
          parse_mode: "Markdown",
          reply_markup: linkKb,
        });
      }
      console.log(`[Admin Channel] Successfully sent R2 upload notification to ${adminChannel} for user ${userInfo.id}`);
    } catch (channelErr: any) {
      console.warn(`[Admin Channel] Failed to send R2 upload notification to ${adminChannel}:`, channelErr?.message || channelErr);
      if (extra?.photoFileId) {
        try {
          await ctx.api.sendMessage(adminChannel, notificationText, {
            parse_mode: "Markdown",
            reply_markup: linkKb,
          });
        } catch (retryErr) {
          console.error(`[Admin Channel] Fallback message also failed:`, retryErr);
        }
      }
    }
  }

  async function notifyDepositSubmission(
    ctx: MyContext,
    requestId: number,
    userInfo: { id: number; username?: string | null; first_name?: string | null },
    playerId: string,
    amount: number,
    methodName: string,
    photoFileId?: string | null,
    r2Url?: string | null,
    isConfirmation = false,
    r2Meta?: R2FileMetadata | null,
    fraudFlags?: string[]
  ) {
    const timeColombo = new Date().toLocaleString("si-LK", { timeZone: "Asia/Colombo" });
    const r2Line = r2Meta
      ? `\n☁️ *R2 Backup:* [View on Cloudflare R2](${r2Meta.r2Url})\n` +
        `📦 *File Metadata:* \`${escapeCode(r2Meta.r2Key)}\` (${formatBytes(r2Meta.fileSize)}, \`${escapeCode(r2Meta.mimeType)}\`)`
      : r2Url
      ? `\n☁️ *R2 Backup:* [View Receipt on Cloudflare R2](${r2Url})`
      : "";
    const header = isConfirmation
      ? `📸 *NEW DEPOSIT CONFIRMATION SLIP #${requestId}*`
      : `🔔 *NEW DEPOSIT REQUEST #${requestId}*`;

    const fraudBanner = fraud.formatFraudBanner(fraudFlags || []);

    const alert =
      `${header}\n\n` +
      (fraudBanner ? `${fraudBanner}\n` : "") +
      `👤 *User:* ${escapeMarkdown(userInfo.first_name || "User")} (@${escapeMarkdown(userInfo.username || "none")})\n` +
      `🆔 *User ID:* \`${userInfo.id}\`\n` +
      `💳 *Method:* *${escapeMarkdown(methodName)}*\n` +
      `🎮 *Player ID:* \`${escapeCode(playerId)}\`\n` +
      `💰 *Amount:* LKR *${amount.toLocaleString()}*\n` +
      `📅 *Time:* ${timeColombo}` +
      r2Line +
      `\n\n📌 *Status:* ⏳ Pending Admin Approval`;

    // 1. Post to Admin Channel (ADMIN_CHANNEL_ID or fallback to CHANNEL_USERNAME)
    const adminChannel = (env.ADMIN_CHANNEL_ID || env.CHANNEL_USERNAME || "").trim();
    if (adminChannel) {
      try {
        if (photoFileId) {
          await ctx.api.sendPhoto(adminChannel, photoFileId, {
            caption: alert,
            parse_mode: "Markdown",
          });
        } else {
          await ctx.api.sendMessage(adminChannel, alert, {
            parse_mode: "Markdown",
          });
        }
        console.log(`[Admin Channel] Successfully logged deposit #${requestId} to ${adminChannel}`);
      } catch (channelErr: any) {
        console.warn(`[Admin Channel] Could not log to channel ${adminChannel}:`, channelErr?.message || channelErr);
      }
    }

    // 2. Alert each Admin individually with interactive Approve / Reject buttons
    const adminKb = new InlineKeyboard()
      .text("✅ Approve", `dep:approve:${requestId}`)
      .text("❌ Reject", `dep:reject:${requestId}`);

    for (const adminId of adminIds) {
      try {
        if (photoFileId) {
          await ctx.api.sendPhoto(adminId, photoFileId, {
            caption: alert,
            parse_mode: "Markdown",
            reply_markup: adminKb,
          });
        } else {
          await ctx.api.sendMessage(adminId, alert, {
            parse_mode: "Markdown",
            reply_markup: adminKb,
          });
        }
      } catch (err) {
        console.error(`Failed to alert admin ${adminId}:`, err);
      }
    }
  }

  async function renderAdminPanel(ctx: MyContext, _userId: number, isEdit = false) {
    const kb = new InlineKeyboard()
      .text("📊 Stats & Analytics", "admin_stats")
      .row()
      .text("💰 Pending Deposits", "admin_pend_deposits")
      .row()
      .text("💸 Pending Withdrawals", "admin_pend_withdraws")
      .row()
      .text("📢 Broadcast", "admin_broadcast")
      .row()
      .text("🧹 Cleanup R2 Logs (>30d)", "admin_clean_logs")
      .row()
      .text("⬅️ Back", "back");
    const text = "🧑‍💼 *ADMIN CONTROL PANEL*";
    if (isEdit) {
      await ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: kb });
    } else {
      await ctx.reply(text, { parse_mode: "Markdown", reply_markup: kb });
    }
  }

  // ========== /admin and /panel commands ==========
  bot.command(["admin", "panel"], async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    if (!adminIds.has(user.id)) {
      await ctx.reply("🔒 මෙම විධානය භාවිත කළ හැක්කේ Bot Admin වරුන්ට පමණි (Admin access required).", {
        reply_markup: mainMenu(user.id, adminIds, lang),
      });
      return;
    }
    await renderAdminPanel(ctx, user.id, false);
  });

  // ========== /stats command (Admin Only) ==========
  bot.command("stats", async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    if (!adminIds.has(user.id)) {
      await ctx.reply("🔒 මෙම විධානය භාවිත කළ හැක්කේ Bot Admin වරුන්ට පමණි (Admin access required).", {
        reply_markup: mainMenu(user.id, adminIds, lang),
      });
      return;
    }
    const stats = await db.getStats(env.DB);
    const text = formatAdminStats(stats);
    const kb = new InlineKeyboard()
      .text("🔄 Refresh Stats", "admin_stats")
      .text("🧑‍💼 Admin Panel", "admin_panel");
    await ctx.reply(text, {
      parse_mode: "Markdown",
      reply_markup: kb,
    });
  });

  // ========== /cleanuplogs command (Admin Only) ==========
  bot.command(["cleanuplogs", "cleanup"], async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    if (!adminIds.has(user.id)) {
      await ctx.reply("🔒 මෙම විධානය භාවිත කළ හැක්කේ Bot Admin වරුන්ට පමණි (Admin access required).", {
        reply_markup: mainMenu(user.id, adminIds, lang),
      });
      return;
    }

    await ctx.reply("⏳ Cleaning up Cloudflare R2 audit & error logs older than 30 days...");
    const result = await cleanupOldR2Logs(env, 30);
    const kb = new InlineKeyboard()
      .text("🔄 Run Again", "admin_clean_logs")
      .text("🧑‍💼 Admin Panel", "admin_panel");

    const report = [
      "🧹 *CLOUDFLARE R2 LOG RETENTION CLEANUP*",
      "━━━━━━━━━━━━━━━━━━━━━━━━━",
      `*Status:* ${result.success ? "✅ Success" : "⚠️ Notice"}`,
      `*Retention Period:* > ${result.retentionDays} Days`,
      `*Cutoff Date:* \`${result.cutoffDate.split("T")[0]}\``,
      `*Logs Scanned:* ${result.totalScanned}`,
      `*Logs Deleted:* ${result.totalDeleted}`,
      `*Storage Freed:* ${(result.bytesFreed / 1024).toFixed(2)} KB`,
      `*Duration:* ${result.durationMs} ms`,
      "━━━━━━━━━━━━━━━━━━━━━━━━━",
      result.errors.length > 0
        ? `⚠️ *Details:* ${result.errors[0]}`
        : "💾 R2 storage optimized & old logs removed successfully!",
    ].join("\n");

    await ctx.reply(report, {
      parse_mode: "Markdown",
      reply_markup: kb,
    });
  });

  // ========== /auditlog command (Admin Only) — permanent admin action trail ==========
  bot.command(["auditlog", "auditlogs"], async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    if (!adminIds.has(user.id)) {
      await ctx.reply("🔒 මෙම විධානය භාවිත කළ හැක්කේ Bot Admin වරුන්ට පමණි (Admin access required).", {
        reply_markup: mainMenu(user.id, adminIds, lang),
      });
      return;
    }

    const actions = await db.getRecentAdminActions(env.DB, 15);
    if (actions.length === 0) {
      await ctx.reply("📋 Admin action log එකේ දැනට records නැහැ.");
      return;
    }

    const lines = actions.map((a) => {
      const amt = a.amount != null ? `LKR ${(a.amount / 100).toLocaleString()}` : "-";
      const icon = a.action.endsWith("APPROVED") ? "✅" : "❌";
      return (
        `${icon} *${escapeMarkdown(a.action)}* — ${a.target_type} #${a.target_id}\n` +
        `   👤 Admin: @${escapeMarkdown(a.admin_username || String(a.admin_id))} | 💰 ${amt}\n` +
        `   🕒 ${escapeMarkdown(a.created_at)}`
      );
    });

    const text = [`📋 *ADMIN AUDIT TRAIL* (Last ${actions.length})`, "━━━━━━━━━━━━━━━━━━━━━━━━━", ...lines].join(
      "\n"
    );

    await ctx.reply(text, { parse_mode: "Markdown" });
  });

  // ========== /id, /myid, /whoami command ==========
  bot.command(["id", "myid", "whoami"], async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    const text =
      `👤 *USER TELEGRAM INFO*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *ID:* \`${user.id}\`\n` +
      `• *Name:* ${escapeMarkdown(user.first_name || "User")}\n` +
      `• *Username:* ${user.username ? `@${escapeMarkdown(user.username)}` : "_None_"}\n` +
      `• *Language:* \`${lang.toUpperCase()}\`\n` +
      `• *Role:* ${adminIds.has(user.id) ? "👑 Admin" : "👤 Member"}`;
    await ctx.reply(text, {
      parse_mode: "Markdown",
      reply_markup: mainMenu(user.id, adminIds, lang),
    });
  });

  // ========== /myreferrals command (User Referral Dashboard) ==========
  bot.command(["myreferrals", "referrals"], async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await db.clearUserState(env.DB, user.id);
    await renderReferralDashboard(ctx, user.id, false);
  });

  // ========== Callback queries ==========
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const user = ctx.from;
    if (!user) return;

    await ctx.answerCallbackQuery();
    let lang = await getUserLang(env.DB, user.id);
    let dict = t(lang);

    // Cancel in-progress flow via inline button
    if (data === "cancel_flow") {
      await db.clearUserState(env.DB, user.id);
      try {
        await ctx.editMessageText(dict.cancelled, {
          reply_markup: mainMenu(user.id, adminIds, lang),
        });
      } catch {
        await ctx.reply(dict.cancelled, {
          reply_markup: mainMenu(user.id, adminIds, lang),
        });
      }
      return;
    }

    // Language Selector Menu
    if (data === "choose_lang") {
      await ctx.editMessageText(dict.chooseLanguage, {
        reply_markup: languageKeyboard(),
      });
      return;
    }

    // Set Language
    if (data.startsWith("lang:")) {
      const newLang = data.split(":")[1] as Language;
      if (["si", "en", "ta"].includes(newLang)) {
        await db.setUserLanguage(env.DB, user.id, newLang);
        lang = newLang;
        dict = t(lang);
        await ctx.editMessageText(`${dict.languageChanged}\n\n${dict.mainMenuHeader}`, {
          reply_markup: mainMenu(user.id, adminIds, lang),
        });
      }
      return;
    }

    // Deposit start -> Choose Payment Method
    if (data === "deposit") {
      await db.clearUserState(env.DB, user.id);
      await ctx.editMessageText(dict.selectDepositMethod, {
        parse_mode: "Markdown",
        reply_markup: paymentMethodKeyboard("pay_dep", lang),
      });
      return;
    }

    // Selected Deposit Payment Method
    if (data.startsWith("pay_dep:")) {
      const method = data.split(":")[1] as PaymentMethod;
      await db.setUserState(env.DB, user.id, "deposit_photo", { method });
      const methodName = getMethodDisplayName(method, lang);
      const instructions = getPaymentMethodInstructions(method, env, lang);
      await ctx.editMessageText(dict.depositStepPhoto(methodName, instructions), {
        parse_mode: "Markdown",
        reply_markup: depositStepKeyboard(lang),
      });
      return;
    }

    // Confirm Deposit start -> Show prompt and bank selection
    if (data === "confirm_deposit") {
      await db.setUserState(env.DB, user.id, "confirm_deposit_photo", {
        method: "BOC",
        isConfirmationWorkflow: true,
      });
      await ctx.editMessageText(dict.confirmDepositPrompt, {
        parse_mode: "Markdown",
        reply_markup: confirmDepositKeyboard(lang),
      });
      return;
    }

    // Selected Bank / Wallet in Confirm Deposit flow
    if (data.startsWith("conf_dep:")) {
      const method = data.split(":")[1] as PaymentMethod;
      await db.setUserState(env.DB, user.id, "confirm_deposit_photo", {
        method,
        isConfirmationWorkflow: true,
      });
      const methodName = getMethodDisplayName(method, lang);
      const promptText =
        lang === "en"
          ? `📸 *CONFIRM DEPOSIT — ${methodName}*\n\nPlease upload the screenshot or photo of your transaction receipt/slip.`
          : lang === "ta"
          ? `📸 *வைப்புத்தொகை உறுதிப்படுத்தல் — ${methodName}*\n\nஉங்கள் பரிவர்த்தனை ரசீது அல்லது Screenshot-ஐ அனுப்பவும்.`
          : `📸 *තැන්පතු තහවුරු කිරීම — ${methodName}*\n\nකරුණාකර ඔබ මුදල් ගෙවූ Slip එකෙහි හෝ Transaction Screenshot එකෙහි ඡායාරූපයක් (Photo) මෙහි එවන්න.`;
      await ctx.editMessageText(promptText, {
        parse_mode: "Markdown",
        reply_markup: cancelKeyboard(lang),
      });
      return;
    }

    // Withdraw start -> Choose Payment Method
    if (data === "withdraw") {
      await db.clearUserState(env.DB, user.id);
      await ctx.editMessageText(dict.selectWithdrawMethod, {
        parse_mode: "Markdown",
        reply_markup: paymentMethodKeyboard("pay_wd", lang),
      });
      return;
    }

    // Selected Withdraw Payment Method
    if (data.startsWith("pay_wd:")) {
      const method = data.split(":")[1] as PaymentMethod;
      await db.setUserState(env.DB, user.id, "withdraw_details", { method });
      const methodName = getMethodDisplayName(method, lang);
      await ctx.editMessageText(dict.withdrawStepDetails(methodName), {
        parse_mode: "Markdown",
        reply_markup: cancelKeyboard(lang),
      });
      return;
    }

    // Quick Amount selection for Deposit
    if (data.startsWith("dep_amt:")) {
      const state = await db.getUserState(env.DB, user.id);
      if (state && (state.state === "deposit_amount" || state.state === "confirm_deposit_amount")) {
        const amount = parseFloat(data.split(":")[1]);
        const min = parseFloat(env.MIN_TRANSACTION_LKR);
        const max = parseFloat(env.MAX_TRANSACTION_LKR);
        if (amount >= min && amount <= max) {
          const { photo, playerId, method = "BANK", isConfirmationWorkflow = false } = state.data;
          const methodName = getMethodDisplayName(method, lang);

          // 🛡️ Rate limit: block rapid repeated deposit submissions from the same user
          const depRateCheck = await fraud.checkRateLimit(env.DB, user.id, "deposits");
          if (!depRateCheck.allowed) {
            await ctx.reply(depRateCheck.blockMessage || "Rate limit exceeded.", {
              reply_markup: mainMenu(user.id, adminIds, lang),
            });
            return;
          }

          try {
            const requestId = await db.addDeposit(
              env.DB,
              user.id,
              user.username || user.first_name || null,
              playerId,
              amount,
              photo,
              method,
              null
            );
            await db.clearUserState(env.DB, user.id);

            // 🛡️ Fraud checks: duplicate receipt & shared player ID (non-blocking, flagged for admin review)
            const depFraud = await fraud.checkDepositFraud(env.DB, user.id, playerId, photo || null);

            // Audit log transaction creation to Cloudflare R2
            logTransactionAudit(
              env,
              {
                category: "DEPOSIT",
                action: "CREATED",
                transactionId: requestId,
                userId: user.id,
                username: user.username || user.first_name || null,
                playerId,
                amount,
                method,
                status: "PENDING",
                details: { photoFileId: photo, isConfirmationWorkflow, fraudFlags: depFraud.flags },
              },
              ctx.waitUntil
            );

            // Backup Receipt to Cloudflare R2
            let r2Meta: R2FileMetadata | null = state.data.r2Meta || null;
            let r2Url: string | null = state.data.r2Url || r2Meta?.r2Url || null;
            if (r2Url) {
              await db.updateDepositR2Url(env.DB, requestId, r2Url);
            } else if (photo) {
              try {
                const backup = await backupReceiptToR2(env, env.BOT_TOKEN, photo, requestId);
                if (backup?.r2Url) {
                  r2Meta = backup;
                  r2Url = backup.r2Url;
                  await db.updateDepositR2Url(env.DB, requestId, backup.r2Url);
                  if (isConfirmationWorkflow) {
                    await notifyR2ScreenshotUploadToAdminChannel(ctx, user, backup, {
                      requestId,
                      playerId,
                      amount,
                      methodName,
                      photoFileId: photo,
                    });
                  }
                }
              } catch (r2Err) {
                console.error("[R2] Quick amount receipt backup failed:", r2Err);
              }
            }

            // Log to Admin Channel and notify admins
            await notifyDepositSubmission(
              ctx,
              requestId,
              user,
              playerId,
              amount,
              methodName,
              photo,
              r2Url,
              Boolean(isConfirmationWorkflow),
              r2Meta,
              depFraud.flags
            );

            if (isConfirmationWorkflow) {
              await ctx.reply(
                dict.confirmDepositSubmitted(
                  requestId,
                  amount,
                  escapeCode(playerId),
                  escapeMarkdown(methodName),
                  Boolean(r2Url)
                ),
                {
                  parse_mode: "Markdown",
                  reply_markup: mainMenu(user.id, adminIds, lang),
                }
              );
            } else {
              await ctx.reply(
                dict.depositSubmitted(requestId, amount, escapeCode(playerId), escapeMarkdown(methodName)),
                {
                  parse_mode: "Markdown",
                  reply_markup: mainMenu(user.id, adminIds, lang),
                }
              );
            }
          } catch (err) {
            console.error("[Deposit Callback Error]:", err);
            logBotError(
              env,
              {
                source: "DepositQuickAmount",
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
                context: {
                  userId: user.id,
                  username: user.username,
                  flow: "deposit_quick_amount",
                  payload: { playerId, amount, method, isConfirmationWorkflow },
                },
              },
              ctx.waitUntil
            );
            await ctx.reply(dict.genericError, {
              reply_markup: mainMenu(user.id, adminIds, lang),
            });
          }
          return;
        }
      }
    }

    // Quick Amount selection for Withdrawal
    if (data.startsWith("wd_amt:")) {
      const state = await db.getUserState(env.DB, user.id);
      if (state && state.state === "withdraw_amount") {
        const amount = parseFloat(data.split(":")[1]);
        const min = parseFloat(env.MIN_TRANSACTION_LKR);
        const max = parseFloat(env.MAX_TRANSACTION_LKR);
        if (amount >= min && amount <= max) {
          await db.setUserState(env.DB, user.id, "withdraw_code", { ...state.data, amount });
          await ctx.reply(dict.withdrawStepCode(amount), {
            parse_mode: "Markdown",
            reply_markup: cancelKeyboard(lang),
          });
          return;
        }
      }
    }

    // Registration
    if (data === "xbet") {
      const link = env.XBET_LINK || "https://reffpa.com/L?tag=d_2481353m_1622c_&site=2481353&ad=1622";
      const promo = escapeCode(env.XBET_PROMO_CODE || "VGSL");
      const text = `${dict.registrationHeader}\n\n${dict.registrationInstructions(promo)}`;

      const kb = new InlineKeyboard();
      if (link && link.startsWith("http")) {
        kb.url(dict.btnRegisterNow, link).row();
      }
      kb.text(dict.btnBack, "back");

      try {
        await ctx.editMessageText(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
          link_preview_options: { is_disabled: true },
        });
      } catch (err) {
        await ctx.reply(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
          link_preview_options: { is_disabled: true },
        });
      }
      return;
    }

    // History
    if (data === "history") {
      const history = await db.getUserHistory(env.DB, user.id);
      const format = (rows: any[]) =>
        rows.length
          ? rows
              .map(
                (r) =>
                  `• ${r.status === "APPROVED" ? "✅" : r.status === "REJECTED" ? "❌" : "⏳"} ${r.status} — LKR ${Number(
                    r.amount
                  ).toLocaleString()} [${r.payment_method || "BANK"}] (${r.created_at.slice(0, 10)})`
              )
              .join("\n")
          : "_No records found_";
      const text = `📜 *${dict.btnHistory}*\n\n*💰 Deposits:*\n${format(
        history.deposits
      )}\n\n*💸 Withdrawals:*\n${format(history.withdrawals)}`;
      try {
        await ctx.editMessageText(text, {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard().text(dict.btnBack, "back"),
        });
      } catch {
        await ctx.reply(text, {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard().text(dict.btnBack, "back"),
        });
      }
      return;
    }

    // Referral Dashboard
    if (data === "referral" || data === "ref_refresh") {
      await renderReferralDashboard(ctx, user.id, true);
      return;
    }

    // Automated FAQ Menu & Help Center
    if (data === "help" || data === "faq_menu") {
      await showFaqMenu(ctx, lang, true);
      return;
    }

    if (data === "faq:register") {
      const link = env.XBET_LINK || "https://reffpa.com/L?tag=d_2481353m_1622c_&site=2481353&ad=1622";
      const promo = escapeCode(env.XBET_PROMO_CODE || "VGSL");
      const text = dict.faqAnsRegister(promo);
      const kb = new InlineKeyboard();
      if (link && link.startsWith("http")) {
        kb.url(dict.btnRegisterNow, link).row();
      }
      kb.text(dict.faqBtnMore, "faq_menu").text(dict.btnBack, "back");
      try {
        await ctx.editMessageText(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
          link_preview_options: { is_disabled: true },
        });
      } catch {
        await ctx.reply(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
          link_preview_options: { is_disabled: true },
        });
      }
      return;
    }

    if (data === "faq:limits") {
      const min = parseFloat(env.MIN_TRANSACTION_LKR || "1000");
      const max = parseFloat(env.MAX_TRANSACTION_LKR || "100000");
      const text = dict.faqAnsLimits(min, max);
      const kb = new InlineKeyboard()
        .text(dict.btnDeposit, "deposit")
        .text(dict.btnWithdraw, "withdraw")
        .row()
        .text(dict.faqBtnMore, "faq_menu")
        .text(dict.btnBack, "back");
      try {
        await ctx.editMessageText(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      } catch {
        await ctx.reply(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      }
      return;
    }

    if (data === "faq:deposit") {
      const min = parseFloat(env.MIN_TRANSACTION_LKR || "1000");
      const max = parseFloat(env.MAX_TRANSACTION_LKR || "100000");
      const text = dict.faqAnsDeposit(min, max);
      const kb = new InlineKeyboard()
        .text(dict.btnDeposit, "deposit")
        .row()
        .text(dict.faqBtnMore, "faq_menu")
        .text(dict.btnBack, "back");
      try {
        await ctx.editMessageText(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      } catch {
        await ctx.reply(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      }
      return;
    }

    if (data === "faq:withdraw") {
      const text = dict.faqAnsWithdraw();
      const kb = new InlineKeyboard()
        .text(dict.btnWithdraw, "withdraw")
        .row()
        .text(dict.faqBtnMore, "faq_menu")
        .text(dict.btnBack, "back");
      try {
        await ctx.editMessageText(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      } catch {
        await ctx.reply(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      }
      return;
    }

    if (data === "faq:playerid") {
      const text = dict.faqAnsPlayerId();
      const kb = new InlineKeyboard()
        .text(dict.faqBtnMore, "faq_menu")
        .text(dict.btnBack, "back");
      try {
        await ctx.editMessageText(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      } catch {
        await ctx.reply(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      }
      return;
    }

    if (data === "faq:time") {
      const text = dict.faqAnsProcessingTime();
      const kb = new InlineKeyboard()
        .text(dict.faqBtnMore, "faq_menu")
        .text(dict.btnBack, "back");
      try {
        await ctx.editMessageText(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      } catch {
        await ctx.reply(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      }
      return;
    }

    // Back to main menu
    if (data === "back") {
      await db.clearUserState(env.DB, user.id);
      await ctx.editMessageText(dict.mainMenuHeader, {
        reply_markup: mainMenu(user.id, adminIds, lang),
      });
      return;
    }

    // ========== Admin Control Panel ==========
    if (data === "admin_panel") {
      if (!adminIds.has(user.id)) {
        await ctx.answerCallbackQuery({ text: "Admin access required", show_alert: true });
        return;
      }
      const kb = new InlineKeyboard()
        .text("📊 Stats & Analytics", "admin_stats")
        .row()
        .text("💰 Pending Deposits", "admin_pend_deposits")
        .row()
        .text("💸 Pending Withdrawals", "admin_pend_withdraws")
        .row()
        .text("📢 Broadcast", "admin_broadcast")
        .row()
        .text("🧹 Cleanup R2 Logs (>30d)", "admin_clean_logs")
        .row()
        .text("⬅️ Back", "back");
      await ctx.editMessageText("🧑‍💼 *ADMIN CONTROL PANEL*", {
        parse_mode: "Markdown",
        reply_markup: kb,
      });
      return;
    }

    if (data === "admin_clean_logs") {
      if (!adminIds.has(user.id)) return;
      await ctx.reply("⏳ Cleaning up Cloudflare R2 logs older than 30 days...");
      const result = await cleanupOldR2Logs(env, 30);
      const kb = new InlineKeyboard()
        .text("🔄 Run Again", "admin_clean_logs")
        .row()
        .text("⬅️ Back to Admin Panel", "admin_panel");

      const report = [
        "🧹 *CLOUDFLARE R2 LOG RETENTION CLEANUP*",
        "━━━━━━━━━━━━━━━━━━━━━━━━━",
        `*Status:* ${result.success ? "✅ Success" : "⚠️ Notice"}`,
        `*Retention Period:* > ${result.retentionDays} Days`,
        `*Cutoff Date:* \`${result.cutoffDate.split("T")[0]}\``,
        `*Logs Scanned:* ${result.totalScanned}`,
        `*Logs Deleted:* ${result.totalDeleted}`,
        `*Storage Freed:* ${(result.bytesFreed / 1024).toFixed(2)} KB`,
        `*Duration:* ${result.durationMs} ms`,
        "━━━━━━━━━━━━━━━━━━━━━━━━━",
        result.errors.length > 0
          ? `⚠️ *Details:* ${result.errors[0]}`
          : "💾 R2 storage optimized & old logs removed successfully!",
      ].join("\n");

      await ctx.reply(report, {
        parse_mode: "Markdown",
        reply_markup: kb,
      });
      return;
    }

    if (data === "admin_stats") {
      if (!adminIds.has(user.id)) return;
      const stats = await db.getStats(env.DB);
      const text = formatAdminStats(stats);
      const kb = new InlineKeyboard()
        .text("🔄 Refresh (නැවත පූරණය)", "admin_stats")
        .row()
        .text("⬅️ Back to Admin Panel", "admin_panel");
      try {
        await ctx.editMessageText(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      } catch {
        await ctx.reply(text, {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      }
      return;
    }

    if (data === "admin_pend_deposits") {
      if (!adminIds.has(user.id)) return;
      const { results } = await db.getPendingDeposits(env.DB);
      if (!results.length) {
        await ctx.reply("✅ No pending deposits at the moment.");
        return;
      }
      for (const row of results) {
        const kb = new InlineKeyboard()
          .text("✅ Approve", `dep:approve:${row.id}`)
          .text("❌ Reject", `dep:reject:${row.id}`);
        const r2Info = row.r2_url ? `\n☁️ R2 Backup: [View Link](${row.r2_url})` : "";
        await ctx.reply(
          `💰 *Deposit #${row.id}*\n` +
          `User: ${escapeMarkdown(row.username || "N/A")} (${row.user_id})\n` +
          `Method: *${escapeMarkdown(row.payment_method || "BANK")}*\n` +
          `Player ID: \`${escapeCode(row.player_id)}\`\n` +
          `Amount: LKR ${Number(row.amount).toLocaleString()}\n` +
          `Date: ${row.created_at}${r2Info}`,
          { reply_markup: kb, parse_mode: "Markdown" }
        );
      }
      return;
    }

    if (data === "admin_pend_withdraws") {
      if (!adminIds.has(user.id)) return;
      const { results } = await db.getPendingWithdrawals(env.DB);
      if (!results.length) {
        await ctx.reply("✅ No pending withdrawals at the moment.");
        return;
      }
      for (const row of results) {
        const kb = new InlineKeyboard()
          .text("✅ Approve", `wd:approve:${row.id}`)
          .text("❌ Reject", `wd:reject:${row.id}`);
        await ctx.reply(
          `💸 *Withdrawal #${row.id}*\n` +
          `User: ${escapeMarkdown(row.username || "N/A")} (${row.user_id})\n` +
          `Method: *${escapeMarkdown(row.payment_method || "BANK")}*\n` +
          `Destination: \`${escapeCode(row.destination_account || "N/A")}\`\n` +
          `Player ID: \`${escapeCode(row.player_id)}\`\n` +
          `Amount: LKR ${Number(row.amount).toLocaleString()}\n` +
          `Security Code: \`${escapeCode(row.security_code || "N/A")}\`\n` +
          `Date: ${row.created_at}`,
          { reply_markup: kb, parse_mode: "Markdown" }
        );
      }
      return;
    }

    if (data === "admin_broadcast") {
      if (!adminIds.has(user.id)) return;
      await db.setUserState(env.DB, user.id, "await_broadcast");
      await ctx.reply("📢 Broadcast message එක එවන්න (text only). Cancel කිරීමට /cancel ඔබන්න.", {
        reply_markup: cancelKeyboard(lang),
      });
      return;
    }

    // ========== Approve / Reject Deposit with Multi-Language Notification ==========
    if (data.startsWith("dep:")) {
      if (!adminIds.has(user.id)) {
        await ctx.answerCallbackQuery({ text: "Admin access required", show_alert: true });
        return;
      }
      const [, action, idStr] = data.split(":");
      const id = parseInt(idStr, 10);
      const deposit = await db.getDepositById(env.DB, id);
      if (!deposit) {
        await ctx.answerCallbackQuery({ text: "Deposit record not found.", show_alert: true });
        return;
      }
      if (deposit.status !== "PENDING") {
        await ctx.answerCallbackQuery({
          text: `⚠️ මෙම තැන්පතු ඉල්ලීම දැනටමත් ${deposit.status} කර ඇත! (Already processed)`,
          show_alert: true,
        });
        try {
          const originalText = ctx.callbackQuery.message?.text || ctx.callbackQuery.message?.caption || "";
          const note = `\n\n━━━━━━━━━━━━━━\n⚠️ ALREADY PROCESSED (${deposit.status})`;
          if (ctx.callbackQuery.message?.photo) {
            await ctx.editMessageCaption({ caption: `${originalText}${note}` });
          } else {
            await ctx.editMessageText(`${originalText}${note}`);
          }
        } catch {}
        return;
      }

      const status = action === "approve" ? "APPROVED" : "REJECTED";
      const updated = await db.updateDepositStatus(env.DB, id, status);
      if (!updated) {
        await ctx.answerCallbackQuery({
          text: "⚠️ මෙම තැන්පතු ඉල්ලීම දැනටමත් වෙනත් Admin කෙනෙකු විසින් සකසා ඇත! (Already processed)",
          show_alert: true,
        });
        try {
          const originalText = ctx.callbackQuery.message?.text || ctx.callbackQuery.message?.caption || "";
          const note = `\n\n━━━━━━━━━━━━━━\n⚠️ ALREADY PROCESSED BY ANOTHER ADMIN`;
          if (ctx.callbackQuery.message?.photo) {
            await ctx.editMessageCaption({ caption: `${originalText}${note}` });
          } else {
            await ctx.editMessageText(`${originalText}${note}`);
          }
        } catch {}
        return;
      }

      const actionText = status === "APPROVED" ? "✅ APPROVED" : "❌ REJECTED";
      const adminSign = `@${escapeMarkdown(user.username || user.first_name || String(user.id))}`;
      const originalText = ctx.callbackQuery.message?.text || ctx.callbackQuery.message?.caption || "";
      const updatedText = `${originalText}\n\n━━━━━━━━━━━━━━\n${actionText} by ${adminSign}`;

      // Audit log deposit approval or rejection to Cloudflare R2
      logTransactionAudit(
        env,
        {
          category: "DEPOSIT",
          action: status as "APPROVED" | "REJECTED",
          transactionId: id,
          userId: deposit.user_id,
          username: deposit.username,
          playerId: deposit.player_id,
          amount: Number(deposit.amount),
          method: deposit.payment_method,
          status,
          performedBy: {
            adminId: user.id,
            adminUsername: user.username || user.first_name || String(user.id),
          },
          details: {
            previousStatus: deposit.status,
            r2Url: deposit.r2_url,
          },
        },
        ctx.waitUntil
      );

      // 🛡️ Permanent admin audit trail (durable, never auto-deleted unlike the 30-day R2 logs)
      ctx.waitUntil(
        db.logAdminAction(
          env.DB,
          user.id,
          user.username || user.first_name || String(user.id),
          `DEPOSIT_${status}`,
          "DEPOSIT",
          id,
          deposit.user_id,
          Number(deposit.amount),
          { playerId: deposit.player_id, method: deposit.payment_method }
        )
      );

      try {
        if (ctx.callbackQuery.message?.photo) {
          await ctx.editMessageCaption({ caption: updatedText });
        } else {
          await ctx.editMessageText(updatedText);
        }
      } catch (e) {
        console.error("Failed to edit admin message:", e);
      }

      // 🔔 Direct Multi-Language Notification to User
      try {
        const targetUser = await db.getUser(env.DB, deposit.user_id);
        const userLang = (targetUser?.language as Language) || "si";
        const userDict = t(userLang);
        const colomboDate = new Date().toLocaleString("si-LK", { timeZone: "Asia/Colombo" });

        const safePlayerId = escapeCode(deposit.player_id);
        const userMsg =
          status === "APPROVED"
            ? userDict.notifyDepApproved(Number(deposit.amount), safePlayerId, deposit.id, colomboDate)
            : userDict.notifyDepRejected(Number(deposit.amount), safePlayerId, deposit.id, colomboDate);

        await ctx.api.sendMessage(deposit.user_id, userMsg, { parse_mode: "Markdown" });
      } catch (notifErr) {
        console.error(`Failed to send notification to user ${deposit.user_id}:`, notifErr);
      }

      await ctx.answerCallbackQuery({ text: `Deposit #${id} ${status}` });
      return;
    }

    // ========== Approve / Reject Withdrawal with Multi-Language Notification ==========
    if (data.startsWith("wd:")) {
      if (!adminIds.has(user.id)) {
        await ctx.answerCallbackQuery({ text: "Admin access required", show_alert: true });
        return;
      }
      const [, action, idStr] = data.split(":");
      const id = parseInt(idStr, 10);
      const withdrawal = await db.getWithdrawalById(env.DB, id);
      if (!withdrawal) {
        await ctx.answerCallbackQuery({ text: "Withdrawal record not found.", show_alert: true });
        return;
      }
      if (withdrawal.status !== "PENDING") {
        await ctx.answerCallbackQuery({
          text: `⚠️ මෙම මුදල් ලබාගැනීමේ ඉල්ලීම දැනටමත් ${withdrawal.status} කර ඇත! (Already processed)`,
          show_alert: true,
        });
        try {
          const originalText = ctx.callbackQuery.message?.text || ctx.callbackQuery.message?.caption || "";
          const note = `\n\n━━━━━━━━━━━━━━\n⚠️ ALREADY PROCESSED (${withdrawal.status})`;
          await ctx.editMessageText(`${originalText}${note}`);
        } catch {}
        return;
      }

      const status = action === "approve" ? "APPROVED" : "REJECTED";
      const updated = await db.updateWithdrawalStatus(env.DB, id, status);
      if (!updated) {
        await ctx.answerCallbackQuery({
          text: "⚠️ මෙම මුදල් ලබාගැනීමේ ඉල්ලීම දැනටමත් වෙනත් Admin කෙනෙකු විසින් සකසා ඇත! (Already processed)",
          show_alert: true,
        });
        try {
          const originalText = ctx.callbackQuery.message?.text || ctx.callbackQuery.message?.caption || "";
          const note = `\n\n━━━━━━━━━━━━━━\n⚠️ ALREADY PROCESSED BY ANOTHER ADMIN`;
          await ctx.editMessageText(`${originalText}${note}`);
        } catch {}
        return;
      }

      const actionText = status === "APPROVED" ? "✅ APPROVED" : "❌ REJECTED";
      const adminSign = `@${escapeMarkdown(user.username || user.first_name || String(user.id))}`;
      const originalText = ctx.callbackQuery.message?.text || ctx.callbackQuery.message?.caption || "";
      const updatedText = `${originalText}\n\n━━━━━━━━━━━━━━\n${actionText} by ${adminSign}`;

      // Audit log withdrawal approval or rejection to Cloudflare R2
      logTransactionAudit(
        env,
        {
          category: "WITHDRAWAL",
          action: status as "APPROVED" | "REJECTED",
          transactionId: id,
          userId: withdrawal.user_id,
          username: withdrawal.username,
          playerId: withdrawal.player_id,
          amount: Number(withdrawal.amount),
          method: withdrawal.payment_method,
          status,
          performedBy: {
            adminId: user.id,
            adminUsername: user.username || user.first_name || String(user.id),
          },
          details: {
            previousStatus: withdrawal.status,
            destinationAccount: withdrawal.destination_account,
          },
        },
        ctx.waitUntil
      );

      // 🛡️ Permanent admin audit trail (durable, never auto-deleted unlike the 30-day R2 logs)
      ctx.waitUntil(
        db.logAdminAction(
          env.DB,
          user.id,
          user.username || user.first_name || String(user.id),
          `WITHDRAWAL_${status}`,
          "WITHDRAWAL",
          id,
          withdrawal.user_id,
          Number(withdrawal.amount),
          { playerId: withdrawal.player_id, method: withdrawal.payment_method }
        )
      );

      try {
        await ctx.editMessageText(updatedText);
      } catch (e) {
        console.error("Failed to edit admin message:", e);
      }

      // 🔔 Direct Multi-Language Notification to User
      try {
        const targetUser = await db.getUser(env.DB, withdrawal.user_id);
        const userLang = (targetUser?.language as Language) || "si";
        const userDict = t(userLang);
        const colomboDate = new Date().toLocaleString("si-LK", { timeZone: "Asia/Colombo" });

        const safePlayerId = escapeCode(withdrawal.player_id);
        const userMsg =
          status === "APPROVED"
            ? userDict.notifyWdApproved(Number(withdrawal.amount), safePlayerId, withdrawal.id, colomboDate)
            : userDict.notifyWdRejected(Number(withdrawal.amount), safePlayerId, withdrawal.id, colomboDate);

        await ctx.api.sendMessage(withdrawal.user_id, userMsg, { parse_mode: "Markdown" });
      } catch (notifErr) {
        console.error(`Failed to send notification to user ${withdrawal.user_id}:`, notifErr);
      }

      await ctx.answerCallbackQuery({ text: `Withdrawal #${id} ${status}` });
      return;
    }
  });

  // ========== General message handler (Multi-step forms & Automated FAQ) ==========
  bot.on("message", async (ctx) => {
    const user = ctx.from;
    if (!user) return;

    const state = await db.getUserState(env.DB, user.id);
    const lang = await getUserLang(env.DB, user.id);
    const dict = t(lang);

    // Cancel text check
    if (ctx.message.text && ["/cancel", "cancel", "අවලංගු", "ரத்து"].includes(ctx.message.text.trim().toLowerCase())) {
      await db.clearUserState(env.DB, user.id);
      await ctx.reply(dict.cancelled, {
        reply_markup: mainMenu(user.id, adminIds, lang),
      });
      return;
    }

    // If user entered any slash command while in a state, clear the state
    if (state && ctx.message?.text?.trim().startsWith("/")) {
      await db.clearUserState(env.DB, user.id);
      await ctx.reply(dict.cancelled, {
        reply_markup: mainMenu(user.id, adminIds, lang),
      });
      return;
    }

    // Automated Response & FAQ intent matching for non-form messages
    if (!state) {
      // If user sends a photo when no state is active, treat it as a deposit receipt confirmation!
      if (ctx.message?.photo && ctx.message.photo.length > 0) {
        const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

        // Upload screenshot to R2 and send notification to ADMIN_CHANNEL_ID
        const r2Meta = await backupReceiptToR2(env, env.BOT_TOKEN, fileId, `conf_${user.id}_${Date.now()}`);
        if (r2Meta) {
          await notifyR2ScreenshotUploadToAdminChannel(ctx, user, r2Meta, { photoFileId: fileId });
        }

        await db.setUserState(env.DB, user.id, "confirm_deposit_player_id", {
          method: "BOC",
          photo: fileId,
          r2Meta,
          r2Url: r2Meta?.r2Url || null,
          isConfirmationWorkflow: true,
        });
        await ctx.reply(dict.photoReceived, {
          parse_mode: "Markdown",
          reply_markup: cancelKeyboard(lang),
        });
        return;
      }

      const msgText = ctx.message?.text?.trim().toLowerCase() || "";
      if (!msgText) return;

      // If an unrecognized slash command reaches here, reply with a helpful prompt and main menu
      if (msgText.startsWith("/")) {
        await ctx.reply(dict.unknownCommand || "❓ නොදන්නා විධානයකි. කරුණාකර /menu භාවිත කරන්න.", {
          reply_markup: mainMenu(user.id, adminIds, lang),
        });
        return;
      }

      const min = parseFloat(env.MIN_TRANSACTION_LKR || "1000");
      const max = parseFloat(env.MAX_TRANSACTION_LKR || "100000");
      const promo = escapeCode(env.XBET_PROMO_CODE || "VGSL");
      const link = env.XBET_LINK || "https://reffpa.com/L?tag=d_2481353m_1622c_&site=2481353&ad=1622";

      // 1. Question about 1XBet Registration
      if (
        msgText.includes("register") ||
        msgText.includes("registration") ||
        msgText.includes("signup") ||
        msgText.includes("sign up") ||
        msgText.includes("account") ||
        msgText.includes("acc") ||
        msgText.includes("ලියාපදිංචි") ||
        msgText.includes("රෙජිස්ටර්") ||
        msgText.includes("පොතක්") ||
        msgText.includes("ගිණුමක්") ||
        msgText.includes("பதிவு")
      ) {
        const kb = new InlineKeyboard();
        if (link && link.startsWith("http")) {
          kb.url(dict.btnRegisterNow, link).row();
        }
        kb.text(dict.faqBtnMore, "faq_menu").text(dict.btnBack, "back");
        await ctx.reply(dict.faqAnsRegister(promo), {
          parse_mode: "Markdown",
          reply_markup: kb,
          link_preview_options: { is_disabled: true },
        });
        return;
      }

      // 2. Question about Minimum / Maximum deposit / limits
      if (
        msgText.includes("minimum") ||
        msgText.includes("min") ||
        msgText.includes("maximum") ||
        msgText.includes("max") ||
        msgText.includes("limit") ||
        msgText.includes("limits") ||
        msgText.includes("අඩුම") ||
        msgText.includes("වැඩිම") ||
        msgText.includes("කීයද") ||
        msgText.includes("ගාන") ||
        msgText.includes("ගාණ") ||
        msgText.includes("සීමා") ||
        msgText.includes("ප්‍රමාණය") ||
        msgText.includes("குறைந்தபட்ச") ||
        msgText.includes("அதிகபட்ச")
      ) {
        const kb = new InlineKeyboard()
          .text(dict.btnDeposit, "deposit")
          .text(dict.btnWithdraw, "withdraw")
          .row()
          .text(dict.faqBtnMore, "faq_menu")
          .text(dict.btnBack, "back");
        await ctx.reply(dict.faqAnsLimits(min, max), {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
        return;
      }

      // 3. Question about Cash Deposit
      if (
        msgText.includes("deposit") ||
        msgText.includes("තැන්පතු") ||
        msgText.includes("තැන්පත්") ||
        msgText.includes("සල්ලි දාන්") ||
        msgText.includes("දාන්නෙ") ||
        msgText.includes("දාන්නේ") ||
        msgText.includes("ඩිපොසිට්") ||
        msgText.includes("வைப்பு")
      ) {
        const kb = new InlineKeyboard()
          .text(dict.btnDeposit, "deposit")
          .row()
          .text(dict.faqBtnMore, "faq_menu")
          .text(dict.btnBack, "back");
        await ctx.reply(dict.faqAnsDeposit(min, max), {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
        return;
      }

      // 4. Question about Cash Withdrawal
      if (
        msgText.includes("withdraw") ||
        msgText.includes("විත්ඩ්‍රෝ") ||
        msgText.includes("ලබාගන්න") ||
        msgText.includes("සල්ලි ගන්න") ||
        msgText.includes("ගන්නේ") ||
        msgText.includes("ගන්නෙ") ||
        msgText.includes("பணம் எடுக்க")
      ) {
        const kb = new InlineKeyboard()
          .text(dict.btnWithdraw, "withdraw")
          .row()
          .text(dict.faqBtnMore, "faq_menu")
          .text(dict.btnBack, "back");
        await ctx.reply(dict.faqAnsWithdraw(), {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
        return;
      }

      // 5. Question about Player ID
      if (
        msgText.includes("player id") ||
        msgText.includes("playerid") ||
        msgText.includes("user id") ||
        msgText.includes("userid") ||
        msgText.includes("id එක") ||
        msgText.includes("අංකය") ||
        msgText.includes("මගේ id") ||
        msgText.includes("ஐடி")
      ) {
        const kb = new InlineKeyboard()
          .text(dict.faqBtnMore, "faq_menu")
          .text(dict.btnBack, "back");
        await ctx.reply(dict.faqAnsPlayerId(), {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
        return;
      }

      // 6. Question about Processing time
      if (
        msgText.includes("time") ||
        msgText.includes("කාලය") ||
        msgText.includes("වෙලාව") ||
        msgText.includes("පරක්කු") ||
        msgText.includes("duration") ||
        msgText.includes("minutes") ||
        msgText.includes("hours") ||
        msgText.includes("කොච්චර වෙලා") ||
        msgText.includes("நேரம்")
      ) {
        const kb = new InlineKeyboard()
          .text(dict.faqBtnMore, "faq_menu")
          .text(dict.btnBack, "back");
        await ctx.reply(dict.faqAnsProcessingTime(), {
          parse_mode: "Markdown",
          reply_markup: kb,
        });
        return;
      }

      // 7. General inquiry or greeting -> show Automated FAQ & Support Menu
      await showFaqMenu(ctx, lang, false);
      return;
    }

    // Broadcast handling with Telegram Rate-Limiting & 429 Backoff protection
    if (state.state === "await_broadcast" && ctx.message.text) {
      if (!adminIds.has(user.id)) return;
      const userIds = await db.getAllUserIds(env.DB);
      if (userIds.length === 0) {
        await db.clearUserState(env.DB, user.id);
        await ctx.reply("ℹ️ Broadcast යැවීමට ලියාපදිංචි පරිශීලකයින් නොමැත.", {
          reply_markup: mainMenu(user.id, adminIds, lang),
        });
        return;
      }

      await ctx.reply(
        `📢 *Broadcast ආරම්භ විය (Started)*\n\n` +
        `👥 මුළු සාමාජිකයින්: *${userIds.length}*\n` +
        `⏳ Telegram Rate Limit (25 msg/s) ආරක්ෂාව සමඟ යවමින් පවතී...`,
        { parse_mode: "Markdown" }
      );

      const broadcastText = `📢 *Announcement:*\n\n${escapeMarkdown(ctx.message.text)}`;
      const adminChatId = ctx.chat.id;
      const api = ctx.api;

      // Cloudflare Workers abort a request handler that runs too long, and
      // Telegram re-delivers the update - which would send the broadcast twice.
      // So the send loop runs as a background task via waitUntil().
      const broadcastTask = (async () => {
        let success = 0;
        let blocked = 0;
        let failed = 0;

        for (const uid of userIds) {
          let sent = false;
          let retries = 0;
          while (!sent && retries < 3) {
            try {
              await api.sendMessage(uid, broadcastText, { parse_mode: "Markdown" });
              success++;
              sent = true;
            } catch (err: any) {
              if (err?.error_code === 429) {
                const retryAfter = (err.parameters?.retry_after || 1) * 1000;
                await new Promise((resolve) => setTimeout(resolve, retryAfter + 100));
                retries++;
              } else if (err?.error_code === 403 || err?.description?.includes("blocked")) {
                blocked++;
                sent = true;
              } else {
                failed++;
                sent = true;
              }
            }
          }
          // Stay within Telegram's ~30 msg/s ceiling.
          await new Promise((resolve) => setTimeout(resolve, 40));
        }

        await api.sendMessage(
          adminChatId,
          `✅ *Broadcast සාර්ථකව අවසන් විය (Finished):*\n\n` +
            `• 📩 සාර්ථකව ලැබුණු ගණන (Delivered): *${success}*\n` +
            `• 🚫 Bot Block කළ ගණන (Blocked): *${blocked}*\n` +
            `• ⚠️ අසාර්ථක වූ ගණන (Failed): *${failed}*\n` +
            `• 👥 මුළු පරිශීලකයින් (Total): *${userIds.length}*`,
          { parse_mode: "Markdown", reply_markup: mainMenu(user.id, adminIds, lang) }
        );
      })();

      await db.clearUserState(env.DB, user.id);
      ctx.waitUntil(broadcastTask);
      return;
    }

    // ===== Deposit Flow & Confirm Deposit Flow =====
    // Step 1: Deposit Photo Validation
    if (state.state === "deposit_photo" || state.state === "confirm_deposit_photo") {
      if (!ctx.message.photo || ctx.message.photo.length === 0) {
        await ctx.reply(dict.invalidPhoto, {
          parse_mode: "Markdown",
          reply_markup: cancelKeyboard(lang),
        });
        return;
      }
      const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

      let r2Meta: R2FileMetadata | null = null;
      if (state.state === "confirm_deposit_photo") {
        // Upload screenshot to R2 and send notification to ADMIN_CHANNEL_ID
        r2Meta = await backupReceiptToR2(env, env.BOT_TOKEN, fileId, `conf_${user.id}_${Date.now()}`);
        if (r2Meta) {
          const methodName = getMethodDisplayName(state.data?.method, lang);
          await notifyR2ScreenshotUploadToAdminChannel(ctx, user, r2Meta, {
            photoFileId: fileId,
            methodName,
          });
        }
      }

      const nextState =
        state.state === "confirm_deposit_photo"
          ? "confirm_deposit_player_id"
          : "deposit_player_id";
      await db.setUserState(env.DB, user.id, nextState, {
        ...state.data,
        photo: fileId,
        ...(r2Meta ? { r2Meta, r2Url: r2Meta.r2Url } : {}),
      });
      await ctx.reply(dict.photoReceived, {
        parse_mode: "Markdown",
        reply_markup: cancelKeyboard(lang),
      });
      return;
    }

    // Step 2: Deposit Player ID Validation
    if (
      (state.state === "deposit_player_id" || state.state === "confirm_deposit_player_id") &&
      ctx.message.text
    ) {
      const playerId = ctx.message.text.trim();
      if (!/^\d{6,20}$/.test(playerId) || /^0+$/.test(playerId)) {
        await ctx.reply(dict.invalidPlayerId, {
          parse_mode: "Markdown",
          reply_markup: cancelKeyboard(lang),
        });
        return;
      }
      const nextState =
        state.state === "confirm_deposit_player_id"
          ? "confirm_deposit_amount"
          : "deposit_amount";
      await db.setUserState(env.DB, user.id, nextState, { ...state.data, playerId });
      const min = parseFloat(env.MIN_TRANSACTION_LKR);
      const max = parseFloat(env.MAX_TRANSACTION_LKR);
      await ctx.reply(dict.depositStepAmount(playerId, min, max), {
        parse_mode: "Markdown",
        reply_markup: quickAmountKeyboard("dep_amt", lang),
      });
      return;
    }

    // Step 3: Deposit Amount Validation
    if (
      (state.state === "deposit_amount" || state.state === "confirm_deposit_amount") &&
      ctx.message.text
    ) {
      const textAmount = ctx.message.text.trim().replace(/,/g, "");
      const isValidNumber = /^\d+(\.\d{1,2})?$/.test(textAmount);
      const amount = parseFloat(textAmount);
      const min = parseFloat(env.MIN_TRANSACTION_LKR);
      const max = parseFloat(env.MAX_TRANSACTION_LKR);

      if (!isValidNumber || isNaN(amount) || amount <= 0) {
        await ctx.reply(dict.invalidAmount, {
          parse_mode: "Markdown",
          reply_markup: cancelKeyboard(lang),
        });
        return;
      }

      if (amount < min) {
        await ctx.reply(dict.amountBelowMin(min), {
          parse_mode: "Markdown",
          reply_markup: cancelKeyboard(lang),
        });
        return;
      }

      if (amount > max) {
        await ctx.reply(dict.amountAboveMax(max), {
          parse_mode: "Markdown",
          reply_markup: cancelKeyboard(lang),
        });
        return;
      }

      const { photo, playerId, method = "BANK", isConfirmationWorkflow = false } = state.data;
      const methodName = getMethodDisplayName(method, lang);

      // 🛡️ Rate limit: block rapid repeated deposit submissions from the same user
      const depRateCheck2 = await fraud.checkRateLimit(env.DB, user.id, "deposits");
      if (!depRateCheck2.allowed) {
        await ctx.reply(depRateCheck2.blockMessage || "Rate limit exceeded.", {
          reply_markup: mainMenu(user.id, adminIds, lang),
        });
        return;
      }

      try {
        const requestId = await db.addDeposit(
          env.DB,
          user.id,
          user.username || user.first_name || null,
          playerId,
          amount,
          photo,
          method,
          null
        );
        await db.clearUserState(env.DB, user.id);

        // 🛡️ Fraud checks: duplicate receipt & shared player ID (non-blocking, flagged for admin review)
        const depFraud2 = await fraud.checkDepositFraud(env.DB, user.id, playerId, photo || null);

        // Audit log transaction creation to Cloudflare R2
        logTransactionAudit(
          env,
          {
            category: "DEPOSIT",
            action: "CREATED",
            transactionId: requestId,
            userId: user.id,
            username: user.username || user.first_name || null,
            playerId,
            amount,
            method,
            status: "PENDING",
            details: { photoFileId: photo, isConfirmationWorkflow, fraudFlags: depFraud2.flags },
          },
          ctx.waitUntil
        );

        // Backup Receipt to Cloudflare R2
        let r2Meta: R2FileMetadata | null = state.data?.r2Meta || null;
        let r2Url: string | null = state.data?.r2Url || r2Meta?.r2Url || null;
        if (r2Url) {
          await db.updateDepositR2Url(env.DB, requestId, r2Url);
        } else if (photo) {
          try {
            const backup = await backupReceiptToR2(env, env.BOT_TOKEN, photo, requestId);
            if (backup?.r2Url) {
              r2Meta = backup;
              r2Url = backup.r2Url;
              await db.updateDepositR2Url(env.DB, requestId, backup.r2Url);
              if (isConfirmationWorkflow) {
                await notifyR2ScreenshotUploadToAdminChannel(ctx, user, backup, {
                  requestId,
                  playerId,
                  amount,
                  methodName,
                  photoFileId: photo,
                });
              }
            }
          } catch (r2Err) {
            console.error("[R2] Async receipt backup failed:", r2Err);
          }
        }

        // Notify Admin Channel and Individual Admins
        await notifyDepositSubmission(
          ctx,
          requestId,
          user,
          playerId,
          amount,
          methodName,
          photo,
          r2Url,
          Boolean(isConfirmationWorkflow),
          r2Meta,
          depFraud2.flags
        );

        if (isConfirmationWorkflow) {
          await ctx.reply(
            dict.confirmDepositSubmitted(
              requestId,
              amount,
              escapeCode(playerId),
              escapeMarkdown(methodName),
              Boolean(r2Url)
            ),
            {
              parse_mode: "Markdown",
              reply_markup: mainMenu(user.id, adminIds, lang),
            }
          );
        } else {
          await ctx.reply(
            dict.depositSubmitted(requestId, amount, escapeCode(playerId), escapeMarkdown(methodName)),
            {
              parse_mode: "Markdown",
              reply_markup: mainMenu(user.id, adminIds, lang),
            }
          );
        }
      } catch (err) {
        console.error("[Manual Deposit Error]:", err);
        logBotError(
          env,
          {
            source: "DepositManualAmount",
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            context: {
              userId: user.id,
              username: user.username,
              flow: "deposit_manual_amount",
              payload: { amount, playerId, method, isConfirmationWorkflow },
            },
          },
          ctx.waitUntil
        );
        await ctx.reply(dict.transactionFailed, {
          parse_mode: "Markdown",
          reply_markup: mainMenu(user.id, adminIds, lang),
        });
      }
      return;
    }

    // ===== Withdraw Flow =====
    // Step 1: Destination Account / Wallet Details
    if (state.state === "withdraw_details" && ctx.message.text) {
      const destinationAccount = ctx.message.text.trim();
      if (!destinationAccount || destinationAccount.length < 4) {
        await ctx.reply(dict.invalidAccountDetails, {
          parse_mode: "Markdown",
          reply_markup: cancelKeyboard(lang),
        });
        return;
      }
      await db.setUserState(env.DB, user.id, "withdraw_player_id", {
        ...state.data,
        destinationAccount,
      });
      await ctx.reply(dict.withdrawStepPlayerId(destinationAccount), {
        parse_mode: "Markdown",
        reply_markup: cancelKeyboard(lang),
      });
      return;
    }

    // Step 2: Withdraw Player ID Validation
    if (state.state === "withdraw_player_id" && ctx.message.text) {
      const playerId = ctx.message.text.trim();
      if (!/^\d{6,20}$/.test(playerId) || /^0+$/.test(playerId)) {
        await ctx.reply(dict.invalidPlayerId, {
          parse_mode: "Markdown",
          reply_markup: cancelKeyboard(lang),
        });
        return;
      }
      await db.setUserState(env.DB, user.id, "withdraw_amount", {
        ...state.data,
        playerId,
      });
      const min = parseFloat(env.MIN_TRANSACTION_LKR);
      const max = parseFloat(env.MAX_TRANSACTION_LKR);
      await ctx.reply(dict.withdrawStepAmount(playerId, min, max), {
        parse_mode: "Markdown",
        reply_markup: quickAmountKeyboard("wd_amt", lang),
      });
      return;
    }

    // Step 3: Withdraw Amount Validation
    if (state.state === "withdraw_amount" && ctx.message.text) {
      const textAmount = ctx.message.text.trim().replace(/,/g, "");
      const isValidNumber = /^\d+(\.\d{1,2})?$/.test(textAmount);
      const amount = parseFloat(textAmount);
      const min = parseFloat(env.MIN_TRANSACTION_LKR);
      const max = parseFloat(env.MAX_TRANSACTION_LKR);

      if (!isValidNumber || isNaN(amount) || amount <= 0) {
        await ctx.reply(dict.invalidAmount, {
          parse_mode: "Markdown",
          reply_markup: cancelKeyboard(lang),
        });
        return;
      }

      if (amount < min) {
        await ctx.reply(dict.amountBelowMin(min), {
          parse_mode: "Markdown",
          reply_markup: cancelKeyboard(lang),
        });
        return;
      }

      if (amount > max) {
        await ctx.reply(dict.amountAboveMax(max), {
          parse_mode: "Markdown",
          reply_markup: cancelKeyboard(lang),
        });
        return;
      }

      await db.setUserState(env.DB, user.id, "withdraw_code", { ...state.data, amount });
      await ctx.reply(dict.withdrawStepCode(amount), {
        parse_mode: "Markdown",
        reply_markup: cancelKeyboard(lang),
      });
      return;
    }

    // Step 4: Withdraw Security Code Validation
    if (state.state === "withdraw_code" && ctx.message.text) {
      const code = ctx.message.text.trim();
      if (!code || code.length < 3 || code.length > 100) {
        await ctx.reply(dict.invalidSecurityCode, {
          parse_mode: "Markdown",
          reply_markup: cancelKeyboard(lang),
        });
        return;
      }

      const { playerId, amount, method = "BANK", destinationAccount = "N/A" } = state.data;
      const methodName = getMethodDisplayName(method, lang);

      // 🛡️ Rate limit: block rapid repeated withdrawal submissions from the same user
      const wdRateCheck = await fraud.checkRateLimit(env.DB, user.id, "withdrawals");
      if (!wdRateCheck.allowed) {
        await ctx.reply(wdRateCheck.blockMessage || "Rate limit exceeded.", {
          reply_markup: mainMenu(user.id, adminIds, lang),
        });
        return;
      }

      try {
        const requestId = await db.addWithdrawal(
          env.DB,
          user.id,
          user.username || user.first_name || null,
          playerId,
          amount,
          code,
          method,
          destinationAccount
        );
        await db.clearUserState(env.DB, user.id);

        // 🛡️ Fraud check: player ID already used by another Telegram account (non-blocking)
        const wdFraud = await fraud.checkWithdrawalFraud(env.DB, user.id, playerId);

        // Audit log withdrawal creation to Cloudflare R2
        logTransactionAudit(
          env,
          {
            category: "WITHDRAWAL",
            action: "CREATED",
            transactionId: requestId,
            userId: user.id,
            username: user.username || user.first_name || null,
            playerId,
            amount,
            method,
            status: "PENDING",
            details: { destinationAccount, fraudFlags: wdFraud.flags },
          },
          ctx.waitUntil
        );
        const fraudBanner = fraud.formatFraudBanner(wdFraud.flags);
        const alert =
          `🔔 *NEW WITHDRAWAL REQUEST #${requestId}*\n\n` +
          (fraudBanner ? `${fraudBanner}\n` : "") +
          `👤 *User:* ${escapeMarkdown(user.first_name || "User")} (@${escapeMarkdown(user.username || "none")})\n` +
          `🆔 *User ID:* \`${user.id}\`\n` +
          `💳 *Method:* *${escapeMarkdown(methodName)}*\n` +
          `🏦 *Destination Account:* \`${escapeCode(destinationAccount)}\`\n` +
          `🎮 *Player ID:* \`${escapeCode(playerId)}\`\n` +
          `💰 *Amount:* LKR *${amount.toLocaleString()}*\n` +
          `🔐 *Security Code:* \`${escapeCode(code)}\`\n` +
          `📅 *Time:* ${new Date().toLocaleString("si-LK", { timeZone: "Asia/Colombo" })}`;

        const adminKb = new InlineKeyboard()
          .text("✅ Approve", `wd:approve:${requestId}`)
          .text("❌ Reject", `wd:reject:${requestId}`);

        for (const adminId of adminIds) {
          try {
            await ctx.api.sendMessage(adminId, alert, {
              parse_mode: "Markdown",
              reply_markup: adminKb,
            });
          } catch (err) {
            console.error(`Failed to alert admin ${adminId}:`, err);
          }
        }

        await ctx.reply(dict.withdrawSubmitted(requestId, amount, escapeCode(playerId), escapeMarkdown(methodName)), {
          parse_mode: "Markdown",
          reply_markup: mainMenu(user.id, adminIds, lang),
        });
      } catch (err) {
        console.error("[Withdrawal Submission Error]:", err);
        logBotError(
          env,
          {
            source: "WithdrawalSubmission",
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            context: {
              userId: user.id,
              username: user.username,
              flow: "withdraw_code",
              payload: { amount, playerId, method, destinationAccount },
            },
          },
          ctx.waitUntil
        );
        await ctx.reply(dict.transactionFailed, {
          parse_mode: "Markdown",
          reply_markup: mainMenu(user.id, adminIds, lang),
        });
      }
      return;
    }
  });

  // Global error handler to prevent silent drops and raw stack traces
  bot.catch(async (err) => {
    const ctx = err.ctx;
    const error = err.error;

    // Log detailed technical telemetry server-side
    const errMessage = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    const errSource =
      error instanceof GrammyError
        ? "GrammyError"
        : error instanceof HttpError
        ? "HttpError"
        : "UnhandledBotError";

    if (error instanceof GrammyError) {
      console.error(`[Telegram GrammyError] Update ${ctx.update.update_id}:`, error.description);
    } else if (error instanceof HttpError) {
      console.error(`[Telegram HttpError] Update ${ctx.update.update_id}:`, error.message);
    } else {
      console.error(`[Bot Unhandled Error] Update ${ctx.update.update_id}:`, error);
    }

    // Persist structured error log to Cloudflare R2
    logBotError(
      env,
      {
        source: errSource,
        message: errMessage,
        stack: errStack,
        errorDetails:
          error instanceof GrammyError
            ? { description: error.description, parameters: error.parameters }
            : undefined,
        context: {
          updateId: ctx.update?.update_id,
          userId: ctx.from?.id,
          username: ctx.from?.username,
          chatId: ctx.chat?.id,
        },
      },
      ctx.waitUntil
    );

    // Safely dismiss pending callback queries to stop spinner
    if (ctx.callbackQuery) {
      try {
        await ctx.answerCallbackQuery({
          text: "⚠️ කරුණාකර සුළු මොහොතකින් නැවත උත්සාහ කරන්න.",
          show_alert: false,
        });
      } catch {}
    }

    // Deliver user-friendly, non-technical recovery message
    try {
      const userId = ctx.from?.id;
      if (userId && ctx.chat?.id) {
        let lang: Language = "si";
        try {
          lang = await getUserLang(env.DB, userId);
        } catch {}
        const dict = t(lang);

        await ctx.reply(dict.genericError, {
          parse_mode: "Markdown",
          reply_markup: mainMenu(userId, adminIds, lang),
        });
      }
    } catch (fallbackErr) {
      console.error("[Bot Error Handler] Failed to dispatch user-friendly error response:", fallbackErr);
    }
  });

  return bot;
}

function mainMenu(userId: number, adminIds: Set<number>, lang: Language = "si") {
  const dict = t(lang);
  const kb = new InlineKeyboard()
    .text(dict.btnDeposit, "deposit")
    .text(dict.btnWithdraw, "withdraw")
    .row()
    .text(dict.btnConfirmDeposit, "confirm_deposit")
    .text(dict.btnHistory, "history")
    .row()
    .text(dict.btnRegistration, "xbet")
    .text(dict.btnReferral, "referral")
    .row()
    .text(dict.btnLanguage, "choose_lang")
    .text(dict.btnHelp, "help");

  if (adminIds.has(userId)) {
    kb.row().text("🧑‍💼 Admin Panel", "admin_panel");
  }
  return kb;
}

function formatAdminStats(stats: SystemStats): string {
  const netApprovedVolume = stats.approvedDepositsVolume - stats.approvedWithdrawalsVolume;
  return (
    `📊 *XBET ADMIN ANALYTICS & REPORTS*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👥 *පරිශීලක සංඛ්‍යාලේඛන (Users):*\n` +
    `• මුළු සාමාජිකයින් (Total Users): *${stats.totalUsers.toLocaleString()}*\n` +
    `• අද ලියාපදිංචි වූවන් (Today's New): *${stats.todayUsers.toLocaleString()}*\n\n` +
    `💰 *තැන්පතු වාර්තාව (Deposits):*\n` +
    `• අනුමත මුළු මුදල (Approved Volume): *LKR ${stats.approvedDepositsVolume.toLocaleString()}*\n` +
    `• අනුමත ගණන (Approved Count): *${stats.approvedDepositsCount.toLocaleString()}*\n` +
    `• අද අනුමත මුදල (Today's Volume): *LKR ${stats.todayDepositsVolume.toLocaleString()}*\n` +
    `• පොරොත්තු ඉල්ලීම් (Pending): *${stats.pendingDeposits.toLocaleString()}*\n` +
    `• ප්‍රතික්ෂේප වූ ගණන (Rejected): *${stats.rejectedDepositsCount.toLocaleString()}*\n\n` +
    `💸 *මුදල් ලබාගැනීම් (Withdrawals):*\n` +
    `• අනුමත මුළු මුදල (Approved Volume): *LKR ${stats.approvedWithdrawalsVolume.toLocaleString()}*\n` +
    `• අනුමත ගණන (Approved Count): *${stats.approvedWithdrawalsCount.toLocaleString()}*\n` +
    `• අද ගෙවූ මුදල (Today's Volume): *LKR ${stats.todayWithdrawalsVolume.toLocaleString()}*\n` +
    `• පොරොත්තු ඉල්ලීම් (Pending): *${stats.pendingWithdrawals.toLocaleString()}*\n` +
    `• ප්‍රතික්ෂේප වූ ගණන (Rejected): *${stats.rejectedWithdrawalsCount.toLocaleString()}*\n\n` +
    `📈 *ශුද්ධ ලැබීම (Net Cash Flow):*\n` +
    `• *L