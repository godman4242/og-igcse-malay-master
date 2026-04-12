import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 animate-fadeUp">
          <p className="text-5xl mb-4">:(</p>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-dim)' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-white"
              style={{ background: 'var(--color-accent)' }}>
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
