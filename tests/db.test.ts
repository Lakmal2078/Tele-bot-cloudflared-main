import { describe, expect, it } from "vitest";
import { addDeposit, addWithdrawal, toCents, toPositiveCents } from "../src/db";

describe("financial amount validation", () => {
  it("converts positive LKR to integer cents", () => {
    expect(toPositiveCents(1000)).toBe(100000);
    expect(toPositiveCents(1000.5)).toBe(100050);
  });

  it("rejects zero", () => {
    expect(() => toPositiveCents(0)).toThrow("Amount must be greater than zero");
  });

  it("rejects negative amounts", () => {
    expect(() => toPositiveCents(-100)).toThrow("Amount must be greater than zero");
  });

  it("rejects NaN and Infinity", () => {
    expect(() => toPositiveCents(Number.NaN)).toThrow("Amount must be greater than zero");
    expect(() => toPositiveCents(Number.POSITIVE_INFINITY)).toThrow("Amount must be greater than zero");
  });

  it("keeps generic toCents behavior unchanged", () => {
    expect(toCents(0)).toBe(0);
    expect(toCents(1000)).toBe(100000);
  });
});


type TxDatabase = Parameters<typeof addDeposit>[0];

/**
 * Minimal D1 stand-in for the insert race: both pre-checks find nothing, the INSERT trips
 * the unique idempotency index, and the recovery look-up finds the row that won the race.
 */
function racingDatabase(winnerId: number, table: "deposits" | "withdrawals") {
  const state = { selects: 0, inserts: 0 };
  const fake = {
    prepare(sql: string) {
      return {
        bind() {
          return this;
        },
        async first() {
          if (sql.includes(`SELECT id FROM ${table}`)) {
            state.selects += 1;
            return state.selects >= 3 && winnerId > 0 ? { id: winnerId } : null;
          }
          return null;
        },
        async run() {
          return { success: true, meta: { changes: 1 } };
        },
      };
    },
    async batch() {
      state.inserts += 1;
      throw new Error(`UNIQUE constraint failed: ${table}.idempotency_key`);
    },
  };
  return { db: fake as unknown as TxDatabase, state };
}

describe("concurrent submission recovery", () => {
  it("returns the winning deposit instead of throwing when the unique index rejects a duplicate", async () => {
    const { db, state } = racingDatabase(4242, "deposits");
    const id = await addDeposit(db, 555, "player", "PLAY-1", 1500, "file-r", "BANK", null, "dep_555_PLAY-1_1500_file-r");
    expect(id).toBe(4242);
    expect(state.inserts).toBe(1);
  });

  it("returns the winning withdrawal instead of throwing when the unique index rejects a duplicate", async () => {
    const { db, state } = racingDatabase(777, "withdrawals");
    const id = await addWithdrawal(db, 555, "player", "PLAY-1", 1500, null, "BANK", "acct-1", "wd_555_PLAY-1_1500_acct-1");
    expect(id).toBe(777);
    expect(state.inserts).toBe(1);
  });

  it("still surfaces a genuine insert failure when no duplicate row exists", async () => {
    const { db } = racingDatabase(0, "deposits");
    await expect(
      addDeposit(db, 555, "player", "PLAY-1", 1500, "file-r", "BANK", null, "dep_nobody")
    ).rejects.toThrow(/UNIQUE constraint failed/);
  });
});
