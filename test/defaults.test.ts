import { describe, expect, it } from "vitest";
import {
  DEFAULT_FACILITATOR_URL,
  DEFAULT_NETWORK,
  DEFAULT_PRICE,
  resolveFacilitatorUrl,
  resolveNetwork,
  resolvePrice,
} from "../src/defaults.js";

describe("defaults", () => {
  it("ships TWZRD mainnet-friendly defaults", () => {
    expect(DEFAULT_PRICE).toBe("$0.05");
    expect(DEFAULT_NETWORK).toBe("solana");
    expect(DEFAULT_FACILITATOR_URL).toBe("https://intel.twzrd.xyz");
  });

  it("resolves empty env to defaults", () => {
    expect(resolvePrice("")).toBe(DEFAULT_PRICE);
    expect(resolvePrice(undefined)).toBe(DEFAULT_PRICE);
    expect(resolveNetwork("  ")).toBe(DEFAULT_NETWORK);
    expect(resolveFacilitatorUrl(null)).toBe(DEFAULT_FACILITATOR_URL);
  });

  it("honors explicit overrides", () => {
    expect(resolvePrice("$0.01")).toBe("$0.01");
    expect(resolveNetwork("solana-devnet")).toBe("solana-devnet");
    expect(resolveFacilitatorUrl("https://example.com/fac")).toBe("https://example.com/fac");
  });
});
