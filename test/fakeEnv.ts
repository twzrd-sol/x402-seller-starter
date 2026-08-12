import type { Env } from "../src/index.js";
import { DEFAULTS, PLACEHOLDER_PAY_TO } from "../src/payTo.js";

/** Deterministic base58-looking address for tests — never fund this. */
export const TEST_PAY_TO = "11111111111111111111111111111112";

/**
 * Worker env for hermetic tests. Defaults to a valid-looking PAY_TO so free
 * routes can run; override PAY_TO to exercise the config guard.
 */
export function fakeEnv(overrides: Partial<Env> = {}): Env {
  return {
    PAY_TO: TEST_PAY_TO,
    PRICE: DEFAULTS.PRICE,
    FACILITATOR_URL: DEFAULTS.FACILITATOR_URL,
    NETWORK: DEFAULTS.NETWORK,
    ...overrides,
  };
}

export { PLACEHOLDER_PAY_TO };
