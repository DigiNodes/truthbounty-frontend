'use client'

import { useState } from 'react'
import { useAccount, useDisconnect } from '@/hooks/useAccount'
import { useIsMounted } from '@/hooks/useIsMounted'
import { ConnectButton } from '@/components/ui/ConnectButton'
import styles from './style.module.css'

// TODO: Eliminate flash of unconnected content on loading
export function WalletConnection() {
  const mounted = useIsMounted()
  const account = useAccount()
  const disconnect = useDisconnect()

  const handleDisconnect = async () => {
    await disconnect()
  }

  const [copyStatus, setCopyStatus] = useState('')

  const handleCopyAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address)
      setCopyStatus('Address copied to clipboard')
      setTimeout(() => setCopyStatus(''), 3000)
    }
  }

  return (
    <>
      {mounted && account ? (
        <div className={styles.displayData}>
          {/* Address button (accessible + keyboard friendly) */}
          <button
            type="button"
            className={styles.card}
            onClick={handleCopyAddress}
            aria-label={`Copy wallet address ${account.displayName}`}
          >
            {account.displayName}
          </button>

          {/* Screen-reader feedback for copy status */}
          <span className="sr-only" aria-live="polite" aria-atomic="true">{copyStatus}</span>

          {/* Disconnect button */}
          <button
            type="button"
            className={styles.disconnectButton}
            onClick={handleDisconnect}
            aria-label="Disconnect wallet"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <ConnectButton label="Connect Wallet" />
      )}
    </>
  )
}