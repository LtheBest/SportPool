// src/components/Footer.tsx
import React, { FormEvent, useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState<string>("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Ici tu peux gérer l'inscription à la newsletter avec l'email
    // Par exemple envoyer à une API ou afficher un message
    console.log("Email newsletter soumis :", email);
    setEmail("");
  }

  return (
    <footer className="bg-gray-50 border-t mt-8">
      <div className="max-w-7xl mx-auto py-8 px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Section principale - centrée sur mobile */}
        <div className="text-center md:text-left">
          <h4 className="font-semibold text-lg text-gray-900 mb-2">SportPool</h4>
          <p className="text-sm text-gray-600 mb-4">
            Plateforme de covoiturage pour événements sportifs. 
            Organisez facilement vos déplacements en groupe.
          </p>
          <div className="flex justify-center md:justify-start space-x-4">
            <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors" aria-label="Facebook">
              <i className="fab fa-facebook-f w-5 h-5"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors" aria-label="Twitter">
              <i className="fab fa-twitter w-5 h-5"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors" aria-label="Instagram">
              <i className="fab fa-instagram w-5 h-5"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors" aria-label="LinkedIn">
              <i className="fab fa-linkedin-in w-5 h-5"></i>
            </a>
          </div>
        </div>
        
        {/* Liens - centrés sur mobile */}
        <div className="text-center md:text-left">
          <h5 className="font-medium text-gray-900 mb-4">Liens utiles</h5>
          <ul className="text-sm space-y-2">
            <li>
              <a href="/about" className="text-gray-600 hover:text-blue-600 transition-colors">
                À propos de nous
              </a>
            </li>
            <li>
              <a href="/terms" className="text-gray-600 hover:text-blue-600 transition-colors">
                Conditions d'utilisation
              </a>
            </li>
            <li>
              <a href="/privacy" className="text-gray-600 hover:text-blue-600 transition-colors">
                Politique de confidentialité
              </a>
            </li>
            <li>
              <a href="/cookies" className="text-gray-600 hover:text-blue-600 transition-colors">
                Gestion des cookies
              </a>
            </li>
            <li>
              <a href="/contact" className="text-gray-600 hover:text-blue-600 transition-colors">
                Nous contacter
              </a>
            </li>
          </ul>
        </div>
        
        {/* Contact et newsletter - centrés sur mobile */}
        <div className="text-center md:text-left">
          <h5 className="font-medium text-gray-900 mb-4">Restez connecté</h5>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Email de support</p>
            <a href="mailto:support@sportpool.com" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              support@sportpool.com
            </a>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-900 block mb-2" htmlFor="newsletter-email">
              Newsletter SportPool
            </label>
            <form className="flex flex-col sm:flex-row gap-2 items-center justify-center md:justify-start" onSubmit={handleSubmit}>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Votre email"
                aria-label="Email pour la newsletter"
                required
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                aria-label="S'inscrire à la newsletter"
              >
                S'inscrire
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              Recevez nos actualités et conseils covoiturage
            </p>
          </div>
        </div>
      </div>
      
      {/* Barre de copyright */}
      <div className="bg-gray-100 py-4 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-600 space-y-2 md:space-y-0">
            <p className="text-center md:text-left">
              © {new Date().getFullYear()} SportPool by LtheBest — Tous droits réservés
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-gray-400">Fait avec ❤️ pour la communauté sportive</span>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">Powered by</span>
                <span className="font-semibold text-blue-600">LtheBest</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
