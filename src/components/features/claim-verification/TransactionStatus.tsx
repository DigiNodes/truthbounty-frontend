import type { TransactionStatus as MachineStatus } from "@/lib/transaction-machine/transaction-machine.types";

type LegacyStatus = "idle" | "pending" | "success" | "error";
type PresentationStatus =
  | "confirmed"
  | "rejected"
  | "reorged"
  | "stale"
  | "failed";
export type TransactionStatusValue =
  | LegacyStatus
  | PresentationStatus
  | MachineStatus;

export interface TransactionStatusMessages {
  pending: string;
  success: string;
  error: string;
  preparing: string;
  "signature-requested": string;
  submitted: string;
  confirmed: string;
  confirming: string;
  safe: string;
  indexing: string;
  finalized: string;
  dropped: string;
  replaced: string;
  reverted: string;
  rejected: string;
  reorged: string;
  stale: string;
  failed: string;
}

const defaultMessages: TransactionStatusMessages = {
  pending: "Transaction pending…",
  success: "Verification submitted",
  error: "Transaction failed",
  preparing: "Validating transaction…",
  "signature-requested": "Waiting for wallet signature…",
  submitted: "Transaction submitted; waiting for confirmation.",
  confirmed: "Transaction confirmed; waiting for finality.",
  confirming: "Transaction confirmed; waiting for finality.",
  safe: "Transaction is safe; waiting for finality.",
  indexing: "Transaction finalized; updating account data.",
  finalized: "Transaction finalized.",
  dropped: "Transaction was dropped. You can retry.",
  replaced: "Transaction was replaced. Following the replacement.",
  reverted: "Transaction reverted. You can retry.",
  rejected: "You rejected the transaction. You can retry.",
  reorged: "The transaction was reorganized. Verifying the canonical chain state.",
  stale: "Transaction status is stale. Refreshing from the canonical chain.",
  failed: "Transaction failed. You can retry.",
};

const errorStatuses = new Set<TransactionStatusValue>([
  "error",
  "dropped",
  "replaced",
  "reverted",
  "rejected",
  "reorged",
  "failed",
]);

const busyStatuses = new Set<TransactionStatusValue>([
  "pending",
  "preparing",
  "signature-requested",
  "submitted",
  "confirming",
  "safe",
  "indexing",
  "stale",
]);

export function TransactionStatus({
  status,
  messages = {},
}: {
  status: TransactionStatusValue;
  messages?: Partial<TransactionStatusMessages>;
}) {
  if (status === "idle") return null;

  const message = {
    ...defaultMessages,
    ...messages,
  }[status as keyof TransactionStatusMessages];

  if (!message) return null;

  return (
    <p
      role={errorStatuses.has(status) ? "alert" : "status"}
      aria-live={errorStatuses.has(status) ? "assertive" : "polite"}
      aria-atomic="true"
      aria-busy={busyStatuses.has(status) ? "true" : undefined}
      className={
        errorStatuses.has(status)
          ? "text-red-600"
          : status === "success" || status === "finalized"
            ? "text-green-600"
            : undefined
      }
    >
      {message}
    </p>
  );
}
