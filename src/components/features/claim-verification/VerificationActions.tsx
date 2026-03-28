'use client';

import { useState } from 'react';
import { submitVerification } from '@/app/lib/api';
import { TransactionStatus } from './TransactionStatus';

export function VerificationActions({ claimId }: { claimId: string }) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  const submit = async (decision: 'verify' | 'reject') => {
    try {
      setStatus('pending');
      await submitVerification({ claimId, decision });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="card flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:p-6">
      <button onClick={() => submit('verify')} className="btn-primary flex-1 py-2.5 sm:py-2 text-base sm:text-sm">
        Verify
      </button>
      <button onClick={() => submit('reject')} className="btn-danger flex-1 py-2.5 sm:py-2 text-base sm:text-sm">
        Reject
      </button>

      <TransactionStatus status={status} />
    </div>
  );
}
