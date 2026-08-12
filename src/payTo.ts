/**
 * PAY_TO guard — pure, unit-testable.
 *
 * The wedge ships a wallet-shaped placeholder so config is self-documenting.
 * If it survives to runtime the operator never set PAY_TO, and every payment
 * would go to a stranger. Fail loudly instead of silently misrouting money.
 *
 * Extracted from the Worker entry so vitest can pin the rules without booting
 * x402-hono or calling a live facilitator (those stay in `npm run smoke`).
 *
 * On success, always return the **trimmed** address. Runtime MUST pass
 * `result.payTo` into paymentMiddleware — not raw `c.env.PAY_TO` — so
 * whitespace-padded vars still settle to the correct destination.
 */

/** Wallet-shaped placeholder shipped in wrangler.jsonc. Never accept at runtime. */
export const PLACEHOLDER_PAY_TO = "YOUR_SOLANA_WALLET_ADDRESS";

/** Solana base58 pubkey shape (32–44 chars, no 0/O/I/l). */
export const BASE58_SOLANA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type PayToOk = { ok: true; payTo: string };

export type PayToErr = {
  ok: false;
  status: 500;
  body: {
    error: "pay_to_not_configured" | "pay_to_not_base58";
    detail: string;
    how?: string;
    received?: string;
  };
};

/**
 * Validate operator PAY_TO before any route runs.
 * Success carries the normalized (trimmed) wallet the middleware must use.
 */
export function validatePayTo(raw: string | undefined | null): PayToOk | PayToErr {
  const payTo = (raw ?? "").trim();
  if (!payTo || payTo === PLACEHOLDER_PAY_TO) {
    return {
      ok: false,
      status: 500,
      body: {
        error: "pay_to_not_configured",
        detail:
          "Set PAY_TO to your own Solana wallet before serving paid routes. " +
          "Left unset, every payment would be routed to the template's placeholder.",
        how: "wrangler.jsonc -> vars.PAY_TO, or the Cloudflare dashboard -> Settings -> Variables",
      },
    };
  }
  if (!BASE58_SOLANA.test(payTo)) {
    return {
      ok: false,
      status: 500,
      body: {
        error: "pay_to_not_base58",
        received: payTo,
        detail: "PAY_TO must be a base58 Solana address.",
      },
    };
  }
  return { ok: true, payTo };
}

/** Defaults shared by the Worker and free-route discovery (short network name). */
export const DEFAULTS = {
  PRICE: "$0.05",
  FACILITATOR_URL: "https://intel.twzrd.xyz",
  /** Short name only — x402 core rejects CAIP-2 form on this v1 wedge path. */
  NETWORK: "solana",
} as const;

export function resolvePrice(raw: string | undefined | null): string {
  const v = (raw ?? "").trim();
  return v || DEFAULTS.PRICE;
}

export function resolveNetwork(raw: string | undefined | null): string {
  const v = (raw ?? "").trim();
  return v || DEFAULTS.NETWORK;
}

export function resolveFacilitatorUrl(raw: string | undefined | null): string {
  const v = (raw ?? "").trim();
  return v || DEFAULTS.FACILITATOR_URL;
}

/**
 * Networks that are NOT Solana mainnet for this wedge's smoke claim.
 * Used by tests to pin "solana" vs devnet / CAIP-2-only aliases.
 */
export function isMainnetSolanaShortName(network: string): boolean {
  return network === "solana";
}
