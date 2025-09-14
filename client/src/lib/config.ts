// Configuration pour différents environnements
export const config = {
  // API Base URL - s'adapte automatiquement à l'environnement
  apiBaseUrl: (() => {
    // En développement local, utiliser le serveur local si disponible, sinon Render
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      // Check if we want to use local backend (useful for development)
      const useLocalBackend = localStorage.getItem('useLocalBackend') === 'true';
      return useLocalBackend ? 'http://localhost:8080' : 'https://teammove.onrender.com';
    }
    
    // En production ou preview, utiliser l'URL courante (même domaine)
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    
    // Fallback pour SSR ou environnements sans window
    return 'https://teammove.onrender.com';
  })(),

  // Configuration pour différents environnements
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // URLs spécifiques par environnement
  environments: {
    development: {
      apiUrl: 'http://localhost:8080',
      renderApiUrl: 'https://teammove.onrender.com',
      wsUrl: 'ws://localhost:8080'
    },
    production: {
      apiUrl: '', // Sera l'origine courante
      wsUrl: '' // Sera l'origine courante avec ws://
    }
  }
};

// Helper pour construire des URLs absolues
export function buildApiUrl(path: string): string {
  const baseUrl = config.apiBaseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  if (baseUrl) {
    return `${baseUrl}${cleanPath}`;
  }
  
  // Si pas de baseUrl (ex: même origine), retourner le path tel quel
  return cleanPath;
}

// Helper pour vérifier si on est sur Render
export function isRenderEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('onrender.com');
}

// Helper pour vérifier si on est sur Vercel  
export function isVercelEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('vercel.app');
}

// Configuration des headers par défaut
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Configuration de timeout pour les requêtes
export const requestTimeout = {
  development: 10000, // 10s en dev
  production: 30000   // 30s en prod
};