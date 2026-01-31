export function TransactionStatus({
  status,
}: {
  status: 'idle' | 'pending' | 'success' | 'error';
}) {
  if (status === 'pending') return <p>Transaction pending...</p>;
  if (status === 'success') return <p className="text-green-600">Verification submitted</p>;
  if (status === 'error') return <p className="text-red-600">Transaction failed</p>;
  return null;
}
