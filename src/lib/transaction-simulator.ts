/**
 * Transaction simulation utilities
 * These utilities help simulate blockchain transactions for testing
 */

export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'reverted';

export interface SimulatedTransaction {
  hash: string;
  status: TransactionStatus;
  blockNumber?: bigint;
  gasUsed?: bigint;
  timestamp: number;
  from: string;
  to: string;
  value?: string;
  data?: string;
  confirmations: number;
}

/**
 * Generate a random transaction hash
 */
export function generateTransactionHash(): string {
  return `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}`;
}

/**
 * Generate a mock address
 */
export function generateMockAddress(): string {
  return `0x${Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}` as `0x${string}`;
}

/**
 * Simulate a transaction with configurable delay
 */
export async function simulateTransaction(config: {
  from?: string;
  to?: string;
  value?: string;
  data?: string;
  confirmTime?: number;
  failRate?: number;
}): Promise<SimulatedTransaction> {
  const {
    from = generateMockAddress(),
    to = generateMockAddress(),
    value = '0',
    data = '0x',
    confirmTime = 1500,
    failRate = 0,
  } = config;

  const hash = generateTransactionHash();
  const startTime = Date.now();
  
  // Simulate transaction pending
  await new Promise((resolve) => setTimeout(resolve, confirmTime));
  
  // Simulate potential failure
  const isFailed = Math.random() < failRate;
  
  const transaction: SimulatedTransaction = {
    hash,
    status: isFailed ? 'failed' : 'confirmed',
    blockNumber: isFailed ? undefined : BigInt(Math.floor(Math.random() * 1000000) + 15000000),
    gasUsed: isFailed ? undefined : BigInt(Math.floor(Math.random() * 100000) + 21000),
    timestamp: startTime,
    from,
    to,
    value,
    data,
    confirmations: isFailed ? 0 : Math.floor(Math.random() * 12) + 1,
  };
  
  return transaction;
}

/**
 * Simulate a multi-step transaction workflow
 */
export async function simulateTransactionWorkflow(steps: {
  label: string;
  duration: number;
  shouldFail?: boolean;
}[]): Promise<{
  success: boolean;
  results: {
    step: string;
    success: boolean;
    hash?: string;
    error?: string;
    duration: number;
  }[];
}> {
  const results: {
    step: string;
    success: boolean;
    hash?: string;
    error?: string;
    duration: number;
  }[] = [];
  
  for (const step of steps) {
    const startTime = Date.now();
    
    await new Promise((resolve) => setTimeout(resolve, step.duration));
    
    const success = !step.shouldFail;
    const duration = Date.now() - startTime;
    
    results.push({
      step: step.label,
      success,
      hash: success ? generateTransactionHash() : undefined,
      error: success ? undefined : 'Transaction reverted',
      duration,
    });
    
    if (step.shouldFail) {
      return { success: false, results };
    }
  }
  
  return { success: true, results };
}

/**
 * Simulate gas estimation
 */
export function estimateGas(config: {
  type: 'transfer' | 'contract_call' | 'contract_deployment';
}): {
  gasLimit: bigint;
  gasPrice: bigint;
  totalCost: bigint;
} {
  const { type } = config;
  
  let gasLimit: bigint;
  switch (type) {
    case 'transfer':
      gasLimit = BigInt(21000);
      break;
    case 'contract_call':
      gasLimit = BigInt(65000);
      break;
    case 'contract_deployment':
      gasLimit = BigInt(2000000);
      break;
    default:
      gasLimit = BigInt(21000);
  }
  
  // Simulate gas price (in wei) - typically 20-100 gwei
  const gasPrice = BigInt(Math.floor(Math.random() * 80 + 20)) * BigInt(10 ** 9);
  const totalCost = gasLimit * gasPrice;
  
  return { gasLimit, gasPrice, totalCost };
}

/**
 * Format wei to ETH for display
 */
export function formatWeiToEth(wei: bigint): string {
  const eth = Number(wei) / 10 ** 18;
  return eth.toFixed(6);
}

/**
 * Simulate network latency
 */
export async function withNetworkDelay<T>(
  callback: () => Promise<T>,
  minDelay = 500,
  maxDelay = 2000
): Promise<T> {
  const delay = Math.floor(Math.random() * (maxDelay - minDelay) + minDelay);
  await new Promise((resolve) => setTimeout(resolve, delay));
  return callback();
}

/**
 * Create a mock transaction receipt
 */
export function createMockReceipt(hash: string): {
  transactionHash: string;
  blockNumber: bigint;
  blockHash: string;
  status: '0x1' | '0x0';
  gasUsed: bigint;
  cumulativeGasUsed: bigint;
  effectiveGasPrice: bigint;
  from: string;
  to: string;
  logs: unknown[];
  logsBloom: string;
} {
  return {
    transactionHash: hash,
    blockNumber: BigInt(Math.floor(Math.random() * 1000000) + 15000000),
    blockHash: generateTransactionHash(),
    status: '0x1',
    gasUsed: BigInt(Math.floor(Math.random() * 100000) + 21000),
    cumulativeGasUsed: BigInt(Math.floor(Math.random() * 500000)),
    effectiveGasPrice: BigInt(Math.floor(Math.random() * 50 + 20)) * BigInt(10 ** 9),
    from: generateMockAddress(),
    to: generateMockAddress(),
    logs: [],
    logsBloom: '0x' + '0'.repeat(512),
  };
}