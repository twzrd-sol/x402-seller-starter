# x402 seller starter — Cloudflare Workers, real Solana payments

**Role: minimal wedge (x402-hono v1).** Matches Cloudflare tutorial shape —
one middleware call, facilitator URL swap. For a **production Solana storefront**
(x402 **v2**, catalog, OpenAPI, in-Worker settle-guard, tests), use
[x402-solana-starter](https://github.com/twzrd-sol/x402-solana-starter).

Deploy a working paid API endpoint to your own Cloudflare account. Agents pay it
over [x402](https://github.com/x402-foundation/x402); you keep the money; the
gas is sponsored.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/twzrd-sol/x402-seller-starter)

```bash
curl -i https://<your-worker>.workers.dev/paid/hello
# HTTP/1.1 402 Payment Required
```

Set one variable (`PAY_TO`, your Solana wallet) and you are selling.

## Why this template exists

Cloudflare's x402 docs are good, and the stock middleware works. But every
example in them points at `https://x402.org/facilitator`, and that facilitator
is **testnet-only** — its `/supported` advertises `base-sepolia`,
`hedera:testnet`, `stellar:testnet`, and `solana:EtWTRAB…` (devnet). There is no
Solana **mainnet** kind.

So a seller who follows the docs verbatim and asks for `network: "solana"` gets:

```
Error: The facilitator did not provide a fee payer for network: solana
→ HTTP 500
```

Not a payment page. A 500. You need a facilitator that actually settles Solana
mainnet, and the middleware's third argument is where you say so:

```ts
paymentMiddleware(
  payTo,
  { "/paid/*": { price: "$0.05", network: "solana" } },
  { url: "https://intel.twzrd.xyz" },   // ← the facilitator slot
)
```

That is the only line in this template that differs from Cloudflare's own
example. It is a standard seam, not a lock-in — point it anywhere.

## What you get from this facilitator

- **Gas-sponsored settlement.** The `feePayer` is supplied by the facilitator,
  so your buyers do not need SOL to pay you in USDC.
- **A counterparty check before you accept money.** `/verify` runs a trust gate
  against an observed-settlement corpus, so you can refuse payers with
  wash-shaped or fleet-dominated histories instead of finding out later.
- **A portable signed receipt** on settle, verifiable offline
  (`npx twzrd-receipt-verifier`) — you are not asked to trust the scorer.

## Configuration

All in `wrangler.jsonc` under `vars`:

| Variable | Default | Notes |
|---|---|---|
| `PAY_TO` | *(placeholder)* | **Required.** Your Solana wallet. The Worker refuses to serve paid routes until you change it, so a one-click deploy can never route your buyers' money to a stranger. |
| `PRICE` | `$0.05` | Keep at or above **$0.01**. Sponsored settlement costs roughly $0.0007 per payment; below a cent, gas is a double-digit share of the sale, which is not a reasonable thing to ask any sponsor to absorb. |
| `FACILITATOR_URL` | `https://intel.twzrd.xyz` | Any x402 facilitator. |
| `NETWORK` | `solana` | Short name is required — x402 core hard-codes `["solana-devnet","solana"]` and rejects the CAIP-2 form (`solana:5eykt4…`) here. |

## Verify before you trust it

```bash
npm install
npm test                 # offline unit tests (pay-to guards + free route)
npm run typecheck
npm run smoke            # live facilitator 402 (needs network)
```

`npm test` covers money-routing guards offline: placeholder / empty / non-base58
`PAY_TO` must 500, and free discovery must reflect env when configured. Live
402 shape (sponsored mainnet `feePayer`) stays in smoke — it needs the facilitator.

```bash
npm run smoke
```

Boots the Worker in-process against the live facilitator and asserts the paid
route really 402s, the challenge carries a **sponsored Solana mainnet**
requirement (`network: "solana"`, not devnet), the `payTo` is *yours*, and an
unset `PAY_TO` is refused.

Prove the wedge (TWZRD works, stock Cloudflare default does not):

```bash
npm run smoke:contrast
# TWZRD must PASS; x402.org/facilitator must FAIL (no feePayer for network: solana)
```

Or one-off:

```bash
FACILITATOR_URL=https://x402.org/facilitator npm run smoke   # fails: testnet-only
```

Re-verified 2026-08-07: intel `/supported` advertises both `solana` and
`solana:5eykt4…` with feePayer `4LkEFj…`; x402.org `/supported` still has only
Solana **devnet** kinds (no mainnet `solana`).

## Local development

```bash
npm install
# set PAY_TO in wrangler.jsonc to your base58 wallet
npm run dev
curl -s http://localhost:8787/
curl -si http://localhost:8787/paid/hello   # expect 402
```

## Sibling templates

| Repo | Role |
|---|---|
| **This** (`x402-seller-starter`) | Minimal v1 wedge — tutorial shape, one paid route |
| [`x402-solana-starter`](https://github.com/twzrd-sol/x402-solana-starter) | Production v2 storefront — catalog, OpenAPI, settle-guard, full test suite |

## License

MIT (see repository).
