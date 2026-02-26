'use client';

import { XCircle, AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VerificationErrorCardProps {
  error: string;
  errorCode?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function VerificationErrorCard({
  error,
  errorCode,
  onRetry,
  onDismiss,
}: VerificationErrorCardProps) {
  const getErrorDetails = () => {
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('already verified') || errorCode === 'DUPLICATE') {
      return {
        title: 'Already Verified',
        message: 'This Worldcoin identity has already been used to verify another account.',
        icon: AlertTriangle,
        canRetry: false,
      };
    }
    
    if (lowerError.includes('cancelled') || lowerError.includes('rejected')) {
      return {
        title: 'Verification Cancelled',
        message: 'You cancelled the verification process. You can try again when ready.',
        icon: XCircle,
        canRetry: true,
      };
    }
    
    if (lowerError.includes('network') || lowerError.includes('timeout')) {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to Worldcoin services. Please check your internet connection.',
        icon: AlertTriangle,
        canRetry: true,
      };
    }
    
    return {
      title: 'Verification Failed',
      message: error || 'An unexpected error occurred during verification. Please try again.',
      icon: XCircle,
      canRetry: true,
    };
  };

  const details = getErrorDetails();
  const Icon = details.icon;

  return (
    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="size-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <Icon className="size-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
              {details.title}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {details.message}
            </p>
          </div>

          {errorCode && (
            <div className="text-xs font-mono text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded inline-block">
              Error Code: {errorCode}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {details.canRetry && onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="border-red-300 dark:border-red-700"
              >
                <RefreshCw className="size-4" />
                Try Again
              </Button>
            )}
            
            <Button
              onClick={() => window.open('https://worldcoin.org/support', '_blank')}
              size="sm"
              variant="ghost"
              className="text-red-700 dark:text-red-300"
            >
              <HelpCircle className="size-4" />
              Get Help
            </Button>

            {onDismiss && (
              <Button
                onClick={onDismiss}
                size="sm"
                variant="ghost"
                className="text-red-700 dark:text-red-300 ml-auto"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
