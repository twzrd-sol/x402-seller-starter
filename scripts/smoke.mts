/**
 * Proves the template actually sells something before anyone deploys it.
 *
 * Boots the Worker in-process and asserts the three things a one-click deploy
 * can get wrong in ways the deployer would not notice:
 *   1. the paid route really returns a 402 (not a 500, not a free 200)
 *   2. the challenge carries a *sponsored* Solana **mainnet** requirement
 *      (network exactly "solana", not solana-devnet / CAIP-2-only)
 *   3. an unset PAY_TO is refused loudly, so a fresh deploy can never route a
 *      stranger's money to the template's placeholder wallet
 *
 * Run: npm run smoke        (uses the live TWZRD facilitator by default)
 *      FACILITATOR_URL=... npm run smoke
 *      npm run smoke:contrast   (TWZRD must pass; x402.org/facilitator must fail)
 */
import app from "../src/index.js";

const FACILITATOR = process.env.FACILITATOR_URL || "https://intel.twzrd.xyz";
const REAL_WALLET = process.env.PAY_TO || "GFpLvocNdEjnSsLH3VJQL6wGcjGxTbUBrj6fqN3Qe1Gs";
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const env = {
  PAY_TO: REAL_WALLET,
  PRICE: "$0.05",
  FACILITATOR_URL: FACILITATOR,
  NETWORK: "solana",
};

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? ` -- ${detail}` : ""}`);
  if (!ok) failures++;
}

const call = (path: string, e: Record<string, string> = env) =>
  app.fetch(new Request(`https://example.test${path}`), e as never);

console.log(`x402 seller starter smoke  (facilitator=${FACILITATOR})`);

// 1. free route
const root = await call("/");
check("free route serves 200", root.status === 200, `got ${root.status}`);

// 2. paid route must 402, and the challenge must come from the facilitator
let paidStatus = 0;
let paidBody: any = null;
try {
  const paid = await call("/paid/hello");
  paidStatus = paid.status;
  if (paid.status === 402) {
    paidBody = await paid.json();
  }
  check("paid route returns 402", paid.status === 402, `got ${paid.status}`);
} catch (err: any) {
  // x402-hono throws when /supported has no feePayer for network: solana
  // (stock Cloudflare docs path → x402.org facilitator). Surface as 500-class fail.
  const msg = String(err?.message || err);
  check("paid route returns 402", false, `threw: ${msg.slice(0, 120)}`);
}

if (paidStatus === 402 && paidBody) {
  const accepts = paidBody?.accepts?.[0];
  const network = String(accepts?.network || "");
  // Mainnet wedge: short name "solana" is what x402-core + CF sellers request.
  // Devnet aliases (solana-devnet, solana:EtWTRAB…) are NOT mainnet.
  check(
    "challenge network is mainnet short name solana",
    accepts?.scheme === "exact" && network === "solana",
    JSON.stringify({ scheme: accepts?.scheme, network }),
  );
  check("payTo is the operator's wallet", accepts?.payTo === REAL_WALLET, String(accepts?.payTo));
  const feePayer = accepts?.extra?.feePayer;
  check(
    "facilitator supplied a gas sponsor (feePayer)",
    Boolean(feePayer) && BASE58.test(String(feePayer)),
    feePayer ? `feePayer=${feePayer}` : "MISSING - facilitator did not answer /supported for solana mainnet",
  );
} else {
  check("challenge network is mainnet short name solana", false, "no 402 to inspect");
  check("payTo is the operator's wallet", false, "no 402 to inspect");
  check("facilitator supplied a gas sponsor (feePayer)", false, "no 402 to inspect");
}

// 3. an unconfigured deploy must refuse, not misroute money
const unset = await call("/paid/hello", { ...env, PAY_TO: "YOUR_SOLANA_WALLET_ADDRESS" });
check("placeholder PAY_TO is refused", unset.status === 500, `got ${unset.status}`);

console.log(failures === 0 ? "\nOK - template sells." : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
