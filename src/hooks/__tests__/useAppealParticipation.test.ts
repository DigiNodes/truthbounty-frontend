/**
 * Unit tests for useAppealParticipation (V2-FE-059).
 * Covers canonical simulation/submission, validation, stale-round rejection,
 * and absence of fabricated tx hashes / synthetic selectors.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { toFunctionSelector } from 'viem';
import { useAppealContext } from '@/hooks/useAppealContext';
import {
  appealContextConfig,
  buildAppealProjection,
} from '@/__tests__/fixtures/appealProjection';
import { useAppealParticipation } from '@/hooks/useAppealParticipation';
import { useAppealReconciliation } from '@/hooks/useAppealReconciliation';
import { renderHook, act } from '@testing-library/react';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWriteContract,
} from 'wagmi';
import { useAppealParticipation } from '../useAppealParticipation';
import {
  AppealParticipationContext,
  AppealSnapshot,
  AppealDeadline,
  AppealStakeBounds,
  AppealWalletPosition,
} from '@/app/types/appeal';
import { encodeParticipateInAppeal, toAppealIdBytes32 } from '@/lib/appeal/round-progression';

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useChainId: jest.fn(),
  usePublicClient: jest.fn(),
  useWriteContract: jest.fn(),
}));

const MOCK_CONTRACT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as const;
/** Must equal the release manifest address, otherwise the write gate fails closed. */
const mockContractAddress = MOCK_CONTRACT;
const mockUserAddress = MOCK_ADDRESS_1;
const RELEASE_CHAIN_ID = 11155420; // OP Sepolia — the pinned release chain
const TX_HASH = MOCK_TX_HASH_1;
const STAKING_TOKEN = '0x3333333333333333333333333333333333333333' as const;

const APPEAL_ID = '0x' + 'ab'.repeat(32);

