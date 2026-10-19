import { NextRequest, NextResponse } from 'next/server';
import { getProtocolRelease } from '@/lib/contracts/registry';

// Verification history entry from the indexer
interface IndexerVerificationEntry {
  id: string;
  claimId: string;
  title: string;
  outcome:
    | 'awaiting-reveal'
    | 'settlement-pending'
    | 'finalized'
    | 'reward'
    | 'withdrawal'
    | 'slashed'
    | 'missed-deadline'
    | 'unavailable-reward';
  amount: string | null; // wei units
  decimals: number;
  asset: string;
  source: {
    kind: 'contract' | 'api-projection';
    block?: string;
    finality?: 'confirmed' | 'finalized';
    receivedAt?: number | null;
    freshness?: 'unknown' | 'stale' | 'projection-lag' | 'delayed-indexing';
  };
  submittedAt: string;
  finalizedAt?: string;
  reorgStatus: 'none' | 'detected' | 'reconciled';
  replacedBy?: string;
  freshness: {
    fetchedAt: string;
    sourceUpdatedAt?: string;
    stale: boolean;
    delayedIndexing?: boolean;
  };
}

interface HistoryResponse {
  entries: IndexerVerificationEntry[];
  rejectedCount: number;
  receivedAt: number | null;
}

// Mock data for development - replace with actual indexer query
function generateMockHistory(address: string): HistoryResponse {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const entries: IndexerVerificationEntry[] = [
    {
      id: `v1-${address}`,
      claimId: '0x1234567890abcdef1234567890abcdef12345678',
      title: 'Breaking: Major Protocol Upgrade Announced',
      outcome: 'finalized',
      amount: '500000000000000000', // 0.5 ETH
      decimals: 18,
      asset: '0x0000000000000000000000000000000000000000',
      source: {
        kind: 'contract',
        block: '12345678',
        finality: 'finalized',
      },
      submittedAt: new Date(now - 10 * day).toISOString(),
      finalizedAt: new Date(now - 8 * day).toISOString(),
      reorgStatus: 'none',
      freshness: {
        fetchedAt: new Date(now - 1000).toISOString(),
        sourceUpdatedAt: new Date(now - 8 * day).toISOString(),
        stale: false,
      },
    },
    {
      id: `v2-${address}`,
      claimId: '0xabcdef1234567890abcdef1234567890abcdef12',
      title: 'Security Audit Reveals Critical Vulnerability',
      outcome: 'reward',
      amount: '200000000000000000', // 0.2 ETH
      decimals: 18,
      asset: '0x0000000000000000000000000000000000000000',
      source: {
        kind: 'api-projection',
        receivedAt: now - 5000,
        freshness: 'unknown',
      },
      submittedAt: new Date(now - 5 * day).toISOString(),
      finalizedAt: new Date(now - 3 * day).toISOString(),
      reorgStatus: 'none',
      freshness: {
        fetchedAt: new Date(now - 5000).toISOString(),
        stale: false,
      },
    },
    {
      id: `v3-${address}`,
      claimId: '0x9876543210fedcba9876543210fedcba98765432',
      title: 'DeFi Protocol TVL Surpasses $1B Milestone',
      outcome: 'settlement-pending',
      amount: '300000000000000000', // 0.3 ETH
      decimals: 18,
      asset: '0x0000000000000000000000000000000000000000',
      source: {
        kind: 'api-projection',
        receivedAt: now - 2000,
        freshness: 'projection-lag',
      },
      submittedAt: new Date(now - 2 * day).toISOString(),
      reorgStatus: 'none',
      freshness: {
        fetchedAt: new Date(now - 2000).toISOString(),
        stale: true,
        delayedIndexing: true,
      },
    },
    {
      id: `v4-${address}`,
      claimId: '0x5555555555555555555555555555555555555555',
      title: 'Governance Proposal Passes with 90% Approval',
      outcome: 'slashed',
      amount: '100000000000000000', // 0.1 ETH
      decimals: 18,
      asset: '0x0000000000000000000000000000000000000000',
      source: {
        kind: 'contract',
        block: '12345600',
        finality: 'finalized',
      },
      submittedAt: new Date(now - 15 * day).toISOString(),
      finalizedAt: new Date(now - 12 * day).toISOString(),
      reorgStatus: 'reconciled',
      replacedBy: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      freshness: {
        fetchedAt: new Date(now - 1000).toISOString(),
        sourceUpdatedAt: new Date(now - 12 * day).toISOString(),
        stale: false,
      },
    },
    {
      id: `v5-${address}`,
      claimId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      title: 'New Stablecoin Launch Depegs on Day One',
      outcome: 'awaiting-reveal',
      amount: null,
      decimals: 18,
      asset: '0x0000000000000000000000000000000000000000',
      source: {
        kind: 'api-projection',
        receivedAt: now - 1000,
        freshness: 'unknown',
      },
      submittedAt: new Date(now - 1 * day).toISOString(),
      reorgStatus: 'none',
      freshness: {
        fetchedAt: new Date(now - 1000).toISOString(),
        stale: false,
      },
    },
    {
      id: `v6-${address}`,
      claimId: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      title: 'Cross-Chain Bridge Hack Drains $50M',
      outcome: 'missed-deadline',
      amount: '0',
      decimals: 18,
      asset: '0x0000000000000000000000000000000000000000',
      source: {
        kind: 'contract',
        block: '12345000',
        finality: 'finalized',
      },
      submittedAt: new Date(now - 20 * day).toISOString(),
      finalizedAt: new Date(now - 18 * day).toISOString(),
      reorgStatus: 'none',
      freshness: {
        fetchedAt: new Date(now - 1000).toISOString(),
        sourceUpdatedAt: new Date(now - 18 * day).toISOString(),
        stale: false,
      },
    },
    {
      id: `v7-${address}`,
      claimId: '0xcccccccccccccccccccccccccccccccccccccccc',
      title: 'Layer 2 Sequencer Experiences Downtime',
      outcome: 'unavailable-reward',
      amount: '150000000000000000', // 0.15 ETH
      decimals: 18,
      asset: '0x0000000000000000000000000000000000000000',
      source: {
        kind: 'api-projection',
        receivedAt: now - 3000,
        freshness: 'stale',
      },
      submittedAt: new Date(now - 3 * day).toISOString(),
      reorgStatus: 'detected',
      freshness: {
        fetchedAt: new Date(now - 3000).toISOString(),
        stale: true,
        delayedIndexing: true,
      },
    },
  ];

  return {
    entries,
    rejectedCount: 0,
    receivedAt: now,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { error: 'Invalid address', code: 'INVALID_ADDRESS' },
      { status: 400 },
    );
  }

  const release = getProtocolRelease();
  const chainId = release.manifest.chainId;

  // Verify chain
  if (chainId !== 10 && chainId !== 11155420) {
    return NextResponse.json(
      { error: 'Unsupported chain', code: 'UNSUPPORTED_CHAIN' },
      { status: 503 },
    );
  }

  // In production, this would query the indexer/database
  // For now, return mock data
  const data = generateMockHistory(address.toLowerCase());

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
    },
  });
}