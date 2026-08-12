/**
 * Proves the template actually sells something before anyone deploys it.
 *
 * Boots the Worker in-process and asserts the things a one-click deploy
 * can get wrong in ways the deployer would not notice:
 *   1. the paid route really returns a 402 (not a 500, not a free 200)
 *   2. the challenge carries a *sponsored* Solana **mainnet** requirement
 *      (network exactly "solana", not solana-devnet / CAIP-2-only)
 *   3. an unset PAY_TO is refused loudly, so a fresh deploy can never route a
 *      stranger's money to the template's placeholder wallet
 *   4. changing PRICE actually changes the settled amount - nothing else in
 *      this repo's test suite (hermetic or live) verifies this; the hermetic
 *      suite pins the PAY_TO guard, and the rest of this script always ran
 *      with the same hardcoded $0.05, so a bug that silently ignored PRICE
 *      would have passed every other check
 *
 * Run: npm run smoke        (uses the live TWZRD facilitator by default)
 *      FACILITATOR_URL=... npm run smoke
 *      npm run smoke:contrast   (TWZRD must pass; x402.org/facilitator must fail)
 */
import app from "../src/index.js";
import { BASE58_SOLANA, DEFAULTS, PLACEHOLDER_PAY_TO } from "../src/payTo.js";

const FACILITATOR = process.env.FACILITATOR_URL || DEFAULTS.FACILITATOR_URL;
const REAL_WALLET = process.env.PAY_TO || "GFpLvocNdEjnSsLH3VJQL6wGcjGxTbUBrj6fqN3Qe1Gs";

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
    Boolean(feePayer) && BASE58_SOLANA.test(String(feePayer)),
    feePayer ? `feePayer=${feePayer}` : "MISSING - facilitator did not answer /supported for solana mainnet",
  );
} else {
  check("challenge network is mainnet short name solana", false, "no 402 to inspect");
  check("payTo is the operator's wallet", false, "no 402 to inspect");
  check("facilitator supplied a gas sponsor (feePayer)", false, "no 402 to inspect");
}

// 3. an unconfigured deploy must refuse, not misroute money
const unset = await call("/paid/hello", { ...env, PAY_TO: PLACEHOLDER_PAY_TO });
check("placeholder PAY_TO is refused", unset.status === 500, `got ${unset.status}`);

// 4. PRICE actually drives the settled amount, not just the default $0.05
// every other check above happens to use.
try {
  const custom = await call("/paid/hello", { ...env, PRICE: "$0.10" });
  const customBody: any = custom.status === 402 ? await custom.json() : null;
  const amount = customBody?.accepts?.[0]?.maxAmountRequired;
  check(
    "PRICE=$0.10 produces maxAmountRequired=100000 (not the $0.05 default)",
    custom.status === 402 && amount === "100000",
    `status=${custom.status} maxAmountRequired=${amount}`,
  );
} catch (err: any) {
  check("PRICE=$0.10 produces maxAmountRequired=100000 (not the $0.05 default)", false, `threw: ${String(err?.message || err).slice(0, 120)}`);
}

console.log(failures === 0 ? "\nOK - template sells." : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
