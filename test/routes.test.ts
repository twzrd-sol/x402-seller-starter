import { describe, expect, it } from "vitest";
import app from "../src/index.js";
import { PLACEHOLDER_PAY_TO } from "../src/address.js";
import { TEST_PAY_TO, fakeEnv } from "./fakeEnv.js";

async function json(res: Response): Promise<Record<string, unknown>> {
  return res.json() as Promise<Record<string, unknown>>;
}

describe("money-routing guards (offline)", () => {
  it("GET / with placeholder PAY_TO returns 500 pay_to_not_configured", async () => {
    const res = await app.request(
      "https://example.test/",
      {},
      fakeEnv({ PAY_TO: PLACEHOLDER_PAY_TO }),
    );
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toBe("pay_to_not_configured");
  });

  it("GET /paid/hello with placeholder PAY_TO is refused (never misroutes)", async () => {
    const res = await app.request(
      "https://example.test/paid/hello",
      {},
      fakeEnv({ PAY_TO: PLACEHOLDER_PAY_TO }),
    );
    expect(res.status).toBe(500);
    expect((await json(res)).error).toBe("pay_to_not_configured");
  });

  it("GET / with empty PAY_TO is refused", async () => {
    const res = await app.request(
      "https://example.test/",
      {},
      fakeEnv({ PAY_TO: "" }),
    );
    expect(res.status).toBe(500);
    expect((await json(res)).error).toBe("pay_to_not_configured");
  });

  it("GET / with EVM-shaped PAY_TO returns pay_to_not_base58", async () => {
    const res = await app.request(
      "https://example.test/",
      {},
      fakeEnv({ PAY_TO: "0x" + "ab".repeat(20) }),
    );
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toBe("pay_to_not_base58");
    expect(String(body.received)).toMatch(/^0x/);
  });
});

describe("free discovery route (offline)", () => {
  it("GET / returns catalog fields when PAY_TO is configured", async () => {
    const res = await app.request(
      "https://example.test/",
      {},
      fakeEnv({
        PAY_TO: TEST_PAY_TO,
        PRICE: "$0.05",
        FACILITATOR_URL: "https://intel.twzrd.xyz",
        NETWORK: "solana",
      }),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.ok).toBe(true);
    expect(body.paid_route).toBe("/paid/hello");
    expect(body.facilitator).toBe("https://intel.twzrd.xyz");
    expect(body.network).toBe("solana");
    expect(body.price).toBe("$0.05");
    expect(String(body.try_it)).toContain("/paid/hello");
  });

  it("GET / reflects custom FACILITATOR_URL and PRICE from env", async () => {
    const res = await app.request(
      "https://example.test/",
      {},
      fakeEnv({
        FACILITATOR_URL: "https://example-facilitator.test",
        PRICE: "$0.01",
      }),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.facilitator).toBe("https://example-facilitator.test");
    expect(body.price).toBe("$0.01");
  });
});
