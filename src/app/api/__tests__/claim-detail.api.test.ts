import { fetchClaimDetailProjection } from '@/app/api/claim-detail.api';

describe('fetchClaimDetailProjection', () => {
  afterEach(() => jest.restoreAllMocks());

  it('maps not found without rendering it as a generic failure', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
    await expect(fetchClaimDetailProjection('claim-1')).rejects.toMatchObject({
      code: 'CLAIM_NOT_FOUND',
    });
  });

  it('rejects a successful but malformed projection', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ claim: {} }), { status: 200 }),
    );
    await expect(fetchClaimDetailProjection('claim-1')).rejects.toMatchObject({
      code: 'PROJECTION_MALFORMED',
    });
  });

  it('maps a rebuilding projection to the stale state', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));
    await expect(fetchClaimDetailProjection('claim-1')).rejects.toMatchObject({
      code: 'PROJECTION_STALE',
    });
  });
});