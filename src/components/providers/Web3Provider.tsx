// src/components/providers/Web3Provider.tsx

'use client';

import React, { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from '@/config/wagmi';
import { useTheme } from './ThemeProvider';

interface Web3ProviderProps {
  children: ReactNode;
}

/**
 * RainbowKit theme provider synced with TruthBounty ThemeContext
 */
export function RainbowKitThemedProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();

  const customDarkTheme = darkTheme({
    accentColor: '#5b5bf6',
    accentColorForeground: '#ffffff',
    borderRadius: 'medium',
  });

  const customLightTheme = lightTheme({
    accentColor: '#5b5bf6',
    accentColorForeground: '#ffffff',
    borderRadius: 'medium',
  });

  return (
    <RainbowKitProvider
      theme={resolvedTheme === 'light' ? customLightTheme : customDarkTheme}
      modalSize="compact"
    >
      {children}
    </RainbowKitProvider>
  );
}

/**
 * Canonical Web3 provider combining Wagmi configuration
 */
export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      {children}
    </WagmiProvider>
  );
}
