import { useEffect, useState } from "react";
import { isConnected, getAddress } from "@stellar/freighter-api";

const WALLET_STORAGE_KEY = 'truthbounty-wallet-connection';

let address: string | undefined;

const resetAddress = () => {
  address = undefined;
  localStorage.removeItem(WALLET_STORAGE_KEY);
};

const persistConnection = (walletAddress: string) => {
  localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify({
    address: walletAddress,
    timestamp: Date.now()
  }));
};

const getPersistedConnection = () => {
  try {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.address;
    }
  } catch (error) {
    console.error('Failed to parse stored wallet connection:', error);
    localStorage.removeItem(WALLET_STORAGE_KEY);
  }
  return null;
};

const addressLookup = (async () => {
  // First check if we have a persisted connection
  const persistedAddress = getPersistedConnection();
  if (persistedAddress) {
    // Verify the wallet is still connected
    if (await isConnected()) {
      const currentAddress = await getAddress();
      if (currentAddress?.address === persistedAddress) {
        return currentAddress;
      } else {
        // Address changed, clear persisted data
        resetAddress();
      }
    } else {
      // Wallet not connected, clear persisted data
      resetAddress();
    }
  }
  
  // No persisted connection or validation failed, check current state
  if (await isConnected()) {
    const walletAddress = await getAddress();
    if (walletAddress) {
      persistConnection(walletAddress.address);
    }
    return walletAddress;
  }
  
  return null;
})();

// returning the same object identity every time avoids unnecessary re-renders
const addressObject = {
  address: '',
  displayName: '',
};

const addressToHistoricObject = (address: string) => {
  addressObject.address = address;
  addressObject.displayName = `${address.slice(0, 4)}...${address.slice(-4)}`;
  return addressObject
};

export function useAccount(): typeof addressObject | null {
  const [ , setTick] = useState(false);

  useEffect(() => {
    let mounted = true;

    const notify = () => {
      // toggle to force re-render for subscribers
      setTick((t) => !t);
    };

    const validate = async () => {
      try {
        if (await isConnected()) {
          const current = await getAddress();
          if (current && current.address) {
            if (address !== current.address) {
              address = current.address;
              persistConnection(current.address);
              if (mounted) notify();
            }
            return;
          }
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