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
        <div className="text-center md:text-left">
          <h4 className="font-semibold text-primary">Covoit Sports by LtheBest</h4>
          <p className="text-sm text-gray-600 mt-2">
            Plateforme moderne de covoiturage pour vos événements sportifs. 
            Organisez facilement le transport de vos équipes.
          </p>
          <div className="flex justify-center md:justify-start space-x-4 mt-4">
            <a href="#" className="text-gray-400 hover:text-primary transition-colors" aria-label="Facebook">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-primary transition-colors" aria-label="Twitter">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-primary transition-colors" aria-label="LinkedIn">
              <i className="fab fa-linkedin-in"></i>
            </a>
          </div>
        </div>
        
        <div className="text-center md:text-left">
          <h5 className="font-medium text-gray-900 mb-3">Liens utiles</h5>
          <ul className="text-sm space-y-2">
            <li>
              <a href="/about" className="text-gray-600 hover:text-primary transition-colors">
                À propos
              </a>
            </li>
            <li>
              <a href="/terms" className="text-gray-600 hover:text-primary transition-colors">
                Conditions d'utilisation
              </a>
            </li>
            <li>
              <a href="/privacy" className="text-gray-600 hover:text-primary transition-colors">
                Politique de confidentialité
              </a>
            </li>
            <li>
              <a href="/help" className="text-gray-600 hover:text-primary transition-colors">
                Centre d'aide
              </a>
            </li>
          </ul>
        </div>
        
        <div className="text-center md:text-left">
          <h5 className="font-medium text-gray-900 mb-3">Contact & Newsletter</h5>
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p className="flex items-center justify-center md:justify-start">
              <i className="fas fa-envelope mr-2"></i>
              support@covoitsports.com
            </p>
            <p className="flex items-center justify-center md:justify-start">
              <i className="fas fa-phone mr-2"></i>
              +33 1 23 45 67 89
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2" htmlFor="newsletter-email">
              Newsletter - Restez informé
            </label>
            <form className="flex flex-col sm:flex-row gap-2" onSubmit={handleSubmit}>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                placeholder="votre@email.com"
                aria-label="Email newsletter"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                aria-label="S'inscrire à la newsletter"
              >
                <i className="fas fa-paper-plane mr-2"></i>
                S'inscrire
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-100 py-4 text-center text-xs text-gray-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="text-center sm:text-left">
            © {new Date().getFullYear()} Covoit Sports by LtheBest — Tous droits réservés
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <span className="flex items-center">
              <i className="fas fa-heart text-red-500 mr-1"></i>
              Fait avec passion en France
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
