import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ERROR_BOUNDARY]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center">
          <p className="text-4xl">⚠️</p>
          <h1 className="text-xl font-bold text-slate-800">Algo deu errado</h1>
          <p className="max-w-md text-sm text-slate-500">
            Um erro inesperado ocorreu. Tente recarregar a página.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
