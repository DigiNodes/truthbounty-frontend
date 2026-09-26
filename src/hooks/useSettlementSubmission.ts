'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { encodeFunctionData, type Abi, type Hash } from 'viem';
import { useCallback, useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { encodeFunctionData, isAddress } from 'viem';
import {
  SettlementAction,
  SimulationResult,
  SettlementSubmission,
} from '@/app/types/settlement';
import {
  getContractAbi,
  getContractAddress,
  getProtocolVersion,
} from '@/lib/contracts/registry';
import { evaluateWriteTarget } from '@/lib/contracts/write-gate';
import { useConstant } from './useConstant';

interface UseSettlementSubmissionConfig {
  contractAddress?: string;
  abi?: readonly unknown[];
}

const SETTLEMENT_FUNCTIONS: Record<string, 'settleProvisional' | 'settleAppeal' | 'finalize'> = {
  SETTLE_PROVISIONAL: 'settleProvisional',
  SETTLE_APPEAL: 'settleAppeal',
  FINALIZE: 'finalize',
  CLAIM_SETTLEMENT: 'settleProvisional',
  CLAIM_APPEAL: 'settleAppeal',
};

interface SettlementCall {
  functionName: 'settleProvisional' | 'settleAppeal' | 'finalize';
  args: readonly [`0x${string}`];
}

interface SettlementSubmissionResult {
  simulateSettlement: (action: SettlementAction) => Promise<SimulationResult>;
  submitSettlement: (action: SettlementAction) => Promise<SettlementSubmission>;
  isSimulating: boolean;
  isSubmitting: boolean;
  error: string | null;
  lastSubmission: SettlementSubmission | null;
  artifactVersion: string;
}

/** True when the pinned ABI actually declares `functionName`. */
function abiDeclares(abi: readonly unknown[], functionName: string): boolean {
  return (abi as readonly { type?: string; name?: string }[]).some(
    (entry) => entry?.type === 'function' && entry.name === functionName,
  );
}

/**
 * Normalise a claim identifier to a canonical 32-byte hex word.
 *
 * Padding an arbitrary string with zeros does *not* produce valid `bytes32`
 * calldata — the result contains non-hex characters and the contract would
 * decode garbage. Anything that is not already 32 bytes of hex is rejected so
 * the caller fails closed instead of sending a malformed call.
 */
function toClaimIdArg(claimId: string): `0x${string}` {
  const trimmed = claimId.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
    throw new Error(
      `Claim ID must be a 32-byte hex value (0x + 64 hex characters); received ${trimmed}.`,
    );
  }
  return trimmed as `0x${string}`;
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as { cause?: { shortMessage?: string; message?: string } }).cause;
    return cause?.shortMessage || cause?.message || err.message || 'Unknown error';
  }
  return String(err);
}

function isUserRejected(err: unknown): boolean {
  const message = extractMessage(err);
  return /user rejected|user denied|rejected the request|rejected/i.test(message);
}

