import { describe, expect, it } from "vitest";
import {
  getXBetAffiliateLink,
  SRI_LANKA_AML_BANK_WARNING,
  getPaymentMethodAccountDetails,
  buildRegistrationView,
  formatDepositAdminSlipAlert,
  formatWithdrawalAdminAlert,
  buildCashierMethodKeyboard,
} from "../src/cashier";
import type { Env } from "../src/types";

describe("Sri Lankan 1xBet Cashier & Affiliate System", () => {
  const mockEnv: Env = {
    DB: {} as any,
    BOT_TOKEN: "mock_token",
    ADMIN_IDS: "123456789",
    ADMIN_CHAT_ID: "-1004336999467",
    ADMIN_CHANNEL_ID: "-1004336999467",
    WEBHOOK_SECRET: "mock_secret_16chars",
    ADMIN_API_SECRET: "mock_admin_api_secret_24chars",
    CHANNEL_USERNAME: "@fast_xbet_official_tips",
    CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
    PROOF_CHANNEL_URL: "https://t.me/fast_xbet_proofs",
    TIPS_CHANNEL_ID: "-1004336999467",
    TIPS_CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
    XBET_LINK: "https://reffpa.com/L?tag=d_2481353m_1622c_&site=2481353&ad=1622",
    XBET_PROMO_CODE: "VGSL",
    MIN_TRANSACTION_LKR: "1000",
    MAX_TRANSACTION_LKR: "500000",
    DEPOSIT_INSTRUCTIONS: "Instructions",
    COMMERCIAL_DETAILS: "Commercial Bank - 8001234567 - VGS Lakmal - Colombo",
    SAMPATH_DETAILS: "Sampath Bank - 105456146706 - NKS Oshadhi - City Branch",
    HNB_DETAILS: "HNB Bank - 003010456789 - VGS Lakmal - Head Office",
    BOC_DETAILS: "BOC Bank - 95645895 - VGS Lakmal - Walasmulla",
    PEOPLES_DETAILS: "People's Bank - 120200380030196 - VGS Lakmal",
    EZCASH_NUMBER: "0765865387",
    MCASH_NUMBER: "0711234567",
    BINANCE_PAY_ID: "876543210",
    USDT_TRC20_ADDRESS: "TLaSy8abcdefghijklmnopqrstuvwxyz123456",
    USDT_BEP20_ADDRESS: "0x1234567890abcdef1234567890abcdef12345678",
  };

  describe("Affiliate Link with Dynamic SubID Tracking", () => {
    it("attaches dynamic subid to affiliate links", () => {
      const link = getXBetAffiliateLink(mockEnv.XBET_LINK, "tele_bot_main");
      expect(link).toContain("subid=tele_bot_main");
      expect(link).toContain("reffpa.com");
    });

    it("supports custom campaign subids like tips_channel and register", () => {
      const tipsLink = getXBetAffiliateLink(mockEnv.XBET_LINK, "tips_channel");
      expect(tipsLink).toContain("subid=tips_channel");

      const regLink = getXBetAffiliateLink(mockEnv.XBET_LINK, "tele_bot_register");
      expect(regLink).toContain("subid=tele_bot_register");
    });
  });

  describe("Sri Lanka Anti-AML Bank Warnings", () => {
    it("contains strict warning prohibiting keywords 1xBet, Bet, or Game in Sinhala and English", () => {
      expect(SRI_LANKA_AML_BANK_WARNING.si).toContain("1xBet");
      expect(SRI_LANKA_AML_BANK_WARNING.si).toContain("Bet");
      expect(SRI_LANKA_AML_BANK_WARNING.si).toContain("Game");
      expect(SRI_LANKA_AML_BANK_WARNING.si).toContain("Account freeze");

      expect(SRI_LANKA_AML_BANK_WARNING.en).toContain("1xBet");
      expect(SRI_LANKA_AML_BANK_WARNING.en).toContain("Bet");
      expect(SRI_LANKA_AML_BANK_WARNING.en).toContain("Game");
      expect(SRI_LANKA_AML_BANK_WARNING.en).toContain("Personal");
    });

    it("appends AML warning to all bank account details", () => {
      const commDetails = getPaymentMethodAccountDetails("COMMERCIAL", mockEnv, "si");
      expect(commDetails).toContain("Commercial Bank");
      expect(commDetails).toContain("8001234567");
      expect(commDetails).toContain("Account freeze");

      const sampathDetails = getPaymentMethodAccountDetails("SAMPATH", mockEnv, "en");
      expect(sampathDetails).toContain("Sampath Bank");
      expect(sampathDetails).toContain("105456146706");
      expect(sampathDetails).toContain("Strictly PROHIBIT writing words like '1xBet'");

      const hnbDetails = getPaymentMethodAccountDetails("HNB", mockEnv, "si");
      expect(hnbDetails).toContain("003010456789");
      expect(hnbDetails).toContain("Account freeze");

      const bocDetails = getPaymentMethodAccountDetails("BOC", mockEnv, "si");
      expect(bocDetails).toContain("95645895");
      expect(bocDetails).toContain("Account freeze");
    });
  });

  describe("Mobile Money & Crypto Details", () => {
    it("renders eZ Cash and mCash numbers properly with reference advice", () => {
      const ez = getPaymentMethodAccountDetails("EZCASH", mockEnv, "si");
      expect(ez).toContain("0765865387");
      expect(ez).toContain("Reference");

      const mcash = getPaymentMethodAccountDetails("MCASH", mockEnv, "si");
      expect(mcash).toContain("0711234567");
    });

    it("renders Binance Pay and USDT (TRC20/BEP20) addresses", () => {
      const bPay = getPaymentMethodAccountDetails("BINANCE_PAY", mockEnv, "si");
      expect(bPay).toContain("876543210");

      const trc20 = getPaymentMethodAccountDetails("USDT_TRC20", mockEnv, "si");
      expect(trc20).toContain("TLaSy8abcdefghijklmnopqrstuvwxyz123456");
      expect(trc20).toContain("TRC20");

      const bep20 = getPaymentMethodAccountDetails("USDT_BEP20", mockEnv, "si");
      expect(bep20).toContain("0x1234567890abcdef1234567890abcdef12345678");
      expect(bep20).toContain("BEP20");
    });
  });

  describe("Registration View & Benefits", () => {
    it("highlights 130% welcome bonus + 0% cashier deposit fees and interactive promo code", () => {
      const text = buildRegistrationView("VGSL", "https://reffpa.com/L?subid=tele_bot_register", "si");
      expect(text).toContain("`VGSL`");
      expect(text).toContain("130% Welcome Bonus");
      expect(text).toContain("0% Cashier Deposit Fees");
      expect(text).toContain("https://reffpa.com/L?subid=tele_bot_register");
    });
  });

  describe("Admin Slip Forwarding & Alerts", () => {
    it("formats deposit slip alert with user ID, username, amount, and timestamp", () => {
      const alert = formatDepositAdminSlipAlert({
        depositId: 101,
        userId: 98765432,
        username: "srilanka_player",
        firstName: "Kamal",
        playerId: "1X_998877",
        amount: 25000,
        paymentMethod: "COMMERCIAL",
        timestamp: "2026-10-05 19:30:00",
        r2Key: "receipts/dep_101.jpg",
      });

      expect(alert).toContain("#101");
      expect(alert).toContain("98765432");
      expect(alert).toContain("@srilanka_player");
      expect(alert).toContain("1X_998877");
      expect(alert).toContain("25,000");
      expect(alert).toContain("COMMERCIAL");
      expect(alert).toContain("receipts/dep_101.jpg");
    });

    it("formats withdrawal alert with player ID, withdrawal code, destination, and amount", () => {
      const alert = formatWithdrawalAdminAlert({
        withdrawalId: 202,
        userId: 98765432,
        username: "srilanka_player",
        firstName: "Kamal",
        playerId: "1X_998877",
        amount: 15000,
        paymentMethod: "COMMERCIAL",
        destinationAccount: "Commercial Bank - 8001234567",
        maskedCode: "****89",
        timestamp: "2026-10-05 19:35:00",
      });

      expect(alert).toContain("#202");
      expect(alert).toContain("1X_998877");
      expect(alert).toContain("15,000");
      expect(alert).toContain("8001234567");
      expect(alert).toContain("****89");
    });
  });

  describe("Cashier Keyboard", () => {
    it("constructs keyboard with local banks, mobile money, and crypto", () => {
      const kb = buildCashierMethodKeyboard("pay_dep", "si");
      expect(kb).toBeDefined();
    });
  });
});
