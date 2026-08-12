import { describe, expect, it } from "vitest";
import app from "../src/index.js";
import { DEFAULTS, PLACEHOLDER_PAY_TO } from "../src/payTo.js";
import { fakeEnv, TEST_PAY_TO } from "./fakeEnv.js";

describe("GET / (free discovery)", () => {
  it("returns 200 with wedge discovery fields when PAY_TO is configured", async () => {
    const res = await app.request("https://example.test/", {}, fakeEnv());
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.paid_route).toBe("/paid/hello");
    expect(body.facilitator).toBe(DEFAULTS.FACILITATOR_URL);
    expect(body.network).toBe("solana");
    expect(body.price).toBe(DEFAULTS.PRICE);
    expect(String(body.try_it)).toContain("/paid/hello");
  });

  it("reflects env overrides for facilitator / price / network", async () => {
    const res = await app.request(
      "https://example.test/",
      {},
      fakeEnv({
        FACILITATOR_URL: "https://example-facilitator.test",
        PRICE: "$0.10",
        NETWORK: "solana",
      }),
    );
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.facilitator).toBe("https://example-facilitator.test");
    expect(body.price).toBe("$0.10");
    expect(body.network).toBe("solana");
  });

  it("still runs the PAY_TO guard on free routes (misconfig fails closed)", async () => {
    const res = await app.request(
      "https://example.test/",
      {},
      fakeEnv({ PAY_TO: PLACEHOLDER_PAY_TO }),
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("pay_to_not_configured");
  });

  it("accepts whitespace-padded PAY_TO on free route (normalized by validatePayTo)", async () => {
    const res = await app.request(
      "https://example.test/",
      {},
      fakeEnv({ PAY_TO: `  ${TEST_PAY_TO}  ` }),
    );
    expect(res.status).toBe(200);
  });
});

describe("PAY_TO guard on routes (no live facilitator)", () => {
  it("placeholder PAY_TO → 500 pay_to_not_configured on paid route", async () => {
    const res = await app.request(
      "https://example.test/paid/hello",
      {},
      fakeEnv({ PAY_TO: PLACEHOLDER_PAY_TO }),
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; how?: string };
    expect(body.error).toBe("pay_to_not_configured");
    expect(body.how).toMatch(/wrangler/i);
  });

  it("empty PAY_TO → 500 pay_to_not_configured", async () => {
    const res = await app.request(
      "https://example.test/paid/hello",
      {},
      fakeEnv({ PAY_TO: "" }),
    );
    expect(res.status).toBe(500);
    expect((await res.json() as { error: string }).error).toBe("pay_to_not_configured");
  });

  it("EVM PAY_TO → 500 pay_to_not_base58 (does not call facilitator)", async () => {
    const res = await app.request(
      "https://example.test/paid/hello",
      {},
      fakeEnv({ PAY_TO: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" }),
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; received?: string };
    expect(body.error).toBe("pay_to_not_base58");
    expect(body.received).toMatch(/^0x/);
  });

  it("valid PAY_TO shape is not rejected by the guard (may proceed to middleware)", async () => {
    // No 402 assert — live facilitator is npm run smoke only.
    const res = await app.request(
      "https://example.test/paid/hello",
      {},
      fakeEnv({ PAY_TO: TEST_PAY_TO }),
    );
    expect(res.status).not.toBe(500);
  });

  it("whitespace-padded valid PAY_TO is not rejected (middleware gets trimmed payTo)", async () => {
    const res = await app.request(
      "https://example.test/paid/hello",
      {},
      fakeEnv({ PAY_TO: `  ${TEST_PAY_TO}  ` }),
    );
    // Guard must accept; 500 with pay_to_* would mean trim was not applied.
    expect(res.status).not.toBe(500);
  });
});
