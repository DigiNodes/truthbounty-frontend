'use client';

import { useState } from 'react';
import { submitVerification } from '@/app/lib/api';
import { TransactionStatus } from './TransactionStatus';
import {
  clearPendingTransaction,
  trackPendingTransaction,
} from '@/lib/pending-transactions';

export function VerificationActions({
  claimId,
  stakeAmount,
}: {
  claimId: string;
  stakeAmount: number;
}) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  const submit = async (decision: 'verify' | 'reject') => {
    if (!stakeAmount || stakeAmount <= 0) {
      setStatus('error');
      console.error('Stake amount is required and must be greater than 0');
      return;
    }

    const transactionId = `verification:${claimId}:${decision}`;

    try {
      setStatus('pending');
      trackPendingTransaction({
        id: transactionId,
        kind: 'verification',
        title: decision === 'verify' ? 'Verification stake pending' : 'Rejection stake pending',
        description: `Claim ${claimId} is waiting for wallet confirmation.`,
      });
      await submitVerification({ claimId, decision, stakeAmount });
      clearPendingTransaction(transactionId);
      setStatus('success');
    } catch {
      clearPendingTransaction(transactionId);
      setStatus('error');
    }
  };

  return (
    <div className="card flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:p-6">
      <button
        onClick={() => submit('verify')}
        className="btn-primary flex-1 py-3 px-4 text-base min-h-[44px] touch-manipulation transition-colors"
      >
        Verify
      </button>
      <button
        onClick={() => submit('reject')}
        className="btn-danger flex-1 py-3 px-4 text-base min-h-[44px] touch-manipulation transition-colors"
      >
        Reject
      </button>

      <TransactionStatus status={status} />
    </div>
  );
}

export default VerificationActions;
