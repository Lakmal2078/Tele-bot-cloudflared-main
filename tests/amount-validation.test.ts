import { describe, it, expect } from "vitest";
import { getTransactionLimits, validateTransactionAmount } from "../src/utils";

describe("getTransactionLimits", () => {
  it("uses defined MIN_TRANSACTION_LKR and MAX_TRANSACTION_LKR from env", () => {
    const limits = getTransactionLimits({
      MIN_TRANSACTION_LKR: "2500",
      MAX_TRANSACTION_LKR: "50000",
    });
    expect(limits.min).toBe(2500);
    expect(limits.max).toBe(50000);
  });

  it("handles commas and string formatting in env", () => {
    const limits = getTransactionLimits({
      MIN_TRANSACTION_LKR: "1,500",
      MAX_TRANSACTION_LKR: "75,000",
    });
    expect(limits.min).toBe(1500);
    expect(limits.max).toBe(75000);
  });

  it("falls back to default limits (1,000 to 100,000) when env is missing or empty", () => {
    const limitsEmpty = getTransactionLimits({});
    expect(limitsEmpty.min).toBe(1000);
    expect(limitsEmpty.max).toBe(100000);

    const limitsUndefined = getTransactionLimits(undefined);
    expect(limitsUndefined.min).toBe(1000);
    expect(limitsUndefined.max).toBe(100000);
  });

  it("ensures max is at least min even if max is misconfigured below min", () => {
    const limits = getTransactionLimits({
      MIN_TRANSACTION_LKR: "5000",
      MAX_TRANSACTION_LKR: "2000",
    });
    expect(limits.min).toBe(5000);
    expect(limits.max).toBe(100000);
  });
});

describe("validateTransactionAmount", () => {
  const min = 1000;
  const max = 50000;

  it("accepts valid integer amounts within range", () => {
    const res = validateTransactionAmount("5000", min, max);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.amount).toBe(5000);
    }
  });

  it("accepts amounts equal to exactly MIN_TRANSACTION_LKR boundary", () => {
    const res = validateTransactionAmount("1000", min, max);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.amount).toBe(1000);
    }
  });

  it("accepts amounts equal to exactly MAX_TRANSACTION_LKR boundary", () => {
    const res = validateTransactionAmount("50000", min, max);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.amount).toBe(50000);
    }
  });

  it("accepts decimal amounts with up to 2 decimal places", () => {
    const res = validateTransactionAmount("2500.50", min, max);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.amount).toBe(2500.5);
    }
  });

  it("parses numbers with commas correctly", () => {
    const res = validateTransactionAmount("10,000", min, max);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.amount).toBe(10000);
    }
  });

  it("handles currency prefix/suffix like LKR and Rs.", () => {
    const res1 = validateTransactionAmount("LKR 15000", min, max);
    expect(res1.valid).toBe(true);
    if (res1.valid) expect(res1.amount).toBe(15000);

    const res2 = validateTransactionAmount("Rs. 20000", min, max);
    expect(res2.valid).toBe(true);
    if (res2.valid) expect(res2.amount).toBe(20000);

    const res3 = validateTransactionAmount("30000 LKR", min, max);
    expect(res3.valid).toBe(true);
    if (res3.valid) expect(res3.amount).toBe(30000);
  });

  it("accepts number primitive input", () => {
    const res = validateTransactionAmount(12000, min, max);
    expect(res.valid).toBe(true);
    if (res.valid) expect(res.amount).toBe(12000);
  });

  it("rejects amounts below MIN_TRANSACTION_LKR with BELOW_MIN error", () => {
    const res = validateTransactionAmount("999.99", min, max);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toBe("BELOW_MIN");
      expect(res.amount).toBe(999.99);
      expect(res.min).toBe(min);
    }
  });

  it("rejects amounts above MAX_TRANSACTION_LKR with ABOVE_MAX error", () => {
    const res = validateTransactionAmount("50000.01", min, max);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toBe("ABOVE_MAX");
      expect(res.amount).toBe(50000.01);
      expect(res.max).toBe(max);
    }
  });

  it("rejects zero and negative amounts with INVALID_FORMAT error", () => {
    expect(validateTransactionAmount("0", min, max).error).toBe("INVALID_FORMAT");
    expect(validateTransactionAmount("-1000", min, max).error).toBe("INVALID_FORMAT");
  });

  it("rejects non-numeric characters and garbage strings with INVALID_FORMAT error", () => {
    expect(validateTransactionAmount("abc", min, max).error).toBe("INVALID_FORMAT");
    expect(validateTransactionAmount("1000abc", min, max).error).toBe("INVALID_FORMAT");
    expect(validateTransactionAmount("NaN", min, max).error).toBe("INVALID_FORMAT");
    expect(validateTransactionAmount("", min, max).error).toBe("INVALID_FORMAT");
    expect(validateTransactionAmount(null, min, max).error).toBe("INVALID_FORMAT");
    expect(validateTransactionAmount(undefined, min, max).error).toBe("INVALID_FORMAT");
  });

  it("rejects numbers with more than 2 decimal places with INVALID_FORMAT error", () => {
    expect(validateTransactionAmount("1500.555", min, max).error).toBe("INVALID_FORMAT");
  });
});
