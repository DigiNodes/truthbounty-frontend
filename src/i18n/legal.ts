/**
 * UI-FE-063 — Legal-copy policy.
 *
 * Legal copy (privacy notice, terms of use, risk disclosures, consent) may only
 * be produced from a legally approved, versioned source. This module pins the
 * rules that keep an i18n system from *falsely approving* a translation:
 *
 * - Legal namespaces are never pseudo-localized (a machine rendering must never
 *   look like an approved translation).
 * - Missing or unapproved legal copy fails closed to `unavailable`; it never
 *   silently falls back to an older/unapproved version or to untranslated text
 *   presented as current.
 *
 * This mirrors the fail-closed status model already used by
 * `src/data/terms` (`approved | review | unavailable`).
 */

import type { Locale } from './config';

/** Top-level namespaces that carry legal copy. */
export const LEGAL_NAMESPACES = [
  'legal',
  'terms',
  'privacy',
  'disclosures',
  'consent',
] as const;

export type LegalNamespace = (typeof LEGAL_NAMESPACES)[number];

/** Rendered in place of legal copy that cannot be verified as approved. */
export const LEGAL_COPY_UNAVAILABLE = '[[legal-copy:unavailable]]';

/** The policy legal namespaces must obey. Enforced by the i18n gate. */
export const LEGAL_COPY_POLICY = {
  /** Legal copy must never be machine- or pseudo-translated. */
  pseudoLocalizationAllowed: false,
  /** Legal copy is only valid when tied to an approved version. */
  requiresVersion: true,
  /** Missing/unapproved legal copy is unavailable, never an English fallback. */
  missingCopyBehavior: 'unavailable' as const,
  /** Fallback to the primary locale is forbidden for legal namespaces. */
  allowPrimaryLocaleFallback: false,
} as const;

/** The first path segment of a translation key (e.g. `terms.clause.title`). */
export function getNamespace(key: string): string {
  const index = key.indexOf('.');
  return index === -1 ? key : key.slice(0, index);
}

/** Whether a translation key belongs to a legal namespace. */
export function isLegalKey(key: string): boolean {
  return isLegalNamespace(getNamespace(key));
}

/** Whether a namespace carries legal copy. */
export function isLegalNamespace(
  namespace: string | undefined | null,
): namespace is LegalNamespace {
  return (
    typeof namespace === 'string' &&
    (LEGAL_NAMESPACES as readonly string[]).includes(namespace)
  );
}

export type LegalCopyStatus = 'approved' | 'unavailable';

export interface LegalCopyResolution {
  status: LegalCopyStatus;
  copy?: string;
  reason?:
    | 'missing-version'
    | 'unapproved-version'
    | 'missing-copy'
    | 'untranslated-locale';
}

/**
 * Resolve legal copy, failing closed.
 *
 * Returns `approved` only when a requested version matches the approved version
 * for the active locale and copy is present. Every other case is `unavailable`
 * so a caller renders an explicit unavailable boundary instead of stale or
 * unapproved wording.
 */
export function resolveLegalCopy(params: {
  requestedVersion?: string;
  approvedVersion?: string;
  locale?: Locale;
  approvedLocale?: Locale;
  copy?: string;
}): LegalCopyResolution {
  if (!params.requestedVersion || !params.approvedVersion) {
    return { status: 'unavailable', reason: 'missing-version' };
  }
  if (params.requestedVersion !== params.approvedVersion) {
    return { status: 'unavailable', reason: 'unapproved-version' };
  }
  if (
    params.locale !== undefined &&
    params.approvedLocale !== undefined &&
    params.locale !== params.approvedLocale
  ) {
    return { status: 'unavailable', reason: 'untranslated-locale' };
  }
  if (!params.copy) {
    return { status: 'unavailable', reason: 'missing-copy' };
  }
  return { status: 'approved', copy: params.copy };
}
