'use client';

import { useState, useEffect } from 'react';
import { getTokenBalance } from '@/app/lib/wallet';

export function StakeForm({ claimId }: { claimId: string }) {
  const [stake, setStake] = useState('');
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    getTokenBalance().then(setBalance);
  }, []);

  return (
    <div className="card p-4 sm:p-6">
      <h3 className="font-semibold mb-3 text-base sm:text-lg">Stake Tokens</h3>

      <input
        type="number"
        value={stake}
        onChange={(e) => setStake(e.target.value)}
        placeholder="Enter stake amount"
        className="input w-full p-3 sm:p-3 text-base min-h-[44px] touch-manipulation"
      />

      <p className="text-sm sm:text-sm mt-2">
        Balance: {balance} TBNT
      </p>

      {Number(stake) > balance && (
        <p className="text-red-500 text-sm mt-2">
          Insufficient balance
        </p>
      )}
    </div>
  );
}
