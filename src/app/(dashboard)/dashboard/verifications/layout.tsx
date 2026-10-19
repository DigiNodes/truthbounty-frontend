import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { generateRouteMetadata } from '@/lib/metadata/route-metadata';

export const metadata: Metadata = generateRouteMetadata({
  pathname: '/dashboard/verifications',
});

export default function VerificationsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}