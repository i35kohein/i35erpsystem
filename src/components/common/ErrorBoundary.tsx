import React from 'react';
import { Button } from '../ui';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to server error endpoint (fire-and-forget)
    try {
      void fetch('/api/error-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'client',
          batch: [{
            type: 'error-boundary',
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            href: window.location.href,
          }],
        }),
      }).catch(() => {});
    } catch {
      // ignore
    }

    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReload = () => {
    // Force hard reload to get fresh chunks
    window.location.reload();
  };

  // audit F-P3: transient render errors (bad data row, momentary offline
  // fetch) shouldn't brick the whole ERP until a manual reload — offer an
  // in-place retry that clears the error state.
  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('dynamically imported module') ||
                           this.state.error?.message?.includes('ChunkLoadError');

      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-line shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-ink">Something went wrong</h2>
                <p className="mt-1 text-xs text-muted">
                  {isChunkError
                    ? 'The app has been updated. Please reload to get the latest version.'
                    : 'An unexpected error occurred. Please reload the page.'}
                </p>
              </div>
            </div>

            {this.state.error && (
              <details className="rounded-lg bg-surface border border-line p-3">
                <summary className="cursor-pointer text-xs font-bold text-muted">Error details</summary>
                <pre className="mt-2 text-[10px] text-danger overflow-auto max-h-32 font-mono">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={this.handleRetry}
                className="flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-extrabold text-ink shadow-xs transition-all hover:bg-line active:scale-95"
              >
                Try Again
              </Button>
              <Button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand bg-brand px-4 text-xs font-extrabold text-white shadow-xs transition-all hover:bg-brand-deep active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
