'use client';

import React from 'react';
import { Target, CheckCircle, XCircle, Copy, Check } from 'lucide-react';
import type {
  SecurityScopeTarget,
  ScopeCategory,
} from '@/app/types/security-disclosure';

export interface SecurityScopeSectionProps {
  targets: readonly SecurityScopeTarget[];
  scopeFilter: 'all' | 'in-scope' | 'out-of-scope';
  onScopeFilterChange: (filter: 'all' | 'in-scope' | 'out-of-scope') => void;
  categoryFilter: ScopeCategory | 'all';
  onCategoryFilterChange: (category: ScopeCategory | 'all') => void;
  copiedTargetId: string | null;
  onCopyTarget: (text: string, targetId: string) => void;
}

const CATEGORIES: readonly { value: ScopeCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'smart-contract', label: 'Smart Contracts' },
  { value: 'frontend', label: 'Frontend Apps' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

export function SecurityScopeSection({
  targets,
  scopeFilter,
  onScopeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  copiedTargetId,
  onCopyTarget,
}: SecurityScopeSectionProps) {
  return (
    <section
      aria-labelledby="security-scope-heading"
      className="space-y-4 rounded-xl border border-[#232329] bg-[#14141A] p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#232329] pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Target className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id="security-scope-heading" className="text-lg font-semibold text-white">
              Target Scope & Eligibility Boundaries
            </h2>
            <p className="text-xs text-gray-400">
              Targets officially covered by TruthBounty responsible disclosure policy.
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope filter pills */}
          <div className="inline-flex rounded-lg bg-[#0B0B0F] p-0.5 border border-[#232329]" role="group" aria-label="Scope Filter">
            <button
              type="button"
              onClick={() => onScopeFilterChange('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                scopeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              aria-pressed={scopeFilter === 'all'}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onScopeFilterChange('in-scope')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                scopeFilter === 'in-scope'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              aria-pressed={scopeFilter === 'in-scope'}
            >
              In Scope
            </button>
            <button
              type="button"
              onClick={() => onScopeFilterChange('out-of-scope')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                scopeFilter === 'out-of-scope'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              aria-pressed={scopeFilter === 'out-of-scope'}
            >
              Out of Scope
            </button>
          </div>

          {/* Category filter selector */}
          <label htmlFor="scope-category-filter" className="sr-only">
            Filter by category
          </label>
          <select
            id="scope-category-filter"
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value as ScopeCategory | 'all')}
            className="rounded-lg border border-[#232329] bg-[#0B0B0F] px-2.5 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target cards grid */}
      {targets.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400" role="status">
          No security targets match the selected filters.
        </div>
      ) : (
        <ul className="space-y-3">
          {targets.map((target) => {
            const isCopied = copiedTargetId === target.id;
            return (
              <li
                key={target.id}
                className={`rounded-lg border p-4 transition-colors ${
                  target.inScope
                    ? 'border-emerald-500/20 bg-[#0E1513]/60 hover:border-emerald-500/40'
                    : 'border-red-500/20 bg-[#160E0F]/60 hover:border-red-500/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white text-sm">{target.name}</span>

                      {/* In-scope status badge */}
                      {target.inScope ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="h-3 w-3" aria-hidden="true" />
                          <span>In Scope</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-400 border border-red-500/20">
                          <XCircle className="h-3 w-3" aria-hidden="true" />
                          <span>Out of Scope</span>
                        </span>
                      )}

                      {/* Category tag */}
                      <span className="rounded bg-[#232329] px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-300">
                        {target.category.replace('-', ' ')}
                      </span>

                      {/* Environment tag */}
                      <span className="rounded bg-[#1B1B22] px-2 py-0.5 text-[10px] text-gray-400">
                        {target.environment}
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed pt-1">
                      {target.notes}
                    </p>

                    {/* Target identifier / address */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                      <span className="text-gray-400">Target:</span>
                      <span className="rounded bg-[#0B0B0F] px-2 py-0.5 text-gray-200 border border-[#232329] break-all">
                        {target.targetIdentifier}
                      </span>
                      <button
                        type="button"
                        onClick={() => onCopyTarget(target.targetIdentifier, target.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 underline transition-colors"
                        aria-label={`Copy identifier for ${target.name}`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" aria-hidden="true" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Provenance source badge */}
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] text-gray-400 block">
                      Source: {target.sourceClass}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
