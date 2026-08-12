/**
 * PAY_TO validation — pure helpers so unit tests do not need a live facilitator.
 */

/** Wallet-shaped placeholder shipped so config is self-documenting. */
export const PLACEHOLDER_PAY_TO = "YOUR_SOLANA_WALLET_ADDRESS";

/** Base58 Solana address shape (32–44 chars, no 0/O/I/l). */
export const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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
 * Validate operator PAY_TO before any paid route can run.
 * Refuse placeholder / empty / non-base58 so one-click deploys never misroute money.
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
  if (!BASE58.test(payTo)) {
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

export function isSolanaAddress(raw: string | undefined | null): boolean {
  const s = (raw ?? "").trim();
  return s.length > 0 && s !== PLACEHOLDER_PAY_TO && BASE58.test(s);
}
