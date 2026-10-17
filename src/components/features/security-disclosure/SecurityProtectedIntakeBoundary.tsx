'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  KeyRound,
  FileCode,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  ProtectedIntakeStatus,
  ProtectedChannelState,
} from '@/app/types/security-disclosure';

export interface SecurityProtectedIntakeBoundaryProps {
  status: ProtectedIntakeStatus;
  activeState: ProtectedChannelState;
  copiedTargetId: string | null;
  onCopyText: (text: string, targetId: string) => void;
}

export function SecurityProtectedIntakeBoundary({
  status,
  activeState,
  copiedTargetId,
  onCopyText,
}: SecurityProtectedIntakeBoundaryProps) {
  const [showPgpBlock, setShowPgpBlock] = useState(false);

  // Loading state
  if (activeState === 'loading') {
    return (
      <section
        aria-label="Protected intake channel loading"
        aria-busy="true"
        className="rounded-xl border border-[#232329] bg-[#14141A] p-5 space-y-4"
      >
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-800" />
          <div className="space-y-1.5">
            <div className="h-5 w-48 animate-pulse rounded bg-gray-800" />
            <div className="h-3 w-64 animate-pulse rounded bg-gray-800" />
          </div>
        </div>
        <div className="h-24 animate-pulse rounded-lg bg-[#0B0B0F]" />
      </section>
    );
  }

  // Unavailable State (Default per DigiNodes/truthbounty-protocol#24)
  if (activeState === 'unavailable') {
    return (
      <section
        aria-labelledby="protected-boundary-heading"
        className="space-y-4 rounded-xl border border-amber-500/30 bg-[#16120D] p-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-500/20 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="protected-boundary-heading" className="text-lg font-semibold text-white">
                Protected Intake Boundary: Unavailable (Fail-Closed)
              </h2>
              <p className="text-xs text-amber-300/80">
                Direct web submission form is intentionally disabled to protect sensitive findings.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20 shrink-0">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>UNAVAILABLE (Fail-Closed)</span>
          </span>
        </div>

        {/* Invariant Explanation */}
        <div className="space-y-3 text-xs text-amber-100/90 leading-relaxed">
          <p>
            {status.unavailableReason ||
              'Web intake forms are disabled pending the intake channel decision in DigiNodes/truthbounty-protocol#24.'}
          </p>

          <div className="rounded-lg bg-[#0E0B08] p-3.5 border border-amber-500/20 space-y-2">
            <p className="font-semibold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span>Zero-Data Collection & Telemetry Isolation Invariant</span>
            </p>
            <p className="text-gray-300 leading-relaxed">
              To guarantee that unencrypted 0-day payloads, exploit steps, or private keys never leak into standard web logs, serverless API traces, or customer support ticket systems, this frontend will not render an input form until an audited, verified endpoint is confirmed.
            </p>
          </div>

          {/* Safe Alternative Guidance */}
          <div className="space-y-2 pt-1">
            <p className="font-semibold text-white">Safe Coordinated Disclosure Alternatives:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>
                Create a confidential security advisory through GitHub Security Advisories at{' '}
                {status.privateAdvisoryUrl ? (
                  <a
                    href={status.privateAdvisoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline"
                  >
                    <span>truthbounty-protocol / Security Advisories</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : (
                  <span>GitHub Security Advisories</span>
                )}
                .
              </li>
              <li>
                For critical findings requiring immediate PGP encryption prior to public repo activation, review the protocol release manifest or maintainer PGP fingerprint in the verified security repository.
              </li>
            </ul>
          </div>
        </div>

        {/* Warning banner */}
        <div className="rounded-lg bg-red-950/40 p-3 text-xs text-red-200 border border-red-500/30">
          <p>
            <strong>Warning:</strong> {status.failClosedNotice || 'Never disclose vulnerability details in public channels.'}
          </p>
        </div>
      </section>
    );
  }

  // Ready State (Verified channel & PGP available)
  const pgp = status.verifiedPgpKey;
  const isFingerprintCopied = copiedTargetId === 'pgp-fingerprint';
  const isKeyBlockCopied = copiedTargetId === 'pgp-key-block';

  return (
    <section
      aria-labelledby="protected-boundary-heading"
      className="space-y-4 rounded-xl border border-emerald-500/30 bg-[#0E1513] p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-emerald-500/20 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="protected-boundary-heading" className="text-lg font-semibold text-white">
              Protected Intake Boundary: Verified Channel
            </h2>
            <p className="text-xs text-emerald-300/80">
              Approved PGP keys and private advisory channel for secure disclosures.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20 shrink-0">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          <span>CHANNEL READY</span>
        </span>
      </div>

      {pgp && (
        <div className="space-y-3 text-xs">
          {/* Key metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg bg-[#0B0B0F] p-3 text-gray-300 border border-[#232329]">
            <div>
              <span className="block text-gray-500 text-[11px]">Key ID</span>
              <span className="font-mono font-medium text-white">{pgp.keyId}</span>
            </div>
            <div>
              <span className="block text-gray-500 text-[11px]">Algorithm</span>
              <span className="font-medium text-white">{pgp.algorithm}</span>
            </div>
            <div>
              <span className="block text-gray-500 text-[11px]">Key Expiration</span>
              <span className="font-medium text-white">{pgp.expiresAt}</span>
            </div>
          </div>

          {/* Fingerprint block */}
          <div className="rounded-lg bg-[#0B0B0F] p-3 border border-[#232329] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 font-semibold">
                PGP Fingerprint (Verify Against security.txt)
              </span>
              <button
                type="button"
                onClick={() => onCopyText(pgp.fingerprint, 'pgp-fingerprint')}
                className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 underline transition-colors"
                aria-label="Copy PGP Fingerprint"
              >
                {isFingerprintCopied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    <span>Copy Fingerprint</span>
                  </>
                )}
              </button>
            </div>
            <p className="font-mono text-emerald-300 text-xs break-all tracking-wider bg-[#14141A] p-2 rounded border border-[#232329]">
              {pgp.fingerprint}
            </p>
          </div>

          {/* Collapsible Armored Key Block */}
          <div className="rounded-lg bg-[#0B0B0F] border border-[#232329] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPgpBlock((prev) => !prev)}
              className="w-full flex items-center justify-between p-3 text-left text-xs font-medium text-gray-200 hover:bg-[#14141A] transition-colors"
              aria-expanded={showPgpBlock}
              aria-controls="pgp-public-key-block"
            >
              <span className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>View Armored PGP Public Key</span>
              </span>
              {showPgpBlock ? (
                <ChevronUp className="h-4 w-4 text-gray-400" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
              )}
            </button>

            {showPgpBlock && (
              <div id="pgp-public-key-block" className="p-3 border-t border-[#232329] space-y-2">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onCopyText(pgp.armoredPublicKey, 'pgp-key-block')}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 underline"
                    aria-label="Copy Armored Public Key"
                  >
                    {isKeyBlockCopied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                        <span className="text-emerald-400">Copied Key!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" aria-hidden="true" />
                        <span>Copy Key Block</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="font-mono text-[11px] text-gray-300 bg-[#14141A] p-3 rounded overflow-x-auto border border-[#232329]">
                  {pgp.armoredPublicKey}
                </pre>
              </div>
            )}
          </div>

          {/* Links to security.txt & private advisory */}
          <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
            <a
              href={pgp.canonicalVerificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline"
            >
              <span>Verify Canonical security.txt</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            {status.privateAdvisoryUrl && (
              <a
                href={status.privateAdvisoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 underline"
              >
                <span>Submit Private Security Advisory</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
