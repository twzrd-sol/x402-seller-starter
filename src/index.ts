/**
 * x402 seller on Cloudflare Workers, with a trust gate on settlement.
 *
 * This is the stock pattern from Cloudflare's own docs - `x402-hono`'s
 * paymentMiddleware - with ONE difference: the third argument (the facilitator)
 * points at TWZRD instead of the default. That single argument is what buys you
 * gas-sponsored settlement and a counterparty check before you accept money.
 *
 * Nothing here is TWZRD-specific beyond that URL. Change FACILITATOR_URL and
 * this template keeps working against any x402 facilitator - which is the point:
 * the facilitator slot is a standard seam, not a lock-in.
 */
import { Hono } from "hono";
import { paymentMiddleware } from "x402-hono";
import { validatePayTo } from "./address.js";

export type Env = {
  /** Your Solana wallet. Payments land here. REQUIRED - the template refuses to run on the placeholder. */
  PAY_TO: string;
  /** Price per call, e.g. "$0.05". Keep >= $0.01: below that, sponsored gas costs more than the sale is worth. */
  PRICE: string;
  /** Facilitator that verifies + settles. Defaults to TWZRD (gas-sponsored Solana + trust gate). */
  FACILITATOR_URL: string;
  /** "solana" (mainnet). The short name is required - x402 core rejects the CAIP-2 form here. */
  NETWORK: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  const v = validatePayTo(c.env.PAY_TO);
  if (!v.ok) {
    if (v.error === "pay_to_not_configured") {
      return c.json(
        {
          error: "pay_to_not_configured",
          detail:
            "Set PAY_TO to your own Solana wallet before serving paid routes. " +
            "Left unset, every payment would be routed to the template's placeholder.",
          how: "wrangler.jsonc -> vars.PAY_TO, or the Cloudflare dashboard -> Settings -> Variables",
        },
        500,
      );
    }
    return c.json(
      {
        error: "pay_to_not_base58",
        received: v.received,
        detail: "PAY_TO must be a base58 Solana address.",
      },
      500,
    );
  }
  return next();
});

// The paid surface. Everything under /paid/* requires an x402 payment.
//
// The casts are load-bearing and not laziness: x402-hono types `payTo` as an
// EVM `0x${string}` Address, so a base58 Solana wallet does not typecheck even
// though the runtime accepts it (see `npm run smoke` - a live 402 comes back
// with this exact wallet in payTo). The middleware's types are EVM-first; the
// protocol is not. Remove the casts only when upstream widens the type.
app.use("/paid/*", async (c, next) =>
  paymentMiddleware(
    c.env.PAY_TO as never,
    {
      "/paid/*": {
        price: c.env.PRICE || "$0.05",
        network: (c.env.NETWORK || "solana") as never,
      },
    },
    { url: (c.env.FACILITATOR_URL || "https://intel.twzrd.xyz") as never },
  )(c, next),
);

app.get("/paid/hello", (c) =>
  c.json({
    ok: true,
    content: "You paid for this. Replace it with whatever you actually sell.",
    paidAt: new Date().toISOString(),
  }),
);

app.get("/", (c) =>
  c.json({
    ok: true,
    what: "x402 seller on Cloudflare Workers, settled through a trust-gating facilitator.",
    paid_route: "/paid/hello",
    facilitator: c.env.FACILITATOR_URL || "https://intel.twzrd.xyz",
    network: c.env.NETWORK || "solana",
    price: c.env.PRICE || "$0.05",
    try_it:
      "curl -i " +
      new URL(c.req.url).origin +
      "/paid/hello   # -> 402 with payment requirements",
  }),
);

export default app;
