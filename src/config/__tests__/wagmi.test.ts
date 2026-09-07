import { wagmiConfig, supportedChains, isSupportedChain } from '../wagmi';
import { optimism, optimismSepolia } from 'wagmi/chains';

describe('Wagmi Configuration', () => {
  it('includes Optimism and Optimism Sepolia in supportedChains', () => {
    const chainIds = supportedChains.map((chain) => chain.id);
    expect(chainIds).toContain(optimism.id);
    expect(chainIds).toContain(optimismSepolia.id);
    expect(optimism.id).toBe(10);
    expect(optimismSepolia.id).toBe(11155420);
  });

  it('configures Wagmi with the correct chains', () => {
    const configuredChains = wagmiConfig.chains.map((chain) => chain.id);
    expect(configuredChains).toContain(10);
    expect(configuredChains).toContain(11155420);
  });

  it('correctly identifies supported chains using isSupportedChain', () => {
    expect(isSupportedChain(10)).toBe(true);
    expect(isSupportedChain(11155420)).toBe(true);
    expect(isSupportedChain(1)).toBe(false);
    expect(isSupportedChain(5)).toBe(false);
    expect(isSupportedChain(undefined)).toBe(false);
  });
});
