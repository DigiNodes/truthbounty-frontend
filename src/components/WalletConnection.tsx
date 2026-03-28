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

  return (
    <>
  {mounted && account ? (
    <div className={styles.displayData}>
      {/* Address button (accessible + keyboard friendly) */}
      <button
        type="button"
        className={styles.card}
        onClick={() => {
          navigator.clipboard.writeText(account.address);
        }}
        aria-label={`Copy wallet address ${account.displayName}`}
      >
        {account.displayName}
      </button>

      {/* Screen-reader feedback (instead of alert) */}
      <span className="sr-only" aria-live="polite" id="copy-status" />

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