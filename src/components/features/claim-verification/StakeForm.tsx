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
    <div className="card">
      <h3 className="font-semibold mb-2">Stake Tokens</h3>

      <input
        type="number"
        value={stake}
        onChange={(e) => setStake(e.target.value)}
        placeholder="Enter stake amount"
        className="input"
      />

      <p className="text-xs mt-1">
        Balance: {balance} TBNT
      </p>

      {Number(stake) > balance && (
        <p className="text-red-500 text-xs mt-1">
          Insufficient balance
        </p>
      )}
    </div>
  );
}
