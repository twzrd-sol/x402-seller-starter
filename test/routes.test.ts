/**
 * Offline Worker route tests — no live facilitator.
 * Live 402 / feePayer assertions stay in `npm run smoke`.
 */
import { describe, expect, it } from "vitest";
import app from "../src/index.js";
import { PLACEHOLDER_PAY_TO } from "../src/pay-to.js";
import { DEFAULT_FACILITATOR_URL, DEFAULT_NETWORK, DEFAULT_PRICE } from "../src/defaults.js";
import { TEST_PAY_TO, fakeEnv } from "./fakeEnv.js";

describe("GET / (free discovery)", () => {
  it("returns 200 with paid_route and defaults when env empty strings", async () => {
    const env = fakeEnv({
      PRICE: "",
      NETWORK: "",
      FACILITATOR_URL: "",
    });
    const res = await app.request("https://example.test/", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.paid_route).toBe("/paid/hello");
    expect(body.price).toBe(DEFAULT_PRICE);
    expect(body.network).toBe(DEFAULT_NETWORK);
    expect(body.facilitator).toBe(DEFAULT_FACILITATOR_URL);
    expect(String(body.try_it)).toContain("/paid/hello");
  });

  it("reflects configured price/network/facilitator", async () => {
    const res = await app.request(
      "https://example.test/",
      {},
      fakeEnv({ PRICE: "$0.01", NETWORK: "solana", FACILITATOR_URL: "https://fac.example" }),
    );
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.price).toBe("$0.01");
    expect(body.facilitator).toBe("https://fac.example");
  });
});

describe("PAY_TO misconfiguration guard (HTTP)", () => {
  it("refuses placeholder on any route including free /", async () => {
    const res = await app.request(
      "https://example.test/",
      {},
      fakeEnv({ PAY_TO: PLACEHOLDER_PAY_TO }),
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("pay_to_not_configured");
  });

  it("refuses empty PAY_TO on paid route", async () => {
    const res = await app.request(
      "https://example.test/paid/hello",
      {},
      fakeEnv({ PAY_TO: "" }),
    );
    expect(res.status).toBe(500);
    expect(((await res.json()) as { error: string }).error).toBe("pay_to_not_configured");
  });

  it("refuses EVM-shaped PAY_TO", async () => {
    const res = await app.request(
      "https://example.test/paid/hello",
      {},
      fakeEnv({ PAY_TO: "0x" + "11".repeat(20) }),
    );
    expect(res.status).toBe(500);
    expect(((await res.json()) as { error: string }).error).toBe("pay_to_not_base58");
  });

  it("allows a valid test payTo past the guard (paid route may then 402 via middleware)", async () => {
    // With valid PAY_TO the global guard passes. paymentMiddleware may then
    // hit the network; we only assert we did NOT get the misconfig 500.
    const res = await app.request(
      "https://example.test/",
      {},
      fakeEnv({ PAY_TO: TEST_PAY_TO }),
    );
    expect(res.status).toBe(200);
  });
});
