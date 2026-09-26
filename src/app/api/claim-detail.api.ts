import {
  createClaimDetailError,
  parseClaimDetailEnvelope,
  type ClaimDetailEnvelope,
} from '@/app/types/claim-detail';

export async function fetchClaimDetailProjection(
  claimId: string,
  signal?: AbortSignal,
): Promise<ClaimDetailEnvelope> {
  let response: Response;
  try {
    response = await fetch(`/api/claims/${encodeURIComponent(claimId)}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw createClaimDetailError(
      'PROJECTION_UNAVAILABLE',
      'Could not reach the claim detail projection',
    );
  }

  if (response.status === 404) {
    throw createClaimDetailError('CLAIM_NOT_FOUND', 'Claim was not found');
  }
  if (response.status === 503) {
    throw createClaimDetailError(
      'PROJECTION_STALE',
      'Claim detail projection is stale or rebuilding',
    );
  }
  if (!response.ok) {
    throw createClaimDetailError(
      'PROJECTION_UNAVAILABLE',
      `Claim detail projection failed with status ${response.status}`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw createClaimDetailError(
      'PROJECTION_MALFORMED',
      'Claim detail projection returned non-JSON data',
    );
  }
  return parseClaimDetailEnvelope(payload);
}