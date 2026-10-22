/**
 * V2-FE-070 — Internationalization Public API
 * 
 * Central export point for all i18n functionality.
 * Import from this file to access translations, formatters, and utilities.
 */

// Core configuration
export {
  locales,
  shippableLocales,
  pseudoLocales,
  primaryLocale,
  defaultLocale,
  fallbackLocale,
  rtlLocales,
  localeNames,
  i18nConfig,
  isProductionEnvironment,
  isPseudoLocale,
  isShippableLocale,
  isLocale,
  isRtlLocale,
  isNonProductionLocale,
  getRuntimeLocales,
  resolveLocale,
} from './config';
export type { Locale, ShippableLocale, PseudoLocale } from './config';

// Catalogue resolution, fallback policy, and missing-key behaviour (UI-FE-063)
export {
  CATALOGS,
  MISSING_KEY_OPEN,
  MISSING_KEY_CLOSE,
  makeMissingKeyMarker,
  isMissingKeyMarker,
  hasCatalog,
  getCatalog,
  getMessageByPath,
  resolveCatalog,
  getMessageFallback,
  shouldWarnOnMissingKey,
  isPseudoCatalog,
} from './fallback';
export type { Messages as CatalogMessages, ResolvedCatalog } from './fallback';

// Pseudo-locale generation (UI-FE-063)
export {
  PSEUDO_LOCALE_DEFAULTS,
  transformMessage,
  pseudoLocalizeString,
  pseudoLocalizeMessages,
  isPseudoLocalizedString,
} from './pseudo-locale';
export type { PseudoLocaleOptions } from './pseudo-locale';

// Legal-copy policy (UI-FE-063)
export {
  LEGAL_NAMESPACES,
  LEGAL_COPY_UNAVAILABLE,
  LEGAL_COPY_POLICY,
  getNamespace,
  isLegalKey,
  isLegalNamespace,
  resolveLegalCopy,
} from './legal';
export type {
  LegalNamespace,
  LegalCopyStatus,
  LegalCopyResolution,
} from './legal';

// Client-side hooks and utilities
export {
  useTranslations,
  useLocale,
  useNumberFormat,
  useDateFormat,
  useRelativeTime,
  useErrorMessage,
  useTransactionStateLabel,
  useTransactionError,
  useTransactionState,
  useTransactionStateDescription,
  useClaimError,
  useClaimStatus,
  useFormatError,
} from './client';

// Formatter hooks
export {
  useAddressFormatter,
  useTxHashFormatter,
  useBlockNumberFormatter,
  useGasFormatter,
  useGasPriceFormatter,
  useTokenAmountFormatter,
  usePercentageFormatter,
  useCompactNumberFormatter,
  useDurationFormatter,
  useRelativeTimeFormatter,
  useAbsoluteTimeFormatter,
  useUnixTimestampFormatter,
  useChainIdFormatter,
  useNetworkName,
  useExplorerUrl,
  useFormatters,
} from './use-formatters';

// Pluralization hooks
export {
  useFormatCount,
  useFormatOrdinal,
  useFormatRange,
  useFormatList,
  usePluralCategory,
  useProtocolPluralizers,
  usePluralize,
  usePluralizers,
} from './use-pluralization';

// Standalone formatters (for non-React contexts)
export {
  formatAddress,
  formatTxHash,
  formatBlockNumber,
  formatGas,
  formatGasPrice,
  formatTokenAmount,
  formatPercentage,
  formatCompactNumber,
  formatDuration,
  formatRelativeTime,
  formatAbsoluteTime,
  formatUnixTimestamp,
  formatChainId,
  getNetworkName,
  getExplorerUrl,
  isValidAddress,
  isValidTxHash,
  isValidBytes32,
  formatters,
} from './formatters';

// Pluralization utilities
export {
  createPluralMessage,
  pluralize,
  getPluralCategory,
  formatCount,
  formatOrdinal,
  formatRange,
  formatList,
  protocolPluralizers,
  PLURAL_FORMS,
} from './pluralization';

// Protocol mappers
export {
  TRANSACTION_ERROR_KEY_MAP,
  TRANSACTION_STATE_KEY_MAP,
  TRANSACTION_STATE_DESCRIPTION_MAP,
  CLAIM_ERROR_KEY_MAP,
  CLAIM_STATUS_KEY_MAP,
  getTransactionErrorKey,
  getTransactionStateKey,
  getTransactionStateDescriptionKey,
  getClaimErrorKey,
  getClaimStatusKey,
  extractErrorParams,
  isFailureState,
  isSuccessState,
  isInProgressState,
  getStateColor,
  getStateIcon,
} from './protocol-mapper';

// Type definitions
export type {
  Messages,
  MessageKeys,
  TranslationParams,
  TechnicalIdentifier,
  TransactionStateKey,
  ErrorCodeKey,
  ClaimErrorCodeKey,
} from './types';

// Legacy exports (from utils.ts - kept for backward compatibility)
export {
  formatNumber,
  formatDate,
  shortenAddress,
  shortenHash,
} from './utils';
