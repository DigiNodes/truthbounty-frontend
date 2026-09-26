import { renderHook, act } from '@testing-library/react';
import { useAppealParticipation } from '@/hooks/useAppealParticipation';
import { MOCK_ADDRESS_1 } from '@/__tests__/mocks/wagmi/mock-wagmi';

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: MOCK_ADDRESS_1 }),
  useChainId: () => 10,
  useWalletClient: () => ({ data: { sendTransaction: jest.fn().mockRejectedValue(new Error('User rejected')) } }),
  usePublicClient: () => ({
    waitForTransactionReceipt: jest.fn().mockRejectedValue(new Error('Revert')),
    estimateGas: jest.fn().mockResolvedValue(100000n),
    getBlockNumber: jest.fn().mockResolvedValue(100n),
    readContract: jest.fn().mockResolvedValue(0n)
  })
}));

describe('Appeal Participation - Adversarial', () => {
  it('handles wallet rejection', async () => {
    const { result } = renderHook(() => useAppealParticipation({ claimId: 'test' }));
    await act(async () => {
      try {
        await result.current.participate('test', BigInt(100));
      } catch (e: any) {
        expect(e.message).toMatch(/rejected/);
      }
    });
  });
});