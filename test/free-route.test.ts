import { describe, expect, it } from "vitest";
import app from "../src/index.js";
import { json } from "./json.js";

const VALID_PAY_TO = "GFpLvocNdEjnSsLH3VJQL6wGcjGxTbUBrj6fqN3Qe1Gs";

describe("GET / (discovery route)", () => {
  it("returns 200 with a self-describing payload when PAY_TO is configured", async () => {
    const res = await app.request(
      "https://example.workers.dev/",
      {},
      { PAY_TO: VALID_PAY_TO, PRICE: "$0.05", FACILITATOR_URL: "https://intel.twzrd.xyz", NETWORK: "solana" },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.ok).toBe(true);
    expect(body.paid_route).toBe("/paid/hello");
    expect(body.facilitator).toBe("https://intel.twzrd.xyz");
    expect(body.network).toBe("solana");
    expect(body.price).toBe("$0.05");
    expect(body.try_it).toBe(
      "curl -i https://example.workers.dev/paid/hello   # -> 402 with payment requirements",
    );
  });

  it("falls back to defaults (facilitator/network/price) when those env vars are empty", async () => {
    const res = await app.request(
      "https://example.workers.dev/",
      {},
      { PAY_TO: VALID_PAY_TO, PRICE: "", FACILITATOR_URL: "", NETWORK: "" },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.facilitator).toBe("https://intel.twzrd.xyz");
    expect(body.network).toBe("solana");
    expect(body.price).toBe("$0.05");
  });

  it("reflects a non-default FACILITATOR_URL/NETWORK/PRICE when explicitly set", async () => {
    const res = await app.request(
      "https://example.workers.dev/",
      {},
      {
        PAY_TO: VALID_PAY_TO,
        PRICE: "$0.10",
        FACILITATOR_URL: "https://x402.org/facilitator",
        NETWORK: "solana-devnet",
      },
    );
    const body = await json(res);
    expect(body.facilitator).toBe("https://x402.org/facilitator");
    expect(body.network).toBe("solana-devnet");
    expect(body.price).toBe("$0.10");
  });

  it("builds try_it from the request's own origin, not a hardcoded host", async () => {
    const res = await app.request(
      "https://my-custom-worker.example.com/",
      {},
      { PAY_TO: VALID_PAY_TO, PRICE: "$0.05", FACILITATOR_URL: "https://intel.twzrd.xyz", NETWORK: "solana" },
    );
    const body = await json(res);
    expect(body.try_it).toContain("https://my-custom-worker.example.com/paid/hello");
  });
});
