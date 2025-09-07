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
          <h4 className="font-semibold text-lg text-gray-900">🏆 Team Move </h4>
          <p className="text-sm text-gray-600 mt-2">Plateforme moderne de covoiturage pour événements sportifs.</p>
          <div className="flex justify-center md:justify-start mt-4 space-x-4">
            <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
              <i className="fab fa-facebook-f text-lg"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
              <i className="fab fa-twitter text-lg"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-blue-700 transition-colors">
              <i className="fab fa-linkedin-in text-lg"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-pink-600 transition-colors">
              <i className="fab fa-instagram text-lg"></i>
            </a>
          </div>
        </div>

        {/* Liens utiles - centrés sur mobile */}
        <div className="text-center md:text-left">
          <h5 className="font-medium text-gray-900 mb-3">Liens utiles</h5>
          <ul className="text-sm space-y-2 text-gray-600">
            <li><a href="/about" className="hover:text-blue-600 transition-colors">À propos</a></li>
            <li><a href="/terms" className="hover:text-blue-600 transition-colors">Conditions d'utilisation</a></li>
            <li><a href="/privacy" className="hover:text-blue-600 transition-colors">Politique de confidentialité</a></li>
            <li><a href="/help" className="hover:text-blue-600 transition-colors">Centre d'aide</a></li>
          </ul>
        </div>

        {/* Contact et newsletter - centrés sur mobile */}
        <div className="text-center md:text-left">
          <h5 className="font-medium text-gray-900 mb-3">Contact & Newsletter</h5>
          <p className="text-sm text-gray-600 mb-3">
            <i className="fas fa-envelope mr-2"></i>
            support@teammove.com
          </p>
          <p className="text-sm text-gray-600 mb-4">
            <i className="fas fa-phone mr-2"></i>
            +33 1 23 45 67 89
          </p>
          
          <div className="max-w-sm mx-auto md:mx-0">
            <label className="text-sm font-medium text-gray-700" htmlFor="newsletter-email">
              Restez informé de nos nouveautés
            </label>
            <form className="flex mt-2" onSubmit={handleSubmit}>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-l px-3 py-2 border border-gray-300 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="Votre email"
                aria-label="Email newsletter"
                required
              />
              <button
                type="submit"
                className="rounded-r bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white text-sm font-medium transition-colors"
                aria-label="Envoyer l'inscription newsletter"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-100 py-4 text-center text-xs text-gray-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-center md:justify-between">
          <p>© {new Date().getFullYear()} Team Move  — Tous droits réservés</p>
          <div className="mt-2 md:mt-0 flex items-center space-x-4">
            <span className="text-green-600">
              <i className="fas fa-leaf mr-1"></i>
              Plateforme éco-responsable
            </span>
            <span className="text-blue-600">
              <i className="fas fa-shield-alt mr-1"></i>
              Données sécurisées
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
