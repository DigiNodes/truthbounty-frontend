'use client';

import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Shield, Hash } from 'lucide-react';
import type { AdminAuditDetailedRecord } from '@/app/types/admin-audit';
import { CopyableValue } from '@/components/ui/CopyableValue';
import { AdminAuditStatusBadge } from './AdminAuditStatusBadge';

export interface AdminAuditTableProps {
  records: AdminAuditDetailedRecord[];
  className?: string;
}

export function AdminAuditTable({ records, className = '' }: AdminAuditTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (auditId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [auditId]: !prev[auditId],
    }));
  };

  const getExplorerTxUrl = (txHash: string) => {
    return `https://sepolia-optimism.etherscan.io/tx/${txHash}`;
  };

  return (
    <div
      className={`hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-xs ${className}`}
      data-testid="admin-audit-desktop-table"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs" aria-label="Administrative audit trail log records">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th scope="col" className="px-4 py-3.5">Audit ID</th>
              <th scope="col" className="px-4 py-3.5">Actor & Authority Source</th>
              <th scope="col" className="px-4 py-3.5">Action & Target</th>
              <th scope="col" className="px-4 py-3.5">Status</th>
              <th scope="col" className="px-4 py-3.5">Before / After Refs</th>
              <th scope="col" className="px-4 py-3.5">Tx Hash</th>
              <th scope="col" className="px-4 py-3.5">Timestamp</th>
              <th scope="col" className="px-3 py-3.5 text-center">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-sans">
            {records.map((rec) => {
              const isExpanded = Boolean(expandedRows[rec.auditId]);
              const shortActor = `${rec.actor.slice(0, 6)}...${rec.actor.slice(-4)}`;

              return (
                <React.Fragment key={rec.auditId}>
                  <tr
                    className={`hover:bg-muted/20 transition-colors ${
                      isExpanded ? 'bg-muted/15' : ''
                    }`}
                  >
                    {/* 1. API Audit ID */}
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground align-top whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{rec.auditId}</span>
                        <CopyableValue
                          kind="support-reference"
                          value={rec.auditId}
                          displayValue=""
                          label="audit ID"
                          accessibleLabel={`Copy audit identifier ${rec.auditId}`}
                        />
                      </div>
                      <div className="mt-1">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border border-border bg-muted/40 text-muted-foreground">
                          {rec.capability}
                        </span>
                      </div>
                    </td>

                    {/* 2. Actor & Authority Source */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="flex items-center gap-1.5 font-mono text-foreground font-medium">
                        <span>{shortActor}</span>
                        <CopyableValue
                          kind="address"
                          value={rec.actor}
                          displayValue=""
                          label="actor address"
                          accessibleLabel={`Copy actor address ${rec.actor}`}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Shield className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />
                        <span className="truncate max-w-[150px]" title={rec.authoritySource}>
                          {rec.authoritySource}
                        </span>
                      </div>
                    </td>

                    {/* 3. Action & Target Resource */}
                    <td className="px-4 py-3.5 align-top max-w-[220px]">
                      <div className="font-semibold text-foreground leading-snug">{rec.action}</div>
                      <div
                        className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate"
                        title={rec.targetResource}
                      >
                        Target: {rec.targetResource}
                      </div>
                    </td>

                    {/* 4. Lifecycle Status */}
                    <td className="px-4 py-3.5 align-top whitespace-nowrap">
                      <AdminAuditStatusBadge status={rec.lifecycleState} />
                    </td>

                    {/* 5. Before / After Cryptographic Refs */}
                    <td className="px-4 py-3.5 align-top font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground font-medium">Pre:</span>
                        <span>{rec.beforeRef.slice(0, 8)}...</span>
                        <CopyableValue
                          kind="hash"
                          value={rec.beforeRef}
                          displayValue=""
                          label="pre-execution state hash"
                          accessibleLabel="Copy pre-execution reference hash"
                        />
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-muted-foreground font-medium">Post:</span>
                        <span>{rec.afterRef.slice(0, 8)}...</span>
                        <CopyableValue
                          kind="hash"
                          value={rec.afterRef}
                          displayValue=""
                          label="post-execution consequence hash"
                          accessibleLabel="Copy post-execution reference hash"
                        />
                      </div>
                    </td>

                    {/* 6. Transaction Hash */}
                    <td className="px-4 py-3.5 align-top font-mono text-[11px] whitespace-nowrap">
                      {rec.txHash && rec.txHash !== '0x00' ? (
                        <div className="flex items-center gap-1.5 text-foreground">
                          <span>{rec.txHash.slice(0, 8)}...</span>
                          <CopyableValue
                            kind="hash"
                            value={rec.txHash}
                            displayValue=""
                            label="transaction hash"
                            accessibleLabel="Copy transaction hash"
                          />
                          <a
                            href={getExplorerTxUrl(rec.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 transition-colors p-0.5"
                            aria-label={`View transaction ${rec.txHash} on Optimism block explorer (opens in new tab)`}
                            title="View on Optimism Sepolia Explorer"
                          >
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-sans text-[11px]">
                          Off-chain / Supervisor
                        </span>
                      )}
                      {rec.blockNumber && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Hash className="h-2.5 w-2.5" aria-hidden="true" />
                          <span>Block {rec.blockNumber.toLocaleString()}</span>
                        </div>
                      )}
                    </td>

                    {/* 7. Timestamp */}
                    <td className="px-4 py-3.5 align-top whitespace-nowrap text-muted-foreground text-[11px]">
                      <div>{new Date(rec.timestamp).toLocaleDateString()}</div>
                      <div className="text-[10px]">{new Date(rec.timestamp).toLocaleTimeString()}</div>
                    </td>

                    {/* 8. Expand/Collapse Button */}
                    <td className="px-3 py-3.5 align-top text-center">
                      <button
                        type="button"
                        onClick={() => toggleRow(rec.auditId)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} request and result details for ${rec.auditId}`}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <tr className="bg-muted/10 border-b border-border/80">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Request Summary */}
                          <div className="space-y-1.5 p-3 rounded-xl border border-border/60 bg-card">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <span>Request Summary</span>
                            </span>
                            <p className="text-foreground font-mono text-[11px] whitespace-pre-wrap break-all">
                              {rec.requestSummary || 'No request parameters specified.'}
                            </p>
                          </div>

                          {/* Result Summary */}
                          <div className="space-y-1.5 p-3 rounded-xl border border-border/60 bg-card">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <span>Execution Result</span>
                            </span>
                            <p className="text-foreground font-mono text-[11px] whitespace-pre-wrap break-all">
                              {rec.resultSummary || 'Execution completed without returned payload.'}
                            </p>
                          </div>
                        </div>

                        {rec.details && (
                          <div className="mt-3 p-3 rounded-xl border border-border/60 bg-card text-[11px] text-muted-foreground font-mono">
                            <span className="font-semibold text-foreground mr-1">Supervisor Notes:</span>
                            {rec.details}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
