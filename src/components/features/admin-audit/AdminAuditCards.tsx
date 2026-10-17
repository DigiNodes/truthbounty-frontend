'use client';

import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import type { AdminAuditDetailedRecord } from '@/app/types/admin-audit';
import { CopyableValue } from '@/components/ui/CopyableValue';
import { AdminAuditStatusBadge } from './AdminAuditStatusBadge';

export interface AdminAuditCardsProps {
  records: AdminAuditDetailedRecord[];
  className?: string;
}

export function AdminAuditCards({ records, className = '' }: AdminAuditCardsProps) {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (auditId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [auditId]: !prev[auditId],
    }));
  };

  const getExplorerTxUrl = (txHash: string) => {
    return `https://sepolia-optimism.etherscan.io/tx/${txHash}`;
  };

  return (
    <div
      className={`md:hidden space-y-3 ${className}`}
      data-testid="admin-audit-mobile-cards"
      aria-label="Administrative audit trail log records (mobile card view)"
    >
      {records.map((rec) => {
        const isExpanded = Boolean(expandedCards[rec.auditId]);
        const shortActor = `${rec.actor.slice(0, 8)}...${rec.actor.slice(-6)}`;

        return (
          <div
            key={rec.auditId}
            className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs text-xs"
          >
            {/* Header: Audit ID & Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                  <span>{rec.auditId}</span>
                  <CopyableValue
                    kind="support-reference"
                    value={rec.auditId}
                    displayValue=""
                    label="audit ID"
                    accessibleLabel={`Copy audit identifier ${rec.auditId}`}
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-border bg-muted/40 text-muted-foreground">
                    {rec.capability}
                  </span>
                </div>
              </div>
              <AdminAuditStatusBadge status={rec.lifecycleState} />
            </div>

            {/* Action and Target */}
            <div>
              <h2 className="font-semibold text-foreground text-sm leading-tight">{rec.action}</h2>
              <p className="text-muted-foreground text-[11px] mt-0.5 font-mono break-all">
                Target: {rec.targetResource}
              </p>
            </div>

            {/* Key Metadata Rows */}
            <div className="pt-2 border-t border-border/60 space-y-1.5 text-[11px]">
              {/* Actor */}
              <div className="flex items-center justify-between font-mono">
                <span className="text-muted-foreground">Actor:</span>
                <div className="flex items-center gap-1 text-foreground font-semibold">
                  <span>{shortActor}</span>
                  <CopyableValue
                    kind="address"
                    value={rec.actor}
                    displayValue=""
                    label="actor address"
                    accessibleLabel={`Copy actor address ${rec.actor}`}
                  />
                </div>
              </div>

              {/* Authority Source */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Authority:</span>
                <div className="flex items-center gap-1 text-foreground">
                  <Shield className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />
                  <span className="truncate max-w-[180px]">{rec.authoritySource}</span>
                </div>
              </div>

              {/* Before / After Refs */}
              <div className="flex items-center justify-between font-mono">
                <span className="text-muted-foreground">Pre Ref:</span>
                <div className="flex items-center gap-1 text-foreground">
                  <span>{rec.beforeRef.slice(0, 10)}...</span>
                  <CopyableValue
                    kind="hash"
                    value={rec.beforeRef}
                    displayValue=""
                    label="pre-execution state hash"
                    accessibleLabel="Copy pre-execution reference hash"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between font-mono">
                <span className="text-muted-foreground">Post Ref:</span>
                <div className="flex items-center gap-1 text-foreground">
                  <span>{rec.afterRef.slice(0, 10)}...</span>
                  <CopyableValue
                    kind="hash"
                    value={rec.afterRef}
                    displayValue=""
                    label="post-execution consequence hash"
                    accessibleLabel="Copy post-execution reference hash"
                  />
                </div>
              </div>

              {/* Tx Hash */}
              <div className="flex items-center justify-between font-mono">
                <span className="text-muted-foreground">Tx Hash:</span>
                {rec.txHash && rec.txHash !== '0x00' ? (
                  <div className="flex items-center gap-1 text-foreground">
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
                      aria-label={`View transaction on explorer`}
                    >
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                ) : (
                  <span className="text-muted-foreground font-sans">Off-chain / Supervisor</span>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex items-center justify-between text-muted-foreground pt-1">
                <span>Timestamp:</span>
                <span>{new Date(rec.timestamp).toLocaleString()}</span>
              </div>
            </div>

            {/* Expand / Collapse Button for Mobile Details */}
            <div className="pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => toggleCard(rec.auditId)}
                className="w-full py-1.5 px-2 rounded-lg bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Hide' : 'Show'} request and result details for ${rec.auditId}`}
              >
                <span>{isExpanded ? 'Hide Request / Result Details' : 'View Request / Result Details'}</span>
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Expanded Payload Content */}
            {isExpanded && (
              <div className="pt-2 space-y-2 text-[11px]">
                <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <div className="font-semibold text-muted-foreground">Request Summary</div>
                  <div className="font-mono text-foreground break-all whitespace-pre-wrap">
                    {rec.requestSummary || 'No request parameters.'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <div className="font-semibold text-muted-foreground">Execution Result</div>
                  <div className="font-mono text-foreground break-all whitespace-pre-wrap">
                    {rec.resultSummary || 'Completed without returned payload.'}
                  </div>
                </div>

                {rec.details && (
                  <div className="p-2 rounded-lg border border-border/40 text-[10px] text-muted-foreground font-mono">
                    <span className="font-semibold text-foreground mr-1">Supervisor Notes:</span>
                    {rec.details}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
