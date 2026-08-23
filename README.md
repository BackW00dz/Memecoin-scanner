# Next CYBERLEEK Scanner — phone dashboard MVP

This is a mobile-first PWA-style dashboard for spotting early momentum in Solana meme tokens.

## What it does
- Pulls recent Solana token profiles, boosts and community takeovers from DEX Screener.
- Pulls the best available pair for each candidate.
- Scores candidates 0–100 using volume, price change, transactions, liquidity, age, social/profile signals and boosts.
- Flags 80+ scores as breakout candidates.
- Provides search, sorting and a token detail sheet.
- Refreshes automatically every 60 seconds.
- Falls back to demo data if the API is unavailable.

## Important limitation
This is an MVP, not an investment-grade scanner. It does **not** yet verify:
- developer wallet behavior
- holder concentration
- mint/freeze authority
- bundled/sniper wallets
- fake social engagement
- liquidity lock/burn status

Those should be added in a server-side enrichment layer before using the dashboard for real-money decisions.

## Run locally

Any static server works. For example:

```bash
python3 -m http.server 8080
```

Then open:

`http://localhost:8080`

On an iPhone on the same Wi-Fi, use the computer's LAN IP instead of localhost.

## Deploy for phone access

The simplest route is to upload this folder to a static hosting provider such as Vercel, Netlify or GitHub Pages. After deployment, open the HTTPS URL on your phone and use **Add to Home Screen**.

## Data sources

DEX Screener API:
https://docs.dexscreener.com/api/reference

DEX Screener documents a 60 requests/minute limit for latest profiles/boosts and 300 requests/minute for pair/token endpoints. Keep the scan interval reasonable.

For the next version, add Birdeye server-side for:
- holder distribution
- token security
- smart-money activity
- richer token/trade data

Never put a paid Birdeye API key directly in browser JavaScript; proxy it through a serverless function/environment variable.
