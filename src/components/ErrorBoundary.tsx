import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorDetails = null;
      try {
        if (this.state.error?.message) {
          errorDetails = JSON.parse(this.state.error.message);
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-8">
              We encountered an unexpected error. Please try refreshing the page.
            </p>

            {errorDetails && (
              <div className="mb-8 p-4 bg-red-50 rounded-xl text-left border border-red-200">
                <p className="text-sm font-semibold text-red-800 mb-1">Error Details:</p>
                <p className="text-xs text-red-700 font-mono break-all">
                  Operation: {errorDetails.operationType}<br />
                  Path: {errorDetails.path}<br />
                  Message: {errorDetails.error}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              <RefreshCcw className="w-5 h-5" />
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
