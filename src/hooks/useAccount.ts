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
  const [ , setLoading] = useState(true);

  useEffect(() => {
    if (address !== undefined) return;

    addressLookup
      .then(user => { 
        if (user) {
          address = user.address;
          persistConnection(user.address);
        }
      })
      .finally(() => { setLoading(false) });
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