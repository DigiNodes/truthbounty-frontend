import type { TransactionStatus as MachineStatus } from '@/lib/transaction-machine/transaction-machine.types';
import {
  getTransactionLifecycleMessage,
  getTransactionLifecycleTone,
} from '@/lib/transaction-machine/lifecycle-feedback';

export type TransactionStatusProp =
  | MachineStatus
  | 'idle'
  | 'pending'
  | 'success'
  | 'error';

/**
 * Accessible lifecycle feedback for write flows.
 * Maps shared machine states (including reorged / recovery) to live region copy.
 */
export function TransactionStatus({
  status,
}: {
  status: TransactionStatusProp;
}) {
  // Legacy shorthand used by older call sites
  const normalized: MachineStatus | 'pending' | 'success' | 'error' =
    status === 'pending'
      ? 'submitted'
      : status === 'success'
        ? 'finalized'
        : status === 'error'
          ? 'reverted'
          : status;

  if (normalized === 'idle') return null;

  const message = getTransactionLifecycleMessage(normalized as MachineStatus);
  const tone = getTransactionLifecycleTone(normalized as MachineStatus);

  const className =
    tone === 'success'
      ? 'text-green-600'
      : tone === 'danger'
        ? 'text-red-600'
        : tone === 'warning'
          ? 'text-amber-700'
          : 'text-slate-700';

  return (
    <p role="status" aria-live="polite" className={className}>
      {message}
    </p>
  );
}
