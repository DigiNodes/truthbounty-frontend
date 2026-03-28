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

  const handleCopyAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address)
      alert('Address copied to clipboard')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCopyAddress()
    }
  }

  return (
    <>
      {mounted && account ? (
        <div className={styles.displayData}>
          <button 
            className={`${styles.card} cursor-pointer`}
            onClick={handleCopyAddress}
            onKeyDown={handleKeyDown}
            aria-label={`Wallet address: ${account.displayName}. Click to copy to clipboard.`}
          >
            {account.displayName}
          </button>
          <button 
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