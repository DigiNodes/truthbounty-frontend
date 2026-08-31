// src/config/wagmi.ts

'use client';

import { http, createConfig, WagmiProvider } from 'wagmi';
import { optimism, optimismSepolia } from 'wagmi/chains';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { ReactNode } from 'react';

// Configure supported chains (Optimism mainnet and testnet)
const chains = [optimism, optimismSepolia] as const;

// Create Wagmi config with proper RPC URLs
export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'TruthBounty',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    chains,
    transports: {
      [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL),
      [optimismSepolia.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL),
    },
  })
);

// Provider component to wrap app with Wagmi and RainbowKit
export function WagmiProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}