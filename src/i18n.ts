export type Language = "si" | "en" | "ta";

export type PaymentMethod =
  | "BOC"
  | "PEOPLES"
  | "SAMPATH"
  | "LOLC"
  | "IPAY"
  | "EZCASH"
  | "BANK"
  | "MCASH"
  | "FRIMI";

export const PAYMENT_METHOD_NAMES: Record<PaymentMethod, { si: string; en: string; ta: string }> = {
  BOC: {
    si: "🏦 BOC Bank (ලංකා බැංකුව)",
    en: "🏦 BOC Bank (Bank of Ceylon)",
    ta: "🏦 BOC வங்கி (Bank of Ceylon)",
  },
  PEOPLES: {
    si: "🏦 People's Bank (මහජන බැංකුව)",
    en: "🏦 People's Bank",
    ta: "🏦 மக்கள் வங்கி (People's Bank)",
  },
  SAMPATH: {
    si: "🏦 Sampath Bank (සම්පත් බැංකුව)",
    en: "🏦 Sampath Bank",
    ta: "🏦 சம்பத் வங்கி (Sampath Bank)",
  },
  LOLC: {
    si: "🏦 LOLC Bank / Finance",
    en: "🏦 LOLC Bank / Finance",
    ta: "🏦 LOLC வங்கி (LOLC Bank)",
  },
  IPAY: {
    si: "📱 iPay Mobile (0740452530)",
    en: "📱 iPay Mobile (0740452530)",
    ta: "📱 iPay Mobile (0740452530)",
  },
  EZCASH: {
    si: "📱 eZ Cash Mobile (0703346455)",
    en: "📱 eZ Cash Mobile (0703346455)",
    ta: "📱 eZ Cash Mobile (0703346455)",
  },
  BANK: {
    si: "🏦 Other Bank (වෙනත් බැංකු)",
    en: "🏦 Other Bank Transfer",
    ta: "🏦 பிற வங்கி (Other Bank)",
  },
  MCASH: {
    si: "📲 mCash (Mobitel)",
    en: "📲 mCash (Mobitel)",
    ta: "📲 mCash (Mobitel)",
  },
  FRIMI: {
    si: "💳 FriMi (Nations Trust)",
    en: "💳 FriMi (Nations Trust)",
    ta: "💳 FriMi (Nations Trust)",
  },
};

