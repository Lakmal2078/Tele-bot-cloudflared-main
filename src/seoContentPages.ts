import type { Env } from "./types";
import { trustedPublicBaseUrl } from "./landingPage";
import { getTransactionLimits } from "./utils";

export const SEO_GUIDE_SLUGS = ["deposit-guide", "withdrawal-guide", "free-sports-tips"] as const;
export type SeoGuideSlug = (typeof SEO_GUIDE_SLUGS)[number];
export type SeoGuideLang = "si" | "en" | "ta";

type Section = { heading: string; body: string[]; list?: "steps" | "bullets" };
type Guide = {
  title: string; description: string; h1: string; intro: string;
  sections: Section[]; faqs: Array<{ q: string; a: string }>;
  warning: string; cta: string; related: string; faqLabel: string;
};

const DATA: Record<SeoGuideLang, Record<SeoGuideSlug, Guide>> = {
  en: {
    "deposit-guide": {
      title: "Sri Lanka Deposit Guide | Fast xBet Cash Telegram Help",
      description: "Learn how to submit a deposit request through the Fast xBet Cash Telegram bot in Sri Lanka. Check payment details, limits and receipt steps. 18+ only.",
      h1: "How to Submit a Deposit Request",
      intro: "This guide explains the deposit-assistance workflow available through our Telegram bot. Payment methods and cashier instructions can change, so always follow the current details shown inside the official bot before transferring money.",
      sections: [
        { heading: "Before you start", list: "bullets", body: [
          "Have your numeric player ID ready and make sure you are using the correct account.",
          "Open the official Telegram bot from the button below. Do not trust payment numbers or bank details sent by unofficial accounts or private messages.",
          "Check the current minimum and maximum transaction limits displayed by the bot. Limits are configurable and may change.",
          "Only continue if the payment method you intend to use is currently shown as available."
        ]},
        { heading: "Deposit request: step by step", list: "steps", body: [
          "Open the Fast xBet Cash Telegram bot and choose Deposit from its main menu.",
          "Select a payment method currently offered in the bot, such as a supported bank transfer or mobile payment option.",
          "Read the cashier instructions carefully. Verify the recipient and destination details in the official bot before making a transfer.",
          "Complete the transfer using your own payment app or bank. Keep the original receipt or transaction confirmation.",
          "Return to the bot's deposit-confirmation flow and upload a clear receipt image when prompted.",
          "Enter your numeric player ID and the exact amount transferred in LKR. Check both details before submitting.",
          "Save the request reference and wait for payment review. Check your player account and bot notification for the final status."
        ]},
        { heading: "Payment methods and availability", body: [
          "The bot may display bank options such as Bank of Ceylon, People's Bank, Sampath Bank or LOLC, and mobile options such as iPay or eZ Cash. The available list depends on the service configuration when you open the bot.",
          "A method shown in an old screenshot or mentioned on this page is not proof that it is currently active. Use only the live instructions and destination details displayed in the official bot."
        ]},
        { heading: "Receipt and verification checklist", list: "bullets", body: [
          "The receipt should be readable and show the transaction reference, date and amount.",
          "The amount entered in the bot must match the amount on the receipt.",
          "Use the correct numeric player ID. A typo can delay manual review.",
          "Do not submit multiple requests for the same transfer unless support asks you to.",
          "If the transfer is pending or the receipt is unclear, contact support through the bot and keep the transaction reference."
        ]},
        { heading: "Security and responsible use", body: [
          "Never share your bank PIN, mobile-wallet PIN, card CVV, account password or one-time password (OTP) with anyone. Do not install remote-access apps or follow instructions to disclose those credentials.",
          "Only use payment accounts you are authorized to use. Check applicable laws and the payment provider's terms in your location. This service is restricted to adults aged 18 or over.",
          "Deposits are not a way to earn income. Set a personal spending limit and never borrow money to gamble."
        ]}
      ],
      faqs: [
        { q: "What payment methods can I use?", a: "The Telegram bot shows the methods currently configured and available. Check the live list before making a transfer; older screenshots and third-party messages may be out of date." },
        { q: "What amount can I deposit?", a: "The bot displays the current minimum and maximum LKR limits. These are configurable, so use the limits shown during your request rather than relying on an old example." },
        { q: "Why is my deposit still pending?", a: "A submitted request may need manual receipt and payment verification. Keep your transaction reference and contact support through the official bot if the status does not update." },
        { q: "Should I send my PIN or OTP to confirm a deposit?", a: "No. Never share bank or wallet PINs, passwords, card CVVs or one-time passwords." }
      ],
      warning: "18+ only. Betting involves risk and you can lose money. No deposit, tip or service guarantees a return or a winning outcome. Follow local laws and gamble responsibly.",
      cta: "Open the official Telegram bot", related: "Related guides", faqLabel: "Frequently asked questions"
    },
    "withdrawal-guide": {
      title: "Sri Lanka Withdrawal Guide | Fast xBet Cash Telegram Help",
      description: "Learn how to submit a withdrawal request through the Fast xBet Cash Telegram bot, check destination details and protect your account. 18+ only.",
      h1: "How to Submit a Withdrawal Request",
      intro: "This guide explains the withdrawal-request steps handled by the Telegram bot. Processing and verification times can vary. Confirm current requirements in the official bot and your player account before submitting a request.",
      sections: [
        { heading: "Before you submit a request", list: "bullets", body: [
          "Check the balance and withdrawal eligibility in your player account.",
          "Confirm that the bank account or wallet belongs to you and can receive the requested transfer.",
          "Have your numeric player ID ready and review the current transaction limits displayed by the bot.",
          "Use only the official Telegram bot. Never send account details to an impersonator or an unverified support contact."
        ]},
        { heading: "Withdrawal request: step by step", list: "steps", body: [
          "Open the Fast xBet Cash Telegram bot and choose Withdraw.",
          "Select a currently available receiving method from the bot's menu.",
          "Enter the destination bank account details and bank name, or the mobile-wallet number requested for that method. Check every digit carefully.",
          "Enter your numeric player ID when prompted.",
          "Enter the withdrawal amount in LKR, staying within the current minimum and maximum shown by the bot.",
          "Review the request details before submitting. Keep the request reference and monitor status notifications.",
          "If the bot asks for a withdrawal security code, verify what that code is through the official account provider before sharing it. Never provide a login password, bank PIN, wallet PIN, card CVV or OTP."
        ]},
        { heading: "Receiving methods and account details", body: [
          "Depending on live configuration, the bot may offer BOC, People's Bank, Sampath Bank, LOLC or another bank, and selected mobile payment options. Do not assume every method is available at all times.",
          "Enter the destination exactly as required by the selected method. Incorrect account numbers, wallet numbers or bank names can cause delays or failed transfers. The bot's current instructions take precedence over examples on this page."
        ]},
        { heading: "After submitting", list: "bullets", body: [
          "Save the request ID and the amount you requested.",
          "Wait for review and status notification. Processing times depend on verification and the payment provider; no fixed completion time is promised.",
          "Check your receiving account before treating a request as completed.",
          "If a request is rejected or delayed, contact support through the official bot and provide the request ID. Do not create repeated requests for the same withdrawal unless instructed."
        ]},
        { heading: "Protect your money and account", body: [
          "Never disclose passwords, one-time codes, bank or wallet PINs, or card security codes. Legitimate support should not require your account password or OTP.",
          "Use a payment destination you control and comply with local laws and provider terms. This service is for adults aged 18 or over.",
          "Gambling carries financial risk. Do not chase losses, borrow to play or treat a withdrawal as guaranteed income."
        ]}
      ],
      faqs: [
        { q: "Which account can receive a withdrawal?", a: "Use a bank account or wallet you are authorized to use and that meets the requirements shown for the selected method in the official bot." },
        { q: "How long does a withdrawal take?", a: "Review and payment-provider processing times can vary. The bot does not promise a fixed completion time; contact support with your request ID if needed." },
        { q: "What if I entered the wrong destination details?", a: "Contact support through the official bot immediately and provide the request ID. Do not submit another request until you receive instructions." },
        { q: "Is it safe to share an OTP or bank PIN?", a: "No. Never share an OTP, login password, bank PIN, wallet PIN or card CVV with support or anyone else." }
      ],
      warning: "18+ only. Withdrawals are subject to account checks, applicable terms and payment-provider processing. No betting outcome or profit is guaranteed. Follow local laws and gamble responsibly.",
      cta: "Open the official Telegram bot", related: "Related guides", faqLabel: "Frequently asked questions"
    },
    "free-sports-tips": {
      title: "Free Sports Tips & Match Analysis | Fast xBet Cash",
      description: "Understand how to read free football and cricket tips, odds and markets. Learn about uncertainty, record keeping and responsible betting. 18+ only.",
      h1: "Free Sports Tips: Read the Analysis, Understand the Risk",
      intro: "This guide explains how to interpret football and cricket tips shared through our Telegram channel and bot. A tip is an opinion based on available information—not a prediction with a guaranteed result.",
      sections: [
        { heading: "What a sports tip contains", body: [
          "A tip may identify a fixture, a market, a selection and the odds available when the analysis was prepared. A football market may refer to a match result, while a cricket market may refer to a match winner. Read the market and selection together.",
          "Odds are time-sensitive. They can change before an event starts, and different bookmakers may display different prices. Check the current market rules and settlement conditions with the provider you use."
        ]},
        { heading: "A simple way to review a tip", list: "steps", body: [
          "Confirm the sport, teams and event start time. Make sure the event has not been postponed or started.",
          "Read the market name and selection in full. Similar-looking markets may have different settlement rules.",
          "Check the displayed odds again before making any decision; the price shown in an earlier post may no longer be available.",
          "Consider uncertainty: injuries, team changes, weather and schedule congestion can affect a match.",
          "Decide in advance whether to skip the event. You do not need to place a bet just because a tip is published."
        ]},
        { heading: "Understanding decimal odds", body: [
          "Decimal odds show the gross return per unit staked if a selection wins, including the original stake. For example, odds of 2.00 correspond to a gross return of 2 units for a 1-unit stake, before applicable rules or deductions.",
          "A rough implied probability is 1 divided by decimal odds, multiplied by 100. This is not a true forecast: bookmaker margin and market conditions mean the figure should not be treated as the actual chance of an outcome."
        ]},
        { heading: "Keep a balanced record", list: "bullets", body: [
          "Record the date, event, market, odds when you decided, stake and final result.",
          "Include losing, void and cancelled selections—not only wins.",
          "Do not judge a method from a handful of results. Short-term streaks can happen by chance.",
          "Never increase a stake to recover a loss or follow a tip you do not understand."
        ]},
        { heading: "Responsible betting", body: [
          "Tips are provided for information and discussion. They do not guarantee wins, profit or a particular return, and past results do not predict future outcomes.",
          "Only adults aged 18 or over may use betting services. Follow the laws that apply where you live.",
          "Set a strict entertainment budget, never borrow to bet, take breaks and stop if betting affects your finances, work or relationships. It is always acceptable not to bet."
        ]}
      ],
      faqs: [
        { q: "Are free sports tips guaranteed to win?", a: "No. Sports outcomes are uncertain. Tips are informational analysis only and do not guarantee a win, profit or return." },
        { q: "Can odds change after a tip is posted?", a: "Yes. Odds and market availability can change quickly. Always check the current price and market rules with your provider." },
        { q: "Which sports are covered?", a: "The public preview currently focuses on football and cricket when eligible data is available. The Telegram channel may publish other sports; check each post for its sport and market." },
        { q: "Do I have to place a bet when a tip appears?", a: "No. You can read the analysis and choose not to bet. Never stake money on a selection you do not understand or cannot afford to lose." }
      ],
      warning: "18+ only. Sports tips are not guarantees or financial advice. You can lose your entire stake. Follow local laws, set limits and gamble responsibly.",
      cta: "View the latest free tips on Telegram", related: "Related guides", faqLabel: "Frequently asked questions"
    }
  },
  si: {
    "deposit-guide": {
      title: "ශ්‍රී ලංකාවේ Deposit Guide | Fast xBet Cash Telegram සහාය",
      description: "Fast xBet Cash Telegram Bot හරහා Deposit ඉල්ලීමක් යොමු කරන ආකාරය, ගෙවීම් තොරතුරු සහ රිසිට්පත් පියවර දැනගන්න. 18+ පමණි.",
      h1: "Deposit ඉල්ලීමක් යොමු කරන්නේ කෙසේද?",
      intro: "Telegram bot එකේ ඇති Deposit සහාය ක්‍රියාවලිය තේරුම් ගැනීමට මෙම මාර්ගෝපදේශය භාවිතා කරන්න. ගෙවීම් ක්‍රම සහ cashier උපදෙස් වෙනස් විය හැකි බැවින් මුදල් යැවීමට පෙර නිල bot එකේ වර්තමාන තොරතුරු පමණක් අනුගමනය කරන්න.",
      sections: [
        { heading: "ආරම්භ කිරීමට පෙර", list: "bullets", body: [
          "ඔබගේ සංඛ්‍යාත්මක Player ID එක සූදානම් කර නිවැරදි ගිණුම භාවිතා කරන බව තහවුරු කරන්න.",
          "පහත බොත්තමෙන් නිල Telegram bot එක විවෘත කරන්න. නිල නොවන ගිණුම් හෝ පෞද්ගලික පණිවිඩවලින් එවන ගෙවීම් අංක විශ්වාස නොකරන්න.",
          "Bot එකේ පෙන්වන වර්තමාන අවම සහ උපරිම ගනුදෙනු සීමා පරීක්ෂා කරන්න. ඒවා වෙනස් විය හැක.",
          "දැනට ලබාගත හැකි ලෙස bot එකේ පෙන්වන ගෙවීම් ක්‍රමයක් පමණක් තෝරන්න."
        ]},
        { heading: "Deposit ඉල්ලීම: පියවරෙන් පියවර", list: "steps", body: [
          "Fast xBet Cash Telegram bot එක විවෘත කර ප්‍රධාන මෙනුවෙන් Deposit තෝරන්න.",
          "Bot එකේ දැනට පෙන්වන බැංකු හෝ mobile payment ක්‍රමවලින් එකක් තෝරන්න.",
          "Cashier උපදෙස් කියවා ලබන්නාගේ සහ ගෙවීම් ගමනාන්තයේ තොරතුරු නිල bot එක තුළම පරීක්ෂා කරන්න.",
          "ඔබගේම බැංකු හෝ payment app එක භාවිතයෙන් මුදල් යවා මුල් රිසිට්පත හෝ transaction confirmation එක තබාගන්න.",
          "Bot එකේ Deposit Confirmation ක්‍රියාවලියට ආපසු ගොස් ඉල්ලා සිටින විට පැහැදිලි රිසිට්පත් රූපයක් යවන්න.",
          "ඔබගේ සංඛ්‍යාත්මක Player ID එක සහ යැවූ නිවැරදි LKR මුදල ඇතුළත් කර දෙකම පරීක්ෂා කරන්න.",
          "Request reference එක සුරකින්න. ගෙවීම පරීක්ෂා කරන තෙක් රැඳී සිට bot දැනුම්දීම සහ player account එක පරීක්ෂා කරන්න."
        ]},
        { heading: "ගෙවීම් ක්‍රම සහ ලබාගත හැකි බව", body: [
          "Bot එකේ Bank of Ceylon, People's Bank, Sampath Bank හෝ LOLC වැනි බැංකු ක්‍රම සහ iPay හෝ eZ Cash වැනි mobile ක්‍රම පෙන්විය හැක. සැබෑ ලැයිස්තුව එම මොහොතේ සේවා සැකසුම අනුව වෙනස් වේ.",
          "පැරණි screenshot එකක හෝ මෙම පිටුවේ සඳහන් ක්‍රමයක් දැනට සක්‍රිය බවට සාක්ෂියක් නොවේ. නිල bot එකේ live උපදෙස් සහ ගෙවීම් විස්තර පමණක් භාවිතා කරන්න."
        ]},
        { heading: "රිසිට්පත් සහ තහවුරු කිරීම", list: "bullets", body: [
          "රිසිට්පතේ transaction reference, දිනය සහ මුදල පැහැදිලිව පෙනිය යුතුය.",
          "Bot එකට ඇතුළත් කරන මුදල රිසිට්පතේ මුදලට සමාන විය යුතුය.",
          "නිවැරදි Player ID එක භාවිතා කරන්න. වැරදි අංකයක් manual review ප්‍රමාද කළ හැක.",
          "එකම ගෙවීම සඳහා නැවත නැවත ඉල්ලීම් යොමු නොකරන්න; support විසින් එසේ කියන්නේ නම් පමණක් කරන්න.",
          "ගෙවීම pending නම් හෝ රිසිට්පත පැහැදිලි නොවේ නම් transaction reference එක තබාගෙන නිල bot support අමතන්න."
        ]},
        { heading: "ආරක්ෂාව සහ වගකීම් සහගත භාවිතය", body: [
          "ඔබගේ බැංකු PIN, mobile-wallet PIN, card CVV, account password හෝ OTP කිසිවෙකුට ලබා නොදෙන්න. එවැනි තොරතුරු ඉල්ලන අයෙකුට ප්‍රතිචාර නොදෙන්න.",
          "ඔබට භාවිතා කිරීමට අවසර ඇති ගෙවීම් ගිණුමක් පමණක් භාවිතා කරන්න. ඔබගේ ප්‍රදේශයේ අදාළ නීති සහ payment provider නියමයන් පරීක්ෂා කරන්න. මෙම සේවාව 18+ අය සඳහා පමණි.",
          "Deposit කිරීම ආදායමක් උපයාගැනීමේ ක්‍රමයක් නොවේ. වියදම් සීමාවක් තබාගෙන ණයට මුදල් ගෙන ක්‍රීඩා නොකරන්න."
        ]}
      ],
      faqs: [
        { q: "භාවිතා කළ හැකි ගෙවීම් ක්‍රම මොනවාද?", a: "දැනට සැකසූ සහ ලබාගත හැකි ක්‍රම Telegram bot එකේ පෙන්වයි. මුදල් යැවීමට පෙර live ලැයිස්තුව පරීක්ෂා කරන්න." },
        { q: "Deposit කළ හැකි මුදල් සීමාව කුමක්ද?", a: "වර්තමාන අවම සහ උපරිම LKR සීමා bot එකේ පෙන්වයි. ඒවා වෙනස් විය හැකි බැවින් ඔබගේ ඉල්ලීමේදී පෙන්වන සීමා අනුගමනය කරන්න." },
        { q: "මගේ Deposit එක තවම pending ඇයි?", a: "යොමු කළ ඉල්ලීමේ රිසිට්පත සහ ගෙවීම manual ලෙස පරීක්ෂා කිරීමට අවශ්‍ය විය හැක. Transaction reference එක තබාගෙන තත්ත්වය යාවත්කාලීන නොවේ නම් නිල bot support අමතන්න." },
        { q: "Deposit තහවුරු කිරීමට PIN හෝ OTP යැවිය යුතුද?", a: "නැහැ. බැංකු හෝ wallet PIN, password, card CVV හෝ OTP කිසිවිටෙක බෙදා නොගන්න." }
      ],
      warning: "18+ පමණි. ඔට්ටු ක්‍රීඩා කිරීමේදී මුදල් අහිමි විය හැක. කිසිදු deposit, tip හෝ සේවාවක් ලාභයක් හෝ ජයග්‍රහණයක් සහතික නොකරයි. දේශීය නීති පිළිපදිමින් වගකීමෙන් ක්‍රීඩා කරන්න.",
      cta: "නිල Telegram Bot එක විවෘත කරන්න", related: "අදාළ මාර්ගෝපදේශ", faqLabel: "නිතර අසන ප්‍රශ්න"
    },
    "withdrawal-guide": {
      title: "ශ්‍රී ලංකාවේ Withdrawal Guide | Fast xBet Cash Telegram සහාය",
      description: "Fast xBet Cash Telegram Bot හරහා Withdrawal ඉල්ලීමක් යොමු කිරීම, මුදල් ලබන ගිණුම් තොරතුරු සහ ආරක්ෂාව ගැන දැනගන්න. 18+ පමණි.",
      h1: "Withdrawal ඉල්ලීමක් යොමු කරන්නේ කෙසේද?",
      intro: "Telegram bot එක හරහා සිදුකරන withdrawal ඉල්ලීමේ පියවර මෙම මාර්ගෝපදේශයෙන් පැහැදිලි කරයි. පරීක්ෂා කිරීමේ සහ ගෙවීම් කාලය වෙනස් විය හැක. ඉල්ලීමක් යොමු කිරීමට පෙර නිල bot එකේ සහ player account එකේ වර්තමාන අවශ්‍යතා තහවුරු කරන්න.",
      sections: [
        { heading: "ඉල්ලීමට පෙර", list: "bullets", body: [
          "Player account එකේ balance සහ withdrawal සුදුසුකම් පරීක්ෂා කරන්න.",
          "බැංකු ගිණුම හෝ wallet එක ඔබ සතු බවත් ඉල්ලන මුදල ලබාගත හැකි බවත් තහවුරු කරන්න.",
          "Player ID එක සූදානම් කර bot එකේ පෙන්වන වර්තමාන transaction සීමා බලන්න.",
          "නිල Telegram bot එක පමණක් භාවිතා කරන්න. වෙනත් අයෙකු ලෙස පෙනී සිටින ගිණුම්වලට තොරතුරු යවන්න එපා."
        ]},
        { heading: "Withdrawal ඉල්ලීම: පියවරෙන් පියවර", list: "steps", body: [
          "Fast xBet Cash Telegram bot එක විවෘත කර Withdraw තෝරන්න.",
          "Bot මෙනුවේ දැනට ලබාගත හැකි මුදල් ලබාගැනීමේ ක්‍රමයක් තෝරන්න.",
          "බැංකු ගිණුම් අංකය සහ බැංකුවේ නම හෝ තෝරාගත් mobile-wallet අංකය ඇතුළත් කර සෑම අංකයක්ම පරීක්ෂා කරන්න.",
          "ඉල්ලා සිටින විට සංඛ්‍යාත්මක Player ID එක ඇතුළත් කරන්න.",
          "Bot එකේ පෙන්වන අවම සහ උපරිම සීමා අතර LKR මුදල ඇතුළත් කරන්න.",
          "යොමු කිරීමට පෙර ඉල්ලීමේ තොරතුරු පරීක්ෂා කර request reference එක සුරකින්න.",
          "Bot එක withdrawal security code එකක් ඉල්ලන්නේ නම්, එය බෙදාගැනීමට පෙර නිල account provider හරහා එම code එක කුමක්දැයි තහවුරු කරන්න. Login password, බැංකු PIN, wallet PIN, card CVV හෝ OTP කිසිවිටෙක ලබා නොදෙන්න."
        ]},
        { heading: "මුදල් ලබාගැනීමේ ක්‍රම", body: [
          "Live සැකසුම අනුව BOC, People's Bank, Sampath Bank, LOLC හෝ වෙනත් බැංකුවක් සහ තෝරාගත් mobile payment ක්‍රම bot එකේ පෙන්විය හැක. සෑම ක්‍රමයක්ම සෑම විටම ලබාගත හැකි බව උපකල්පනය නොකරන්න.",
          "තෝරාගත් ක්‍රමයට අවශ්‍ය පරිදි ගමනාන්ත තොරතුරු නිවැරදිව ඇතුළත් කරන්න. වැරදි ගිණුම් අංකයක්, wallet අංකයක් හෝ බැංකු නමක් ප්‍රමාදයක් හෝ අසාර්ථක ගෙවීමක් ඇති කළ හැක."
        ]},
        { heading: "ඉල්ලීම යොමු කිරීමෙන් පසු", list: "bullets", body: [
          "Request ID එක සහ ඉල්ලූ මුදල සුරකින්න.",
          "පරීක්ෂාව සහ payment provider ක්‍රියාවලිය අවසන් වන තෙක් රැඳී සිට status notification බලන්න. නිශ්චිත කාලයක් සහතික නොවේ.",
          "ඉල්ලීම සම්පූර්ණ බව සලකන්නට පෙර receiving account එක පරීක්ෂා කරන්න.",
          "ඉල්ලීම ප්‍රතික්ෂේප වුවහොත් හෝ ප්‍රමාද වුවහොත් Request ID එක සමඟ නිල bot support අමතන්න. උපදෙස් ලැබෙන තෙක් එකම withdrawal එක නැවත යොමු නොකරන්න."
        ]},
        { heading: "ඔබගේ මුදල් සහ ගිණුම ආරක්ෂා කරගන්න", body: [
          "Password, OTP, බැංකු හෝ wallet PIN, card security code කිසිවෙකුට ලබා නොදෙන්න. නීත්‍යානුකූල support කතාබහකට account password හෝ OTP අවශ්‍ය නොවේ.",
          "ඔබ පාලනය කරන payment destination එකක් භාවිතා කර දේශීය නීති සහ provider නියමයන් පිළිපදින්න. මෙම සේවාව 18+ අය සඳහා පමණි.",
          "ඔට්ටු ක්‍රීඩා කිරීමේදී මූල්‍ය අවදානමක් ඇත. පාඩු පියවා ගැනීමට තවත් මුදල් යොදවන්න හෝ ණයට ක්‍රීඩා නොකරන්න."
        ]}
      ],
      faqs: [
        { q: "Withdrawal ලබාගත හැක්කේ කුමන ගිණුමකටද?", a: "ඔබට භාවිතා කිරීමට අවසර ඇති සහ නිල bot එකේ තෝරාගත් ක්‍රමයේ අවශ්‍යතා සපුරන බැංකු ගිණුමක් හෝ wallet එකක් භාවිතා කරන්න." },
        { q: "Withdrawal එකකට කොපමණ කාලයක් ගතවේද?", a: "පරීක්ෂා කිරීමේ සහ payment provider ක්‍රියාවලියේ කාලය වෙනස් විය හැක. නිශ්චිත අවසන් කාලයක් පොරොන්දු නොවේ. අවශ්‍ය නම් Request ID එක සමඟ support අමතන්න." },
        { q: "වැරදි ගිණුම් තොරතුරු ඇතුළත් කළහොත්?", a: "වහාම නිල bot support අමතා Request ID එක ලබාදෙන්න. උපදෙස් ලැබෙන තෙක් වෙනත් ඉල්ලීමක් යොමු නොකරන්න." },
        { q: "OTP හෝ බැංකු PIN එකක් බෙදාගැනීම ආරක්ෂිතද?", a: "නැහැ. OTP, login password, බැංකු PIN, wallet PIN හෝ card CVV කිසිවෙකු සමඟ බෙදා නොගන්න." }
      ],
      warning: "18+ පමණි. Withdrawal ඉල්ලීම් ගිණුම් පරීක්ෂාව, අදාළ නියමයන් සහ payment provider ක්‍රියාවලියට යටත් වේ. කිසිදු ලාභයක් සහතික නොවේ. දේශීය නීති පිළිපදිමින් වගකීමෙන් ක්‍රීඩා කරන්න.",
      cta: "නිල Telegram Bot එක විවෘත කරන්න", related: "අදාළ මාර්ගෝපදේශ", faqLabel: "නිතර අසන ප්‍රශ්න"
    },
    "free-sports-tips": {
      title: "නොමිලේ Sports Tips සහ තරග විශ්ලේෂණය | Fast xBet Cash",
      description: "නොමිලේ පාපන්දු සහ ක්‍රිකට් tips, odds සහ betting markets කියවන ආකාරය ඉගෙන ගන්න. අවදානම සහ වගකීම් සහගත ක්‍රීඩාව දැනගන්න. 18+ පමණි.",
      h1: "නොමිලේ Sports Tips: විශ්ලේෂණය කියවන්න, අවදානම තේරුම් ගන්න",
      intro: "අපගේ Telegram channel සහ bot හරහා බෙදාගන්නා පාපන්දු සහ ක්‍රිකට් tips තේරුම් ගැනීමට මෙම මාර්ගෝපදේශය උපකාරී වේ. Tip එකක් යනු තොරතුරු මත පදනම් වූ අදහසක් පමණි—ජයග්‍රහණයක් සහතික කරන අනාවැකියක් නොවේ.",
      sections: [
        { heading: "Sports tip එකක අඩංගු දේ", body: [
          "Tip එකක තරගය, market එක, selection එක සහ විශ්ලේෂණය කළ අවස්ථාවේ තිබූ odds සඳහන් විය හැක. පාපන්දු market එකක් තරග ප්‍රතිඵලය ගැන විය හැකි අතර ක්‍රිකට් market එකක් තරග ජයග්‍රාහකයා ගැන විය හැක. Market නම සහ selection එක එකට කියවන්න.",
          "Odds කාලය අනුව වෙනස් වේ. තරගය ආරම්භ වීමට පෙර ඒවා වෙනස් විය හැකි අතර bookmaker අනුව මිල වෙනස් විය හැක. ඔබ භාවිතා කරන provider ගේ වර්තමාන market නීති පරීක්ෂා කරන්න."
        ]},
        { heading: "Tip එකක් සලකා බලන සරල ක්‍රමයක්", list: "steps", body: [
          "ක්‍රීඩාව, කණ්ඩායම් සහ තරග ආරම්භක වේලාව තහවුරු කරන්න. තරගය කල් දමා හෝ ආරම්භ කර නැති බව බලන්න.",
          "Market නම සහ selection එක සම්පූර්ණයෙන් කියවන්න. සමාන ලෙස පෙනෙන markets දෙකකට එකම නීති ඇතැයි නොසිතන්න.",
          "තීරණයක් ගැනීමට පෙර odds නැවත පරීක්ෂා කරන්න; පැරණි post එකක මිල තවදුරටත් නොතිබිය හැක.",
          "ක්‍රීඩක තුවාල, කණ්ඩායම් වෙනස්කම්, කාලගුණය සහ තරග කාලසටහන වැනි අවිනිශ්චිත කරුණු සලකා බලන්න.",
          "තරගය මඟහැරීමටත් ඔබට හැකිය. Tip එකක් පළ වූ පමණින් ඔට්ටුවක් තැබීමට අවශ්‍ය නැත."
        ]},
        { heading: "Decimal odds තේරුම් ගැනීම", body: [
          "Decimal odds මඟින් තෝරාගැනීම ජයග්‍රහණය කළහොත් මුල් stake එකද ඇතුළුව ලැබිය හැකි මුළු return එක පෙන්වයි. උදාහරණයක් ලෙස 1 unit stake එකකට 2.00 odds යටතේ මුළු return එක 2 units වේ.",
          "සරල implied probability අගයක් 1 ÷ decimal odds × 100 ලෙස ගණනය කළ හැක. මෙය සැබෑ අනාවැකියක් නොවේ; bookmaker margin නිසා එය සැබෑ සම්භාවිතාව ලෙස නොසලකන්න."
        ]},
        { heading: "සමබර වාර්තාවක් තබාගන්න", list: "bullets", body: [
          "දිනය, තරගය, market එක, තීරණය ගත් අවස්ථාවේ odds, stake සහ අවසාන ප්‍රතිඵලය සටහන් කරන්න.",
          "ජයග්‍රහණ පමණක් නොව පරාජය, void සහ අවලංගු කළ තෝරාගැනීම්ද ඇතුළත් කරන්න.",
          "ප්‍රතිඵල කිහිපයකින් පමණක් ක්‍රමයක සාර්ථකත්වය තීරණය නොකරන්න. කෙටි කාලීන ජය/පරාජය අහඹු විය හැක.",
          "පාඩුවක් පියවා ගැනීමට stake වැඩි නොකරන්න. නොතේරෙන tip එකක් අනුගමනය නොකරන්න."
        ]},
        { heading: "වගකීම් සහගත ක්‍රීඩාව", body: [
          "Tips ලබාදෙන්නේ තොරතුරු සහ සාකච්ඡාව සඳහා පමණි. ඒවා ජයග්‍රහණ, ලාභ හෝ නිශ්චිත ප්‍රතිලාභයක් සහතික නොකරයි. අතීත ප්‍රතිඵල අනාගතය තීරණය නොකරයි.",
          "ඔට්ටු සේවා භාවිතා කළ හැක්කේ වයස අවුරුදු 18 හෝ ඊට වැඩි අයට පමණි. ඔබ ජීවත් වන ස්ථානයේ නීති පිළිපදින්න.",
          "විනෝදාස්වාදය සඳහා දැරිය හැකි අයවැයක් තබාගන්න. ණයට මුදල් ගෙන ඔට්ටු නොතබන්න. මුදල්, රැකියාව හෝ සබඳතා බලපෑමට ලක්වන්නේ නම් නවත්වන්න. ඔට්ටුවක් නොතැබීමද සුදුසු තේරීමකි."
        ]}
      ],
      faqs: [
        { q: "Free Sports Tips ජයග්‍රහණය සහතික කරනවාද?", a: "නැහැ. ක්‍රීඩා ප්‍රතිඵල අවිනිශ්චිතයි. Tips යනු තොරතුරුමය විශ්ලේෂණයක් පමණක් වන අතර ජයග්‍රහණයක් හෝ ලාභයක් සහතික නොකරයි." },
        { q: "Tip එකක් පළ කළ පසු odds වෙනස් විය හැකිද?", a: "ඔව්. Odds සහ market ලබාගත හැකි බව වෙනස් විය හැක. Provider වෙතින් වර්තමාන මිල සහ නීති පරීක්ෂා කරන්න." },
        { q: "කුමන ක්‍රීඩා ආවරණය කරනවාද?", a: "සුදුසු දත්ත තිබෙන විට public preview එක පාපන්දු සහ ක්‍රිකට් කෙරෙහි අවධානය යොමු කරයි. Telegram channel එකේ වෙනත් ක්‍රීඩාද තිබිය හැක." },
        { q: "Tip එකක් පළ වූ විට ඔට්ටුවක් තැබිය යුතුද?", a: "නැහැ. ඔබට විශ්ලේෂණය කියවා ඔට්ටුවක් නොතැබීමට තීරණය කළ හැක. අහිමි කරගත නොහැකි මුදලක් කිසිවිටෙක යොදවන්න එපා." }
      ],
      warning: "18+ පමණි. Sports tips ජයග්‍රහණ සහතිකයක් හෝ මූල්‍ය උපදෙසක් නොවේ. ඔබට stake කළ මුදල අහිමි විය හැක. දේශීය නීති පිළිපදිමින් වගකීමෙන් ක්‍රීඩා කරන්න.",
      cta: "නවතම Free Tips Telegram වෙතින් බලන්න", related: "අදාළ මාර්ගෝපදේශ", faqLabel: "නිතර අසන ප්‍රශ්න"
    }
  },
  ta: {
    "deposit-guide": {
      title: "இலங்கையில் Deposit வழிகாட்டி | Fast xBet Cash Telegram உதவி",
      description: "Fast xBet Cash Telegram Bot மூலம் deposit கோரிக்கையை சமர்ப்பிப்பது, கட்டண விவரங்கள் மற்றும் ரசீது படிகளை அறியுங்கள். 18+ மட்டும்.",
      h1: "Deposit கோரிக்கையை எவ்வாறு சமர்ப்பிப்பது?",
      intro: "Telegram bot வழங்கும் deposit உதவி செயல்முறையைப் புரிந்துகொள்ள இந்த வழிகாட்டியைப் பயன்படுத்துங்கள். கட்டண முறைகளும் cashier வழிமுறைகளும் மாறலாம்; பணம் அனுப்புவதற்கு முன் அதிகாரப்பூர்வ bot-இல் தற்போது காட்டப்படும் விவரங்களையே பின்பற்றுங்கள்.",
      sections: [
        { heading: "தொடங்குவதற்கு முன்", list: "bullets", body: [
          "உங்கள் எண் கொண்ட Player ID-ஐ தயார் செய்து சரியான கணக்கைப் பயன்படுத்துகிறீர்கள் என்பதை உறுதிப்படுத்துங்கள்.",
          "கீழே உள்ள பொத்தானின் மூலம் அதிகாரப்பூர்வ Telegram bot-ஐத் திறக்கவும். அதிகாரப்பூர்வமற்ற கணக்குகள் அல்லது தனிப்பட்ட செய்திகளில் வரும் கட்டண எண்களை நம்ப வேண்டாம்.",
          "Bot-இல் காட்டப்படும் தற்போதைய குறைந்தபட்ச மற்றும் அதிகபட்ச பரிவர்த்தனை வரம்புகளைப் பாருங்கள். அவை மாறக்கூடும்.",
          "தற்போது கிடைக்கிறது என்று bot காட்டும் கட்டண முறையை மட்டுமே தேர்ந்தெடுக்கவும்."
        ]},
        { heading: "Deposit கோரிக்கை: படிப்படியாக", list: "steps", body: [
          "Fast xBet Cash Telegram bot-ஐத் திறந்து முதன்மை மெனுவில் Deposit என்பதைத் தேர்ந்தெடுக்கவும்.",
          "Bot-இல் தற்போது வழங்கப்படும் வங்கி அல்லது மொபைல் கட்டண முறைகளில் ஒன்றைத் தேர்ந்தெடுக்கவும்.",
          "Cashier வழிமுறைகளைப் படித்து, அதிகாரப்பூர்வ bot-இல் பெறுநர் மற்றும் இலக்கு விவரங்களைச் சரிபார்க்கவும்.",
          "உங்கள் சொந்த வங்கி அல்லது கட்டண செயலியைப் பயன்படுத்தி பணம் அனுப்பி, அசல் ரசீது அல்லது பரிவர்த்தனை உறுதிப்படுத்தலை வைத்திருக்கவும்.",
          "Bot-இன் Deposit Confirmation செயல்முறைக்குத் திரும்பி, கேட்கப்படும் போது தெளிவான ரசீது படத்தைப் பதிவேற்றவும்.",
          "உங்கள் Player ID மற்றும் அனுப்பிய சரியான LKR தொகையை உள்ளிட்டு இரண்டையும் சரிபார்க்கவும்.",
          "கோரிக்கை குறிப்பு எண்ணைச் சேமித்து, கட்டணச் சரிபார்ப்பு முடியும் வரை காத்திருந்து bot அறிவிப்பையும் player கணக்கையும் பார்க்கவும்."
        ]},
        { heading: "கட்டண முறைகள் மற்றும் கிடைக்கும் நிலை", body: [
          "Bot-இல் Bank of Ceylon, People's Bank, Sampath Bank அல்லது LOLC போன்ற வங்கி முறைகளும் iPay அல்லது eZ Cash போன்ற மொபைல் முறைகளும் காட்டப்படலாம். உண்மையான பட்டியல் சேவை அமைப்பைப் பொறுத்து மாறும்.",
          "பழைய screenshot அல்லது இந்தப் பக்கத்தில் உள்ள குறிப்பு ஒரு முறை தற்போது செயல்பாட்டில் இருப்பதற்கான சான்றல்ல. அதிகாரப்பூர்வ bot-இல் உள்ள நேரடி வழிமுறைகளையும் விவரங்களையும் மட்டுமே பயன்படுத்துங்கள்."
        ]},
        { heading: "ரசீது மற்றும் சரிபார்ப்பு", list: "bullets", body: [
          "ரசீதில் பரிவர்த்தனை குறிப்பு எண், தேதி மற்றும் தொகை தெளிவாகத் தெரிய வேண்டும்.",
          "Bot-இல் உள்ளிடும் தொகை ரசீதில் உள்ள தொகையுடன் பொருந்த வேண்டும்.",
          "சரியான Player ID-ஐப் பயன்படுத்தவும். தவறான எண் கைமுறை சரிபார்ப்பைத் தாமதப்படுத்தலாம்.",
          "ஆதரவு குழு கேட்காவிட்டால் அதே பரிவர்த்தனைக்கு பல கோரிக்கைகளைச் சமர்ப்பிக்க வேண்டாம்.",
          "பரிவர்த்தனை நிலுவையில் இருந்தால் குறிப்பு எண்ணை வைத்திருந்து அதிகாரப்பூர்வ bot ஆதரவைத் தொடர்புகொள்ளுங்கள்."
        ]},
        { heading: "பாதுகாப்பும் பொறுப்பான பயன்பாடும்", body: [
          "உங்கள் வங்கி PIN, mobile wallet PIN, card CVV, கணக்கு கடவுச்சொல் அல்லது OTP ஆகியவற்றை யாரிடமும் பகிர வேண்டாம்.",
          "நீங்கள் பயன்படுத்த அனுமதிக்கப்பட்ட கட்டணக் கணக்கை மட்டுமே பயன்படுத்துங்கள். உங்கள் இடத்தில் பொருந்தும் சட்டங்களையும் கட்டண வழங்குநரின் விதிமுறைகளையும் சரிபார்க்கவும். இந்தச் சேவை 18 வயது அல்லது அதற்கு மேற்பட்டவர்களுக்கு மட்டுமே.",
          "Deposit செய்வது வருமானம் ஈட்டும் வழி அல்ல. செலவு வரம்பை நிர்ணயித்து, கடன் வாங்கி விளையாட வேண்டாம்."
        ]}
      ],
      faqs: [
        { q: "எந்த கட்டண முறைகளைப் பயன்படுத்தலாம்?", a: "தற்போது அமைக்கப்பட்டு கிடைக்கும் முறைகளை Telegram bot காட்டும். பணம் அனுப்புவதற்கு முன் நேரடி பட்டியலைச் சரிபார்க்கவும்." },
        { q: "Deposit தொகை வரம்பு என்ன?", a: "தற்போதைய குறைந்தபட்ச மற்றும் அதிகபட்ச LKR வரம்புகளை bot காட்டும். அவை மாறக்கூடும்; உங்கள் கோரிக்கையில் காட்டப்படும் வரம்பைப் பின்பற்றுங்கள்." },
        { q: "என் Deposit ஏன் இன்னும் நிலுவையில் உள்ளது?", a: "கோரிக்கைக்கு ரசீது மற்றும் கட்டணத்தின் கைமுறை சரிபார்ப்பு தேவைப்படலாம். குறிப்பு எண்ணை வைத்திருந்து நிலை மாறாவிட்டால் அதிகாரப்பூர்வ bot ஆதரவைத் தொடர்புகொள்ளுங்கள்." },
        { q: "Deposit உறுதிப்படுத்த PIN அல்லது OTP அனுப்ப வேண்டுமா?", a: "வேண்டாம். வங்கி அல்லது wallet PIN, கடவுச்சொல், card CVV அல்லது OTP ஆகியவற்றை ஒருபோதும் பகிர வேண்டாம்." }
      ],
      warning: "18+ மட்டும். பந்தயத்தில் பணத்தை இழக்கலாம். எந்த deposit, tip அல்லது சேவையும் லாபத்தையோ வெற்றியையோ உறுதி செய்யாது. உள்ளூர் சட்டங்களைப் பின்பற்றி பொறுப்புடன் விளையாடுங்கள்.",
      cta: "அதிகாரப்பூர்வ Telegram bot-ஐத் திறக்கவும்", related: "தொடர்புடைய வழிகாட்டிகள்", faqLabel: "அடிக்கடி கேட்கப்படும் கேள்விகள்"
    },
    "withdrawal-guide": {
      title: "இலங்கையில் Withdrawal வழிகாட்டி | Fast xBet Cash Telegram உதவி",
      description: "Fast xBet Cash Telegram Bot மூலம் withdrawal கோரிக்கையைச் சமர்ப்பிப்பது, பெறும் கணக்கு விவரங்கள் மற்றும் பாதுகாப்பைப் பற்றி அறியுங்கள். 18+ மட்டும்.",
      h1: "Withdrawal கோரிக்கையை எவ்வாறு சமர்ப்பிப்பது?",
      intro: "Telegram bot கையாளும் withdrawal கோரிக்கை படிகளை இந்த வழிகாட்டி விளக்குகிறது. சரிபார்ப்பு மற்றும் செயலாக்க நேரம் மாறலாம். சமர்ப்பிப்பதற்கு முன் அதிகாரப்பூர்வ bot மற்றும் player கணக்கில் தற்போதைய தேவைகளை உறுதிப்படுத்துங்கள்.",
      sections: [
        { heading: "கோரிக்கைக்கு முன்", list: "bullets", body: [
          "உங்கள் player கணக்கில் இருப்புத் தொகை மற்றும் withdrawal தகுதியைச் சரிபார்க்கவும்.",
          "வங்கி கணக்கு அல்லது wallet உங்களுடையது என்றும் கோரிய தொகையைப் பெற முடியும் என்றும் உறுதிப்படுத்துங்கள்.",
          "Player ID-ஐத் தயார் செய்து bot காட்டும் தற்போதைய பரிவர்த்தனை வரம்புகளைப் பாருங்கள்.",
          "அதிகாரப்பூர்வ Telegram bot-ஐ மட்டுமே பயன்படுத்துங்கள். போலியான கணக்குகளுக்கு விவரங்களை அனுப்ப வேண்டாம்."
        ]},
        { heading: "Withdrawal கோரிக்கை: படிப்படியாக", list: "steps", body: [
          "Fast xBet Cash Telegram bot-ஐத் திறந்து Withdraw என்பதைத் தேர்ந்தெடுக்கவும்.",
          "Bot மெனுவில் தற்போது கிடைக்கும் பெறும் முறையைத் தேர்ந்தெடுக்கவும்.",
          "வங்கி கணக்கு எண் மற்றும் வங்கி பெயர் அல்லது தேர்ந்தெடுத்த mobile-wallet எண்ணை உள்ளிட்டு ஒவ்வொரு இலக்கத்தையும் சரிபார்க்கவும்.",
          "கேட்கப்படும் போது உங்கள் Player ID-ஐ உள்ளிடவும்.",
          "Bot காட்டும் குறைந்தபட்ச மற்றும் அதிகபட்ச வரம்புக்குள் LKR தொகையை உள்ளிடவும்.",
          "சமர்ப்பிப்பதற்கு முன் கோரிக்கை விவரங்களைச் சரிபார்த்து குறிப்பு எண்ணைச் சேமிக்கவும்.",
          "Bot withdrawal security code கேட்டால், பகிர்வதற்கு முன் அதிகாரப்பூர்வ account provider மூலம் அதன் பொருளை உறுதிப்படுத்துங்கள். Login password, வங்கி PIN, wallet PIN, card CVV அல்லது OTP-ஐ ஒருபோதும் வழங்க வேண்டாம்."
        ]},
        { heading: "பெறும் முறைகள் மற்றும் கணக்கு விவரங்கள்", body: [
          "நேரடி அமைப்பைப் பொறுத்து BOC, People's Bank, Sampath Bank, LOLC அல்லது வேறு வங்கி மற்றும் தேர்ந்தெடுக்கப்பட்ட mobile payment முறைகள் bot-இல் காட்டப்படலாம். எல்லா முறைகளும் எப்போதும் கிடைக்கும் என்று கருத வேண்டாம்.",
          "தேர்ந்தெடுத்த முறைக்கு தேவையானபடி பெறும் விவரங்களைச் சரியாக உள்ளிடுங்கள். தவறான கணக்கு எண், wallet எண் அல்லது வங்கி பெயர் தாமதம் அல்லது தோல்வியை ஏற்படுத்தலாம்."
        ]},
        { heading: "சமர்ப்பித்த பிறகு", list: "bullets", body: [
          "கோரிக்கை ID மற்றும் கோரிய தொகையைச் சேமிக்கவும்.",
          "சரிபார்ப்பு மற்றும் கட்டண வழங்குநரின் செயலாக்கம் முடியும் வரை காத்திருந்து நிலை அறிவிப்புகளைப் பாருங்கள். குறிப்பிட்ட நிறைவு நேரம் உறுதி செய்யப்படவில்லை.",
          "கோரிக்கை முடிந்ததாகக் கருதுவதற்கு முன் பெறும் கணக்கைச் சரிபார்க்கவும்.",
          "கோரிக்கை நிராகரிக்கப்பட்டால் அல்லது தாமதமானால் கோரிக்கை ID-உடன் அதிகாரப்பூர்வ bot ஆதரவைத் தொடர்புகொள்ளுங்கள். அறிவுறுத்தப்படாவிட்டால் அதே withdrawal-ஐ மீண்டும் சமர்ப்பிக்க வேண்டாம்."
        ]},
        { heading: "உங்கள் பணத்தையும் கணக்கையும் பாதுகாக்கவும்", body: [
          "கடவுச்சொல், OTP, வங்கி அல்லது wallet PIN, card security code ஆகியவற்றை யாரிடமும் பகிர வேண்டாம். முறையான ஆதரவு உரையாடலுக்கு account password அல்லது OTP தேவையில்லை.",
          "நீங்கள் கட்டுப்படுத்தும் payment destination-ஐப் பயன்படுத்தி உள்ளூர் சட்டங்களையும் வழங்குநர் விதிகளையும் பின்பற்றுங்கள். இந்தச் சேவை 18+ வயதினருக்கு மட்டுமே.",
          "பந்தயம் நிதி ஆபத்தைக் கொண்டது. இழப்பைத் துரத்தவோ கடன் வாங்கி விளையாடவோ வேண்டாம்."
        ]}
      ],
      faqs: [
        { q: "எந்த கணக்கிற்கு Withdrawal பெறலாம்?", a: "நீங்கள் பயன்படுத்த அனுமதிக்கப்பட்டதும் அதிகாரப்பூர்வ bot-இல் தேர்ந்தெடுத்த முறையின் தேவைகளைப் பூர்த்தி செய்வதுமான வங்கி கணக்கு அல்லது wallet-ஐப் பயன்படுத்துங்கள்." },
        { q: "Withdrawal எவ்வளவு நேரம் எடுக்கும்?", a: "சரிபார்ப்பு மற்றும் கட்டண வழங்குநரின் செயலாக்க நேரம் மாறலாம். குறிப்பிட்ட நிறைவு நேரம் உறுதி செய்யப்படவில்லை; தேவையெனில் கோரிக்கை ID-உடன் ஆதரவைத் தொடர்புகொள்ளுங்கள்." },
        { q: "தவறான பெறும் விவரங்களை உள்ளிட்டால்?", a: "உடனடியாக அதிகாரப்பூர்வ bot ஆதரவைத் தொடர்புகொண்டு கோரிக்கை ID-ஐ வழங்குங்கள். அறிவுறுத்தல் கிடைக்கும் வரை புதிய கோரிக்கையைச் சமர்ப்பிக்க வேண்டாம்." },
        { q: "OTP அல்லது வங்கி PIN பகிர்வது பாதுகாப்பானதா?", a: "இல்லை. OTP, login password, வங்கி PIN, wallet PIN அல்லது card CVV ஆகியவற்றை யாரிடமும் பகிர வேண்டாம்." }
      ],
      warning: "18+ மட்டும். Withdrawal கோரிக்கைகள் கணக்கு சரிபார்ப்பு, பொருந்தும் விதிமுறைகள் மற்றும் கட்டண வழங்குநரின் செயலாக்கத்திற்கு உட்பட்டவை. லாபம் உறுதி செய்யப்படவில்லை. உள்ளூர் சட்டங்களைப் பின்பற்றி பொறுப்புடன் விளையாடுங்கள்.",
      cta: "அதிகாரப்பூர்வ Telegram bot-ஐத் திறக்கவும்", related: "தொடர்புடைய வழிகாட்டிகள்", faqLabel: "அடிக்கடி கேட்கப்படும் கேள்விகள்"
    },
    "free-sports-tips": {
      title: "இலவச Sports Tips மற்றும் போட்டி பகுப்பாய்வு | Fast xBet Cash",
      description: "இலவச கால்பந்து மற்றும் கிரிக்கெட் tips, odds மற்றும் betting markets-ஐப் புரிந்துகொள்ளுங்கள். ஆபத்து மற்றும் பொறுப்பான பந்தயத்தை அறியுங்கள். 18+ மட்டும்.",
      h1: "இலவச Sports Tips: பகுப்பாய்வைப் படித்து ஆபத்தைப் புரிந்துகொள்ளுங்கள்",
      intro: "எங்கள் Telegram channel மற்றும் bot-இல் பகிரப்படும் கால்பந்து மற்றும் கிரிக்கெட் tips-ஐப் புரிந்துகொள்ள இந்த வழிகாட்டி உதவும். ஒரு tip என்பது கிடைக்கும் தகவலின் அடிப்படையிலான கருத்து மட்டுமே; உறுதியான முடிவு கணிப்பு அல்ல.",
      sections: [
        { heading: "ஒரு sports tip-இல் என்ன இருக்கும்?", body: [
          "ஒரு tip-இல் போட்டி, market, selection மற்றும் பகுப்பாய்வு தயாரிக்கப்பட்டபோது இருந்த odds குறிப்பிடப்படலாம். கால்பந்து market போட்டி முடிவைக் குறிக்கலாம்; கிரிக்கெட் market போட்டி வெற்றியாளரைக் குறிக்கலாம். Market பெயரையும் selection-ஐயும் ஒன்றாகப் படிக்கவும்.",
          "Odds நேரத்துக்கு ஏற்ப மாறும். போட்டி தொடங்குவதற்கு முன் அவை மாறலாம்; வெவ்வேறு bookmaker-களில் விலையும் மாறலாம். வழங்குநரின் தற்போதைய market விதிகளைச் சரிபார்க்கவும்."
        ]},
        { heading: "ஒரு tip-ஐ மதிப்பிட எளிய வழி", list: "steps", body: [
          "விளையாட்டு, அணிகள் மற்றும் போட்டி தொடங்கும் நேரத்தை உறுதிப்படுத்துங்கள். போட்டி ஒத்திவைக்கப்படவோ தொடங்கியிருக்கவோ இல்லை என்பதைப் பாருங்கள்.",
          "Market பெயரையும் selection-ஐயும் முழுமையாகப் படிக்கவும். ஒரே மாதிரி தோன்றும் market-களுக்கு ஒரே விதிகள் என்று கருத வேண்டாம்.",
          "முடிவு எடுப்பதற்கு முன் odds-ஐ மீண்டும் சரிபார்க்கவும்; பழைய பதிவின் விலை இனி கிடைக்காமல் இருக்கலாம்.",
          "காயங்கள், அணித் தேர்வு மாற்றங்கள், வானிலை மற்றும் போட்டி அட்டவணை போன்ற நிச்சயமற்ற காரணிகளைக் கவனியுங்கள்.",
          "போட்டியைத் தவிர்க்கவும் முடியும். Tip வெளியிடப்பட்டதால் பந்தயம் வைக்க வேண்டிய கட்டாயம் இல்லை."
        ]},
        { heading: "Decimal odds-ஐப் புரிந்துகொள்ளுதல்", body: [
          "Decimal odds என்பது தேர்வு வென்றால் அசல் stake உட்பட கிடைக்கும் மொத்த வருமானத்தைக் காட்டும். உதாரணமாக 1 unit stake-க்கு 2.00 odds என்றால் மொத்த return 2 units ஆகும்.",
          "தோராயமான implied probability-ஐ 1 ÷ decimal odds × 100 எனக் கணக்கிடலாம். இது உண்மையான கணிப்பு அல்ல; bookmaker margin காரணமாக இதை உண்மையான வாய்ப்பாகக் கருத வேண்டாம்."
        ]},
        { heading: "சமநிலையான பதிவை வைத்திருங்கள்", list: "bullets", body: [
          "தேதி, போட்டி, market, முடிவு எடுத்த நேர odds, stake மற்றும் இறுதி முடிவைப் பதிவு செய்யுங்கள்.",
          "வெற்றிகள் மட்டுமல்லாமல் தோல்வி, void மற்றும் ரத்து செய்யப்பட்ட தேர்வுகளையும் சேர்க்கவும்.",
          "சில முடிவுகளை வைத்து ஒரு முறையின் வெற்றியைத் தீர்மானிக்க வேண்டாம். குறுகிய கால தொடர்கள் தற்செயலாக இருக்கலாம்.",
          "இழப்பை மீட்டெடுக்க stake-ஐ அதிகரிக்க வேண்டாம்; புரியாத tip-ஐப் பின்பற்ற வேண்டாம்."
        ]},
        { heading: "பொறுப்பான பந்தயம்", body: [
          "Tips தகவல் மற்றும் விவாதத்திற்காக மட்டுமே. அவை வெற்றி, லாபம் அல்லது குறிப்பிட்ட வருமானத்தை உறுதி செய்யாது. கடந்த முடிவுகள் எதிர்கால முடிவுகளை கணிக்காது.",
          "பந்தய சேவைகளை 18 வயது அல்லது அதற்கு மேற்பட்டவர்கள் மட்டுமே பயன்படுத்த வேண்டும். நீங்கள் வசிக்கும் இடத்தின் சட்டங்களைப் பின்பற்றுங்கள்.",
          "பொழுதுபோக்கிற்காக இழக்கத் தயாரான வரம்பை நிர்ணயிக்கவும். கடன் வாங்கிப் பந்தயம் வைக்க வேண்டாம். பணம், வேலை அல்லது உறவுகள் பாதிக்கப்பட்டால் நிறுத்துங்கள். பந்தயம் வைக்காமல் இருப்பதும் சரியான தேர்வே."
        ]}
      ],
      faqs: [
        { q: "இலவச Sports Tips வெற்றியை உறுதி செய்கிறதா?", a: "இல்லை. விளையாட்டு முடிவுகள் நிச்சயமற்றவை. Tips தகவல் பகுப்பாய்வு மட்டுமே; வெற்றி அல்லது லாபத்தை உறுதி செய்யாது." },
        { q: "Tip வெளியான பிறகு odds மாறுமா?", a: "ஆம். Odds மற்றும் market கிடைக்கும் நிலை மாறலாம். வழங்குநரிடம் தற்போதைய விலையையும் விதிகளையும் சரிபார்க்கவும்." },
        { q: "எந்த விளையாட்டுகள் உள்ளடக்கப்படுகின்றன?", a: "தகுதியான தரவு கிடைக்கும் போது public preview தற்போது கால்பந்து மற்றும் கிரிக்கெட்டில் கவனம் செலுத்துகிறது. Telegram channel-இல் பிற விளையாட்டுகளும் இருக்கலாம்." },
        { q: "Tip வந்தால் பந்தயம் வைக்க வேண்டுமா?", a: "வேண்டியதில்லை. பகுப்பாய்வைப் படித்து பந்தயம் வைக்காமல் இருக்கலாம். இழக்க முடியாத பணத்தை ஒருபோதும் stake செய்ய வேண்டாம்." }
      ],
      warning: "18+ மட்டும். Sports tips வெற்றி உறுதியோ நிதி ஆலோசனையோ அல்ல. உங்கள் stake முழுவதையும் இழக்கலாம். உள்ளூர் சட்டங்களைப் பின்பற்றி வரம்புகளை அமைத்து பொறுப்புடன் விளையாடுங்கள்.",
      cta: "சமீபத்திய இலவச Tips-ஐ Telegram-இல் பாருங்கள்", related: "தொடர்புடைய வழிகாட்டிகள்", faqLabel: "அடிக்கடி கேட்கப்படும் கேள்விகள்"
    }
  }
};

