/**
 * V2 accessible UI primitives.
 *
 * Small, token-bound building blocks shared across Gate C compositions.
 * Components keep meaning in text + iconography so colour is never the sole
 * signal and never infer protocol authority or finality.
 */

export { Card, type CardProps } from './Card';
export { StatePanel, type StatePanelKind, type StatePanelProps } from './StatePanel';
export { StatusBadge, type StatusBadgeProps } from './StatusBadge';
export { TokenAmount, type TokenAmountProps } from './TokenAmount';
export {
  TRANSACTION_STATE_DEFINITIONS,
  TransactionStatePanel,
  type TransactionStatePanelProps,
  type TransactionUiState,
} from './TransactionStatePanel';
