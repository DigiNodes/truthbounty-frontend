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
  TelemetryProvider,
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
              <FeatureFlagProvider enablePersistence={true}>
                {/* TelemetryProvider must be inside FeatureFlagProvider so the
                    PRIVACY_SAFE_TELEMETRY flag is available at initialisation. */}
                <TelemetryProvider>
                  {children}
                  {/* Feature flag panel for development debugging */}
                  <FeatureFlagPanel defaultOpen={false} position="bottom-right" />
                </TelemetryProvider>
              </FeatureFlagProvider>
            </SiweAuthProvider>
          </RainbowKitThemedProvider>
        </QueryProvider>
      </Web3Provider>
    </ThemeProvider>
  );
}