const TEST_ABI = [
  {
    type: 'function',
    name: 'participateInAppeal',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'appealId', type: 'bytes32' },
      { name: 'support', type: 'bool' },
      { name: 'stakeAmount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

const PARTICIPATE_SELECTOR = toFunctionSelector(
  'participateInAppeal(bytes32,bool,uint256)'
);
const mockContractAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
const mockUserAddress = '0x1234567890123456789012345678901234567890';
const OPTIMISM_MAINNET = 10;
const TX_HASH = `0x${'ab'.repeat(32)}`;

const mockedUseAccount = useAccount as jest.Mock;
const mockedUseChainId = useChainId as jest.Mock;
const mockedUsePublicClient = usePublicClient as jest.Mock;
const mockedUseWriteContract = useWriteContract as jest.Mock;

const mockWriteContractAsync = jest.fn();
const mockSimulateContract = jest.fn();
const mockEstimateContractGas = jest.fn();
const mockReadContract = jest.fn();

function renderAppealHook(config: Record<string, unknown> = {}) {
  return renderHook(() =>
    useAppealParticipation({
      contractAddress: mockContractAddress,
      abi: TEST_ABI,
      expectedChainId: RELEASE_CHAIN_ID,
      ...config,
    })
function createMockContext(
  overrides?: Partial<AppealParticipationContext>
): AppealParticipationContext {
  const snapshot: AppealSnapshot = {
    appealId: 'appeal-123',
    claimId: 'claim-456',
    disputeId: 'dispute-789',
    initiatorAddress: '0x' + '1'.repeat(40),
    initiatorStake: '1000000000000000000',
    firstRoundDecision: 'VERIFIED',
    firstRoundVotesFor: 15,
    firstRoundVotesAgainst: 8,
    reason: 'Test appeal reason',
    initiatedAt: new Date().toISOString(),
    blockNumber: 12345000,
  };

  const deadline: AppealDeadline = {
    appealId: 'appeal-123',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    timeRemaining: 3600,
    endBlock: 12347000,
    currentBlock: 12345500,
    blocksRemaining: 1500,
    isActive: true,
    hasEnded: false,
  };

  const stakeBounds: AppealStakeBounds = {
    appealId: 'appeal-123',
    minStake: '100000000000000000',
    maxStake: '10000000000000000000',
    recommendedStake: '500000000000000000',
    totalSupportStake: '3500000000000000000',
    totalOpposeStake: '2100000000000000000',
    supporterCount: 7,
    opposerCount: 4,
  };

  const walletPosition: AppealWalletPosition = {
    appealId: 'appeal-123',
    userAddress: mockUserAddress,
    hasParticipated: false,
    currentBalance: '5000000000000000000',
    hasMinimumBalance: true,
  };

  return {
    snapshot,
    deadline,
    stakeBounds,
    walletPosition,
    roundProgression: {
      appealId: 'appeal-123',
      roundNumber: 1,
      requiredBond: '100000000000000000',
      deadlineSeconds: Math.floor(Date.now() / 1000) + 3600,
      timeRemainingSeconds: 3600,
      supportStake: '3500000000000000000',
      opposeStake: '2100000000000000000',
      state: 'ACTIVE',
      isActive: true,
      hasEnded: false,
      roundMatchesExpected: true,
      expectedRound: 1,
    },
    isEligible: true,
    ...overrides,
  };
}

function installMocks() {
  mockedUseAccount.mockReturnValue({
    address: mockUserAddress,
    isConnected: true,
  });
  mockedUseChainId.mockReturnValue(OPTIMISM_MAINNET);
  mockWriteContractAsync.mockResolvedValue(TX_HASH);
  mockedUseWriteContract.mockReturnValue({
    writeContractAsync: mockWriteContractAsync,
  });
  mockSimulateContract.mockResolvedValue({ request: {} });
  mockEstimateContractGas.mockResolvedValue(180000n);
  mockReadContract.mockImplementation(
    ({ functionName }: { functionName: string }) => {
      if (functionName === 'getAppealRound') {
        return Promise.resolve({
          roundNumber: 1n,
          requiredBond: 100000000000000000n,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
          supportStake: 3500000000000000000n,
          opposeStake: 2100000000000000000n,
          state: 1,
          claimId: toAppealIdBytes32('claim-456'),
        });
      }
      if (functionName === 'allowance') {
        return Promise.resolve(10n ** 24n);
      }
      return Promise.resolve(null);
    }
  );
  mockedUsePublicClient.mockReturnValue({
    simulateContract: mockSimulateContract,
    estimateContractGas: mockEstimateContractGas,
    readContract: mockReadContract,
    getTransactionReceipt: jest.fn(),
  });
}

describe('useAppealParticipation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockUserAddress,
      isConnected: true,
    });
    (wagmi.useChainId as jest.Mock).mockReturnValue(RELEASE_CHAIN_ID);
    (wagmi.useBlockNumber as jest.Mock).mockReturnValue({
      data: BigInt(12345678),
    });
    mockSimulateContract.mockResolvedValue({ request: {} });
    mockGetTransactionReceipt.mockResolvedValue({
      transactionHash: TX_HASH,
      status: '0x1',
      blockNumber: 1234n,
      gasUsed: 21000n,
      chainId: RELEASE_CHAIN_ID,
    });
    mockReadContract.mockResolvedValue(0n);
    (wagmi.usePublicClient as jest.Mock).mockReturnValue({
      simulateContract: mockSimulateContract,
      getTransactionReceipt: mockGetTransactionReceipt,
      readContract: mockReadContract,
    });
    mockWriteContractAsync.mockResolvedValue(TX_HASH);
    (wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
    });
  });

  describe('complete participation flow', () => {
    it('should complete full flow: fetch context → validate → simulate → submit → reconcile', async () => {
      const { result: contextResult } = renderHook(() =>
        useAppealContext(appealContextConfig({
          appealId: APPEAL_ID,
          claimId: 'claim-456',
          contractAddress: mockContractAddress,
          userAddress: mockUserAddress,
        }))
    installMocks();
  });

  describe('successful participation', () => {
    it('simulates support with canonical calldata and projected totals', async () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
        })
      );

      const mockContext = createMockContext();
      let simulation: Awaited<
        ReturnType<typeof result.current.simulateParticipation>
      >;

      await act(async () => {
        simulation = await result.current.simulateParticipation(
          mockContext,
          'SUPPORT',
          '500000000000000000'
        );
      });

      expect(simulation!.success).toBe(true);
      expect(simulation!.gasEstimate).toBe('180000');
      expect(simulation!.projectedState?.newSupportTotal).toBe(
        '4000000000000000000'
      );
      expect(simulation!.projectedState?.potentialReward).toBeUndefined();

      // Step 5: Submit through the real wallet write path (V2-FE-100)
      let submitted: any;
      await act(async () => {
        submitted = await participationResult.current.submitParticipation(
          context,
          'SUPPORT',
          '500000000000000000'
        );
      });

      expect(mockWriteContractAsync).toHaveBeenCalledTimes(1);
      expect(submitted.transactionHash).toBe(TX_HASH);
      expect(submitted.from).toBe(mockUserAddress);
      expect(submitted.to).toBe(MOCK_CONTRACT);
      expect(submitted.chainId).toBe(RELEASE_CHAIN_ID);
      expect(submitted.status).toBe('CONFIRMED');
      expect(submitted.blockNumber).toBe(1234n);
      expect(participationResult.current.phase).toBe('confirmed');

      // Reconciliation only proceeds from a real receipt — fabricate nothing here
      const realHash = '0x' + 'ab'.repeat(32);
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'success',
          transactionHash: realHash,
          blockNumber: BigInt(12345680),
        },
        isLoading: false,
        error: null,
      const expected = encodeParticipateInAppeal({
        appealId: toAppealIdBytes32('appeal-123'),
        decision: 'SUPPORT',
        stakeAmount: 500000000000000000n,
        expectedRound: 1n,
      });
      expect(simulation!.data?.calldata).toBe(expected.calldata);
      expect(simulation!.data?.calldata.startsWith('0xabc12345')).toBe(false);
    });

      const { result: reconciliationResult } = renderHook(() =>
        useAppealReconciliation({
          transaction: {
            transactionHash: realHash,
            from: mockUserAddress,
            to: mockContractAddress,
            status: 'PENDING',
            appealId: APPEAL_ID,
            claimId: 'claim-456',
            disputeId: 'dispute-789',
            decision: 'SUPPORT',
            stakeAmount: '500000000000000000',
            timestamp: new Date().toISOString(),
          },
    it('simulates oppose decision successfully', async () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
        })
      );

      let simulation: Awaited<
        ReturnType<typeof result.current.simulateParticipation>
      >;
      await act(async () => {
        simulation = await result.current.simulateParticipation(
          createMockContext(),
          'OPPOSE',
          '300000000000000000'
        );
      });

      expect(simulation!.success).toBe(true);
      expect(simulation!.projectedState?.newOpposeTotal).toBe(
        '2400000000000000000'
      );
    });

    it('should handle oppose decision in complete flow', async () => {
      const { result: contextResult } = renderHook(() =>
        useAppealContext(appealContextConfig({
          appealId: APPEAL_ID,
          claimId: 'claim-789',
    it('submits via writeContractAsync and returns the wallet tx hash', async () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
          userAddress: mockUserAddress,
        }))
      );

      let transaction: Awaited<
        ReturnType<typeof result.current.submitParticipation>
      >;
      await act(async () => {
        transaction = await result.current.submitParticipation(
          createMockContext(),
          'SUPPORT',
          '500000000000000000'
        );
      });

      expect(mockWriteContractAsync).toHaveBeenCalled();
      expect(transaction!.transactionHash).toBe(TX_HASH);
      expect(transaction!.from).toBe(mockUserAddress);
      expect(transaction!.to.toLowerCase()).toBe(
        mockContractAddress.toLowerCase()
      );
      expect(transaction!.status).toBe('PENDING');
      expect(transaction!.decision).toBe('SUPPORT');
      expect(transaction!.expectedRound).toBe(1);
    });

    it('tracks last transaction', async () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
        })
      );

      let submitted: any;
      await act(async () => {
        submitted = await participationResult.current.submitParticipation(
          contextResult.current.context!,
          'OPPOSE',
          '300000000000000000'
        );
      });

      // OPPOSE is encoded from the real ABI and submitted through the wallet.
      expect(mockWriteContractAsync).toHaveBeenCalledTimes(1);
      const [writeArgs] = mockWriteContractAsync.mock.calls[0] as [
        { args: unknown[] },
      ];
      expect(writeArgs.args[1]).toBe(false);
      expect(submitted.transactionHash).toBe(TX_HASH);
      expect(submitted.decision).toBe('OPPOSE');
      expect(submitted.status).toBe('CONFIRMED');
    });
  });

  describe('fail-closed guards', () => {
    it('should fail closed and never invent a hash when the wallet write path is unavailable', async () => {
      (wagmi.useWriteContract as jest.Mock).mockReturnValue(undefined);

      const { result: contextResult } = renderHook(() =>
        useAppealContext(appealContextConfig({
          appealId: APPEAL_ID,
          claimId: 'claim-456',
          contractAddress: mockContractAddress,
          userAddress: mockUserAddress,
        }))
      );

      await waitFor(() => {
        expect(contextResult.current.context).not.toBeNull();
      });

      const { result: participationResult } = renderAppealHook();

      let submitError: Error | undefined;
      await act(async () => {
        try {
          await participationResult.current.submitParticipation(
            contextResult.current.context!,
            'SUPPORT',
            '500000000000000000'
          );
        } catch (e) {
          submitError = e as Error;
        }
      });

      expect(submitError).toBeDefined();
      expect(submitError?.message).toMatch(/write path unavailable|writeContract|wallet write/i);
      expect(participationResult.current.lastTransaction).toBeNull();
      expect(participationResult.current.phase).toBe('unsupported');
      await act(async () => {
        await result.current.submitParticipation(
          createMockContext(),
          'OPPOSE',
          '200000000000000000'
        );
      });

      expect(result.current.lastTransaction?.decision).toBe('OPPOSE');
      expect(result.current.lastTransaction?.stakeAmount).toBe(
        '200000000000000000'
      );
    });
  });

  describe('validation errors', () => {
    it('rejects when appeal has ended', () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
        })
      );

      const validation = result.current.validateParticipation(
        createMockContext({
          deadline: {
            appealId: 'appeal-123',
            startTime: new Date(Date.now() - 7200000).toISOString(),
            endTime: new Date(Date.now() - 3600000).toISOString(),
            timeRemaining: 0,
            endBlock: 12345000,
            currentBlock: 12346000,
            blocksRemaining: 0,
            isActive: false,
            hasEnded: true,
          },
          isEligible: false,
          ineligibilityReason: 'Appeal period has ended',
        }),
        'SUPPORT',
        '500000000000000000'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Appeal period has ended or has not started'
      );
      expect(validation.checks.appealActive).toBe(false);
    });

    it('rejects when wallet not connected', () => {
      mockedUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
      });

      const { result: contextResult } = renderHook(() =>
        useAppealContext(appealContextConfig({
          appealId: APPEAL_ID,
          claimId: 'claim-456',
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
          userAddress: mockUserAddress,
        }))
      );

      const validation = result.current.validateParticipation(
        createMockContext(),
        'SUPPORT',
        '500000000000000000'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Wallet not connected');
      expect(validation.checks.walletConnected).toBe(false);
    });

    it('should stop flow when validation fails', async () => {
      const { result: contextResult } = renderHook(() =>
        useAppealContext(appealContextConfig({
          appealId: APPEAL_ID,
          claimId: 'claim-456',
          contractAddress: mockContractAddress,
          userAddress: mockUserAddress,
        }))
    it('rejects when on wrong network', () => {
      mockedUseChainId.mockReturnValue(1);

      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
          expectedChainId: OPTIMISM_MAINNET,
        })
      );

      const validation = result.current.validateParticipation(
        createMockContext(),
        'SUPPORT',
        '500000000000000000'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Wrong network'))).toBe(
        true
      );
      expect(validation.checks.correctChain).toBe(false);
    });

    it('should handle transaction revert in reconciliation', async () => {
      const { result: contextResult } = renderHook(() =>
        useAppealContext(appealContextConfig({
          appealId: APPEAL_ID,
          claimId: 'claim-456',
    it('rejects when user already participated', () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
          userAddress: mockUserAddress,
        }))
      );

      const validation = result.current.validateParticipation(
        createMockContext({
          walletPosition: {
            appealId: 'appeal-123',
            userAddress: mockUserAddress,
            hasParticipated: true,
            existingDecision: 'SUPPORT',
            existingStake: '500000000000000000',
            participatedAt: new Date().toISOString(),
            transactionHash: TX_HASH,
            currentBalance: '4500000000000000000',
            hasMinimumBalance: true,
          },
        }),
        'OPPOSE',
        '300000000000000000'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'You have already participated in this appeal'
      );
      expect(validation.checks.notAlreadyParticipated).toBe(false);
    });

    it('rejects stale-round participation', () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
        })
      );

      const { result: reconciliationResult } = renderHook(() =>
        useAppealReconciliation({
          transaction: {
            transactionHash: revertedHash,
            from: mockUserAddress,
            to: mockContractAddress,
            status: 'PENDING',
            appealId: APPEAL_ID,
            claimId: 'claim-456',
            disputeId: 'dispute-789',
            decision: 'SUPPORT',
            stakeAmount: '500000000000000000',
            timestamp: new Date().toISOString(),
      const validation = result.current.validateParticipation(
        createMockContext({
          roundProgression: {
            appealId: 'appeal-123',
            roundNumber: 2,
            requiredBond: '100000000000000000',
            deadlineSeconds: Math.floor(Date.now() / 1000) + 3600,
            timeRemainingSeconds: 3600,
            supportStake: '0',
            opposeStake: '0',
            state: 'ACTIVE',
            isActive: true,
            hasEnded: false,
            roundMatchesExpected: false,
            expectedRound: 1,
          },
        }),
        'SUPPORT',
        '500000000000000000'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.checks.roundCurrent).toBe(false);
      expect(validation.errors.some((e) => /Stale round/i.test(e))).toBe(true);
    });

  describe('state segregation throughout flow', () => {
    it('should maintain state segregation from context to reconciliation', async () => {
      const { result: contextResult } = renderHook(() =>
        useAppealContext(appealContextConfig({
          appealId: APPEAL_ID,
          claimId: 'claim-456',
    it('rejects stake below minimum', () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
          userAddress: mockUserAddress,
        }))
      );

      const validation = result.current.validateParticipation(
        createMockContext(),
        'SUPPORT',
        '50000000000000000'
      );

      let submitted: any;
      await act(async () => {
        submitted = await participationResult.current.submitParticipation(
          contextResult.current.context!,
          'SUPPORT',
          '500000000000000000'
        );
      });
      expect(submitted.transactionHash).toBe(TX_HASH);
      expect(submitted.status).toBe('CONFIRMED');

      const confirmedHash = '0x' + 'ef'.repeat(32);
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: {
          status: 'success',
          transactionHash: confirmedHash,
        },
        isLoading: false,
        error: null,
      });

      const { result: reconciliationResult } = renderHook(() =>
        useAppealReconciliation({
          transaction: {
            transactionHash: confirmedHash,
            from: mockUserAddress,
            to: mockContractAddress,
            status: 'PENDING',
            appealId: APPEAL_ID,
            claimId: 'claim-456',
            disputeId: 'dispute-789',
            decision: 'SUPPORT',
            stakeAmount: '500000000000000000',
            timestamp: new Date().toISOString(),
          },
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('below minimum'))).toBe(
        true
      );
    });

    it('rejects stake above maximum', () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
        })
      );

      const validation = result.current.validateParticipation(
        createMockContext(),
        'SUPPORT',
        '15000000000000000000'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('exceeds maximum'))).toBe(
        true
      );
    });

  describe('real-time updates during flow', () => {
    it('should reflect a new projected deadline after a refetch', async () => {
      // The deadline is projection-owned: block height alone must never
      // synthesise one. It changes only when the projection is re-read.
      let blocksRemaining = 39_200;
      const fetcher = jest.fn(async () => {
        const base = buildAppealProjection({
          appealId: APPEAL_ID,
          chainId: RELEASE_CHAIN_ID,
          snapshot: { appealId: APPEAL_ID, claimId: 'claim-456' },
          deadline: { appealId: APPEAL_ID, blocksRemaining },
          position: { appealId: APPEAL_ID, userAddress: mockUserAddress },
        });
        return base;
      });

      const { result: contextResult } = renderHook(() =>
        useAppealContext({
          appealId: APPEAL_ID,
          claimId: 'claim-456',
    it('rejects insufficient balance', () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
          pollInterval: 100000,
          fetcher,
        })
      );

      const validation = result.current.validateParticipation(
        createMockContext({
          walletPosition: {
            appealId: 'appeal-123',
            userAddress: mockUserAddress,
            hasParticipated: false,
            currentBalance: '50000000000000000',
            hasMinimumBalance: false,
          },
        }),
        'SUPPORT',
        '100000000000000000'
      );

      const initialBlocksRemaining =
        contextResult.current.context!.deadline.blocksRemaining;
      expect(initialBlocksRemaining).toBe(39_200);

      blocksRemaining = 12_000;
      await contextResult.current.refetch();

      await waitFor(() => {
        expect(
          contextResult.current.context?.deadline.blocksRemaining
        ).toBe(12_000);
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('does not change the deadline when only the local block height moves', async () => {
      const fetcher = jest.fn(async () =>
        buildAppealProjection({
          appealId: APPEAL_ID,
          chainId: RELEASE_CHAIN_ID,
          snapshot: { appealId: APPEAL_ID, claimId: 'claim-456' },
          deadline: { appealId: APPEAL_ID, blocksRemaining: 39_200 },
          position: { appealId: APPEAL_ID, userAddress: mockUserAddress },
        })
      );

      const { result: contextResult, rerender } = renderHook(() =>
        useAppealContext({
          appealId: APPEAL_ID,
          claimId: 'claim-456',
          contractAddress: mockContractAddress,
          pollInterval: 100000,
          fetcher,
        })
      );

      await waitFor(() => {
        expect(contextResult.current.context).not.toBeNull();
      });

      (wagmi.useBlockNumber as jest.Mock).mockReturnValue({
        data: BigInt(99_999_999),
      });
      rerender();
      await act(async () => {});

      expect(contextResult.current.context?.deadline.blocksRemaining).toBe(
        39_200
      );
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Insufficient balance for stake amount'
      );
    });

    it('rejects invalid contract address', () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: 'invalid-address',
        })
      );

      const validation = result.current.validateParticipation(
        createMockContext(),
        'SUPPORT',
        '500000000000000000'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid contract address format');
    });

  describe('concurrent participation attempts', () => {
    it('should prevent double submission', async () => {
      const { result: contextResult } = renderHook(() =>
        useAppealContext(appealContextConfig({
          appealId: APPEAL_ID,
          claimId: 'claim-456',
    it('rejects invalid stake amount format', () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
          userAddress: mockUserAddress,
        }))
      );

      const validation = result.current.validateParticipation(
        createMockContext(),
        'SUPPORT',
        'invalid-amount'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid stake amount format');
    });
  });

      // First submission goes through the real wallet write path.
      let firstSubmitted: any;
      await act(async () => {
        firstSubmitted = await participationResult.current.submitParticipation(
          contextResult.current.context!,
          'SUPPORT',
          '500000000000000000'
        );
      });

      expect(firstSubmitted.transactionHash).toBe(TX_HASH);
      expect(firstSubmitted.status).toBe('CONFIRMED');
      expect(participationResult.current.lastTransaction?.transactionHash).toBe(
        TX_HASH
      );

      const updatedContext = {
        ...contextResult.current.context!,
        walletPosition: {
          ...contextResult.current.context!.walletPosition,
          hasParticipated: true,
          existingDecision: 'SUPPORT' as const,
        },
        isEligible: false,
        ineligibilityReason: 'Already participated',
      };

      const validation = participationResult.current.validateParticipation(
        updatedContext,
        'OPPOSE',
        '300000000000000000'
      );
  describe('simulation before submission', () => {
    it('does not submit if simulation fails', async () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: 'invalid-address',
        })
      );

      await expect(
        act(async () => {
          await result.current.submitParticipation(
            createMockContext(),
            'SUPPORT',
            '500000000000000000'
          );
        })
      ).rejects.toThrow();

      expect(result.current.lastTransaction).toBeNull();
      expect(mockWriteContractAsync).not.toHaveBeenCalled();
    });

    it('fails closed when eth_call simulation reverts', async () => {
      mockSimulateContract.mockRejectedValueOnce(
        new Error('execution reverted: AppealRoundClosed')
      );

  describe('real simulation data', () => {
    it('should surface real calldata and never fabricate gas or projections', async () => {
      const { result: contextResult } = renderHook(() =>
        useAppealContext(appealContextConfig({
          appealId: APPEAL_ID,
          claimId: 'claim-456',
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
          userAddress: mockUserAddress,
        }))
      );

      let simulation: Awaited<
        ReturnType<typeof result.current.simulateParticipation>
      >;
      await act(async () => {
        simulation = await result.current.simulateParticipation(
          createMockContext(),
          'SUPPORT',
          '500000000000000000'
        );
      });

      expect(simulation!.success).toBe(false);
      expect(simulation!.error).toMatch(/AppealRoundClosed|reverted/i);
    });
  });

  describe('stake warnings', () => {
    it('warns when stake is significantly below recommended', () => {
      const { result } = renderHook(() =>
        useAppealParticipation({
          contractAddress: mockContractAddress,
        })
      );

      const validation = result.current.validateParticipation(
        createMockContext(),
        'SUPPORT',
        '150000000000000000'
      );

      expect(validation.isValid).toBe(true);
      expect(
        validation.warnings.some((w) => w.includes('below recommended'))
      ).toBe(true);
    });
  });
});
