import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error in Component Tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/tasks';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
          <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl shadow-acto-lg p-6 text-center space-y-4 animate-pop-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#FEF2F2] flex items-center justify-center text-[#DC2626]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold font-heading text-[#1E1B26]">Something went wrong</h2>
              <p className="text-xs text-[#5B616E]">
                An unexpected error occurred while rendering this view.
              </p>
              {this.state.error?.message && (
                <div className="mt-2 p-2.5 bg-[#F1F5F9] rounded-lg text-left text-[11px] font-mono text-[#DC2626] overflow-x-auto max-h-24">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-3.5 py-2 text-xs font-semibold text-[#5B616E] hover:text-[#1E1B26] hover:bg-[#F1F5F9] rounded-lg transition-colors font-sans"
              >
                Go to Tasks
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#290660] hover:bg-[#1F044A] text-white text-xs font-semibold rounded-lg shadow-acto-purple active:scale-[0.98] transition-all font-heading"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
