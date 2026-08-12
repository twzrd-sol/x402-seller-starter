/**
 * PAY_TO guard — pure, unit-testable.
 *
 * The wedge ships a wallet-shaped placeholder so config is self-documenting.
 * If it survives to runtime the operator never set PAY_TO, and every payment
 * would go to a stranger. Fail loudly instead of silently misrouting money.
 *
 * Extracted from the Worker entry so vitest can pin the rules without booting
 * x402-hono or calling a live facilitator (those stay in `npm run smoke`).
 */

/** Wallet-shaped placeholder shipped in wrangler.jsonc. Never accept at runtime. */
export const PLACEHOLDER_PAY_TO = "YOUR_SOLANA_WALLET_ADDRESS";

/** Solana base58 pubkey shape (32–44 chars, no 0/O/I/l). */
export const BASE58_SOLANA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type PayToConfigError = {
  error: "pay_to_not_configured" | "pay_to_not_base58";
  detail: string;
  how?: string;
  received?: string;
};

/**
 * Returns a JSON-serializable error body if `payTo` must not be used as a
 * settlement destination, or `null` when it is safe to pass to the middleware.
 */
export function checkPayTo(payTo: string | undefined | null): PayToConfigError | null {
  const trimmed = (payTo ?? "").trim();
  if (!trimmed || trimmed === PLACEHOLDER_PAY_TO) {
    return {
      error: "pay_to_not_configured",
      detail:
        "Set PAY_TO to your own Solana wallet before serving paid routes. " +
        "Left unset, every payment would be routed to the template's placeholder.",
      how: "wrangler.jsonc -> vars.PAY_TO, or the Cloudflare dashboard -> Settings -> Variables",
    };
  }
  if (!BASE58_SOLANA.test(trimmed)) {
    return {
      error: "pay_to_not_base58",
      received: trimmed,
      detail: "PAY_TO must be a base58 Solana address.",
    };
  }
  return null;
}

/** Defaults shared by the Worker and free-route discovery (short network name). */
export const DEFAULTS = {
  PRICE: "$0.05",
  FACILITATOR_URL: "https://intel.twzrd.xyz",
  /** Short name only — x402 core rejects CAIP-2 form on this v1 wedge path. */
  NETWORK: "solana",
} as const;

/**
 * Networks that are NOT Solana mainnet for this wedge's smoke claim.
 * Used by tests to pin "solana" vs devnet / CAIP-2-only aliases.
 */
export function isMainnetSolanaShortName(network: string): boolean {
  return network === "solana";
}
