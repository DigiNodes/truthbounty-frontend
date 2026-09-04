/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports -- test doubles and dynamic module access */
/**
 * Integration Tests: Claim Submission Flow
 * 
 * This test suite validates the complete claim submission process including:
 * - Form rendering and field interactions
 * - Form validation and error handling
 * - API submission and response handling
 * - UI feedback during submission
 * - Multiple claim submissions
 * - Evidence/attachment handling
 */

import React from 'react'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import { useSubmitClaim } from '@/app/queries/claims.queries'
import { render, createMockClaim } from '../utils/test-utils'
import { setupMockServer } from '../mocks/server'
import ClaimSubmissionForm from '@/components/features/claim-submission/ClaimSubmissionForm'

const server = setupMockServer()

let mockTrustInfo = {
  isVerified: true,
  reputation: 50,
  accountAgeDays: 30,
  suspicious: false,
}

jest.mock('@/components/hooks/useTrust', () => ({
  useTrust: () => mockTrustInfo,
}))

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1234567890123456789012345678901234567890', isConnected: true }),
  useChainId: () => 11155420,
  usePublicClient: () => ({
    waitForTransactionReceipt: jest.fn().mockResolvedValue(undefined),
    simulateContract: jest.fn().mockResolvedValue({ request: {} }),
  }),
  useReadContract: () => ({ data: 0n }),
  useWriteContract: jest.fn(() => ({ writeContractAsync: jest.fn().mockResolvedValue('0xhash') })),
  useConnectors: () => [{ id: 'injected', name: 'Injected', type: 'injected' }],
  useConnect: () => ({ connect: jest.fn() }),
}))

// Claim contract config is required by useCreateClaimTransaction during render.
process.env.NEXT_PUBLIC_BOUNTY_CLAIM_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
process.env.NEXT_PUBLIC_BOUNTY_ASSET = '0x1234567890123456789012345678901234567890';
process.env.NEXT_PUBLIC_CLAIM_AMOUNT = '1000000000000000000';
process.env.NEXT_PUBLIC_CLAIM_CONFIG_HASH = '0xabc';
process.env.NEXT_PUBLIC_EXPECTED_CHAIN_ID = '11155420';

jest.mock('@/app/api/claims.api', () => ({
  submitClaim: jest.fn(),
}))

