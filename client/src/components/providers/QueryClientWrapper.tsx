import React, { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface QueryClientWrapperProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

// Composant pour gérer les erreurs de QueryClient
class QueryErrorBoundary extends React.Component<
  { children: ReactNode; onError: (error: Error, errorInfo: string) => void },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorDetails = errorInfo.componentStack || 'No component stack available';
    this.setState({ errorInfo: errorDetails });
    this.props.onError(error, errorDetails);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
          <div className="max-w-md w-full mx-4">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Erreur de l'application
              </h2>
              
              <p className="text-gray-600 mb-4">
                Une erreur s'est produite lors du chargement des données. 
                Cela peut être temporaire.
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-left">
                <p className="text-sm text-red-700 font-medium">
                  {this.state.error?.message || 'Erreur inconnue'}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">
                      Détails techniques
                    </summary>
                    <pre className="text-xs text-red-600 mt-1 overflow-auto max-h-20">
                      {this.state.errorInfo}
                    </pre>
                  </details>
                )}
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                >
                  🔄 Recharger la page
                </button>
                
                <button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors text-sm"
                >
                  🗑️ Réinitialiser et recharger
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function QueryClientWrapper({ children }: QueryClientWrapperProps) {
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    // Initialiser le QueryClient avec gestion d'erreur
    try {
      // Vérifier que le queryClient est fonctionnel
      if (!queryClient) {
        throw new Error('QueryClient not initialized');
      }
      
      // Test basique du queryClient
      queryClient.getQueryCache();
      
      setIsInitialized(true);
      console.info("✅ QueryClient initialized successfully");
    } catch (error) {
      console.error("❌ QueryClient initialization failed:", error);
      setError(error as Error);
    }
  }, []);

  const handleError = (error: Error, errorInfo: string) => {
    console.error("📊 QueryClient Error:", { error, errorInfo });
    
    // Vous pourriez envoyer cette erreur à un service de monitoring ici
    if (process.env.NODE_ENV === 'production') {
      // Exemple: sendToMonitoringService({ error, errorInfo });
    }
  };

  // Si le QueryClient n'est pas encore initialisé
  if (!isInitialized && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initialisation de l'application...</p>
        </div>
      </div>
    );
  }

  // Si une erreur s'est produite lors de l'initialisation
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Erreur d'initialisation
            </h2>
            
            <p className="text-gray-600 mb-4">
              L'application n'a pas pu s'initialiser correctement. 
              Cela peut être dû à un problème de connexion.
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-sm text-red-700">
                {error.message}
              </p>
            </div>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
            >
              🔄 Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tout est OK, rendre l'application avec le QueryClient
  return (
    <QueryErrorBoundary onError={handleError}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </QueryErrorBoundary>
  );
}