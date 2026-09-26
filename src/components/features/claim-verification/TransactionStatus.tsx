import React from 'react';
import type { TransactionStatus as MachineStatus } from '@/lib/transaction-machine/transaction-machine.types';
import {
  getTransactionLifecycleMessage,
  getTransactionLifecycleTone,
} from '@/lib/transaction-machine/lifecycle-feedback';

/** Legacy shorthand retained for older call sites. */
export type LegacyTransactionStatus = 'pending' | 'success' | 'error';

export type TransactionStatusProp = MachineStatus | LegacyTransactionStatus;

interface TransactionStatusProps {
  status: TransactionStatusProp;
  errorMessage?: string;
  onRetry?: () => void;
}

function isLegacyShorthand(
  status: TransactionStatusProp,
): status is LegacyTransactionStatus {
  return status === 'pending' || status === 'success' || status === 'error';
}

const LEGACY_TONE_CLASS: Record<'neutral' | 'success' | 'warning' | 'danger', string> = {
  neutral: 'text-gray-600 dark:text-gray-300',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

interface TransactionStatusProps {
  status: 'idle' | 'pending' | 'success' | 'error';
  errorMessage?: string;
  onRetry?: () => void;
}

export function TransactionStatus({
  status,
  errorMessage,
  onRetry,
}: TransactionStatusProps) {
  if (status === 'idle') {
    return null;
  }

  // Shared-machine states — including reorged / recovery — render lifecycle
  // copy from the state machine rather than the legacy shorthand strings.
  if (!isLegacyShorthand(status)) {
    const tone = getTransactionLifecycleTone(status);
    const message = getTransactionLifecycleMessage(status);

  if (tone === 'danger') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex flex-col space-y-2 text-red-600 dark:text-red-400"
      >
        <div className="flex items-center space-x-2">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm font-medium">{message}</p>
        </div>
        {errorMessage && (
          <p className="text-xs text-red-500 dark:text-red-300">
            {errorMessage}
          </p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="self-start text-xs underline hover:text-red-700 dark:hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
            aria-label="Retry transaction"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`flex items-center space-x-2 ${LEGACY_TONE_CLASS[tone]}`}
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
  }

  if (status === 'pending') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center space-x-2 text-gray-600 dark:text-gray-300"
      >
        <svg
          className="animate-spin h-4 w-4 text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-sm font-medium">Transaction pending...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-center space-x-2 text-green-600 dark:text-green-400"
      >
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm font-medium">Verification submitted</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex flex-col space-y-2 text-red-600 dark:text-red-400"
      >
        <div className="flex items-center space-x-2">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm font-medium">Transaction failed</p>
        </div>
        {errorMessage && (
          <p className="text-xs text-red-500 dark:text-red-300">
            {errorMessage}
          </p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="self-start text-xs underline hover:text-red-700 dark:hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
            aria-label="Retry transaction"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return null;
}