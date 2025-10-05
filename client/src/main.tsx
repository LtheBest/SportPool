import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { 
  initializeProtocolHandling, 
  handleMixedContentErrors 
} from "./lib/protocol-fix";

// Initialiser la gestion des protocoles avant le rendu de l'app
try {
  initializeProtocolHandling();
  handleMixedContentErrors();
} catch (error) {
  console.warn("Protocol initialization failed:", error);
  // Continuer même si l'initialisation échoue
}

// Safety wrapper pour le rendu
function renderApp() {
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Root element not found");
    }
    
    const root = createRoot(rootElement);
    root.render(<App />);
    
    console.info("✅ App rendered successfully");
  } catch (error) {
    console.error("❌ App rendering failed:", error);
    
    // Fallback: afficher un message d'erreur basique
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="
          display: flex; 
          align-items: center; 
          justify-content: center; 
          height: 100vh; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          padding: 20px;
        ">
          <div>
            <h1 style="font-size: 2rem; margin-bottom: 1rem;">⚠️ Erreur de chargement</h1>
            <p style="font-size: 1.1rem; margin-bottom: 2rem; opacity: 0.9;">
              L'application n'a pas pu se charger correctement.
            </p>
            <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px; margin-bottom: 2rem;">
              <p style="font-size: 0.9rem; opacity: 0.8;">
                Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}
              </p>
            </div>
            <button 
              onclick="window.location.reload()" 
              style="
                background: rgba(255,255,255,0.2); 
                color: white; 
                border: 1px solid rgba(255,255,255,0.3); 
                padding: 12px 24px; 
                border-radius: 6px; 
                font-size: 1rem; 
                cursor: pointer;
                transition: background 0.2s;
              "
              onmouseover="this.style.background='rgba(255,255,255,0.3)'"
              onmouseout="this.style.background='rgba(255,255,255,0.2)'"
            >
              🔄 Recharger la page
            </button>
          </div>
        </div>
      `;
    }
  }
}

// Attendre que le DOM soit prêt avant de rendre
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
