import { rest } from 'msw'
import { createMockClaim, createMockVerification } from '../utils/test-utils'

// MSW handlers for API mocking
export const handlers = [
  // GET /api/claims
  rest.get('/api/claims', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        createMockClaim({ id: 'claim-1', title: 'First Claim' }),
        createMockClaim({ id: 'claim-2', title: 'Second Claim', status: 'UNDER_REVIEW' }),
        createMockClaim({ id: 'claim-3', title: 'Third Claim', status: 'VERIFIED' }),
      ])
    )
  }),

  // GET /api/claims/:id
  rest.get('/api/claims/:claimId', (req, res, ctx) => {
    const { claimId } = req.params
    return res(
      ctx.status(200),
      ctx.json(createMockClaim({ id: claimId, title: `Claim ${claimId}` }))
    )
  }),

  // POST /api/claims
  rest.post('/api/claims', async (req, res, ctx) => {
    const body = await req.json()
    return res(
      ctx.status(201),
      ctx.json(
        createMockClaim({
          id: 'new-claim',
          title: body.title,
          description: body.description,
          status: 'OPEN',
        })
      )
    )
  }),

  // GET /api/claims?status=:status
  rest.get('/api/claims', (req, res, ctx) => {
    const status = req.url.searchParams.get('status')
    const claims = [
      createMockClaim({ id: 'claim-1', title: 'Open Claim', status: 'OPEN' }),
      createMockClaim({ id: 'claim-2', title: 'Review Claim', status: 'UNDER_REVIEW' }),
      createMockClaim({ id: 'claim-3', title: 'Verified Claim', status: 'VERIFIED' }),
    ]
    
    const filteredClaims = status 
      ? claims.filter(claim => claim.status === status)
      : claims
    
    return res(ctx.status(200), ctx.json(filteredClaims))
  }),

  // POST /api/verifications
  rest.post('/api/verifications', async (req, res, ctx) => {
    const body = await req.json()
    return res(
      ctx.status(201),
      ctx.json(
        createMockVerification({
          id: 'new-verification',
          claimId: body.claimId,
          decision: body.decision.toUpperCase(),
          status: 'PENDING',
        })
      )
    )
  }),

  // GET /api/user/:userId/reputation
  rest.get('/api/user/:userId/reputation', (req, res, ctx) => {
    const { userId } = req.params
    return res(
      ctx.status(200),
      ctx.json({
        userId,
        reputation: 50,
        isVerified: true,
        accountAgeDays: 30,
        suspicious: false,
      })
    )
  }),

  // GET /api/leaderboard
  rest.get('/api/leaderboard', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { address: '0x123...', reputation: 100, verifications: 10 },
        { address: '0x456...', reputation: 80, verifications: 8 },
        { address: '0x789...', reputation: 60, verifications: 6 },
      ])
    )
  }),

  // Error handlers
  rest.get('/api/claims/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ error: 'Internal Server Error' })
    )
  }),

  rest.post('/api/claims/error', (req, res, ctx) => {
    return res(
      ctx.status(400),
      ctx.json({ error: 'Bad Request' })
    )
  }),
]
