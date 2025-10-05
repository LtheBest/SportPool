import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { checkMixedContentIssues } from '@/lib/config';

export function MixedContentWarning() {
  const [show, setShow] = useState(false);
  const [httpsUrl, setHttpsUrl] = useState<string>('');

  useEffect(() => {
    const { hasIssue, httpsUrl: url } = checkMixedContentIssues();
    if (hasIssue && url) {
      setShow(true);
      setHttpsUrl(url);
    }
  }, []);

  if (!show) return null;

  const handleRedirect = () => {
    window.location.href = httpsUrl;
  };

  const handleDismiss = () => {
    setShow(false);
    // Se souvenir que l'utilisateur a fermé l'avertissement
    localStorage.setItem('mixedContentWarningDismissed', 'true');
  };

  // Ne pas afficher si déjà fermé dans cette session
  if (typeof window !== 'undefined' && localStorage.getItem('mixedContentWarningDismissed') === 'true') {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/50 p-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-medium">Connexion HTTP détectée.</span>{' '}
              Pour une meilleure compatibilité avec tous les navigateurs, nous recommandons d'utiliser HTTPS.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handleRedirect}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-800/30 hover:bg-amber-200 dark:hover:bg-amber-700/40 transition-colors"
          >
            Passer en HTTPS
            <ExternalLink className="ml-1.5 h-3 w-3" />
          </button>
          <button
            onClick={handleDismiss}
            className="inline-flex items-center p-1 border border-transparent rounded text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-700/40 transition-colors"
            aria-label="Fermer l'avertissement"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}