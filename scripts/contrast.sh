#!/usr/bin/env bash
# Wedge differentiator: TWZRD must pass smoke; x402.org must fail for network: solana.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== TWZRD facilitator (must PASS) ==="
FACILITATOR_URL="${FACILITATOR_URL:-https://intel.twzrd.xyz}" npm run smoke

echo ""
echo "=== x402.org facilitator (must FAIL for mainnet solana) ==="
set +e
FACILITATOR_URL=https://x402.org/facilitator npm run smoke
org_status=$?
set -e

echo ""
echo "=== contrast verdict ==="
if [[ "$org_status" -eq 0 ]]; then
  echo "  x402.org mainnet smoke: PASS (unexpected — wedge claim broken)"
  exit 1
fi
echo "  TWZRD mainnet smoke: PASS"
echo "  x402.org mainnet smoke: FAIL (expected — testnet-only)"
echo ""
echo "OK - wedge holds: Cloudflare default cannot sell Solana mainnet; TWZRD can."
