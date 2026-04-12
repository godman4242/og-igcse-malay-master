import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="text-4xl mb-4">😵</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-red)' }}>
            Something went wrong
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-dim)' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
