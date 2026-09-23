/**
 * Inline transaction status for the verification decision workflow.
 *
 * Announces state changes to assistive technology: pending/success use a
 * polite `status` live region, failures use `alert`. Text wraps within the
 * stacked mobile layout of the parent action row.
 */
export function TransactionStatus({
  status,
}: {
  status: 'idle' | 'pending' | 'success' | 'error';
}) {
  if (status === 'pending') {
    return (
      <p role="status" aria-live="polite" className="min-w-0 break-words text-sm sm:text-base">
        Transaction pending...
      </p>
    );
  }
  if (status === 'success') {
    return (
      <p role="status" aria-live="polite" className="min-w-0 break-words text-sm text-green-600 sm:text-base">
        Verification submitted
      </p>
    );
  }
  if (status === 'error') {
    return (
      <p role="alert" className="min-w-0 break-words text-sm text-red-600 sm:text-base">
        Transaction failed
      </p>
    );
  }
  return null;
}
