import { describe, expect, it } from "vitest";
import app from "../src/index.js";
import { json } from "./json.js";

// This middleware runs on every route (app.use("*", ...)), before any
// handler and before x402-hono's paymentMiddleware ever touches a
// network. All cases here are fully offline - no facilitator involved.

type TestEnv = {
  PAY_TO: string;
  PRICE: string;
  FACILITATOR_URL: string;
  NETWORK: string;
};

function env(payTo: string): TestEnv {
  return { PAY_TO: payTo, PRICE: "$0.05", FACILITATOR_URL: "https://intel.twzrd.xyz", NETWORK: "solana" };
}

// A syntactically valid base58 Solana address (not a real funded wallet).
const VALID_PAY_TO = "GFpLvocNdEjnSsLH3VJQL6wGcjGxTbUBrj6fqN3Qe1Gs";

describe("PAY_TO validation (applies to every route, including /)", () => {
  it("rejects an unset PAY_TO with pay_to_not_configured", async () => {
    const res = await app.request("/", {}, env(""));
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toBe("pay_to_not_configured");
  });

  it("rejects the shipped placeholder with pay_to_not_configured", async () => {
    const res = await app.request("/", {}, env("YOUR_SOLANA_WALLET_ADDRESS"));
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toBe("pay_to_not_configured");
  });

  it("trims whitespace before checking - an all-whitespace PAY_TO is treated as unset", async () => {
    const res = await app.request("/", {}, env("   "));
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toBe("pay_to_not_configured");
  });

  it("rejects a non-base58 PAY_TO (e.g. an EVM address) with pay_to_not_base58", async () => {
    const res = await app.request("/", {}, env("0x1234567890abcdef1234567890abcdef12345678"));
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toBe("pay_to_not_base58");
    expect(body.received).toBe("0x1234567890abcdef1234567890abcdef12345678");
  });

  it("rejects a base58-alphabet string of the wrong length", async () => {
    // Valid base58 characters, but too short to be a real 32-byte pubkey.
    const res = await app.request("/", {}, env("abc"));
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toBe("pay_to_not_base58");
  });

  it("passes through to the route handler for a well-formed base58 PAY_TO", async () => {
    const res = await app.request("/", {}, env(VALID_PAY_TO));
    expect(res.status).toBe(200);
  });
});
