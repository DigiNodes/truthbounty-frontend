export type PendingTransactionKind = 'verification' | 'rewards' | 'dispute';

export interface PendingTransactionEntry {
  id: string;
  kind: PendingTransactionKind;
  title: string;
  description: string;
  createdAt: number;
}

const STORAGE_KEY = 'truthbounty-pending-transactions';
const EVENT_NAME = 'truthbounty:pending-transactions';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readStore(): PendingTransactionEntry[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(entries: PendingTransactionEntry[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: entries }));
}

export function getPendingTransactions(): PendingTransactionEntry[] {
  return readStore().sort((left, right) => right.createdAt - left.createdAt);
}

export function trackPendingTransaction(entry: Omit<PendingTransactionEntry, 'createdAt'>): void {
  const existing = readStore().filter((item) => item.id !== entry.id);
  existing.push({ ...entry, createdAt: Date.now() });
  writeStore(existing);
}

export function clearPendingTransaction(id: string): void {
  const remaining = readStore().filter((item) => item.id !== id);
  writeStore(remaining);
}

export function subscribeToPendingTransactions(
  listener: (entries: PendingTransactionEntry[]) => void,
): () => void {
  if (!isBrowser()) return () => undefined;

  const handleChange = () => listener(getPendingTransactions());
  window.addEventListener(EVENT_NAME, handleChange as EventListener);
  window.addEventListener('storage', handleChange);
  return () => {
    window.removeEventListener(EVENT_NAME, handleChange as EventListener);
    window.removeEventListener('storage', handleChange);
  };
}
