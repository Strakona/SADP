import * as React from 'react';
import { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      let errorMessage = 'Ocorreu um erro inesperado.';
      try {
        const errorInfo = JSON.parse(error?.message || '{}');
        if (errorInfo.error) {
          errorMessage = `Erro no Firestore: ${errorInfo.error} (Operação: ${errorInfo.operationType})`;
        }
      } catch (e) {
        // Not a JSON error message
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Ops! Algo deu errado.</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
