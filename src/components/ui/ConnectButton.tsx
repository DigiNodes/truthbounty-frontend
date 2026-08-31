'use client';

import React from 'react';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import styles from './style.module.css';

export interface ConnectButtonProps {
  label?: string;
  isHigher?: boolean;
  onClick?: () => void;
}

export function ConnectButton({ label = 'Connect Wallet', isHigher, onClick }: ConnectButtonProps) {
  return (
    <RainbowConnectButton.Custom>
      {({ openConnectModal }) => {
        return (
          <button
            type="button"
            className={styles.button}
            style={{ height: isHigher ? 50 : 38 }}
            onClick={onClick || openConnectModal}
            aria-label={label}
          >
            {label}
          </button>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}

export default ConnectButton;