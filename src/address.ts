/**
 * Solana pay-to validation for the wedge seller.
 * Extracted so unit tests cover money-routing guards without network I/O.
 */

/** Wallet-shaped placeholder shipped in wrangler.jsonc. Must never accept payments. */
export const PLACEHOLDER_PAY_TO = "YOUR_SOLANA_WALLET_ADDRESS";

/** Base58 Solana address shape (32–44 chars, no 0/O/I/l). */
export const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isSolanaAddress(value: string | undefined | null): boolean {
  if (value == null) return false;
  const t = value.trim();
  if (!t) return false;
  return BASE58.test(t);
}

export type PayToValidation =
  | { ok: true; payTo: string }
  | { ok: false; error: "pay_to_not_configured" | "pay_to_not_base58"; received?: string };

/**
 * Refuse placeholder / empty / non-base58 before any payment can be routed.
 */
export function validatePayTo(raw: string | undefined | null): PayToValidation {
  const payTo = (raw ?? "").trim();
  if (!payTo || payTo === PLACEHOLDER_PAY_TO) {
    return { ok: false, error: "pay_to_not_configured" };
  }
  if (!BASE58.test(payTo)) {
    return { ok: false, error: "pay_to_not_base58", received: payTo };
  }
  return { ok: true, payTo };
}
