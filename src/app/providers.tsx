// src/app/providers.tsx

'use client';

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import {
  QueryProvider,
  ThemeProvider,
  Web3Provider,
  RainbowKitThemedProvider,
  FeatureFlagProvider,
  FeatureFlagPanel as _FeatureFlagPanel,
  WalletStateGuard,
  ReducedDataProvider,
  CrossTabSyncProvider,
} from '@/components/providers';
import { SiweAuthProvider } from '@/context/SiweAuthProvider';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { IntegrityBoundary } from '@/components/security/IntegrityBoundary';

// Client-only, non-deterministic surfaces must never render on the server.
// Loading them dynamically with ssr:false guarantees the server shell is
// deterministic and prevents hydration mismatches from wallet/time/random
// dependent output.
const FeatureFlagPanel = dynamic(
  () =>
    import('@/components/providers').then((m) => ({
      default: m.FeatureFlagPanel,
    })),
  { ssr: false },
);

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system">
      <ReducedDataProvider>
        <Web3Provider>
          <QueryProvider>
            <RainbowKitThemedProvider>
              <SiweAuthProvider>
                <FeatureFlagProvider enablePersistence={true}>
                  <ErrorBoundary>
                    <IntegrityBoundary>
                      <WalletStateGuard>
                        <CrossTabSyncProvider>
                          {children}
                          {/* Feature flag panel is client-only; rendered after
                              hydration to keep the server shell deterministic. */}
                          <Suspense fallback={null}>
                            <FeatureFlagPanel defaultOpen={false} position="bottom-right" />
                          </Suspense>
                        </CrossTabSyncProvider>
                      </WalletStateGuard>
                    </IntegrityBoundary>
                  </ErrorBoundary>
                </FeatureFlagProvider>
              </SiweAuthProvider>
            </RainbowKitThemedProvider>
          </QueryProvider>
        </Web3Provider>
      </ReducedDataProvider>
    </ThemeProvider>
  );
}