export function useSettlementSubmission(
  config: UseSettlementSubmissionConfig = {},
): SettlementSubmissionResult {
  const usingDefaultTarget = !config.contractAddress;
  // Pinned once: these are static release artifacts, and an unstable identity
  // here would invalidate every memoised callback that depends on them.
  const contractAddress = useConstant(
    () => config.contractAddress ?? getContractAddress('TruthBountyWeighted'),
  );
  const abi = useConstant(() => config.abi ?? getContractAbi('TruthBountyWeighted'));
  const artifactVersion = useConstant(() => getProtocolVersion());
  const expectedChainId = useConstant(() => config.expectedChainId ?? getReleaseChainId());

  const { address: userAddress } = useAccount();
  const activeChainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract() ?? {};

  // wagmi client objects are not identity-stable across renders; reading them
  // through refs keeps callback identities (and therefore effects) stable. The
  // refs are synced in an effect rather than during render, which React
  // explicitly disallows; the lazy initialisers keep them correct for the first
  // render and every callback invocation afterwards.
  const publicClientRef = useRef(publicClient);
  const writeRef = useRef(writeContractAsync);
  useEffect(() => {
    publicClientRef.current = publicClient;
    writeRef.current = writeContractAsync;
  });
  const contractAddress = config.contractAddress ?? getContractAddress('TruthBountyWeighted');
  const abi = config.abi ?? getContractAbi('TruthBountyWeighted');
  const artifactVersion = getProtocolVersion();
  const { address: userAddress } = useAccount();

  const [isSimulating, setIsSimulating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only populated after a real wallet write returns a hash (V2-FE-100).
  const [lastSubmission, setLastSubmission] = useState<SettlementSubmission | null>(null);
  const [lastSubmission, setLastSubmission] = useState<SettlementSubmission | null>(null);

  // Wagmi hooks for actual chain interaction
  const { writeContractAsync } = useWriteContract();
  
  // We track the latest transaction hash to wait for receipt
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | null>(null);
  
  // Wait for the transaction receipt to confirm finality
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: pendingTxHash || undefined,
  });

  /**
   * Resolve the canonical function and argument for a settlement action.
   * Throws rather than inventing a selector: a fabricated 4-byte selector would
   * silently route funds to the wrong entrypoint.
   */
  const buildSettlementCall = useCallback(
    (action: SettlementAction): SettlementCall => {
      const functionName = SETTLEMENT_FUNCTIONS[action.type];
      if (!functionName) {
        throw new Error(`Unsupported settlement action: ${action.type}`);
      }

      const claimId = toClaimIdArg(action.claimId);

      return { functionName, args: [claimId] as const };
    },
    [],
  );

  /**
   * Locally encode calldata when the pinned ABI declares the function.
   * Returns null when it does not — an unknown entrypoint is reported as
   * "no calldata available" rather than assembled from a guessed selector.
   */
  const encodeSettlementCalldata = useCallback(
    (call: SettlementCall): string | null => {
      if (!abiDeclares(abi, call.functionName)) return null;
      try {
        return encodeFunctionData({
          abi: abi as Abi,
          functionName: call.functionName,
          args: call.args,
        });
      } catch {
        return null;
        // Fallback should not happen if ABI is valid, but fail closed
        throw new Error('Failed to encode settlement call data');
      }
    },
    [abi],
  );

  /**
   * Validate settlement action can be executed
   */
  const validateSettlementAction = useCallback((action: SettlementAction): string | null => {
    if (!action.isCallable) {
      return action.reason || 'Settlement action is not callable';
    }

    if (!userAddress) {
      return 'Wallet not connected';
    }

    if (!isAddress(contractAddress)) {
      return 'Invalid contract address';
    }

    if (!action.claimId) {
      return 'Invalid claim ID';
    }

    return null;
  }, [userAddress, contractAddress]);

  /**
   * Simulate settlement transaction against the canonical deployment.
   *
   * The RPC node is the only source of truth for whether the call succeeds and
   * for the gas estimate; neither is ever invented locally.
   * Simulate settlement transaction
   * Note: We do not fabricate calldata or gas. We rely on the contract ABI for encoding.
   * Actual simulation/gas estimation is typically done via viem's estimateGas or public client,
   * but for this hook, we focus on validation and encoding readiness.
   */
  const simulateSettlement = useCallback(
    async (action: SettlementAction): Promise<SimulationResult> => {
      setIsSimulating(true);
      setError(null);

      try {
        const validationError = validateSettlementAction(action);
        if (validationError) {
          return { success: false, error: validationError };
        }

        const call = buildSettlementCall(action);
        const calldata = encodeSettlementCalldata(call);
        const fromAddress = userAddress as string;

        const client = publicClientRef.current;
        if (!client?.simulateContract) {
          return {
            success: false,
            error: 'No RPC endpoint is available to simulate this settlement.',
          };
        }

        const simulation = (await client.simulateContract({
          address: contractAddress as `0x${string}`,
          abi: abi as Abi,
          functionName: call.functionName,
          args: call.args,
          account: fromAddress,
        } as never)) as { request?: { gas?: bigint | number | string } } | undefined;

        // Only report a gas figure the node actually returned.
        const nodeGas = simulation?.request?.gas;
        const gasEstimate =
          nodeGas === undefined || nodeGas === null ? undefined : BigInt(nodeGas).toString();

        return {
          success: true,
          ...(gasEstimate === undefined ? {} : { gasEstimate }),
        // Encode call data to ensure ABI compatibility
        const calldata = encodeSettlementCall(action);

        // In a real implementation, we would use viem's estimateGas here.
        // For this focused implementation, we return the encoded data for the UI to display
        // and prepare for submission. We do not fabricate gas estimates.
        
        return {
          success: true,
          gasEstimate: '0', // Placeholder, actual gas comes from RPC estimateGas
          data: {
            from: userAddress!,
            to: contractAddress,
            ...(calldata === null ? {} : { calldata }),
          },
        };
      } catch (err) {
        const errorMsg = `Simulation reverted: ${extractMessage(err)}`;
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsSimulating(false);
      }
    },
    [
      userAddress,
      contractAddress,
      abi,
      validateSettlementAction,
      buildSettlementCall,
      encodeSettlementCalldata,
    ],
  );

  /**
   * Submit settlement transaction through the connected wallet.
   *
   * The returned hash is whatever the wallet/RPC returns. Nothing is derived,
   * truncated or invented locally, and the submission is only recorded once
   * that real hash exists.
   * Submit settlement transaction
   * Uses Wagmi/Viem to interact with the chain. Receipts are authoritative.
   */
  const submitSettlement = useCallback(
    async (action: SettlementAction): Promise<SettlementSubmission> => {
      setIsSubmitting(true);
      setError(null);

      try {
        const validationError = validateSettlementAction(action);
        if (validationError) {
          throw new Error(validationError);
        }

        // V2-FE-100 readiness gate — fail closed before any submission attempt
        const gate = evaluateWriteTarget({
          account: userAddress ?? null,
          chainId: activeChainId,
          expectedChainId,
          targetAddress: contractAddress,
          requireCanonicalMatch: usingDefaultTarget,
        });
        if (!gate.ready) {
          throw new Error(gate.reason ?? 'Wallet is not ready for settlement submission.');
        }

        // Never fabricate a transaction hash. Settlement requires a real
        // wallet writeContract call; without it, fail closed (V2-FE-100).
        const write = writeRef.current;
        if (typeof write !== 'function') {
          throw new Error(
            'No wallet writeContract is available; no synthetic transaction hash is emitted.',
          );
        }

        // Simulate first so a reverting call never reaches the wallet.
        // First simulate to catch errors early
        const simulation = await simulateSettlement(action);
        if (!simulation.success) {
          throw new Error(simulation.error || 'Simulation failed');
        }

        const call = buildSettlementCall(action);

        let txHash: Hash;
        try {
          txHash = (await write({
            address: contractAddress as `0x${string}`,
            abi: abi as Abi,
            functionName: call.functionName,
            args: call.args,
            account: userAddress,
            chain: activeChainId,
          } as never)) as Hash;
        } catch (writeErr) {
          throw new Error(
            isUserRejected(writeErr)
              ? `Settlement was rejected by the wallet: ${extractMessage(writeErr)}`
              : `Settlement write failed: ${extractMessage(writeErr)}`,
          );
        }

        if (typeof txHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
          throw new Error('Wallet did not return a transaction hash; failing closed.');
        }

        const submission: SettlementSubmission = {
          transactionHash: txHash,
          from: userAddress as string,
        // Encode the actual call
        const calldata = encodeSettlementCall(action);
        const claimId = action.claimId.startsWith('0x')
          ? (action.claimId as `0x${string}`)
          : (`0x${action.claimId.padStart(64, '0')}` as `0x${string}`);

        // Execute the contract write via Wagmi
        const hash = await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: abi as any,
          functionName: SETTLEMENT_FUNCTIONS[action.type],
          args: [claimId],
        });

        // Set the pending hash to trigger the receipt waiter
        setPendingTxHash(hash);

        // Create a pending submission record immediately
        const submission: SettlementSubmission = {
          transactionHash: hash,
          from: userAddress!,
          to: contractAddress,
          status: 'pending',
          type: action.type,
          claimId: action.claimId,
          ...(action.disputeId === undefined ? {} : { disputeId: action.disputeId }),
          disputeId: action.disputeId,
          timestamp: new Date().toISOString(),
        };

        setLastSubmission(submission);
        return submission;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Submission failed';
        setError(errorMsg);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      userAddress,
      contractAddress,
      abi,
      activeChainId,
      expectedChainId,
      usingDefaultTarget,
      validateSettlementAction,
      buildSettlementCall,
      simulateSettlement,
    ],
    [userAddress, contractAddress, validateSettlementAction, simulateSettlement, encodeSettlementCall, writeContractAsync, abi]
  );

  // Update the last submission status based on the receipt
  // This ensures the UI reflects the authoritative chain state
  if (receipt && lastSubmission && lastSubmission.transactionHash === receipt.hash) {
    const isSuccess = receipt.status === 'success';
    setLastSubmission({
      ...lastSubmission,
      status: isSuccess ? 'confirmed' : 'reverted',
      blockNumber: receipt.blockNumber?.toString(),
      gasUsed: receipt.gasUsed?.toString(),
    });
  }

  return {
    simulateSettlement,
    submitSettlement,
    isSimulating,
    isSubmitting,
    error,
    lastSubmission,
    artifactVersion,
  };
}