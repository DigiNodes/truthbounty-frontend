import type { ClassifiedError, ErrorKind } from '@/lib/errors/classification';

/**
 * User-facing copy. Static strings only — never interpolates error messages,
 * server text, wallet data or evidence. Error boundaries must render even when
 * i18n providers have failed, so these are intentionally not routed through
 * next-intl (consistent with the existing RouteErrorFallback).
 */
export interface ErrorCopy {
  title: string;
  description: string;
}

const BY_KIND: Record<ErrorKind, ErrorCopy> = {
  user: {
    title: 'This needs your attention',
    description: 'We couldn’t complete that. Check the details or your wallet, then try again.',
  },
  dependency: {
    title: 'A service this view depends on is unavailable',
    description:
      'We couldn’t reach something this view needs. We aren’t showing unconfirmed data in its place.',
  },
  denied: {
    title: 'Access restricted',
    description:
      'Your current session isn’t authorized for this. This is an access decision, not a technical error.',
  },
  defect: {
    title: 'Something went wrong in the app',
    description: 'This looks like a fault on our side. You can try again or reload the page.',
  },
};

const BY_CODE: Partial<Record<string, ErrorCopy>> = {
  NOT_FOUND: {
    title: 'We couldn’t find that',
    description: 'What you were looking for doesn’t exist here or is no longer available.',
  },
  WRONG_CHAIN: {
    title: 'Switch to a supported network',
    description: 'Your wallet is on a network this view doesn’t support. Switch networks, then try again.',
  },
  WALLET_REQUEST_DECLINED: {
    title: 'Wallet request declined',
    description: 'The wallet request was declined. Review your wallet before trying again.',
  },
  WALLET_REQUEST_PENDING: {
    title: 'Wallet request already open',
    description: 'A request is already waiting in your wallet. Finish or dismiss it, then try again.',
  },
  CHUNK_LOAD_FAILED: {
    title: 'Part of the app didn’t load',
    description: 'A piece of the app failed to download. Reloading the page usually fixes this.',
  },
  HYDRATION_MISMATCH: {
    title: 'The page didn’t start correctly',
    description: 'The page content didn’t match what was expected. Reloading the page usually fixes this.',
  },
  CONFIGURATION_ERROR: {
    title: 'This section is misconfigured',
    description: 'A required setting is missing or invalid. Retrying will not help until it is fixed.',
  },
  AUTHENTICATION_REQUIRED: {
    title: 'Sign-in required',
    description: 'You need to be signed in to continue. This is an access decision, not a technical error.',
  },
  RATE_LIMITED: {
    title: 'Too many requests',
    description: 'A service asked us to slow down. Wait a moment, then try again.',
  },
};

export function getErrorCopy(classified: Pick<ClassifiedError, 'kind' | 'code'>): ErrorCopy {
  return BY_CODE[classified.code] ?? BY_KIND[classified.kind];
}