export const translations = {
  si: {
    welcome: (name: string) => `👋 ආයුබෝවන් ${name}! පහත menu එකෙන් ඔබට අවශ්‍ය සේවාව තෝරන්න.`,
    chooseLanguage: "🌐 කරුණාකර ඔබගේ භාෂාව තෝරන්න / Please choose your language / உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்:",
    languageChanged: "✅ භාෂාව සිංහල ලෙස වෙනස් කරන ලදී.",
    cancelBtn: "❌ Cancel (අවලංගු කරන්න)",
    cancelled: "❌ සියලුම ක්‍රියාකාරකම් අවලංගු කරන ලදී (Cancelled).\n\nපහත මෙනුවෙන් සේවාවක් තෝරන්න:",
    mainMenuHeader: "📋 ප්‍රධාන මෙනුව (Main Menu):",
    btnDeposit: "💰 Cash Deposit (තැන්පතු)",
    btnConfirmDeposit: "📸 Confirm Deposit (තහවුරු කරන්න)",
    btnWithdraw: "💸 Cash Withdrawal (මුදල් ලබාගැනීම)",
    btnHistory: "📜 ගනුදෙනු ඉතිහාසය (History)",
    btnRegistration: "🎯 1XBet Registration",
    btnReferral: "🔄 Referral Dashboard",
    btnLanguage: "🌐 Language (භාෂාව)",
    btnHelp: "❓ සහාය (Help)",
    btnBack: "⬅️ Back (ආපසු)",
    forceJoinMsg: "බොට් භාවිතා කිරීමට පෙර කරුණාකර අපගේ නිල channel එක join කරන්න.",
    joinChannelBtn: "📢 Join Channel",
    checkJoinBtn: "✅ මම Join වුණා (Joined)",
    notJoinedAlert: "⚠️ ඔබ තවමත් channel එකට join වී නොමැත. කරුණාකර පළමුව channel එකට join වී නැවත උත්සාහ කරන්න.",
    
    // 1XBet Registration
    registrationHeader: "🎯 *1XBET REGISTRATION (ලියාපදිංචි වීම)*",
    registrationInstructions: (promoCode: string) =>
      `පහත ඇති නිල ලියාපදිංචි කිරීමේ බොත්තම (Official Link) මඟින් 1XBet වෙබ් අඩවියට පිවිසෙන්න.\n\n` +
      `🎁 *VIP Promo Code:* \`${promoCode}\`\n\n` +
      `💡 *උපදෙස්:*\n` +
      `• ලියාපදිංචි වීමේදී ඉහත Promo Code එක යොදා විශේෂ තැන්පතු Bonus ලබාගන්න.\n` +
      `• ලියාපදිංචි වූ පසු ලැබෙන Numeric Player ID එක අපගේ බොට් හරහා Cash Deposit සහ Withdrawal සඳහා භාවිතා කරන්න.`,
    btnRegisterNow: "🔗 1XBet හි ලියාපදිංචි වන්න",
    
    // Deposit
    selectDepositMethod: "💰 *DEPOSIT REQUEST (තැන්පතු ඉල්ලීම)*\n\nකරුණාකර ඔබ මුදල් ගෙවීමට බලාපොරොත්තු වන ගෙවීම් ක්‍රමය (Payment Method) තෝරන්න:",
    confirmDepositPrompt:
      `📸 *CONFIRM DEPOSIT (තැන්පතු තහවුරු කිරීම)*\n\n` +
      `ඔබ සිදුකළ ගෙවීම් රිසිට්පතෙහි හෝ Transaction Screenshot එකෙහි පැහැදිලි ඡායාරූපයක් (Photo) මෙහි එවන්න.\n\n` +
      `_පහතින් ඔබ මුදල් ගෙවූ ගිණුම/ක්‍රමය තෝරාගත හැක:_`,
    depositStepPhoto: (methodName: string, instructions: string) =>
      `💰 *DEPOSIT — ${methodName}*\n\n` +
      `${instructions}\n\n` +
      `📸 *පියවර 1/3:* කරුණාකර ඔබ මුදල් ගෙවූ Payment Receipt එකෙහි පැහැදිලි Screenshot එකක් හෝ Photo එකක් මෙහි එවන්න.`,
    invalidPhoto: "⚠️ *කරුණාකර Payment Receipt Photo එකක් එවන්න!*\n\nඔබ මුදල් ගෙවූ Slip එකෙහි හෝ Transfer Screenshot එකෙහි පැහැදිලි ඡායාරූපයක් (Photo) එවන්න.",
    photoReceived: "✅ *Receipt ඡායාරූපය ලැබුණා!*\n\n🆔 *පියවර 2/3:* කරුණාකර ඔබගේ 1XBet Numeric Player ID එක ඇතුළත් කරන්න (ඉලක්කම් 6 සිට 20 දක්වා).\n_(උදාහරණයක් ලෙස: `12345678`)_",
    invalidPlayerId: "⚠️ *අවලංගු Player ID එකකි!*\n\nකරුණාකර ඉලක්කම් පමණක් අඩංගු වලංගු Player ID එකක් ඇතුළත් කරන්න (අවම ඉලක්කම් 6ක්, උපරිම 20ක්).\n_(උදා: `12345678`)_",
    depositStepAmount: (playerId: string, min: number, max: number) =>
      `✅ Player ID: \`${playerId}\` තහවුරු විය.\n\n` +
      `💵 *පියවර 3/3:* කරුණාකර තැන්පත් කළ මුදල (LKR) ඇතුළත් කරන්න.\n` +
      `📊 අවම: *LKR ${min.toLocaleString()}* | උපරිම: *LKR ${max.toLocaleString()}*\n` +
      `_(උදා: ${Math.max(min, 2000)})_`,
    invalidAmount: "⚠️ *අවලංගු මුදල් ප්‍රමාණයකි!*\n\nකරුණාකර ඉලක්කම් පමණක් භාවිතයෙන් නිවැරදි මුදල ඇතුළත් කරන්න (උදා: `5000`).",
    amountBelowMin: (min: number) => `⚠️ *අවම සීමාවට වඩා අඩුයි!*\n\nඅවම ගනුදෙනු මුදල *LKR ${min.toLocaleString()}* කි. කරුණාකර ඊට සමාන හෝ වැඩි මුදලක් ඇතුළත් කරන්න.`,
    amountAboveMax: (max: number) => `⚠️ *උපරිම සීමාව ඉක්මවා ඇත!*\n\nඋපරිම ගනුදෙනු මුදල *LKR ${max.toLocaleString()}* කි. කරුණාකර ඊට අඩු මුදලක් ඇතුළත් කරන්න.`,
    depositSubmitted: (id: number, amount: number, playerId: string, method: string) =>
      `✅ *Deposit Request #${id} සාර්ථකව යොමු කරන ලදී!*\n\n` +
      `💳 ක්‍රමය: *${method}*\n` +
      `💰 මුදල: *LKR ${amount.toLocaleString()}*\n` +
      `🆔 Player ID: \`${playerId}\`\n\n` +
      `Admin කණ්ඩායම විසින් පරීක්ෂා කර සුළු වේලාවකින් Approve කරනු ඇත. තහවුරු වූ වහාම ඔබට මෙහි notification message එකක් ලැබෙනු ඇත.`,
    confirmDepositSubmitted: (id: number, amount: number, playerId: string, method: string, r2BackedUp: boolean) =>
      `✅ *තැන්පතු තහවුරු කිරීම සාර්ථකව යොමු කෙරිණි!*\n*(Deposit Confirmation Submitted)*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔖 *Request ID:* #${id}\n` +
      `💰 *මුදල:* LKR *${amount.toLocaleString()}*\n` +
      `🎮 *Player ID:* \`${playerId}\`\n` +
      `💳 *ගෙවීම් ක්‍රමය:* *${method}*\n` +
      `☁️ *Cloudflare R2:* ${r2BackedUp ? "✅ සාර්ථකව සුරකින ලදී (Backed Up)" : "⏳ ක්‍රියාත්මක වෙමින් පවතී"}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ Admin කණ්ඩායම විසින් පරීක්ෂා කර මිනිත්තු කිහිපයක් ඇතුළත Player Account එකට බැර කරනු ඇත.`,

    // Withdrawal
    selectWithdrawMethod: "💸 *WITHDRAWAL REQUEST (මුදල් ලබාගැනීම)*\n\nකරුණාකර මුදල් ලබාගැනීමට අවශ්‍ය ගෙවීම් ක්‍රමය තෝරන්න:",
    withdrawStepDetails: (methodName: string) =>
      `💸 *WITHDRAWAL — ${methodName}*\n\n` +
      `🏦 *පියවර 1/4:* කරුණාකර මුදල් ලබාගන්නා ගිණුම් අංකය හෝ Wallet අංකය ඇතුළත් කරන්න:\n` +
      `_(Bank Account No + Bank Name, හෝ eZ Cash / mCash / FriMi අංකය)_`,
    invalidAccountDetails: "⚠️ කරුණාකර වලංගු ගිණුම් හෝ Wallet අංකයක් ඇතුළත් කරන්න.",
    withdrawStepPlayerId: (account: string) =>
      `✅ ගිණුම් විස්තරය: \`${account}\` සටහන් විය.\n\n` +
      `🆔 *පියවර 2/4:* කරුණාකර ඔබගේ 1XBet Numeric Player ID එක ඇතුළත් කරන්න (ඉලක්කම් 6–20).`,
    withdrawStepAmount: (playerId: string, min: number, max: number) =>
      `✅ Player ID: \`${playerId}\` තහවුරු විය.\n\n` +
      `💵 *පියවර 3/4:* කරුණාකර Withdrawal කිරීමට අවශ්‍ය මුදල (LKR) ඇතුළත් කරන්න.\n` +
      `📊 අවම: *LKR ${min.toLocaleString()}* | උපරිම: *LKR ${max.toLocaleString()}*\n` +
      `_(උදා: ${Math.max(min, 3000)})_`,
    withdrawStepCode: (amount: number) =>
      `✅ මුදල: LKR *${amount.toLocaleString()}*\n\n` +
      `🔐 *පියවර 4/4:* කරුණාකර ඔබගේ 1XBet Withdrawal Security Code එක ඇතුළත් කරන්න.\n` +
      `_(මෙය ආරක්ෂිතව තහවුරු කරනු ලැබේ)_`,
    invalidSecurityCode: "⚠️ *අවලංගු Security Code එකකි!*\n\nකරුණාකර අවම වශයෙන් අක්ෂර 3කට වැඩි වලංගු Security code එකක් ඇතුළත් කරන්න.",
    withdrawSubmitted: (id: number, amount: number, playerId: string, method: string) =>
      `✅ *Withdrawal Request #${id} සාර්ථකව යොමු කරන ලදී!*\n\n` +
      `💳 ක්‍රමය: *${method}*\n` +
      `💰 මුදල: *LKR ${amount.toLocaleString()}*\n` +
      `🆔 Player ID: \`${playerId}\`\n\n` +
      `Admin කණ්ඩායම විසින් පරීක්ෂා කර සුළු වේලාවකින් මුදල් නිදහස් කරනු ඇත. තහවුරු වූ වහාම ඔබට මෙහි notification message එකක් ලැබෙනු ඇත.`,

    // User Notifications on Admin Action
    notifyDepApproved: (amount: number, playerId: string, id: number, date: string) =>
      `🎉 *Deposit Approved! (තහවුරු විය)*\n\n` +
      `✅ ඔබගේ LKR *${amount.toLocaleString()}* ක මුදල සාර්ථකව Player Account එකට බැර කරන ලදී!\n\n` +
      `🆔 *Player ID:* \`${playerId}\`\n` +
      `🔢 *Request ID:* #${id}\n` +
      `📅 *දිනය:* ${date}\n\n` +
      `ඔබගේ Player Account එක පරීක්ෂා කර බලන්න. සුභ පැතුම්! 🏆`,
    notifyDepRejected: (amount: number, playerId: string, id: number, date: string) =>
      `⚠️ *Deposit Rejected (ප්‍රතික්ෂේප විය)*\n\n` +
      `❌ ඔබගේ LKR *${amount.toLocaleString()}* ක Deposit ඉල්ලීම (Request #${id}) Admin විසින් ප්‍රතික්ෂේප කරන ලදී.\n\n` +
      `🆔 *Player ID:* \`${playerId}\`\n` +
      `📅 *දිනය:* ${date}\n\n` +
      `කරුණාකර නිවැරදි Payment Slip එකක් සහිතව නැවත උත්සාහ කරන්න හෝ විමසීම් සඳහා Admin සහය ලබාගන්න.`,
    notifyWdApproved: (amount: number, playerId: string, id: number, date: string) =>
      `🎉 *Withdrawal Approved! (තහවුරු විය)*\n\n` +
      `✅ ඔබගේ LKR *${amount.toLocaleString()}* ක Withdrawal ඉල්ලීම සාර්ථකව සම්පූර්ණ කරන ලදී!\n\n` +
      `🆔 *Player ID:* \`${playerId}\`\n` +
      `🔢 *Request ID:* #${id}\n` +
      `📅 *දිනය:* ${date}\n\n` +
      `මුදල් ඔබගේ ගිණුමට ලැබී ඇත්දැයි පරීක්ෂා කර බලන්න. ස්තූතියි! 💰`,
    notifyWdRejected: (amount: number, playerId: string, id: number, date: string) =>
      `⚠️ *Withdrawal Rejected (ප්‍රතික්ෂේප විය)*\n\n` +
      `❌ ඔබගේ LKR *${amount.toLocaleString()}* ක Withdrawal ඉල්ලීම (Request #${id}) Admin විසින් ප්‍රතික්ෂේප කරන ලදී.\n\n` +
      `🆔 *Player ID:* \`${playerId}\`\n` +
      `📅 *දිනය:* ${date}\n\n` +
      `කරුණාකර ඔබ ලබාදුන් Player ID සහ Security Code නිවැරදිදැයි පරීක්ෂා කර නැවත උත්සාහ කරන්න හෝ Admin සහය ලබාගන්න.`,
    transactionFailed:
      `⚠️ *ගනුදෙනුව යොමු කිරීමේදී බාධාවක් මතු විය*\n\n` +
      `පද්ධතියේ තාවකාලික සන්නිවේදන ප්‍රමාදයක් හේතුවෙන් ඔබගේ ඉල්ලීම මේ මොහොතේ සටහන් කර ගැනීමට නොහැකි විය. ඔබගේ තොරතුරු හා ගිණුම සම්පූර්ණයෙන්ම ආරක්ෂිතයි.\n\n` +
      `🔄 කරුණාකර සුළු මොහොතකින් නැවත උත්සාහ කරන්න, නැතහොත් වැඩිදුර සහාය සඳහා අපගේ සහාය සේවාව අමතන්න.`,
    genericError:
      `⚠️ *ක්‍රියාවලිය අතරතුර සුළු දෝෂයක් මතු විය*\n\n` +
      `කරුණාකර සුළු මොහොතකින් නැවත උත්සාහ කරන්න හෝ පහත ප්‍රධාන මෙනුවෙන් ඉදිරියට යන්න.`,

    // Automated FAQ Menu
    faqMenuHeader: "🤖 *ස්වයංක්‍රීය සහාය සහ නිතර අසන ප්‍රශ්න (FAQ)*\n\nපාරිභෝගික සහාය කණ්ඩායම අමතන්නේ නැතිව ක්ෂණිකව පිළිතුරු ලබාගැනීමට පහතින් ඔබගේ ප්‍රශ්නය තෝරන්න:",
    faqBtnRegister: "🎯 ලියාපදිංචි වන්නේ කෙසේද?",
    faqBtnLimits: "💰 අවම / උපරිම මුදල් සීමා",
    faqBtnDeposit: "📥 Cash Deposit කරන්නේ කෙසේද?",
    faqBtnWithdraw: "📤 Cash Withdrawal ගන්නේ කෙසේද?",
    faqBtnPlayerId: "🆔 Player ID එක සොයාගැනීම",
    faqBtnProcessingTime: "⏱️ ගතවන කාලය (Processing Time)",
    faqBtnContactSupport: "💬 WhatsApp සහායකයෙකු",
    faqBtnMore: "❓ වෙනත් ප්‍රශ්න (More FAQs)",

    faqAnsRegister: (promo: string) =>
      `🎯 *1XBET හි ලියාපදිංචි වන්නේ කෙසේද?*\n\n` +
      `1️⃣ පහත ඇති *🔗 1XBet හි ලියාපදිංචි වන්න* බොත්තම මඟින් නිල වෙබ් අඩවියට පිවිසෙන්න.\n` +
      `2️⃣ ලියාපදිංචි වීමේදී VIP Promo Code එක ලෙස \`${promo}\` යොදන්න (100% පළමු තැන්පතු Bonus එකක් ලැබේ).\n` +
      `3️⃣ Registration අවසන් වූ පසු ලැබෙන ඔබේ ඉලක්කම් 9-10 කින් යුත් Numeric Player ID එක සටහන් කරගන්න.\n` +
      `4️⃣ ඉන්පසු අපගේ මෙම Bot හරහා 24/7 ක්ෂණිකව Cash Deposit සහ Cash Withdrawal සිදුකළ හැක!`,

    faqAnsLimits: (min: number, max: number) =>
      `💰 *අවම සහ උපරිම මුදල් සීමා (LIMITS)*\n\n` +
      `• 💵 *අවම තැන්පතුව (Min Deposit):* LKR *${min.toLocaleString()}*\n` +
      `• 💰 *උපරිම තැන්පතුව (Max Deposit):* LKR *${max.toLocaleString()}*\n` +
      `• 💸 *අවම මුදල් ලබාගැනීම (Min Withdrawal):* LKR *${min.toLocaleString()}*\n` +
      `• 🏦 *උපරිම මුදල් ලබාගැනීම (Max Withdrawal):* LKR *${max.toLocaleString()}*\n` +
      `• 🏷️ *සේවා ගාස්තු:* 0% (කිසිදු අමතර ගාස්තුවක් අය නොකෙරේ)\n\n` +
      `⚡ ඔබගේ සියලුම ගනුදෙනු ක්ෂණිකව සහ විශ්වාසනීයව සැකසේ.`,

    faqAnsDeposit: (min: number, max: number) =>
      `📥 *CASH DEPOSIT (මුදල් තැන්පත් කරන්නේ කෙසේද?)*\n\n` +
      `1️⃣ ප්‍රධාන මෙනුවේ *Cash Deposit* බොත්තම ඔබන්න.\n` +
      `2️⃣ ගෙවීම් ක්‍රමය (BOC, People's Bank, Sampath Bank, LOLC, iPay, eZ Cash) තෝරන්න.\n` +
      `3️⃣ දක්වා ඇති ගිණුම් අංකයට මුදල් යවා Slip එකෙහි හෝ Transfer Receipt එකෙහි ඡායාරූපයක් (Screenshot) එවන්න.\n` +
      `4️⃣ ඔබේ 1XBet Player ID එක ඇතුළත් කරන්න.\n` +
      `5️⃣ තැන්පත් කළ මුදල (LKR ${min.toLocaleString()} - ${max.toLocaleString()}) ඇතුළත් කරන්න.\n\n` +
      `✅ සුළු මොහොතකින් Admin පරීක්ෂා කර මුදල් ඔබේ 1XBet ගිණුමට බැර කරනු ඇත!`,

    faqAnsWithdraw: () =>
      `📤 *CASH WITHDRAWAL (මුදල් ලබාගන්නේ කෙසේද?)*\n\n` +
      `1️⃣ ඔබගේ 1XBet App හෝ Website එකේ *Withdrawal* වෙත ගොස් *1XBet Cash* තෝරන්න.\n` +
      `2️⃣ නගරය (City) හා ලිපිනය ලෙස Agent තොරතුරු තෝරා Submit කරන්න.\n` +
      `3️⃣ 1XBet වෙතින් ලැබෙන ඉලක්කම් 4ක Security Code එක සටහන් කරගන්න.\n` +
      `4️⃣ මෙම Bot වෙත පැමිණ *Cash Withdrawal* තෝරා ඔබේ Bank/eZ Cash විස්තර, Player ID, මුදල සහ Security Code එක ඇතුළත් කරන්න.\n\n` +
      `✅ Admin විසින් ඉල්ලීම පරීක්ෂා කර මුදල් කෙළින්ම ඔබේ බැංකු ගිණුමට හෝ Wallet එකට එවනු ලැබේ!`,

    faqAnsPlayerId: () =>
      `🆔 *1XBET PLAYER ID එක සොයාගන්නේ කෙසේද?*\n\n` +
      `1️⃣ 1XBet App හෝ වෙබ් අඩවියට Log in වන්න.\n` +
      `2️⃣ Menu -> Profile / My Account (පැතිකඩ) වෙත පිවිසෙන්න.\n` +
      `3️⃣ ඔබගේ නමට යටින් දිස්වන ඉලක්කම් 9ක් හෝ 10කින් යුත් අංකය (උදා: \`1071114543\`) ඔබේ Player ID එක වේ.\n` +
      `💡 මෙම අංකය මත tap කර copy කරගත හැක.`,

    faqAnsProcessingTime: () =>
      `⏱️ *ගනුදෙනුවක් සඳහා ගතවන කාලය කොපමණද?*\n\n` +
      `• ⚡ *Cash Deposits:* සාමාන්‍යයෙන් විනාඩි 2 සිට 10 දක්වා.\n` +
      `• ⚡ *Cash Withdrawals:* සාමාන්‍යයෙන් විනාඩි 5 සිට 15 දක්වා.\n` +
      `• 🕒 සේවාව දවසේ පැය 24 පුරාම (24/7) ක්‍රියාත්මකයි.`,

    unknownCommand: "❓ හඳුනානොගත් විධානයකි (Unrecognized command).\n\nකරුණාකර /menu හෝ /help භාවිත කරන්න.",
  },

  en: {
    welcome: (name: string) => `👋 Welcome ${name}! Please choose a service from the menu below:`,
    chooseLanguage: "🌐 Please select your preferred language / භාෂාව තෝරන්න / மொழியைத் தேர்ந்தெடுக்கவும்:",
    languageChanged: "✅ Language successfully changed to English.",
    cancelBtn: "❌ Cancel",
    cancelled: "❌ Action has been cancelled.\n\nPlease select an option from the menu:",
    mainMenuHeader: "📋 Main Menu:",
    btnDeposit: "💰 Cash Deposit",
    btnConfirmDeposit: "📸 Confirm Deposit",
    btnWithdraw: "💸 Cash Withdrawal",
    btnHistory: "📜 My History",
    btnRegistration: "🎯 1XBet Registration",
    btnReferral: "🔄 Referral Dashboard",
    btnLanguage: "🌐 Language",
    btnHelp: "❓ Help Support",
    btnBack: "⬅️ Back",
    forceJoinMsg: "Please join our official channel before using the bot.",
    joinChannelBtn: "📢 Join Channel",
    checkJoinBtn: "✅ I Have Joined",
    notJoinedAlert: "⚠️ You have not joined the channel yet! Please join the channel first.",

    // 1XBet Registration
    registrationHeader: "🎯 *1XBET REGISTRATION*",
    registrationInstructions: (promoCode: string) =>
      `Click the official link button below to register your 1XBet account:\n\n` +
      `🎁 *VIP Promo Code:* \`${promoCode}\`\n\n` +
      `💡 *Instructions:*\n` +
      `• Use the promo code above during registration to claim maximum deposit bonuses.\n` +
      `• Keep your Numeric Player ID safe for instant deposits and cash withdrawals via our bot.`,
    btnRegisterNow: "🔗 Register on 1XBet",

    // Deposit
    selectDepositMethod: "💰 *DEPOSIT REQUEST*\n\nPlease select your preferred payment method:",
    confirmDepositPrompt:
      `📸 *CONFIRM DEPOSIT*\n\n` +
      `Please upload a clear screenshot or photograph of your transaction slip / payment receipt.\n\n` +
      `_You may also select your payment method below:_`,
    depositStepPhoto: (methodName: string, instructions: string) =>
      `💰 *DEPOSIT — ${methodName}*\n\n` +
      `${instructions}\n\n` +
      `📸 *Step 1/3:* Please send a clear photo or screenshot of your payment receipt/slip.`,
    invalidPhoto: "⚠️ *Please send a payment receipt photo!*\n\nPlease upload a clear screenshot or photograph of the payment receipt.",
    photoReceived: "✅ *Receipt photo received!*\n\n🆔 *Step 2/3:* Please enter your 1XBet Numeric Player ID (6 to 20 digits).\n_(Example: `12345678`)_",
    invalidPlayerId: "⚠️ *Invalid Player ID!*\n\nPlease enter a numeric Player ID with 6 to 20 digits.\n_(Example: `12345678`)_",
    depositStepAmount: (playerId: string, min: number, max: number) =>
      `✅ Player ID: \`${playerId}\` confirmed.\n\n` +
      `💵 *Step 3/3:* Please enter the deposited amount in LKR.\n` +
      `📊 Min: *LKR ${min.toLocaleString()}* | Max: *LKR ${max.toLocaleString()}*\n` +
      `_(Example: ${Math.max(min, 2000)})_`,
    invalidAmount: "⚠️ *Invalid Amount!*\n\nPlease enter numbers only (e.g. `5000`).",
    amountBelowMin: (min: number) => `⚠️ *Amount is below minimum limit!*\n\nMinimum transaction is *LKR ${min.toLocaleString()}*. Please enter an equal or higher amount.`,
    amountAboveMax: (max: number) => `⚠️ *Amount exceeds maximum limit!*\n\nMaximum transaction is *LKR ${max.toLocaleString()}*. Please enter a smaller amount.`,
    depositSubmitted: (id: number, amount: number, playerId: string, method: string) =>
      `✅ *Deposit Request #${id} successfully submitted!*\n\n` +
      `💳 Method: *${method}*\n` +
      `💰 Amount: *LKR ${amount.toLocaleString()}*\n` +
      `🆔 Player ID: \`${playerId}\`\n\n` +
      `Our admin team will review and approve shortly. You will receive a direct notification once confirmed.`,
    confirmDepositSubmitted: (id: number, amount: number, playerId: string, method: string, r2BackedUp: boolean) =>
      `✅ *Deposit Confirmation Submitted!*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔖 *Request ID:* #${id}\n` +
      `💰 *Amount:* LKR *${amount.toLocaleString()}*\n` +
      `🎮 *Player ID:* \`${playerId}\`\n` +
      `💳 *Method:* *${method}*\n` +
      `☁️ *Cloudflare R2 Backup:* ${r2BackedUp ? "✅ Secured in Cloud" : "⏳ Processing"}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ Our admin team will verify the payment and credit your 1XBet player account shortly.`,

    // Withdrawal
    selectWithdrawMethod: "💸 *WITHDRAWAL REQUEST*\n\nPlease select the payment method to receive your funds:",
    withdrawStepDetails: (methodName: string) =>
      `💸 *WITHDRAWAL — ${methodName}*\n\n` +
      `🏦 *Step 1/4:* Please enter your destination Account or Wallet details:\n` +
      `_(Bank Account No + Bank Name, or eZ Cash / mCash / FriMi number)_`,
    invalidAccountDetails: "⚠️ Please enter valid account or wallet details.",
    withdrawStepPlayerId: (account: string) =>
      `✅ Destination: \`${account}\` recorded.\n\n` +
      `🆔 *Step 2/4:* Please enter your 1XBet Numeric Player ID (6–20 digits).`,
    withdrawStepAmount: (playerId: string, min: number, max: number) =>
      `✅ Player ID: \`${playerId}\` confirmed.\n\n` +
      `💵 *Step 3/4:* Please enter the withdrawal amount in LKR.\n` +
      `📊 Min: *LKR ${min.toLocaleString()}* | Max: *LKR ${max.toLocaleString()}*\n` +
      `_(Example: ${Math.max(min, 3000)})_`,
    withdrawStepCode: (amount: number) =>
      `✅ Amount: LKR *${amount.toLocaleString()}*\n\n` +
      `🔐 *Step 4/4:* Please enter your 1XBet Withdrawal Security Code.\n` +
      `_(Securely stored & verified by admin)_`,
    invalidSecurityCode: "⚠️ *Invalid Security Code!*\n\nPlease enter a valid security code (at least 3 characters).",
    withdrawSubmitted: (id: number, amount: number, playerId: string, method: string) =>
      `✅ *Withdrawal Request #${id} successfully submitted!*\n\n` +
      `💳 Method: *${method}*\n` +
      `💰 Amount: *LKR ${amount.toLocaleString()}*\n` +
      `🆔 Player ID: \`${playerId}\`\n\n` +
      `Our admin team will verify and release funds shortly. You will receive a direct notification once completed.`,

    // Notifications
    notifyDepApproved: (amount: number, playerId: string, id: number, date: string) =>
      `🎉 *Deposit Approved!*\n\n` +
      `✅ Your deposit of *LKR ${amount.toLocaleString()}* has been successfully credited to your player account!\n\n` +
      `🆔 *Player ID:* \`${playerId}\`\n` +
      `🔢 *Request ID:* #${id}\n` +
      `📅 *Date:* ${date}\n\n` +
      `Check your player account balance. Congratulations! 🏆`,
    notifyDepRejected: (amount: number, playerId: string, id: number, date: string) =>
      `⚠️ *Deposit Rejected*\n\n` +
      `❌ Your deposit request #${id} for *LKR ${amount.toLocaleString()}* was rejected by the admin.\n\n` +
      `🆔 *Player ID:* \`${playerId}\`\n` +
      `📅 *Date:* ${date}\n\n` +
      `Please try again with a valid receipt slip or contact admin support.`,
    notifyWdApproved: (amount: number, playerId: string, id: number, date: string) =>
      `🎉 *Withdrawal Approved!*\n\n` +
      `✅ Your withdrawal request for *LKR ${amount.toLocaleString()}* has been completed!\n\n` +
      `🆔 *Player ID:* \`${playerId}\`\n` +
      `🔢 *Request ID:* #${id}\n` +
      `📅 *Date:* ${date}\n\n` +
      `Please check your destination account/wallet. Thank you! 💰`,
    notifyWdRejected: (amount: number, playerId: string, id: number, date: string) =>
      `⚠️ *Withdrawal Rejected*\n\n` +
      `❌ Your withdrawal request #${id} for *LKR ${amount.toLocaleString()}* was rejected by the admin.\n\n` +
      `🆔 *Player ID:* \`${playerId}\`\n` +
      `📅 *Date:* ${date}\n\n` +
      `Please ensure your Player ID and Security Code are correct or contact support.`,
    transactionFailed:
      `⚠️ *Transaction Could Not Be Processed*\n\n` +
      `Due to a temporary network or server delay, your request could not be completed at this moment. Your funds and information remain completely secure.\n\n` +
      `🔄 Please try again in a moment, or contact our Support Team for assistance.`,
    genericError:
      `⚠️ *An unexpected error occurred*\n\n` +
      `Please try again in a moment or select an option from the main menu below.`,

    // Automated FAQ Menu
    faqMenuHeader: "🤖 *AUTOMATED FAQ & SUPPORT CENTER*\n\nGet instant answers without waiting for a support agent. Please choose your question below:",
    faqBtnRegister: "🎯 How to Register?",
    faqBtnLimits: "💰 Min & Max Limits",
    faqBtnDeposit: "📥 How to Deposit Cash?",
    faqBtnWithdraw: "📤 How to Withdraw Cash?",
    faqBtnPlayerId: "🆔 How to Find Player ID?",
    faqBtnProcessingTime: "⏱️ Processing Times",
    faqBtnContactSupport: "💬 WhatsApp Support",
    faqBtnMore: "❓ More FAQs",

    faqAnsRegister: (promo: string) =>
      `🎯 *HOW TO REGISTER ON 1XBET*\n\n` +
      `1️⃣ Click the *🔗 Register on 1XBet* button below to open the official website.\n` +
      `2️⃣ Enter VIP Promo Code \`${promo}\` during sign-up to claim your 100% first deposit bonus.\n` +
      `3️⃣ After registration, note down your 9-10 digit Numeric Player ID from your profile.\n` +
      `4️⃣ Use this bot 24/7 for instant cash deposits and swift withdrawals!`,

    faqAnsLimits: (min: number, max: number) =>
      `💰 *TRANSACTION LIMITS & FEES*\n\n` +
      `• 💵 *Minimum Deposit:* LKR *${min.toLocaleString()}*\n` +
      `• 💰 *Maximum Deposit:* LKR *${max.toLocaleString()}*\n` +
      `• 💸 *Minimum Withdrawal:* LKR *${min.toLocaleString()}*\n` +
      `• 🏦 *Maximum Withdrawal:* LKR *${max.toLocaleString()}*\n` +
      `• 🏷️ *Service Fee:* 0% Free (No additional commission)\n\n` +
      `⚡ All transactions are processed instantly and reliably.`,

    faqAnsDeposit: (min: number, max: number) =>
      `📥 *HOW TO MAKE A CASH DEPOSIT*\n\n` +
      `1️⃣ Click *Cash Deposit* on the main menu.\n` +
      `2️⃣ Choose your payment method (BOC, People's Bank, Sampath Bank, LOLC, iPay, eZ Cash).\n` +
      `3️⃣ Transfer the amount to the provided account details and upload a photo/screenshot of the receipt.\n` +
      `4️⃣ Enter your 1XBet Numeric Player ID.\n` +
      `5️⃣ Enter the deposited amount (LKR ${min.toLocaleString()} - ${max.toLocaleString()}).\n\n` +
      `✅ Our admin team will verify and credit funds to your 1XBet player account within minutes!`,

    faqAnsWithdraw: () =>
      `📤 *HOW TO MAKE A CASH WITHDRAWAL*\n\n` +
      `1️⃣ In the 1XBet App or Website, go to *Withdrawal* and select *1XBet Cash*.\n` +
      `2️⃣ Select the city and street agent location as prompted.\n` +
      `3️⃣ Receive your 4-digit security code via SMS/app from 1XBet.\n` +
      `4️⃣ In this bot, click *Cash Withdrawal*, enter your destination bank/wallet info, Player ID, amount, and the security code.\n\n` +
      `✅ The admin will verify the request and transfer cash directly to your bank account or mobile wallet!`,

    faqAnsPlayerId: () =>
      `🆔 *HOW TO FIND YOUR 1XBET PLAYER ID*\n\n` +
      `1️⃣ Log in to the 1XBet mobile app or official website.\n` +
      `2️⃣ Open Menu -> Profile / My Account.\n` +
      `3️⃣ Under your display name, you will see a 9 or 10-digit number (e.g. \`1071114543\`).\n` +
      `💡 Tap or long-press on this number to copy it easily.`,

    faqAnsProcessingTime: () =>
      `⏱️ *TRANSACTION PROCESSING TIMES*\n\n` +
      `• ⚡ *Cash Deposits:* Typically completed within 2 to 10 minutes.\n` +
      `• ⚡ *Cash Withdrawals:* Typically processed within 5 to 15 minutes.\n` +
      `• 🕒 Service operates 24 hours a day, 7 days a week (24/7).`,

    unknownCommand: "❓ Unrecognized command.\n\nPlease use /menu to view available options or /help for assistance.",
  },

  ta: {
    welcome: (name: string) => `👋 வணக்கம் ${name}! கீழேயுள்ள மெனுவிலிருந்து உங்கள் சேவையைத் தேர்ந்தெடுக்கவும்:`,
    chooseLanguage: "🌐 உங்கள் மொழியைத் தேர்ந்தெடுக்கவும் / Choose language / භාෂාව තෝරන්න:",
    languageChanged: "✅ மொழி வெற்றிகரமாக தமிழ் என மாற்றப்பட்டது.",
    cancelBtn: "❌ Cancel (ரத்துசெய்)",
    cancelled: "❌ உங்கள் செயல்பாடு ரத்துசெய்யப்பட்டது (Cancelled).\n\nகீழேயுள்ள மெனுவிலிருந்து தேர்வுசெய்யவும்:",
    mainMenuHeader: "📋 முதன்மை மெனு (Main Menu):",
    btnDeposit: "💰 பணம் வைப்பு (Cash Deposit)",
    btnConfirmDeposit: "📸 வைப்புத்தொகை உறுதிப்படுத்தல்",
    btnWithdraw: "💸 பணம் எடுத்தல் (Cash Withdrawal)",
    btnHistory: "📜 பரிவர்த்தனை வரலாறு (History)",
    btnRegistration: "🎯 1XBet பதிவு (Registration)",
    btnReferral: "🔄 பரிந்துரை பலகை (Referral)",
    btnLanguage: "🌐 மொழி (Language)",
    btnHelp: "❓ உதவி மையம் (Help)",
    btnBack: "⬅️ Back (பின்செல்க)",
    forceJoinMsg: "போட்டைப் பயன்படுத்துவதற்கு முன் எங்கள் அதிகாரப்பூர்வ சேனலில் இணையவும்.",
    joinChannelBtn: "📢 Join Channel",
    checkJoinBtn: "✅ நான் இணைந்துவிட்டேன் (Joined)",
    notJoinedAlert: "⚠️ நீங்கள் இன்னும் சேனலில் இணையவில்லை. தயவுசெய்து முதலில் இணையவும்.",

    // 1XBet Registration
    registrationHeader: "🎯 *1XBET REGISTRATION (பதிவு செய்தல்)*",
    registrationInstructions: (promoCode: string) =>
      `1XBet கணக்கை பதிவு செய்ய கீழே உள்ள அதிகாரப்பூர்வ இணைப்பைப் பயன்படுத்தவும்:\n\n` +
      `🎁 *VIP Promo Code:* \`${promoCode}\`\n\n` +
      `💡 *வழிமுறைகள்:*\n` +
      `• கூடுதல் போனஸ் சலுகைகளைப் பெற பதிவின் போது மேலே உள்ள Promo Code ஐப் பயன்படுத்தவும்.\n` +
      `• வைப்பு (Deposit) மற்றும் பணம் எடுக்க (Withdraw) உங்கள் Player ID ஐப் பயன்படுத்தவும்.`,
    btnRegisterNow: "🔗 1XBet இல் பதிவு செய்க",

    // Deposit
    selectDepositMethod: "💰 *பணம் வைப்பு கோரிக்கை (DEPOSIT REQUEST)*\n\nதயவுசெய்து உங்கள் கட்டண முறையைத் தேர்ந்தெடுக்கவும்:",
    confirmDepositPrompt:
      `📸 *வைப்புத்தொகை உறுதிப்படுத்தல் (CONFIRM DEPOSIT)*\n\n` +
      `உங்கள் கட்டண ரசீது அல்லது பரிவர்த்தனை Screenshot-ஐ தெளிவாக அனுப்பவும்.\n\n` +
      `_கீழே நீங்கள் செலுத்திய முறையையும் தேர்ந்தெடுக்கலாம்:_`,
    depositStepPhoto: (methodName: string, instructions: string) =>
      `💰 *DEPOSIT — ${methodName}*\n\n` +
      `${instructions}\n\n` +
      `📸 *படி 1/3:* நீங்கள் செலுத்திய ரசீது அல்லது Screenshot-ஐ தெளிவாக அனுப்பவும்.`,
    invalidPhoto: "⚠️ *ரசீது புகைப்படத்தை அனுப்பவும்!*\n\nதயவுசெய்து தெளிவான கட்டண ரசீது அல்லது பரிவர்த்தனை புகைப்படத்தை அனுப்பவும்.",
    photoReceived: "✅ *ரசீது புகைப்படம் பெறப்பட்டது!*\n\n🆔 *படி 2/3:* உங்கள் 1XBet Numeric Player ID-ஐ உள்ளிடவும் (6–20 இலக்கங்கள்).\n_(உதாரணம்: `12345678`)_",
    invalidPlayerId: "⚠️ *தவறான Player ID!*\n\nதயவுசெய்து 6 முதல் 20 இலக்கங்கள் கொண்ட சரியான Player ID-ஐ உள்ளிடவும்.\n_(உதாரணம்: `12345678`)_",
    depositStepAmount: (playerId: string, min: number, max: number) =>
      `✅ Player ID: \`${playerId}\` உறுதிசெய்யப்பட்டது.\n\n` +
      `💵 *படி 3/3:* வைப்புத்தொகையை (LKR) உள்ளிடவும்.\n` +
      `📊 குறைந்தது: *LKR ${min.toLocaleString()}* | அதிகபட்சம்: *LKR ${max.toLocaleString()}*\n` +
      `_(உதாரணம்: ${Math.max(min, 2000)})_`,
    invalidAmount: "⚠️ *தவறான தொகை!*\n\nஎண்களை மட்டும் சரியாக உள்ளிடவும் (உதா: `5000`).",
    amountBelowMin: (min: number) => `⚠️ *குறைந்தபட்ச வரம்பை விட குறைவு!*\n\nகுறைந்தபட்ச தொகை *LKR ${min.toLocaleString()}*. தயவுசெய்து சரியான தொகையை உள்ளிடவும்.`,
    amountAboveMax: (max: number) => `⚠️ *அதிகபட்ச வரம்பை தாண்டியது!*\n\nஅதிகபட்ச தொகை *LKR ${max.toLocaleString()}*. தயவுசெய்து குறைந்த தொகையை உள்ளிடவும்.`,
    depositSubmitted: (id: number, amount: number, playerId: string, method: string) =>
      `✅ *Deposit கோரிக்கை #${id} வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!*\n\n` +
      `💳 முறை: *${method}*\n` +
      `💰 தொகை: *LKR ${amount.toLocaleString()}*\n` +
      `🆔 Player ID: \`${playerId}\`\n\n` +
      `Admin விரைவில் சரிபார்த்து உறுதிசெய்வார். உறுதிசெய்யப்பட்டவுடன் உங்களுக்கு அறிவிப்பு வரும்.`,
    confirmDepositSubmitted: (id: number, amount: number, playerId: string, method: string, r2BackedUp: boolean) =>
      `✅ *வைப்புத்தொகை உறுதிப்படுத்தல் சமர்ப்பிக்கப்பட்டது!*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔖 *கோரிக்கை எண்:* #${id}\n` +
      `💰 *தொகை:* LKR *${amount.toLocaleString()}*\n` +
      `🎮 *Player ID:* \`${playerId}\`\n` +
      `💳 *முறை:* *${method}*\n` +
      `☁️ *Cloudflare R2:* ${r2BackedUp ? "✅ பாதுகாக்கப்பட்டது (Backed Up)" : "⏳ செயல்படுத்தப்படுகிறது"}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ Admin சரிபார்த்து சிறிது நேரத்தில் உங்கள் கணக்கில் வைப்புத்தொகையை ஏற்றுவார்.`,

    // Withdrawal
    selectWithdrawMethod: "💸 *பணம் எடுத்தல் (WITHDRAWAL REQUEST)*\n\nபணத்தைப் பெற உங்கள் கட்டண முறையைத் தேர்ந்தெடுக்கவும்:",
    withdrawStepDetails: (methodName: string) =>
      `💸 *WITHDRAWAL — ${methodName}*\n\n` +
      `🏦 *படி 1/4:* பணத்தைப் பெற உங்கள் வங்கி அல்லது Wallet விவரங்களை உள்ளிடவும்:\n` +
      `_(Bank Account No + Bank Name, அல்லது eZ Cash / mCash / FriMi எண்)_`,
    invalidAccountDetails: "⚠️ சரியான வங்கி அல்லது Wallet விவரங்களை உள்ளிடவும்.",
    withdrawStepPlayerId: (account: string) =>
      `✅ கணக்கு விவரம்: \`${account}\` பதிவுசெய்யப்பட்டது.\n\n` +
      `🆔 *படி 2/4:* உங்கள் 1XBet Numeric Player ID-ஐ உள்ளிடவும் (6–20 இலக்கங்கள்).`,
    withdrawStepAmount: (playerId: string, min: number, max: number) =>
      `✅ Player ID: \`${playerId}\` உறுதிசெய்யப்பட்டது.\n\n` +
      `💵 *படி 3/4:* திரும்பப் பெற விரும்பும் தொகையை (LKR) உள்ளிடவும்.\n` +
      `📊 குறைந்தது: *LKR ${min.toLocaleString()}* | அதிகபட்சம்: *LKR ${max.toLocaleString()}*\n` +
      `_(உதாரணம்: ${Math.max(min, 3000)})_`,
    withdrawStepCode: (amount: number) =>
      `✅ தொகை: LKR *${amount.toLocaleString()}*\n\n` +
      `🔐 *படி 4/4:* உங்கள் 1XBet Withdrawal Security Code-ஐ உள்ளிடவும்.\n` +
      `_(இது பாதுகாப்பாக சரிபார்க்கப்படும்)_`,
    invalidSecurityCode: "⚠️ *தவறான Security Code!*\n\nகுறைந்தது 3 எழுத்துக்களைக் கொண்ட சரியான Security code-ஐ உள்ளிடவும்.",
    withdrawSubmitted: (id: number, amount: number, playerId: string, method: string) =>
      `✅ *Withdrawal கோரிக்கை #${id} வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!*\n\n` +
      `💳 முறை: *${method}*\n` +
      `💰 தொகை: *LKR ${amount.toLocaleString()}*\n` +
      `🆔 Player ID: \`${playerId}\`\n\n` +
      `Admin விரைவில் சரிபார்த்து பணத்தை விடுவிப்பார். முடிந்ததும் உங்களுக்கு அறிவிப்பு வரும்.`,

    // Notifications
    notifyDepApproved: (amount: number, playerId: string, id: number, date: string) =>
      `🎉 *Deposit Approved! (வைப்புத்தொகை உறுதிசெய்யப்பட்டது)*\n\n` +
      `✅ உங்கள் *LKR ${amount.toLocaleString()}* தொகை வெற்றிகரமாக Player Account-இல் சேர்க்கப்பட்டது!\n\n` +
      `🆔 *Player ID:* \`${playerId}\`\n` +
      `🔢 *Request ID:* #${id}\n` +
      `📅 *தேதி:* ${date}\n\n` +
      `உங்கள் Player Account-ஐ சரிபார்க்கவும். வாழ்த்துகள்! 🏆`,
    notifyDepRejected: (amount: number, playerId: string, id: number, date: string) =>
      `⚠️ *Deposit Rejected (வைப்புத்தொகை நிராகரிக்கப்பட்டது)*\n\n` +
      `❌ உங்கள் *LKR ${amount.toLocaleString()}* Deposit கோரிக்கை (Request #${id}) Admin-ஆல் நிராகரிக்கப்பட்டது.\n\n` +
      `🆔 *Player ID:* \`${playerId}\`\n` +
      `📅 *தேதி:* ${date}\n\n` +
      `சரியான ரசீதுடன் மீண்டும் முயற்சிக்கவும் அல்லது Admin-ஐ தொடர்புகொள்ளவும்.`,
    notifyWdApproved: (amount: number, playerId: string, id: number, date: string) =>
      `🎉 *Withdrawal Approved! (பணம் விடுவிக்கப்பட்டது)*\n\n` +
      `✅ உங்கள் *LKR ${amount.toLocaleString()}* திரும்பப்பெறும் கோரிக்கை வெற்றிகரமாக நிறைவேற்றப்பட்டது!\n\n` +
      `🆔 *Player ID:* \`${playerId}\`\n` +
      `🔢 *Request ID:* #${id}\n` +
      `📅 *தேதி:* ${date}\n\n` +
      `உங்கள் கணக்கு அல்லது wallet-இல் தொகை வந்துள்ளதா எனப் பார்க்கவும். நன்றி! 💰`,
    notifyWdRejected: (amount: number, playerId: string, id: number, date: string) =>
      `⚠️ *Withdrawal Rejected (நிராகரிக்கப்பட்டது)*\n\n` +
      `❌ உங்கள் *LKR ${amount.toLocaleString()}* Withdrawal கோரிக்கை (Request #${id}) Admin-ஆல் நிராகரிக்கப்பட்டது.\n\n` +
      `🆔 *Player ID:* \`${playerId}\`\n` +
      `📅 *தேதி:* ${date}\n\n` +
      `Player ID மற்றும் Security Code சரிபார்த்து மீண்டும் முயற்சிக்கவும் அல்லது Admin உதவி பெறவும்.`,
    transactionFailed:
      `⚠️ *பரிவர்த்தனையை நிறைவு செய்வதில் சிக்கல் ஏற்பட்டது*\n\n` +
      `தற்காலிக சர்வர் தாமதம் காரணமாக உங்கள் கோரிக்கை இப்போது பதிவு செய்யப்படவில்லை. உங்கள் தகவல்கள் மற்றும் நிதி முற்றிலும் பாதுகாப்பாக உள்ளன.\n\n` +
      `🔄 தயவுசெய்து சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும் அல்லது எங்கள் உதவி மையத்தைத் தொடர்புகொள்ளவும்.`,
    genericError:
      `⚠️ *கோரிக்கையைச் செயலாக்குவதில் ஒரு சிறிய பிழை ஏற்பட்டது*\n\n` +
      `தயவுசெய்து மீண்டும் முயற்சிக்கவும் அல்லது முதன்மை மெனுவிலிருந்து தொடரவும்.`,

    // Automated FAQ Menu
    faqMenuHeader: "🤖 *தானியங்கி உதவி & அடிக்கடி கேட்கப்படும் கேள்விகள் (FAQ)*\n\nஉதவி மையத்திற்கு காத்திருக்காமல் உடனடி பதில்களைப் பெற கீழேயுள்ள உங்கள் கேள்வியைத் தேர்ந்தெடுக்கவும்:",
    faqBtnRegister: "🎯 பதிவு செய்வது எப்படி? (How to Register)",
    faqBtnLimits: "💰 குறைந்தபட்ச / அதிகபட்ச வரம்புகள்",
    faqBtnDeposit: "📥 பணம் வைப்பு செய்வது எப்படி?",
    faqBtnWithdraw: "📤 பணம் எடுப்பது எப்படி?",
    faqBtnPlayerId: "🆔 Player ID ஐக் கண்டறிவது எப்படி?",
    faqBtnProcessingTime: "⏱️ செயலாக்க நேரம் (Processing Time)",
    faqBtnContactSupport: "💬 WhatsApp நேரடி உதவி",
    faqBtnMore: "❓ மேலும் கேள்விகள் (More FAQs)",

    faqAnsRegister: (promo: string) =>
      `🎯 *1XBET இல் பதிவு செய்வது எப்படி?*\n\n` +
      `1️⃣ கீழே உள்ள *🔗 1XBet இல் பதிவு செய்க* பொத்தானைக் கிளிக் செய்யவும்.\n` +
      `2️⃣ பதிவின் போது VIP Promo Code ஆக \`${promo}\` ஐ உள்ளிடவும் (100% முதல் வைப்பு போனஸ் கிடைக்கும்).\n` +
      `3️⃣ பதிவு முடிந்ததும் உங்கள் 9-10 இலக்க Numeric Player ID ஐ குறித்துக்கொள்ளவும்.\n` +
      `4️⃣ அதன் பிறகு எங்கள் போட் மூலம் 24/7 உடனடி வைப்பு மற்றும் பணம் திரும்பப் பெறுதலைச் செய்யலாம்!`,

    faqAnsLimits: (min: number, max: number) =>
      `💰 *பரிவர்த்தனை வரம்புகள் (LIMITS & FEES)*\n\n` +
      `• 💵 *குறைந்தபட்ச வைப்பு (Min Deposit):* LKR *${min.toLocaleString()}*\n` +
      `• 💰 *அதிகபட்ச வைப்பு (Max Deposit):* LKR *${max.toLocaleString()}*\n` +
      `• 💸 *குறைந்தபட்ச பணம் எடுப்பு (Min Withdrawal):* LKR *${min.toLocaleString()}*\n` +
      `• 🏦 *அதிகபட்ச பணம் எடுப்பு (Max Withdrawal):* LKR *${max.toLocaleString()}*\n` +
      `• 🏷️ *கட்டணம்:* 0% (கூடுதல் கட்டணம் எதுவும் இல்லை)\n\n` +
      `⚡ அனைத்து பரிவர்த்தனைகளும் விரைவாகவும் பாதுகாப்பாகவும் நிறைவேற்றப்படும்.`,

    faqAnsDeposit: (min: number, max: number) =>
      `📥 *CASH DEPOSIT (பணம் வைப்பு செய்வது எப்படி?)*\n\n` +
      `1️⃣ முதன்மை மெனுவில் *Cash Deposit* ஐத் தேர்ந்தெடுக்கவும்.\n` +
      `2️⃣ கட்டண முறையைத் தேர்ந்தெடுக்கவும் (BOC, People's Bank, Sampath Bank, LOLC, iPay, eZ Cash).\n` +
      `3️⃣ பணத்தைச் செலுத்தி ரசீது அல்லது Screenshot ஐ அனுப்பவும்.\n` +
      `4️⃣ உங்கள் 1XBet Player ID ஐ உள்ளிடவும்.\n` +
      `5️⃣ செலுத்திய தொகையை உள்ளிடவும் (LKR ${min.toLocaleString()} - ${max.toLocaleString()}).\n\n` +
      `✅ நிர்வாகி சரிபார்த்து சில நிமிடங்களில் உங்கள் கணக்கில் பணத்தைச் சேர்ப்பார்!`,

    faqAnsWithdraw: () =>
      `📤 *CASH WITHDRAWAL (பணம் எடுப்பது எப்படி?)*\n\n` +
      `1️⃣ 1XBet App இல் *Withdrawal* சென்று *1XBet Cash* ஐத் தேர்ந்தெடுக்கவும்.\n` +
      `2️⃣ நகரம் மற்றும் முகவரியைத் தேர்ந்தெடுத்து சமர்ப்பிக்கவும்.\n` +
      `3️⃣ 1XBet இலிருந்து வரும் 4 இலக்க Security Code ஐப் பெறவும்.\n` +
      `4️⃣ இந்த போட்டில் *Cash Withdrawal* தேர்ந்தெடுத்து உங்கள் வங்கி விவரங்கள், Player ID, தொகை மற்றும் Security Code ஐ உள்ளிடவும்.\n\n` +
      `✅ நிர்வாகி உடனடியாக உங்கள் கணக்கிற்குப் பணத்தை அனுப்பி வைப்பார்!`,

    faqAnsPlayerId: () =>
      `🆔 *1XBET PLAYER ID ஐக் கண்டறிவது எப்படி?*\n\n` +
      `1️⃣ 1XBet செயலியில் நுழையவும் (Log in).\n` +
      `2️⃣ Menu -> Profile / My Account செல்லவும்.\n` +
      `3️⃣ உங்கள் பெயருக்குக் கீழே உள்ள 9 அல்லது 10 இலக்க எண்ணே உங்கள் Player ID (எ.கா: \`1071114543\`).\n` +
      `💡 இந்த எண்ணை எளிதாக copy செய்து பயன்படுத்தலாம்.`,

    faqAnsProcessingTime: () =>
      `⏱️ *பரிவர்த்தனைக்கு ஆகும் நேரம் எவ்வளவு?*\n\n` +
      `• ⚡ *Cash Deposits:* பொதுவாக 2 முதல் 10 நிமிடங்கள்.\n` +
      `• ⚡ *Cash Withdrawals:* பொதுவாக 5 முதல் 15 நிமிடங்கள்.\n` +
      `• 🕒 24 மணி நேரமும் (24/7) சேவை செயல்படும்.`,

    unknownCommand: "❓ அறியப்படாத கட்டளை (Unrecognized command).\n\nதயவுசெய்து /menu அல்லது /help ஐப் பயன்படுத்தவும்.",
  },
};

export function t(lang?: string | null): typeof translations.si {
  if (lang === "en") return translations.en;
  if (lang === "ta") return translations.ta;
  return translations.si;
}
