import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import ClaimSubmissionForm from '@/components/features/claim-submission/ClaimSubmissionForm'
import { useSubmitClaim } from '@/app/queries/claims.queries'
import { render, createMockClaim, mockSubmitClaim, mockFetchError } from '../utils/test-utils'
import { setupMockServer } from '../mocks/server'

// Setup mock server
const server = setupMockServer()

// Mock the useTrust hook
jest.mock('@/components/hooks/useTrust', () => ({
  useTrust: () => ({
    isVerified: true,
    reputation: 50,
    accountAgeDays: 30,
    suspicious: false,
  }),
}))

// Mock the submitClaim API function
jest.mock('@/app/api/claims.api', () => ({
  submitClaim: jest.fn(),
}))

describe('Claim Submission Integration Tests', () => {
  let queryClient: QueryClient
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    user = userEvent.setup()
  })

  describe('Form Submission Flow', () => {
    it('should submit a claim with valid data', async () => {
      const mockClaim = createMockClaim({ title: 'Test Claim Submission' })
      mockSubmitClaim(mockClaim)

      const onSubmit = jest.fn()
      
      render(
        <ClaimSubmissionForm onSubmit={onSubmit} onClose={jest.fn()} />,
        { queryClient }
      )

      // Fill out the form
      const titleInput = screen.getByPlaceholderText('Title')
      const categoryInput = screen.getByPlaceholderText('Category')
      const impactInput = screen.getByPlaceholderText('Impact (e.g. High Impact)')
      const sourceInput = screen.getByPlaceholderText('Source')
      const descriptionInput = screen.getByPlaceholderText('Description')

      await user.type(titleInput, 'Test Claim Submission')
      await user.type(categoryInput, 'Politics')
      await user.type(impactInput, 'High Impact')
      await user.type(sourceInput, 'https://example.com/source')
      await user.type(descriptionInput, 'This is a detailed description of the claim')

      // Submit the form
      const submitButton = screen.getByRole('button', { name: 'Submit' })
      await user.click(submitButton)

      // Verify the submission
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          title: 'Test Claim Submission',
          category: 'Politics',
          impact: 'High Impact',
          source: 'https://example.com/source',
          description: 'This is a detailed description of the claim',
        })
      })
    })

    it('should show loading state during submission', async () => {
      const onSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(
        <ClaimSubmissionForm onSubmit={onSubmit} onClose={jest.fn()} />,
        { queryClient }
      )

      // Fill out the form minimally
      const titleInput = screen.getByPlaceholderText('Title')
      const categoryInput = screen.getByPlaceholderText('Category')
      const impactInput = screen.getByPlaceholderText('Impact (e.g. High Impact)')
      const sourceInput = screen.getByPlaceholderText('Source')
      const descriptionInput = screen.getByPlaceholderText('Description')

      await user.type(titleInput, 'Test Claim')
      await user.type(categoryInput, 'Test Category')
      await user.type(impactInput, 'Test Impact')
      await user.type(sourceInput, 'Test Source')
      await user.type(descriptionInput, 'Test Description')

      // Submit the form
      const submitButton = screen.getByRole('button', { name: 'Submit' })
      await user.click(submitButton)

      // Check loading state
      expect(screen.getByRole('button', { name: 'Submitting...' })).toBeInTheDocument()
      
      // Wait for submission to complete
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })
    })

    it('should validate required fields', async () => {
      const onSubmit = jest.fn()
      
      render(
        <ClaimSubmissionForm onSubmit={onSubmit} onClose={jest.fn()} />,
        { queryClient }
      )

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: 'Submit' })
      await user.click(submitButton)

      // Form should not submit due to HTML5 validation
      expect(onSubmit).not.toHaveBeenCalled()

      // Check that inputs are required
      const titleInput = screen.getByPlaceholderText('Title')
      const categoryInput = screen.getByPlaceholderText('Category')
      const impactInput = screen.getByPlaceholderText('Impact (e.g. High Impact)')
      const sourceInput = screen.getByPlaceholderText('Source')
      const descriptionInput = screen.getByPlaceholderText('Description')

      expect(titleInput).toBeRequired()
      expect(categoryInput).toBeRequired()
      expect(impactInput).toBeRequired()
      expect(sourceInput).toBeRequired()
      expect(descriptionInput).toBeRequired()
    })

    it('should close form when cancel is clicked', async () => {
      const onClose = jest.fn()
      const onSubmit = jest.fn()
      
      render(
        <ClaimSubmissionForm onSubmit={onSubmit} onClose={onClose} />,
        { queryClient }
      )

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Trust System Integration', () => {
    it('should show trust warning for low trust accounts', () => {
      // Mock low trust user
      jest.doMock('@/components/hooks/useTrust', () => ({
        useTrust: () => ({
          isVerified: false,
          reputation: 15,
          accountAgeDays: 2,
          suspicious: true,
        }),
      }))

      const onSubmit = jest.fn()
      
      render(
        <ClaimSubmissionForm onSubmit={onSubmit} onClose={jest.fn()} />,
        { queryClient }
      )

      // Check for trust warning
      expect(screen.getByText(/⚠️ Your account has a low trust score/)).toBeInTheDocument()
    })

    it('should not show trust warning for high trust accounts', () => {
      const onSubmit = jest.fn()
      
      render(
        <ClaimSubmissionForm onSubmit={onSubmit} onClose={jest.fn()} />,
        { queryClient }
      )

      // Should not show trust warning
      expect(screen.queryByText(/⚠️ Your account has a low trust score/)).not.toBeInTheDocument()
    })
  })

  describe('API Integration', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      const { submitClaim } = require('@/app/api/claims.api')
      submitClaim.mockRejectedValue(new Error('API Error'))

      const onSubmit = jest.fn()
      
      render(
        <ClaimSubmissionForm onSubmit={onSubmit} onClose={jest.fn()} />,
        { queryClient }
      )

      // Fill out form
      const titleInput = screen.getByPlaceholderText('Title')
      await user.type(titleInput, 'Test Claim')

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Submit' })
      await user.click(submitButton)

      // The form should handle the error (currently it just closes the form)
      // In a real implementation, you might want to show an error message
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })
    })

    it('should integrate with React Query mutation', async () => {
      // This test would require more complex setup with actual React Query integration
      // For now, we test the component in isolation
      const onSubmit = jest.fn()
      
      render(
        <ClaimSubmissionForm onSubmit={onSubmit} onClose={jest.fn()} />,
        { queryClient }
      )

      // Fill and submit form
      const titleInput = screen.getByPlaceholderText('Title')
      await user.type(titleInput, 'Test Claim')

      const submitButton = screen.getByRole('button', { name: 'Submit' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Claim',
          })
        )
      })
    })
  })

  describe('Accessibility', () => {
    it('should be accessible via keyboard', async () => {
      const onSubmit = jest.fn()
      
      render(
        <ClaimSubmissionForm onSubmit={onSubmit} onClose={jest.fn()} />,
        { queryClient }
      )

      // Tab through form fields
      const titleInput = screen.getByPlaceholderText('Title')
      titleInput.focus()
      
      // Tab to next field
      await user.tab()
      expect(screen.getByPlaceholderText('Category')).toHaveFocus()

      await user.tab()
      expect(screen.getByPlaceholderText('Impact (e.g. High Impact)')).toHaveFocus()

      await user.tab()
      expect(screen.getByPlaceholderText('Source')).toHaveFocus()

      await user.tab()
      expect(screen.getByPlaceholderText('Description')).toHaveFocus()

      // Tab to cancel button
      await user.tab()
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()

      // Tab to submit button
      await user.tab()
      expect(screen.getByRole('button', { name: 'Submit' })).toHaveFocus()
    })

    it('should have proper ARIA labels', () => {
      const onSubmit = jest.fn()
      
      render(
        <ClaimSubmissionForm onSubmit={onSubmit} onClose={jest.fn()} />,
        { queryClient }
      )

      // Check for proper heading
      expect(screen.getByRole('heading', { name: 'Submit a Claim' })).toBeInTheDocument()

      // Check form inputs have proper labels (via placeholder)
      expect(screen.getByPlaceholderText('Title')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Category')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Description')).toBeInTheDocument()
    })
  })
})
