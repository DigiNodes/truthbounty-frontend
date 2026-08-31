/**
 * V2 Wallet Connect Button - EVM Integration
 *
 * Replaces Stellar/Freighter wallet button with canonical EVM wallet connection.
 * Uses Wagmi to provide multi-wallet support (MetaMask, WalletConnect, etc).
 */

import React, { useCallback } from 'react';
import { useConnect } from 'wagmi';
import styles from './style.module.css';

export interface ConnectButtonProps {
  label: string;
  isHigher?: boolean;
}

export function ConnectButton({ label, isHigher }: ConnectButtonProps) {
  const { connect, connectors } = useConnect();

  const handleConnect = useCallback(() => {
    if (connectors.length > 0) {
      // Use first available connector (typically injected wallet like MetaMask)
      connect({ connector: connectors[0] });
    }
  }, [connect, connectors]);

  return (
    <button
      className={styles.button}
      style={{ height: isHigher ? 50 : 38 }}
      onClick={handleConnect}
      aria-label={label}
      disabled={connectors.length === 0}
    >
      {label}
    </button>
  );
}
