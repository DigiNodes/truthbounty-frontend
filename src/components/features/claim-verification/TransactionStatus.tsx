export function TransactionStatus({
  status,
}: {
  status: 'idle' | 'pending' | 'success' | 'error';
}) {
  if (status === 'pending') {
    return (
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="min-w-0 break-words text-sm sm:text-base"
      >
        Transaction pending...
      </p>
    );
  }
  if (status === 'success') {
    return (
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="min-w-0 break-words text-sm text-green-600 sm:text-base"
      >
        Verification submitted
      </p>
    );
  }
  if (status === 'error') {
    return (
      <p
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="min-w-0 break-words text-sm text-red-600 sm:text-base"
      >
        Transaction failed
      </p>
    );
  }
  return null;
}
