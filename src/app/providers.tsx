// src/app/providers.tsx

'use client';

import { ReactNode } from 'react';
import { QueryProvider, ThemeProvider } from '@/components/providers';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system">
      <QueryProvider>
        {children}
      </QueryProvider>
    </ThemeProvider>
  );
}
