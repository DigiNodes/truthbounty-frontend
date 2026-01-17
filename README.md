# 🔍 TruthBounty Frontend

![License:  MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF? logo=github-actions)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

Decentralized news verification platform with tokenized rewards - User Interface powered by Next.js and Optimism blockchain.

## 🚀 Features

- ✅ **Submit & Verify Claims** - Community-driven fact-checking interface
- 🎯 **Reputation Dashboard** - Real-time reputation scoring and leaderboard
- 💎 **Token Rewards** - Track and claim ERC-20 rewards on Optimism
- 🔐 **Worldcoin Authentication** - Sybil-resistant identity verification
- 📁 **IPFS Evidence Viewer** - Decentralized evidence storage and retrieval
- 🌓 **Dark/Light Mode** - Customizable user experience
- 📱 **Responsive Design** - Mobile-first, accessible UI
- ⚡ **Real-time Updates** - Live verification status and notifications

## ⚙️ Tech Stack

### Frontend Core

| Technology | Purpose |
|------------|---------|
| **Next.js 14+** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **TanStack Query** | Server state management & caching |
| **Context API** | Global state management |
| **Tailwind CSS** | Utility-first styling |

### Web3 Integration

| Technology | Purpose |
|------------|---------|
| **Wagmi** | React hooks for Ethereum |
| **Viem** | TypeScript Ethereum library |
| **RainbowKit** | Wallet connection UI |
| **Worldcoin ID** | Sybil-resistant authentication |
| **IPFS HTTP Client** | Decentralized storage access |

### DevOps

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **GitHub Actions** | CI/CD pipeline |
| **Vercel** | Deployment platform |

## 🛠️ Setup Guide

### Prerequisites

- Node. js v18+
- npm or yarn or pnpm
- Git
- MetaMask or compatible Web3 wallet

### Installation

```bash
# Clone repository
git clone https://github.com/DigiNodes/truthbounty-frontend.git
cd truthbounty-frontend

# Install dependencies
npm install
# or
yarn install
# or
pnpm install

# Configure environment
cp .env.example .env. local
# Edit .env. local with your credentials

# Start development server
npm run dev
# or
yarn dev
# or
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

### Environment Variables

Create a `.env.local` file in the root directory: 

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Blockchain Configuration
NEXT_PUBLIC_OPTIMISM_RPC_URL=https://mainnet.optimism.io
NEXT_PUBLIC_CHAIN_ID=10
NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS=0x... 

# IPFS Configuration
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/

# Worldcoin Configuration
NEXT_PUBLIC_WORLDCOIN_APP_ID=app_... 
NEXT_PUBLIC_WORLDCOIN_ACTION=verify

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Docker Deployment

```bash
# Build and run with Docker
docker build -t truthbounty-frontend .
docker run -p 3000:3000 truthbounty-frontend

# Or use Docker Compose
docker-compose up -d
```

## 📁 Project Structure

```
truthbounty-frontend/
├── app/                      # Next.js App Router pages
│   ├── (auth)/              # Authentication routes
│   ├── (dashboard)/         # Protected dashboard routes
│   ├── claims/              # Claims pages
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── ui/                  # Reusable UI components
│   ├── features/            # Feature-specific components
│   └── layout/              # Layout components
├── contexts/                # React Context providers
│   ├── AuthContext.tsx      # Authentication state
│   ├── Web3Context.tsx      # Blockchain connection
│   └── ThemeContext.tsx     # Theme management
├── hooks/                   # Custom React hooks
│   ├── useAuth. ts
│   ├── useClaims.ts
│   └── useTokenBalance.ts
├── lib/                     # Utility libraries
│   ├── api/                 # API client (TanStack Query)
│   ├── web3/                # Blockchain utilities
│   └── ipfs/                # IPFS client
├── types/                   # TypeScript type definitions
├── public/                  # Static assets
└── styles/                  # Global styles
```

## 🎨 Key Features Implementation

### TanStack Query Setup

```typescript
// lib/api/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})
```

### Context API Example

```typescript
// contexts/AuthContext.tsx
'use client'

import { createContext, useContext, useState } from 'react'

interface AuthContextType {
  user: User | null
  login: (credentials:  Credentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## 📦 Build & Deployment

```bash
# Production build
npm run build

# Start production server
npm run start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🤝 API Integration

This frontend connects to the [TruthBounty API](https://github.com/DigiNodes/truthbounty-api). Ensure the backend is running before starting development.

### Key Endpoints

- `POST /api/claims` - Submit new claim
- `GET /api/claims` - Fetch claims list
- `POST /api/verifications` - Submit verification
- `GET /api/users/reputation` - Get user reputation
- `POST /api/rewards/claim` - Claim token rewards

## 👥 Contributing

We welcome contributions! Please follow these steps:

1. Read our [Contributor's Guide](CONTRIBUTING.md)
2. Fork the repository
3. Create a feature branch (`git checkout -b feature/amazing-feature`)
4. Follow [Conventional Commits](https://www.conventionalcommits.org/)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing code style (ESLint + Prettier)
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 🔒 Security

- Never commit `.env.local` or sensitive credentials
- Report security vulnerabilities to security@diginodes.com
- Use environment variables for all configuration

## 📄 License

MIT © DigiNodes

## 🔗 Related Projects

- [TruthBounty API](https://github.com/DigiNodes/truthbounty-api) - Backend services
- [TruthBounty Contracts](https://github.com/DigiNodes/truthbounty-contracts) - Smart contracts

## 📞 Support

- 📧 Email: support@diginodes.com
- 💬 Discord: [Join our community](https://discord.gg/diginodes)
- 🐦 Twitter: [@DigiNodes](https://twitter.com/DigiNodes)
- 📖 Documentation: [docs.truthbounty.io](https://docs.truthbounty.io)

---

**Built with ❤️ by the DigiNodes team**
```
