import MainLayout from '@/components/layout/MainLayout';
import { ConnectedVerificationHistoryCenter } from '@/components/features/verification-history/ConnectedVerificationHistoryCenter';

export default function VerificationsPage() {
  return (
    <MainLayout>
      <ConnectedVerificationHistoryCenter />
    </MainLayout>
  );
}