/**
 * V2 Wallet Connect Button - EVM Integration
 *
 * Replaces Stellar/Freighter wallet button with canonical EVM wallet connection.
 * Uses Wagmi to provide multi-wallet support (MetaMask, WalletConnect, etc).
 */

import React, { useCallback } from 'react';
import { useConnect } from 'wagmi';
import styles from './style.module.css';
import React from 'react'
import { ConnectButton as RainbowKitConnectButton } from '@rainbow-me/rainbowkit'
import styles from './style.module.css'

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

'use client';

import React from 'react';
import { ConnectButton as RainbowKitConnectButton } from '@rainbow-me/rainbowkit';
import styles from './style.module.css';

export interface ConnectButtonProps {
  label?: string;
  isHigher?: boolean;
  onClick?: () => void;
}

export function ConnectButton({ label = 'Connect Wallet', isHigher, onClick }: ConnectButtonProps) {
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
    <RainbowKitConnectButton.Custom>
      {({
        account,
        chain,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
              },
            })}
          >
            {!connected ? (
              <button
                type="button"
                className={styles.button}
                style={{ height: isHigher ? 50 : 38 }}
                onClick={onClick || openConnectModal}
                aria-label={label}
              >
                {label}
              </button>
            ) : (
              <RainbowKitConnectButton />
            )}
          </div>
        );
      }}
    </RainbowKitConnectButton.Custom>
  )
}
  );
}

export default ConnectButton;
