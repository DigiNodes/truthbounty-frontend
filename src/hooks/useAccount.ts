import { useMemo } from "react";
import { useAccount as useWagmiAccount } from "wagmi";

export { useDisconnect } from "wagmi";

export function useAccount(): { address: string; displayName: string } | null {
  const { address, isConnected } = useWagmiAccount();

  return useMemo(() => {
    if (!isConnected || !address) {
      return null;
    }

    return {
      address,
      displayName: `${address.slice(0, 4)}...${address.slice(-4)}`,
    };
  }, [address, isConnected]);
}
