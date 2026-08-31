import { useMemo } from "react";
import { useAccount as useWagmiAccount } from "wagmi";

// returning the same object identity every time avoids unnecessary re-renders
const addressObject = {
  address: '',
  displayName: '',
};

export function useAccount(): typeof addressObject | null {
  const { address, isConnected } = useWagmiAccount();

  return useMemo(() => {
    if (!isConnected || !address) {
      return null;
    }

    // Format address for display
    addressObject.address = address;
    addressObject.displayName = `${address.slice(0, 4)}...${address.slice(-4)}`;
    
    return { ...addressObject };
  }, [address, isConnected]);
}

        // not connected
        if (address !== undefined) {
          resetAddress();
          if (mounted) notify();
        }
      } catch (error) {
        // swallow errors but ensure state consistency
        console.error('Failed to validate wallet connection:', error);
      }
    };

    // initial lookup (only if we don't already have an address)
    if (address === undefined) {
      addressLookup
        .then(user => {
          if (user) {
            address = user.address;
            persistConnection(user.address);
          }
        })
        .finally(() => { if (mounted) notify(); });
    } else {
      // validate existing address on mount
      void validate();
    }

    // Re-check when the window regains focus or becomes visible
    const onFocus = () => void validate();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void validate();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    // Listen for storage changes (other tabs) and apply persisted changes
    const onStorage = (e: StorageEvent) => {
      if (e.key === WALLET_STORAGE_KEY) {
        const persisted = getPersistedConnection();
        if (!persisted && address !== undefined) {
          // cleared from another tab
          resetAddress();
          if (mounted) notify();
        } else if (persisted && persisted !== address) {
          // changed in another tab
          address = persisted || undefined;
          if (mounted) notify();
        }
      }
    };

    window.addEventListener('storage', onStorage);

    // As a safety net, poll occasionally to detect manual disconnects.
    const interval = setInterval(() => void validate(), 5000);

    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, []);

  if (address) return addressToHistoricObject(address);

  return null;
};

export function useDisconnect() {
  return async () => {
    try {
      resetAddress();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };
};