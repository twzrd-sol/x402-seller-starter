/** Defaults aligned with wrangler.jsonc / README — pure for offline asserts. */
export const DEFAULT_PRICE = "$0.05";
export const DEFAULT_NETWORK = "solana";
export const DEFAULT_FACILITATOR_URL = "https://intel.twzrd.xyz";

export function resolvePrice(raw: string | undefined | null): string {
  const v = (raw ?? "").trim();
  return v || DEFAULT_PRICE;
}

export function resolveNetwork(raw: string | undefined | null): string {
  const v = (raw ?? "").trim();
  return v || DEFAULT_NETWORK;
}

export function resolveFacilitatorUrl(raw: string | undefined | null): string {
  const v = (raw ?? "").trim();
  return v || DEFAULT_FACILITATOR_URL;
}
