'use client'

/**
 * ErrorBoundary — global React error boundary with privacy-safe telemetry.
 *
 * V2-FE-149 — TruthBounty Frontend
 *
 * Catches unhandled render errors and:
 *  1. Reports them via the telemetry library (if PRIVACY_SAFE_TELEMETRY is enabled).
 *  2. Shows an accessible, user-friendly fallback UI with a Retry button.
 *
 * Telemetry is sourced from TelemetryContext so this component only relies on
 * the singleton `getTelemetryClient()` fallback — it does NOT call React hooks
 * (class components cannot use hooks). The singleton is initialised by
 * TelemetryProvider at application boot.
 */

import React, { ErrorInfo, ReactNode } from 'react'
import { getTelemetryClient } from '@/lib/telemetry'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report to privacy-safe telemetry (no-op when flag is disabled)
    try {
      getTelemetryClient().captureError(error, {
        category: 'boundary_error',
        severity: 'fatal',
        context: {
          componentStack: errorInfo.componentStack
            ? String(errorInfo.componentStack).slice(0, 1024)
            : undefined,
        },
      })
    } catch {
      // Telemetry must never surface to the user
    }

    // Development-only verbose logging
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary] Caught unhandled error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen items-center justify-center bg-gray-50 px-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-3">
              Something went wrong
            </h2>

            <p className="text-gray-600 mb-4">
              An unexpected error occurred. Please try again.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-left text-xs text-gray-500 bg-gray-100 p-3 rounded mb-4 overflow-auto">
                {this.state.error.message}
              </pre>
            )}

            <button
              onClick={this.handleRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
              aria-label="Retry after error"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
