import { useRef } from 'react'
import { useAccount, useDisconnect } from '@/hooks/useAccount'
import { useIsMounted } from '@/hooks/useIsMounted'
import { ConnectButton } from '@/components/ui/ConnectButton'
import styles from './style.module.css'

const COPY_STATUS_CLEAR_MS = 2000

// TODO: Eliminate flash of unconnected content on loading
export function WalletConnection() {
  const mounted = useIsMounted()
  const account = useAccount()
  const disconnect = useDisconnect()
  const copyStatusRef = useRef<HTMLSpanElement>(null)
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDisconnect = async () => {
    await disconnect()
  }

  const announceCopy = (message: string) => {
    const node = copyStatusRef.current
    if (!node) return
    node.textContent = message
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current)
    }
    clearTimeoutRef.current = setTimeout(() => {
      if (copyStatusRef.current) {
        copyStatusRef.current.textContent = ''
      }
    }, COPY_STATUS_CLEAR_MS)
  }

  const handleCopyAddress = async () => {
    if (!account?.address) return
    try {
      await navigator.clipboard.writeText(account.address)
      announceCopy('Address copied to clipboard')
    } catch {
      announceCopy('Failed to copy address')
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

      {/* Screen-reader feedback (instead of alert) */}
      <span
        ref={copyStatusRef}
        className="sr-only"
        aria-live="polite"
        id="copy-status"
      />

      {/* Disconnect button (already good, just improve semantics) */}
      <button
        type="button"
        className={styles.disconnectButton}
        onClick={handleDisconnect}
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