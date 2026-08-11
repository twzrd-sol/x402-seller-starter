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
npm run dev      # wrangler dev
npm run deploy   # wrangler deploy
```

## What is proven vs not

| Claim | Status |
|-------|--------|
| Challenge construction end-to-end via `x402-hono` + TWZRD facilitator | **Proven** (`npm run smoke`) |
| Stock `x402.org/facilitator` cannot feePayer `network: "solana"` | **Proven** (`npm run smoke:contrast`) |
| Full USDC settle through a Worker + independent payer (USDC mainnet) | **Proven** 2026-08-10 — see [Close the payment loop](#close-the-payment-loop) |

## Close the payment loop

Once the challenge wedge holds (`npm run smoke:contrast`), prove a real settle:

```bash
# 1. Deploy (or expose local wrangler dev)
#    wrangler.jsonc → set PAY_TO to YOUR wallet, then:
npm run deploy
# or: npm run dev   # then use a public URL / tunnel to that host

# 2. Fund a buyer keypair with mainnet USDC (>= PRICE) on the classic SPL mint
#    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
#    Buyer does not need SOL for the payment itself (facilitator sponsors gas).

# 3. Pay from only the public surface (no monorepo):
python3 scripts/pay_v1_solana.py \
  --url https://YOUR_WORKER.workers.dev/paid/hello \
  --keypair /path/to/buyer.json
```

Expected success:

- HTTP **200** protected body (`ok: true`, content, `paidAt`)
- Response header `x-payment-response` with `success: true`, settlement `transaction` signature, and (via TWZRD facilitator) a V6 `twzrd_receipt`
- On-chain: USDC `transferChecked` of `maxAmountRequired` from payer ATA → `PAY_TO` ATA, feePayer = facilitator sponsor

Deliberate failure check (optional): build a payment whose transfer amount ≠ challenge amount → expect **402** `policy:transfer_amount_mismatch`, not the protected resource.

Requires: `python3`, `solders`, `spl` / `solana` packages (`pip install solders solana base58`).

## Sponsor gas (operators reading this as a TWZRD internal)

Every 402 from intel advertises feePayer `4LkEFj…`. Traction on this template
increases sponsored settle load. Keep the sponsor funded; empty sponsor does
not fail closed on challenge construction — it fails later at settle.

## Related starters

| Repo | Role | Stack |
|---|---|---|
| **This repo** | Minimal CF-tutorial wedge | `x402-hono` v1 + facilitator URL |
| [x402-solana-starter](https://github.com/twzrd-sol/x402-solana-starter) | Full Solana storefront | `@x402/hono` + `@x402/svm` v2 + settle-guard |

MIT. Replace `/paid/hello` with whatever you actually sell.
