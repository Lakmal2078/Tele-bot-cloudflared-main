import { describe, expect, it } from "vitest";
import {
  getXBetAffiliateLink,
  SRI_LANKA_AML_BANK_WARNING,
  getPaymentMethodAccountDetails,
  buildRegistrationView,
  formatDepositAdminSlipAlert,
  formatWithdrawalAdminAlert,
  buildCashierMethodKeyboard,
  generateIdempotencyKey,
  processDepositSubmission,
  processWithdrawalSubmission,
} from "../src/cashier";
import { createD1Database } from "../src/sqlite-d1";
import * as db from "../src/db";
import type { Env } from "../src/types";

describe("cashier safety and business configuration", () => {
  const baseEnv: Env = {
    DB: {} as any,
    BOT_TOKEN: "mock_token",
    ADMIN_IDS: "123456789",
    WEBHOOK_SECRET: "mock_webhook_secret",
    ADMIN_API_SECRET: "mock_admin_api_secret",
    CHANNEL_USERNAME: "@fast_xbet_official_tips",
    CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
    XBET_LINK: "",
    XBET_PROMO_CODE: "",
    MIN_TRANSACTION_LKR: "1000",
    MAX_TRANSACTION_LKR: "500000",
    DEPOSIT_INSTRUCTIONS: "Instructions",
  };

  it("requires an explicitly configured affiliate URL", () => {
    expect(getXBetAffiliateLink(undefined)).toBe("");
    expect(getXBetAffiliateLink("not-a-url", "register")).toBe("");
  });

  it("adds a campaign subID without replacing the configured host", () => {
    const link = getXBetAffiliateLink("https://partner.example/register?tag=abc", "register");
    expect(link).toContain("https://partner.example/register");
    expect(link).toContain("subid=register");
  });

  it("uses compliance-safe payment wording", () => {
    expect(SRI_LANKA_AML_BANK_WARNING.si).toContain("නිවැරදි තොරතුරු");
    expect(SRI_LANKA_AML_BANK_WARNING.en).toContain("Do not misrepresent");
    expect(SRI_LANKA_AML_BANK_WARNING.en).not.toContain("Leave it blank");
    expect(SRI_LANKA_AML_BANK_WARNING.en).not.toContain("prevent bank account restrictions");
  });

  it("fails closed when verified crypto destinations are missing", () => {
    const noCrypto = { ...baseEnv };
    const binance = getPaymentMethodAccountDetails("BINANCE_PAY", noCrypto, "en");
    const trc20 = getPaymentMethodAccountDetails("USDT_TRC20", noCrypto, "en");
    const bep20 = getPaymentMethodAccountDetails("USDT_BEP20", noCrypto, "en");
    expect(binance).toContain("temporarily unavailable");
    expect(trc20).toContain("temporarily unavailable");
    expect(bep20).toContain("temporarily unavailable");
    const text = [binance, trc20, bep20].join("\n");
    expect(text).not.toContain("876543210");
    expect(text).not.toContain("TLaSy8abcdefghijklmnopqrstuvwxyz123456");
    expect(text).not.toContain("0x1234567890abcdef1234567890abcdef12345678");
  });

  it("renders configured bank details with a truthful compliance notice", () => {
    const env = { ...baseEnv, BOC_DETAILS: "Verified BOC account details" };
    const text = getPaymentMethodAccountDetails("BOC", env, "en");
    expect(text).toContain("Verified BOC account details");
    expect(text).toContain("Do not misrepresent");
  });

  it("does not hard-code promotional percentages or guaranteed approval times", () => {
    const text = buildRegistrationView("PROMO123", "https://partner.example/register", "en");
    expect(text).toContain("PROMO123");
    expect(text).toContain("https://partner.example/register");
    expect(text).not.toContain("130% Welcome Bonus");
    expect(text).not.toContain("5-15 mins");
    expect(text).not.toContain("0% Cashier Deposit Fees");
  });

  it("formats admin deposit and withdrawal alerts without changing supplied facts", () => {
    const deposit = formatDepositAdminSlipAlert({
      depositId: 101, userId: 98765432, username: "customer", firstName: "Kamal",
      playerId: "PLAYER-9988", amount: 25000, paymentMethod: "BOC",
      timestamp: "2026-10-05 19:30:00", r2Key: "receipts/dep_101.jpg",
    });
    expect(deposit).toContain("#101");
    expect(deposit).toContain("98765432");
    expect(deposit).toContain("PLAYER-9988");
    expect(deposit).toContain("25,000");

    const withdrawal = formatWithdrawalAdminAlert({
      withdrawalId: 202, userId: 98765432, username: "customer", firstName: "Kamal",
      playerId: "PLAYER-9988", amount: 15000, paymentMethod: "BOC",
      destinationAccount: "Verified payout destination", maskedCode: "****89",
      timestamp: "2026-10-05 19:35:00",
    });
    expect(withdrawal).toContain("#202");
    expect(withdrawal).toContain("15,000");
    expect(withdrawal).toContain("****89");
  });

  it("builds the cashier payment-method keyboard", () => {
    const kb = buildCashierMethodKeyboard("pay_dep", "si");
    expect(kb).toBeDefined();
  });

  it("generates deterministic idempotency keys for submissions", () => {
    const key1 = generateIdempotencyKey("dep", 12345, 5000, "PLAYER1");
    const key2 = generateIdempotencyKey("dep", 12345, 5000, "PLAYER1");
    const key3 = generateIdempotencyKey("dep", 12345, 5000, "PLAYER2");
    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).toContain("dep_");
  });

  it("orchestrates deposit submission with idempotency deduplication", async () => {
    const d1 = createD1Database(":memory:");
    const env: Env = {
      ...baseEnv,
      DB: d1,
    };

    await db.saveUser(d1, 998877, "player77", "Player", null, "si");

    const idempotencyKey = generateIdempotencyKey("dep", 998877, 2500, "PLAY-77");

    // First submission
    const res1 = await processDepositSubmission({
      env,
      userId: 998877,
      username: "player77",
      playerId: "PLAY-77",
      amount: 2500,
      photoFileId: "receipt_file_abc",
      paymentMethod: "BOC",
      idempotencyKey,
    });

    expect(res1.depositId).toBeGreaterThan(0);

    // Duplicate submission with same key
    const res2 = await processDepositSubmission({
      env,
      userId: 998877,
      username: "player77",
      playerId: "PLAY-77",
      amount: 2500,
      photoFileId: "receipt_file_abc",
      paymentMethod: "BOC",
      idempotencyKey,
    });

    // Should return existing depositId without creating a new record
    expect(res2.depositId).toBe(res1.depositId);

    // Verify only 1 record exists in DB
    const count = await d1.prepare("SELECT COUNT(*) as count FROM deposits WHERE user_id = ?").bind(998877).first<any>();
    expect(count.count).toBe(1);
  });

  it("orchestrates withdrawal submission with idempotency deduplication", async () => {
    const d1 = createD1Database(":memory:");
    const env: Env = {
      ...baseEnv,
      DB: d1,
    };

    await db.saveUser(d1, 998877, "player77", "Player", null, "si");

    const idempotencyKey = generateIdempotencyKey("wd", 998877, 1500, "PLAY-77");

    // First submission
    const res1 = await processWithdrawalSubmission({
      env,
      userId: 998877,
      username: "player77",
      playerId: "PLAY-77",
      amount: 1500,
      paymentMethod: "COMMERCIAL",
      securityCode: "SEC-CODE-9999",
      destinationAccount: "Account 0012345678",
      idempotencyKey,
    });

    expect(res1.withdrawalId).toBeGreaterThan(0);

    // Duplicate submission with same key
    const res2 = await processWithdrawalSubmission({
      env,
      userId: 998877,
      username: "player77",
      playerId: "PLAY-77",
      amount: 1500,
      paymentMethod: "COMMERCIAL",
      securityCode: "SEC-CODE-9999",
      destinationAccount: "Account 0012345678",
      idempotencyKey,
    });

    // Should return existing withdrawalId without creating a new record
    expect(res2.withdrawalId).toBe(res1.withdrawalId);

    // Verify only 1 record exists in DB
    const count = await d1.prepare("SELECT COUNT(*) as count FROM withdrawals WHERE user_id = ?").bind(998877).first<any>();
    expect(count.count).toBe(1);
  });
});