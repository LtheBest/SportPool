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
        <div>
          <h4 className="font-semibold">Covoit'Sports</h4>
          <p className="text-sm text-gray-600">Plateforme de pronostics et suivi des matchs.</p>
        </div>
        <div>
          <h5 className="font-medium">Liens</h5>
          <ul className="text-sm space-y-1">
            <li><a href="/about">À propos</a></li>
            <li><a href="/terms">CGU</a></li>
            <li><a href="/privacy">Politique de confidentialité</a></li>
          </ul>
        </div>
        <div>
          <h5 className="font-medium">Contact</h5>
          <p className="text-sm">support@covoitsport.com</p>
          <div className="mt-2">
            <label className="text-sm" htmlFor="newsletter-email">Inscription newsletter</label>
            <form className="flex mt-2" onSubmit={handleSubmit}>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-l px-3 py-2 border"
                placeholder="Email"
                aria-label="Email newsletter"
                required
              />
              <button
                type="submit"
                className="rounded-r bg-primary px-3 text-white"
                aria-label="Envoyer l'inscription newsletter"
              >
                OK
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="bg-gray-100 py-3 text-center text-xs text-gray-600">
        © {new Date().getFullYear()} Covoit'Sports — Tous droits réservés
      </div>
    </footer>
  );
}
