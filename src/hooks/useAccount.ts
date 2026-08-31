import { useMemo } from "react";
import { useAccount as useWagmiAccount } from "wagmi";

export { useDisconnect } from "wagmi";

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