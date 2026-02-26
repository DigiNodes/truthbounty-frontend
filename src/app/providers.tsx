// src/app/providers.tsx

'use client';

import { ReactNode } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      {children}
    </QueryProvider>
  );
}
