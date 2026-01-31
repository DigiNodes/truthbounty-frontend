import React from 'react';
import { TransactionItem, type TransactionItemProps } from './transaction-item';

export interface TransactionsListProps {
  transactions: TransactionItemProps[];
  onCopy?: (hash: string) => void;
  onRetry?: (index: number) => void;
}

export function TransactionsList({
  transactions,
  onCopy,
  onRetry,
}: TransactionsListProps) {
  return (
    <div className="space-y-4">
      {transactions.map((transaction, index) => (
        <TransactionItem
          key={`${transaction.hash}-${index}`}
          {...transaction}
          onCopy={onCopy}
          onRetry={
            transaction.onRetry
              ? () => onRetry?.(index)
              : undefined
          }
        />
      ))}
    </div>
  );
}
