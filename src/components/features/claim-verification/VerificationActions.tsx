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
    <div className="card flex gap-4">
      <button onClick={() => submit('verify')} className="btn-primary">
        Verify
      </button>
      <button onClick={() => submit('reject')} className="btn-danger">
        Reject
      </button>

      <TransactionStatus status={status} />
    </div>
  );
}
