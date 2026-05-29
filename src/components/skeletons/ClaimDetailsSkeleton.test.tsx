import { render, screen } from '@testing-library/react'
import { ClaimDetailsSkeleton } from './ClaimDetailsSkeleton'

describe('ClaimDetailsSkeleton', () => {
  it('renders the skeleton wrapper and placeholders', () => {
    const { container } = render(<ClaimDetailsSkeleton />)

    expect(screen.getByTestId('claim-details-skeleton')).toBeInTheDocument()
    expect(screen.getByTestId('claim-details-skeleton-card')).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)
  })
})
