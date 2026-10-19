/**
 * V2-FE-014 — Reconciliation of a confirmed challenge receipt with the
 * effective on-chain challenge state.
 *
 * Both the receipt and the on-chain read are authoritative inputs; this module
 * only compares them and never fabricates either side. There is no client timer
 * driving lifecycle state.
 */

'use client';

import {
  DisputeReconciliation,
  EffectiveChallengeState,
} from '@/app/types/dispute';

export interface ReceiptLike {
  transactionHash: string;
  status: '0x1' | '0x0' | string;
  blockNumber?: bigint | number;
  chainId?: number;
}

export interface ReconcileChallengeInput {
  chainId?: number;
  claimId?: string;
  receipt?: ReceiptLike;
  onChain?: EffectiveChallengeState | null;
  expectedBond?: bigint | null;
}

function normalizeStatus(value?: string): string {
  return value ? value.toLowerCase() : 'unknown';
}

export function reconcileChallengeState(
  input: ReconcileChallengeInput
): DisputeReconciliation {
  const details: string[] = [];
  const { chainId, receipt, onChain, expectedBond } = input;

  const hasReceipt = Boolean(receipt);
  const hasOnChain = Boolean(onChain && onChain.exists);

  if (!hasReceipt && !hasOnChain) {
    return {
      status: 'idle',
      isMismatch: false,
      isWrongNetwork: false,
      isProtocolDisabled: false,
      details,
    };
  }

  const isWrongNetwork =
    typeof chainId === 'number' &&
    typeof receipt?.chainId === 'number' &&
    receipt.chainId !== chainId;
  if (isWrongNetwork) details.push('receipt belongs to a different chain');

  const receiptStatus = normalizeStatus(receipt?.status);
  const receiptRejected =
    receiptStatus === '0x0' ||
    receiptStatus === 'reverted' ||
    receiptStatus === 'failed';

  if (receiptRejected) {
    details.push(`receipt status is ${receiptStatus}`);
    return {
      status: 'rejected',
      isMismatch: true,
      isWrongNetwork,
      isProtocolDisabled: true,
      details,
    };
  }

  const receiptConfirmed =
    receiptStatus === '0x1' ||
    receiptStatus === 'confirmed' ||
    receiptStatus === 'success';

  if (hasReceipt && receiptConfirmed && !hasOnChain) {
    details.push('receipt confirmed but no on-chain challenge is visible yet');
    return {
      status: 'stale',
      isMismatch: false,
      isWrongNetwork,
      isProtocolDisabled: false,
      details,
    };
  }

  if (hasOnChain) {
    if (
      typeof expectedBond === 'bigint' &&
      expectedBond > 0n &&
      onChain!.bond !== expectedBond
    ) {
      details.push('on-chain bond contradicts the expected challenge bond');
      return {
        status: 'mismatch',
        isMismatch: true,
        isWrongNetwork,
        isProtocolDisabled: false,
        details,
      };
    }
    if (!receiptConfirmed) {
      details.push('on-chain challenge is visible but not yet receipt-confirmed');
      return {
        status: 'stale',
        isMismatch: false,
        isWrongNetwork,
        isProtocolDisabled: false,
        details,
      };
    }
    return {
      status: 'confirmed',
      isMismatch: false,
      isWrongNetwork,
      isProtocolDisabled: false,
      details,
    };
  }

  return {
    status: 'idle',
    isMismatch: false,
    isWrongNetwork,
    isProtocolDisabled: false,
    details,
  };
}
