// src/app/providers.tsx

'use client';

import { ReactNode } from 'react';
import { QueryProvider, ThemeProvider, FeatureFlagProvider, FeatureFlagPanel } from '@/components/providers';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system">
      <FeatureFlagProvider enablePersistence={true}>
        <QueryProvider>
          {children}
        </QueryProvider>
        {/* Feature flag panel for development debugging */}
        <FeatureFlagPanel defaultOpen={false} position="bottom-right" />
      </FeatureFlagProvider>
    </ThemeProvider>
  );
}