const LABELS = {
  en: { home: "Home", language: "Language", note: "General information only. Current official bot instructions and provider terms take precedence." },
  si: { home: "මුල් පිටුව", language: "භාෂාව", note: "මෙම පිටුව සාමාන්‍ය තොරතුරු සඳහාය. නිල bot එකේ වර්තමාන උපදෙස් සහ provider නියමයන් ප්‍රමුඛ වේ." },
  ta: { home: "முகப்பு", language: "மொழி", note: "இந்தப் பக்கம் பொதுவான தகவலுக்கானது. அதிகாரப்பூர்வ bot வழிமுறைகளும் வழங்குநர் விதிகளும் முன்னுரிமை பெறும்." }
} as const;

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char] || char);

export function getSeoGuidePaths(slug: SeoGuideSlug): Record<SeoGuideLang, string> {
  return { si: "/" + slug, en: "/en/" + slug, ta: "/ta/" + slug };
}

export function resolveSeoGuidePath(pathname: string): { slug: SeoGuideSlug; lang: SeoGuideLang; canonicalPath: string } | null {
  const match = pathname.match(/^\/(en|ta)\/(deposit-guide|withdrawal-guide|free-sports-tips)\/?$|^\/(deposit-guide|withdrawal-guide|free-sports-tips)\/?$/);
  if (!match) return null;
  const lang: SeoGuideLang = match[1] === "en" ? "en" : match[1] === "ta" ? "ta" : "si";
  const slug = (match[2] || match[3]) as SeoGuideSlug;
  return { slug, lang, canonicalPath: getSeoGuidePaths(slug)[lang] };
}

