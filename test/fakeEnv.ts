import type { Env } from "../src/index.js";

/** Deterministic base58-looking test address — never used on-chain. */
export const TEST_PAY_TO = "11111111111111111111111111111112";

export function fakeEnv(overrides: Partial<Env> = {}): Env {
  return {
    PAY_TO: TEST_PAY_TO,
    PRICE: "$0.05",
    FACILITATOR_URL: "https://intel.twzrd.xyz",
    NETWORK: "solana",
    ...overrides,
  };
}
