import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, createStorage, cookieStorage } from 'wagmi';
import { optimism, optimismSepolia } from 'wagmi/chains';

// Fallback project ID for local development and CI testing
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  'truthbounty-dev-walletconnect-project-id';

export const supportedChains = [optimism, optimismSepolia] as const;

export const wagmiConfig = getDefaultConfig({
  appName: 'TruthBounty',
  projectId,
  chains: supportedChains,
  transports: {
    [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL),
    [optimismSepolia.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

export type SupportedChainId = (typeof supportedChains)[number]['id'];

export function isSupportedChain(chainId?: number): chainId is SupportedChainId {
  if (!chainId) return false;
  return supportedChains.some((chain) => chain.id === chainId);
}