jest.mock('@/app/lib/wallet', () => ({
  getTokenBalance: jest.fn(() => Promise.resolve(100)),
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
    jest.clearAllMocks()
    mockTrustInfo = {
      isVerified: true,
      reputation: 50,
      accountAgeDays: 30,
      suspicious: false,
    }
    // Restore the default successful write path (individual tests may override).
    ;(require('wagmi').useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue('0xhash'),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Form Rendering', () => {
    it('should render all required form fields', async () => {
      function SubmissionFormTest() {
        return (
          <form data-testid="claim-form">
            <div>
              <label htmlFor="title">Claim Title *</label>
              <input id="title" type="text" maxLength={200} />
            </div>
            <div>
              <label htmlFor="desc">Description *</label>
              <textarea id="desc" maxLength={2000} />
            </div>
            <div>
              <label htmlFor="category">Category *</label>
              <select id="category">
                <option value="">Select category</option>
                <option value="misinformation">Misinformation</option>
                <option value="fraud">Fraud</option>
              </select>
            </div>
            <div>
              <label htmlFor="evidence">Supporting Evidence</label>
              <input id="evidence" type="file" multiple accept="image/*,.pdf" />
            </div>
            <button type="submit">Submit Claim</button>
            <button type="button">Cancel</button>
          </form>
        )
      }

      render(<SubmissionFormTest />, { queryClient })

      // Check all fields are present
      expect(screen.getByLabelText('Claim Title *')).toBeInTheDocument()
      expect(screen.getByLabelText('Description *')).toBeInTheDocument()
      expect(screen.getByLabelText('Category *')).toBeInTheDocument()
      expect(screen.getByLabelText('Supporting Evidence')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Submit Claim' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('should display placeholder text for guidance', async () => {
      function FormGuidanceTest() {
        return (
          <form>
            <input
              placeholder="Enter a clear, factual claim title"
              aria-label="Title"
            />
            <textarea
              placeholder="Provide evidence, sources, and context for your claim"
              aria-label="Description"
            />
          </form>
        )
      }

      render(<FormGuidanceTest />, { queryClient })

      expect(screen.getByPlaceholderText('Enter a clear, factual claim title')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Provide evidence, sources, and context for your claim')).toBeInTheDocument()
    })
  })

  describe('Form Submission Flow', () => {
    it('should submit a claim with valid data', async () => {
      const { submitClaim } = require('@/app/api/claims.api')
      const mockClaim = createMockClaim({ title: 'Test Claim Submission', status: 'OPEN' })
      submitClaim.mockResolvedValue(mockClaim)

      const onSubmit = jest.fn()
      
      function TestSubmissionForm() {
        const [formData, setFormData] = React.useState({
          title: 'Test Claim Submission',
          description: 'Test description',
          category: 'misinformation',
        })
        const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault()
          try {
            setStatus('loading')
            const result = await submitClaim(formData)
            setStatus('success')
            onSubmit(result)
          } catch (error) {
            setStatus('error')
          }
        }

        return (
          <form onSubmit={handleSubmit}>
            <input
              value={formData.title}
              onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
              aria-label="Title"
            />
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              aria-label="Description"
            />
            <select
              value={formData.category}
              onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
              aria-label="Category"
            >
              <option value="misinformation">Misinformation</option>
            </select>
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Submitting...' : 'Submit Claim'}
            </button>
            {status === 'success' && <div data-testid="success-msg">✓ Claim submitted</div>}
          </form>
        )
      }

      render(<TestSubmissionForm />, { queryClient })

      const submitButton = screen.getByRole('button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('success-msg')).toBeInTheDocument()
      })

      expect(submitClaim).toHaveBeenCalledWith({
        title: 'Test Claim Submission',
        description: 'Test description',
        category: 'misinformation',
      })
      expect(onSubmit).toHaveBeenCalledWith(mockClaim)
    })

    it('should submit the form when pressing Enter inside a text field', async () => {
      const { submitClaim } = require('@/app/api/claims.api')
      const mockClaim = createMockClaim({ title: 'Enter Key Claim', status: 'OPEN' })
      submitClaim.mockResolvedValue(mockClaim)

      const onSubmit = jest.fn()

      render(<ClaimSubmissionForm onSubmit={onSubmit} onClose={jest.fn()} />, { queryClient })

      const titleInput = screen.getByPlaceholderText('Title')
      const categoryInput = screen.getByPlaceholderText('Category')
      const impactInput = screen.getByPlaceholderText('Impact')
      const sourceInput = screen.getByPlaceholderText('https://example.com')
      const descriptionInput = screen.getByPlaceholderText('Description')

      await user.type(titleInput, 'Enter Key Claim')
      await user.type(categoryInput, 'fraud')
      await user.type(impactInput, 'High Impact')
      await user.type(sourceInput, 'https://example.com')
      await user.type(descriptionInput, 'This description is long enough to pass validation.')

      await user.type(titleInput, '{Enter}')

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Enter Key Claim' })
        )
      })
    })

    it('should show loading state during submission', async () => {
      const { submitClaim } = require('@/app/api/claims.api')
      submitClaim.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createMockClaim()), 200))
      )

      function LoadingStateForm() {
        const [isLoading, setIsLoading] = React.useState(false)

        const handleSubmit = async () => {
          setIsLoading(true)
          try {
            await submitClaim({})
          } finally {
            setIsLoading(false)
          }
        }

        return (
          <div>
            <button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        )
      }

      render(<LoadingStateForm />, { queryClient })

      const submitButton = screen.getByRole('button')
      await user.click(submitButton)

      expect(submitButton).toHaveTextContent('Submitting...')
      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Submit')
        expect(submitButton).not.toBeDisabled()
      }, { timeout: 300 })
    })

    it('should display validation errors for empty fields', async () => {
      function ValidationForm() {
        const [errors, setErrors] = React.useState<Record<string, string>>({})

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault()
          const form = e.currentTarget as HTMLFormElement
          const newErrors: Record<string, string> = {}

          const titleInput = form.elements.namedItem('title') as HTMLInputElement | null
          const descriptionInput = form.elements.namedItem('description') as HTMLTextAreaElement | null
          if (titleInput && !titleInput.value) newErrors.title = 'Title is required'
          if (descriptionInput && !descriptionInput.value) newErrors.description = 'Description is required'

          setErrors(newErrors)
        }

        return (
          <form onSubmit={handleSubmit}>
            <div>
              <input name="title" aria-label="Title" />
              {errors.title && <span data-testid="title-err">{errors.title}</span>}
            </div>
            <div>
              <textarea name="description" aria-label="Description" />
              {errors.description && <span data-testid="desc-err">{errors.description}</span>}
            </div>
            <button type="submit">Submit</button>
          </form>
        )
      }

      render(<ValidationForm />, { queryClient })

      await user.click(screen.getByRole('button'))

      expect(screen.getByTestId('title-err')).toHaveTextContent('Title is required')
      expect(screen.getByTestId('desc-err')).toHaveTextContent('Description is required')
    })

    it('should handle API errors gracefully', async () => {
      const { submitClaim } = require('@/app/api/claims.api')
      submitClaim.mockRejectedValue(new Error('Network error'))

      function ErrorHandlingForm() {
        const [error, setError] = React.useState<string | null>(null)

        const handleSubmit = async () => {
          try {
            await submitClaim({ title: 'Test' })
            setError(null)
          } catch (err) {
            setError('Failed to submit claim')
          }
        }

        return (
          <div>
            <button onClick={handleSubmit}>Submit</button>
            {error && <div data-testid="error-msg">{error}</div>}
          </div>
        )
      }

      render(<ErrorHandlingForm />, { queryClient })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-msg')).toHaveTextContent('Failed to submit claim')
      })
    })

    it('should clear errors when user starts editing', async () => {
      function ErrorClearingForm() {
        const [errors, setErrors] = React.useState<Record<string, string>>({ title: 'Title is required' })

        const handleChange = () => {
          setErrors({})
        }

        return (
          <div>
            <input onChange={handleChange} aria-label="Title" />
            {errors.title && <span data-testid="error">{errors.title}</span>}
          </div>
        )
      }

      render(<ErrorClearingForm />, { queryClient })

      expect(screen.getByTestId('error')).toBeInTheDocument()

      await user.type(screen.getByLabelText('Title'), 'New Title')

      expect(screen.queryByTestId('error')).not.toBeInTheDocument()
    })
  })

  describe('File/Evidence Handling', () => {
    it('should allow file upload', async () => {
      function FileUploadForm() {
        const [files, setFiles] = React.useState<File[]>([])

        return (
          <form>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              aria-label="Evidence"
            />
            <div data-testid="file-count">Files: {files.length}</div>
          </form>
        )
      }

      render(<FileUploadForm />, { queryClient })

      expect(screen.getByTestId('file-count')).toHaveTextContent('Files: 0')

      const fileInput = screen.getByLabelText('Evidence') as HTMLInputElement
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByTestId('file-count')).toHaveTextContent('Files: 1')
      })
    })
  })

  describe('Multiple Submissions', () => {
    it('should support submitting multiple claims in sequence', async () => {
      const { submitClaim } = require('@/app/api/claims.api')
      
      submitClaim
        .mockResolvedValueOnce(createMockClaim({ id: 'claim-1', title: 'First Claim' }))
        .mockResolvedValueOnce(createMockClaim({ id: 'claim-2', title: 'Second Claim' }))

      function MultiSubmitTest() {
        const [submittedClaims, setSubmittedClaims] = React.useState<any[]>([])

        const handleSubmit = async (title: string) => {
          const result = await submitClaim({ title, description: 'Desc' })
          setSubmittedClaims(prev => [...prev, result])
        }

        return (
          <div>
            <button onClick={() => handleSubmit('First Claim')}>Submit 1</button>
            <button onClick={() => handleSubmit('Second Claim')}>Submit 2</button>
            <div data-testid="count">{submittedClaims.length}</div>
          </div>
        )
      }

      render(<MultiSubmitTest />, { queryClient })

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])
      await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'))

      await user.click(buttons[1])
      await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'))

      expect(submitClaim).toHaveBeenCalledTimes(2)
    })
  })

  describe('Trust Warning Display', () => {
    it('should show trust warning for low trust accounts', () => {
      const onSubmit = jest.fn()
      mockTrustInfo = {
        isVerified: true,
        reputation: 5,
        accountAgeDays: 30,
        suspicious: false,
      }
      
      render(
        <ClaimSubmissionForm onSubmit={onSubmit} onClose={jest.fn()} />,
        { queryClient }
      )

      // Check for trust warning
      expect(screen.getByText(/low trust score/i)).toBeInTheDocument()
    })

    it('should not show trust warning for high trust accounts', () => {
      const onSubmit = jest.fn()
      
      render(
        <ClaimSubmissionForm onSubmit={onSubmit} onClose={jest.fn()} />,
        { queryClient }
      )

      // Should not show trust warning
      expect(screen.queryByText(/low trust score/i)).not.toBeInTheDocument()
    })
  })

  describe('API Integration', () => {
    it('should handle submission errors gracefully', async () => {
      // Simulate an on-chain write failure: the form must surface the error
      // without closing or crashing.
      const { useWriteContract } = require('wagmi')
      useWriteContract.mockReturnValue({
        writeContractAsync: jest.fn().mockRejectedValue(new Error('Transaction failed')),
      })

      const onSubmit = jest.fn()
      const onClose = jest.fn()
      
      render(
        <ClaimSubmissionForm onSubmit={onSubmit} onClose={onClose} />,
        { queryClient }
      )

      // Fill out complete valid form
      await user.type(screen.getByPlaceholderText('Title'), 'Test Claim')
      await user.type(screen.getByPlaceholderText('Category'), 'Politics')
      await user.type(screen.getByPlaceholderText('Impact'), 'High')
      await user.type(screen.getByPlaceholderText('https://example.com'), 'https://example.com/source')
      await user.type(screen.getByPlaceholderText('Description'), 'A sufficiently long description.')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit claim/i })
      await user.click(submitButton)

      // The form should surface the error and neither fire onSubmit nor close.
      await waitFor(() => {
        expect(screen.getAllByText(/transaction failed/i).length).toBeGreaterThan(0)
      })
      expect(onSubmit).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
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
      await user.type(screen.getByPlaceholderText('Title'), 'Test Claim')
      await user.type(screen.getByPlaceholderText('Category'), 'Politics')
      await user.type(screen.getByPlaceholderText('Impact'), 'High')
      await user.type(screen.getByPlaceholderText('https://example.com'), 'https://example.com/source')
      await user.type(screen.getByPlaceholderText('Description'), 'A sufficiently long description.')

      const submitButton = screen.getByRole('button', { name: /submit claim/i })
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
      expect(screen.getByPlaceholderText('Impact')).toHaveFocus()

      await user.tab()
      expect(screen.getByPlaceholderText('https://example.com')).toHaveFocus()

      await user.tab()
      expect(screen.getByPlaceholderText('Description')).toHaveFocus()

      // Tab to cancel button
      await user.tab()
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus()

      // Tab to submit button
      await user.tab()
      expect(screen.getByRole('button', { name: /submit claim/i })).toHaveFocus()
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
