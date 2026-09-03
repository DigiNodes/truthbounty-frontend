
# 🔍 TruthBounty Frontend

![License:  MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF? logo=github-actions)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

Decentralized news verification platform and public-good interface for community-driven fact-checking across Ethereum and Stellar ecosystems.

## 🌍 Why TruthBounty Frontend?

The TruthBounty Frontend is designed to make decentralized news verification **accessible, transparent, and usable** for everyone — not just blockchain experts.

It provides a clean, intuitive interface for:
- Submitting and verifying news claims
- Understanding verification outcomes
- Tracking reputation and rewards
- Participating in truth verification as a public good

This frontend translates complex cryptoeconomic systems into a **human-centered experience**.

## 🚀 Features

- ✅ **Submit & Verify Claims** - Community-driven fact-checking interface
- 🎯 **Reputation Dashboard** - Real-time reputation scoring and leaderboard

### Trust & Sybil warnings

A set of UI components warn users when their account is considered "low
trust" based on missing identity verification, low reputation, suspicious
patterns or a very new wallet.  Banners appear in the layout, and
explanations are available via tooltips and a modal.

You can simulate different states by storing a JSON object under
`localStorage.trustInfo`.  Example:

```js
localStorage.setItem('trustInfo', JSON.stringify({
  isVerified: false,
  reputation: 15,
  accountAgeDays: 2,
  suspicious: true,
}));
```

Reload the page to see how the warnings change.

Trust signals are only ever sourced from authoritative data (the Worldcoin
verification API, and the reputation backend once connected). Unbacked
values render as unknown (`—`) and never trigger warnings — nothing is
fabricated client-side.
- 💎 **Token Rewards** - Track and claim ERC-20 rewards on Optimism
- 🔐 **Worldcoin Authentication** - Sybil-resistant identity verification
- 📁 **IPFS Evidence Viewer** - Decentralized evidence storage and retrieval
- 🌓 **Dark/Light Mode** - Customizable user experience
- 📱 **Responsive Design** - Mobile-first, accessible UI
- ⚡ **Real-time Updates** - Live verification status and notifications

## 🧭 Core User Flow

1. User connects wallet (Ethereum / Stellar – planned)
2. User authenticates via Worldcoin ID
3. News claims are submitted or reviewed
4. Verifications are performed with evidence
5. Reputation updates in real time
6. Rewards are tracked and claimed on-chain

## 🌱 Ecosystem Alignment (Ethereum, Stellar & Public Goods)

TruthBounty Frontend is aligned with open-source and public-good ecosystems:

- **Ethereum & Optimism** – secure, scalable reward settlement
- **Stellar (planned)** – low-cost access and global participation
- **IPFS** – decentralized evidence access
- **Worldcoin ID** – Sybil-resistant identity
- **Drips Network** – sustainable open-source maintenance

The UI is intentionally chain-agnostic, enabling seamless expansion across ecosystems without redesign.

## ⚙️ Tech Stack

### Frontend Core

| Technology | Purpose |
|------------|---------|
| **Next.js 14+** | React framework with App Router |
| **TypeScript** | Type-safe development |

## 🔧 Environment Variables

Copy `.env.example` to `.env.local` and fill in real values.

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ | WalletConnect Cloud project ID (public, dapp-scoped). The app **fails clearly in the browser** when this is absent — no placeholder ID is substituted. |
| `NEXT_PUBLIC_OPTIMISM_RPC_URL` | – | Optimism RPC endpoint (falls back to the chain default when unset). |
| `NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL` | – | Optimism Sepolia RPC endpoint (falls back to the chain default when unset). |
| `NEXT_PUBLIC_WORLDCOIN_APP_ID` | – | Worldcoin IDKit app ID. When unset in production the verification button is disabled; mock verification is a development/test-only fixture. |
| `NEXT_PUBLIC_WORLDCOIN_ACTION` / `NEXT_PUBLIC_WORLDCOIN_TEST_MODE` | – | Optional IDKit overrides. |

> **V2-FE-016 (web3 cleanup):** the frontend never fabricates wallet
> addresses, transaction hashes, rewards, balances, or verification
> verdicts. Development fixtures live under `src/__tests__/fixtures/` and
> are consumed only by tests and Storybook stories.
