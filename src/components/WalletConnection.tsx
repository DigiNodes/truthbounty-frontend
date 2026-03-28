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
          <div 
            className={`${styles.card} cursor-pointer`}
            onClick={() => {
              navigator.clipboard.writeText(account.address)
              alert('Address copied to clipboard')
            }}
          >
            {account.displayName}
          </div>
          <button 
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