// src/app/providers.tsx

'use client';

import { ReactNode } from 'react';
import {
  QueryProvider,
  ThemeProvider,
  Web3Provider,
  RainbowKitThemedProvider,
  FeatureFlagProvider,
  FeatureFlagPanel,
  WalletStateGuard,
} from '@/components/providers';
import { SiweAuthProvider } from '@/context/SiweAuthProvider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system">
      <Web3Provider>
        <QueryProvider>
          <RainbowKitThemedProvider>
            <SiweAuthProvider>
              <WalletStateGuard>
                <FeatureFlagProvider enablePersistence={true}>
                  {children}
                  {/* Feature flag panel for development debugging */}
                  <FeatureFlagPanel defaultOpen={false} position="bottom-right" />
                </FeatureFlagProvider>
              </WalletStateGuard>
            </SiweAuthProvider>
          </RainbowKitThemedProvider>
        </QueryProvider>
      </Web3Provider>
    </ThemeProvider>
  );
}