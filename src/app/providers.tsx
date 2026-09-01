// src/app/providers.tsx

'use client';

import { ReactNode } from 'react';
import { QueryProvider, ThemeProvider, FeatureFlagProvider, FeatureFlagPanel } from '@/components/providers';
import { WagmiProviders } from '@/config/wagmi';
import { SiweAuthProvider } from '@/context/SiweAuthProvider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system">
      <FeatureFlagProvider enablePersistence={true}>
        <WagmiProviders>
          <SiweAuthProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
          </SiweAuthProvider>
        </WagmiProviders>
        {/* Feature flag panel for development debugging */}
        <FeatureFlagPanel defaultOpen={false} position="bottom-right" />
      </FeatureFlagProvider>
    </ThemeProvider>
  );
}