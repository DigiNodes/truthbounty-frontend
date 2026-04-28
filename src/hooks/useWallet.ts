import { useCallback, useState } from "react";

type WalletState = {
  balance: number;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => void;
};

export function useWallet(): WalletState {
  const [balance, setBalance] = useState(0);

  const deposit = useCallback((amount: number) => {
    if (amount <= 0) return;
    setBalance((current) => current + amount);
  }, []);

  const withdraw = useCallback((amount: number) => {
    if (amount <= 0) return;
    setBalance((current) => Math.max(0, current - amount));
  }, []);

  return {
    balance,
    deposit,
    withdraw,
  };
}