export function renderSeoContentPage(env: Env, request: Request, nonce?: string): string | null {
  const resolved = resolveSeoGuidePath(new URL(request.url).pathname);
  if (!resolved) return null;
  const { slug, lang, canonicalPath } = resolved;
  const guide = DATA[lang][slug];
  const labels = LABELS[lang];
  const base = trustedPublicBaseUrl(env, request);
  const canonical = base ? base + canonicalPath : canonicalPath;
  const paths = getSeoGuidePaths(slug);
  const botName = env.BOT_USERNAME?.trim().replace(/^@/, "") || "fast_1xbetcash_bot";
  const botUrl = "https://t.me/" + botName + "?start=" + slug.replace(/-/g, "_");
  const limits = getTransactionLimits(env);

  const sectionHtml = guide.sections.map((section, index) => {
    const body = section.body.map((item) => "<li>" + escapeHtml(item) + "</li>").join("");
    const list = section.list === "steps" ? "<ol>" + body + "</ol>"
      : section.list === "bullets" ? "<ul>" + body + "</ul>"
      : section.body.map((item) => "<p>" + escapeHtml(item) + "</p>").join("");
    const range = slug !== "free-sports-tips" && index === 0
      ? '<p class="limits"><strong>' + (lang === "si" ? "දැනට සැකසූ ගනුදෙනු පරාසය" : lang === "ta" ? "தற்போதைய பரிவர்த்தனை வரம்பு" : "Configured transaction range") + ":</strong> LKR " + limits.min.toLocaleString("en-LK") + " – LKR " + limits.max.toLocaleString("en-LK") + "</p>"
      : "";
    return '<section class="guide-section"><h2>' + escapeHtml(section.heading) + "</h2>" + list + range + "</section>";
  }).join("");

  const faqHtml = guide.faqs.map((item) => "<details><summary>" + escapeHtml(item.q) + "</summary><p>" + escapeHtml(item.a) + "</p></details>").join("");
  const relatedHtml = SEO_GUIDE_SLUGS.filter((other) => other !== slug).map((other) =>
    '<a href="' + getSeoGuidePaths(other)[lang] + '">' + escapeHtml(DATA[lang][other].h1) + "</a>"
  ).join("");
  const localeHtml = (["si", "en", "ta"] as const).map((locale) =>
    '<a href="' + paths[locale] + '" hreflang="' + locale + '" lang="' + locale + '"' + (locale === lang ? ' aria-current="page"' : "") + ">" + locale.toUpperCase() + "</a>"
  ).join("");

  const canonicalTags = base ? [
    '<link rel="canonical" href="' + escapeHtml(canonical) + '">',
    ...(["si", "en", "ta"] as const).map((locale) => '<link rel="alternate" hreflang="' + locale + '" href="' + escapeHtml(base + paths[locale]) + '">'),
    '<link rel="alternate" hreflang="x-default" href="' + escapeHtml(base + paths.si) + '">',
    '<meta property="og:url" content="' + escapeHtml(canonical) + '">',
    '<meta property="og:image" content="' + escapeHtml(base + "/og-image.jpg") + '">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">'
  ].join("\n") : "";

  const faqSchema = guide.faqs.map((item) => ({
    "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a }
  }));
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", headline: guide.h1, description: guide.description, inLanguage: lang, mainEntityOfPage: canonical, publisher: { "@type": "Organization", name: "Fast xBet Cash", url: base || canonical } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: labels.home, item: base ? base + (lang === "si" ? "/" : "/" + lang + "/") : (lang === "si" ? "/" : "/" + lang + "/") },
        { "@type": "ListItem", position: 2, name: guide.h1, item: canonical }
      ] },
      { "@type": "FAQPage", mainEntity: faqSchema }
    ]
  }).replace(/</g, "\\u003c");

  const nonceAttr = nonce ? ' nonce="' + escapeHtml(nonce) + '"' : "";
  const homePath = lang === "si" ? "/" : "/" + lang + "/";
  const warning = escapeHtml(guide.warning);
  const note = escapeHtml(labels.note);

  return '<!doctype html>\n<html lang="' + lang + '">\n<head>\n' +
    '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    "<title>" + escapeHtml(guide.title) + "</title>\n" +
    '<meta name="description" content="' + escapeHtml(guide.description) + '">\n' +
    '<meta name="robots" content="index,follow">\n<meta name="theme-color" content="#0b1220">\n' +
    '<meta property="og:type" content="article">\n<meta property="og:site_name" content="Fast xBet Cash">\n' +
    '<meta property="og:title" content="' + escapeHtml(guide.title) + '">\n' +
    '<meta property="og:description" content="' + escapeHtml(guide.description) + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="' + escapeHtml(guide.title) + '">\n' +
    '<meta name="twitter:description" content="' + escapeHtml(guide.description) + '">\n' + canonicalTags + "\n" +
    '<link rel="icon" type="image/png" href="/favicon.png">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700;800&family=Noto+Sans+Tamil:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">\n' +
    '<script type="application/ld+json"' + nonceAttr + ">" + schema + "</script>\n" +
    '<style' + nonceAttr + '>\n:root{color-scheme:dark;--bg:#0b1220;--panel:#142238;--text:#f8fafc;--muted:#bac7d8;--accent:#34d399;--line:#ffffff1c}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 0,#34d39912,transparent 30%),var(--bg);color:var(--text);font:16px/1.75 "Plus Jakarta Sans","Noto Sans Sinhala","Noto Sans Tamil",system-ui,sans-serif}a{color:#6ee7b7;text-decoration:none}a:hover{text-decoration:underline}.wrap{width:min(900px,calc(100% - 36px));margin:auto}header{border-bottom:1px solid var(--line);background:#0b1220ed}.top{min-height:68px;display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{font-weight:800;color:var(--text)}.brand span{color:var(--accent)}.languages{display:flex;gap:8px}.languages a{padding:4px 8px;border:1px solid var(--line);border-radius:8px;font-size:12px}.languages a[aria-current=page]{background:#34d3991c;color:#d1fae5}main{padding:46px 0 64px}.crumb{font-size:13px;color:var(--muted)}.eyebrow{margin:22px 0 8px;color:var(--accent);font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}h1{font-size:clamp(2rem,5vw,3.1rem);line-height:1.16;letter-spacing:-.04em;margin:0 0 18px}h2{font-size:1.45rem;line-height:1.3;margin:0 0 14px;letter-spacing:-.02em}p{margin:0 0 14px;color:var(--muted)}.intro{font-size:1.08rem;color:#e2e8f0;max-width:78ch}.guide-section{padding:28px;margin:22px 0;background:linear-gradient(145deg,#142238,#101c2e);border:1px solid var(--line);border-radius:18px}.guide-section p:last-child,.guide-section ul:last-child,.guide-section ol:last-child{margin-bottom:0}li{padding-left:5px;margin:8px 0;color:var(--muted)}li::marker{color:var(--accent)}.limits{padding:12px 14px;border-left:3px solid var(--accent);background:#34d3990d;border-radius:0 10px 10px 0}.limits strong{color:#d1fae5}.notice{margin:26px 0;padding:18px;border:1px solid #fbbf2440;background:#fbbf240c;border-radius:14px;color:#fde68a;font-size:14px}.cta{display:inline-flex;margin:8px 0 28px;padding:13px 20px;border-radius:12px;background:var(--accent);color:#052e22;font-weight:800}.faq{padding:28px;margin:22px 0;background:#101c2e;border:1px solid var(--line);border-radius:18px}.faq details{border-top:1px solid var(--line);padding:13px 0}.faq summary{cursor:pointer;font-weight:700}.faq details p{margin:10px 0 0}.related{display:grid;gap:10px;margin:20px 0}.related a{display:block;padding:13px 15px;border:1px solid var(--line);border-radius:12px;background:#ffffff06}.related h2{margin-bottom:14px}footer{border-top:1px solid var(--line);padding:22px 0 34px;color:var(--muted);font-size:13px}.footerlinks{display:flex;flex-wrap:wrap;gap:16px;margin-top:10px}@media(max-width:600px){.top{align-items:flex-start;padding:14px 0;flex-direction:column}.languages{align-self:flex-start}.guide-section,.faq{padding:20px}main{padding-top:28px}}\n</style>\n</head>\n<body>\n<header><div class="wrap top"><a class="brand" href="' + homePath + '">Fast xBet <span>Cash</span></a><nav class="languages" aria-label="' + escapeHtml(labels.language) + '">' + localeHtml + '</nav></div></header>\n<main class="wrap"><nav class="crumb" aria-label="Breadcrumb"><a href="' + homePath + '">' + escapeHtml(labels.home) + '</a> / ' + escapeHtml(guide.h1) + '</nav>\n<p class="eyebrow">' + escapeHtml(guide.title) + ' · Sri Lanka</p><h1>' + escapeHtml(guide.h1) + '</h1><p class="intro">' + escapeHtml(guide.intro) + '</p>\n<a class="cta" href="' + escapeHtml(botUrl) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(guide.cta) + ' ↗</a>\n' + sectionHtml + '<aside class="notice">' + warning + '</aside>\n<section class="faq"><h2>' + escapeHtml(guide.faqLabel) + '</h2>' + faqHtml + '</section>\n<section class="related"><h2>' + escapeHtml(guide.related) + '</h2>' + relatedHtml + '</section></main>\n<footer><div class="wrap"><strong>Fast xBet Cash</strong><p>' + note + '</p><div class="footerlinks"><a href="' + homePath + '">' + escapeHtml(labels.home) + '</a><a href="/privacy">Privacy Policy</a><a href="https://t.me/' + escapeHtml(botName) + '" rel="noopener noreferrer">Telegram support</a></div></div></footer>\n</body>\n</html>';
}

export function buildSeoGuideSitemapEntries(baseUrl: string): string {
  return SEO_GUIDE_SLUGS.map((slug) => {
    const paths = getSeoGuidePaths(slug);
    const alternates = (["si", "en", "ta"] as const).map((locale) =>
      '<xhtml:link rel="alternate" hreflang="' + locale + '" href="' + escapeHtml(baseUrl + paths[locale]) + '"/>'
    ).join("\n    ");
    return (["si", "en", "ta"] as const).map((locale) =>
      "  <url>\n    <loc>" + escapeHtml(baseUrl + paths[locale]) + "</loc>\n    " + alternates +
      '\n    <xhtml:link rel="alternate" hreflang="x-default" href="' + escapeHtml(baseUrl + paths.si) + '"/>' +
      "\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>"
    ).join("\n");
  }).join("\n");
}
