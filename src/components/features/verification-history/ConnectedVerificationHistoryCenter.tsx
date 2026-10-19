'use client';

import { useRecoveryReferences } from '@/hooks/useRecoveryReferences';
import { useVerificationHistoryData } from '@/hooks/useVerificationHistoryData';
import { VerificationHistoryCenter } from '@/components/features/verification-history/VerificationHistoryCenter';

export function ConnectedVerificationHistoryCenter() {
  const { data, refresh, canRefresh } = useVerificationHistoryData();
  const recovery = useRecoveryReferences();
  return (
    <VerificationHistoryCenter
      data={data}
      transactions={recovery.records}
      recoveryUnavailable={recovery.storageUnavailable}
      refreshingDisabled={!canRefresh}
      onRefresh={() => {
        refresh();
        recovery.refresh();
      }}
    />
  );
}