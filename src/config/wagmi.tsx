// src/config/wagmi.ts

'use client';

import { http, WagmiProvider } from 'wagmi';
import { optimism, optimismSepolia } from 'wagmi/chains';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { ReactNode } from 'react';
import { getWalletConnectProjectId } from './walletconnect';

// Configure supported chains (Optimism mainnet and testnet)
const chains = [optimism, optimismSepolia] as const;

// Real Web3 configuration is required: fails clearly in the browser when
// NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is absent (V2-FE-016). No placeholder
// project ID is ever substituted.
const walletConnectProjectId = getWalletConnectProjectId();

// Create Wagmi config with proper RPC URLs
export const wagmiConfig = getDefaultConfig({
  appName: 'TruthBounty',
  projectId: walletConnectProjectId,
  chains,
  transports: {
    [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL),
    [optimismSepolia.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL),
  },
});

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