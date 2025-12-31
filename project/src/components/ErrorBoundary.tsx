import React, { Component, ReactNode, ComponentType, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden max-w-md w-full">
            {/* Green gradient top border - Kibo UI style */}
            <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-600" />
            
            <div className="p-6">
              <div className="text-center space-y-4 mb-6">
                {/* Icon with green background - Kibo UI style */}
                <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-green-50 dark:bg-green-900/20">
                  <AlertTriangle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Something went wrong
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    An unexpected error occurred. Please try again or return to the homepage.
                  </p>
                </div>
              </div>

              {/* Error details in dev mode */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-amber-900 dark:text-amber-300 mb-1">
                        Error Details
                      </h4>
                      <code className="text-xs font-mono text-amber-800 dark:text-amber-400 break-all whitespace-pre-wrap block">
                        {this.state.error.message}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
                
                <Button
                  onClick={this.handleRetry}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
