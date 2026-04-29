import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-6xl mx-auto p-6 rounded-2xl border border-destructive/50 bg-destructive/10 text-destructive-foreground">
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-destructive-foreground/80">The page encountered an error while rendering. Please refresh or try again.</p>
          {this.props.fallback}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
