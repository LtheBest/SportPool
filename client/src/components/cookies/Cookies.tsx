// src/components/cookies/Cookies.tsx
import React, { useEffect, useState } from "react";

interface ConsentPreferences {
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
  performance: boolean;
}

interface ConsentPayload {
  timestamp: string;
  preferences: ConsentPreferences;
}

const CONSENT_KEY = "Covoit'Sport Consent";

export default function Cookies(): JSX.Element | null {
  const [consent, setConsent] = useState<ConsentPayload | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [functional, setFunctional] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [performance, setPerformance] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored) setConsent(JSON.parse(stored));
    } catch (e) {
      console.error("Erreur lecture consentement cookies", e);
    }
  }, []);

  function saveConsent(prefs: ConsentPreferences) {
    const payload: ConsentPayload = {
      timestamp: new Date().toISOString(),
      preferences: prefs,
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
    
    // Apply cookie preferences
    applyCookiePreferences(prefs);
    
    setConsent(payload);
    setShowPrefs(false);
  }

  function applyCookiePreferences(prefs: ConsentPreferences) {
    // Analytics cookies (Google Analytics, etc.)
    if (prefs.analytics) {
      // Enable Google Analytics or other analytics tools
      console.log('🔍 Analytics cookies enabled');
      // Here you would initialize Google Analytics or other tracking
    } else {
      console.log('🚫 Analytics cookies disabled');
      // Disable analytics tracking
    }

    // Functional cookies (always enabled for basic functionality)
    if (prefs.functional) {
      console.log('⚙️ Functional cookies enabled');
    }

    // Marketing cookies
    if (prefs.marketing) {
      console.log('📢 Marketing cookies enabled');
      // Enable marketing/advertising cookies
    } else {
      console.log('🚫 Marketing cookies disabled');
    }

    // Performance cookies
    if (prefs.performance) {
      console.log('🚀 Performance cookies enabled');
      // Enable performance monitoring
    } else {
      console.log('🚫 Performance cookies disabled');
    }
  }

  if (consent) return null;

  return (
    <div
      className="fixed inset-x-2 bottom-6 flex justify-center z-50 transition-all duration-500"
      role="dialog"
      aria-live="polite"
      aria-label="Bannière de cookies"
    >
      <div className="relative md:max-w-xl w-full bg-gradient-to-br from-white/95 to-sky-50 shadow-xl border border-sky-100 rounded-2xl p-6 flex flex-col md:flex-row gap-5 items-center">
        {/* Icône cookie */}
        <div
          className="flex items-center justify-center w-14 h-14 rounded-full bg-sky-100 shadow-inner shrink-0 animate-pulse"
          aria-hidden="true"
        >
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10" fill="#408CFF" />
            <circle cx="9" cy="14" r="1.2" fill="#fff" />
            <circle cx="15" cy="16" r="0.8" fill="#fff" />
            <circle cx="13" cy="10" r="1" fill="#fff" />
            <circle cx="17" cy="9" r="0.7" fill="#fff" />
          </svg>
        </div>
        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 mb-1">🍪 Nous valorisons votre vie privée</p>
          <p className="text-gray-700 text-sm leading-tight">
            Ce site utilise des cookies pour améliorer l’expérience, personnaliser le contenu, et mesurer l’audience.
            <a href="/privacy" className="underline ml-1 text-primary hover:text-blue-700" tabIndex={0}>
              En savoir plus
            </a>
          </p>
        </div>
        {/* Actions */}
        <div className="flex flex-col gap-2 md:ml-4 md:gap-0">
          <button
            onClick={() => saveConsent({ analytics: false, functional: true, marketing: false, performance: false })}
            className="px-4 py-2 rounded-lg border border-sky-200 bg-white text-sky-900 font-medium shadow hover:bg-sky-50 focus:outline focus:ring-2 focus:ring-blue-300 transition"
            aria-label="Refuser les cookies analytiques"
          >
            Refuser
          </button>
          <button
            onClick={() => saveConsent({ analytics: true, functional: true, marketing: true, performance: true })}
            className="px-4 py-2 rounded-lg bg-gradient-to-tr from-sky-500 to-cyan-400 text-white font-semibold shadow hover:from-cyan-600 transition"
            autoFocus
            aria-label="Accepter tous les cookies"
          >
            Accepter
          </button>
          <button
            onClick={() => setShowPrefs(true)}
            className="text-xs mt-1 underline text-gray-500 hover:text-blue-700 px-2 py-1 self-end"
            aria-label="Gérer les préférences des cookies"
          >
            Préférences
          </button>
        </div>

        {/* Préférences avancées */}
        {showPrefs && (
          <div
            className="absolute top-0 left-0 w-full h-full bg-white/80 rounded-2xl flex flex-col justify-center items-center p-4 z-50 shadow-2xl animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Préférences cookies"
          >
            <p className="font-semibold text-gray-800 mb-3">Préférences cookies</p>
            <form className="flex flex-col gap-4 max-w-xs w-full">
              {/* Switch Analytics */}
              <div className="flex items-center justify-between">
                <span>Cookies analytiques</span>
                <label
                  htmlFor="analytics-toggle"
                  className="inline-flex relative items-center cursor-pointer"
                >
                  <input
                    type="checkbox"
                    id="analytics-toggle"
                    className="sr-only peer"
                    checked={analytics}
                    onChange={() => setAnalytics((a) => !a)}
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-sky-500 peer-focus:ring-4 peer-focus:ring-sky-300 transition"></div>
                  <div
                    className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"
                  ></div>
                </label>
              </div>
              {/* Switch Functional */}
              <div className="flex items-center justify-between">
                <span>Cookies fonctionnels (requis)</span>
                <label
                  htmlFor="functional-toggle"
                  className="inline-flex relative items-center cursor-not-allowed opacity-75"
                >
                  <input
                    type="checkbox"
                    id="functional-toggle"
                    className="sr-only peer"
                    checked={true}
                    disabled
                  />
                  <div className="w-11 h-6 bg-sky-500 rounded-full peer peer-focus:ring-4 peer-focus:ring-sky-300 transition"></div>
                  <div
                    className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full translate-x-5 transition-transform"
                  ></div>
                </label>
              </div>

              {/* Switch Marketing */}
              <div className="flex items-center justify-between">
                <span>Cookies marketing</span>
                <label
                  htmlFor="marketing-toggle"
                  className="inline-flex relative items-center cursor-pointer"
                >
                  <input
                    type="checkbox"
                    id="marketing-toggle"
                    className="sr-only peer"
                    checked={marketing}
                    onChange={() => setMarketing((m) => !m)}
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-sky-500 peer-focus:ring-4 peer-focus:ring-sky-300 transition"></div>
                  <div
                    className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"
                  ></div>
                </label>
              </div>

              {/* Switch Performance */}
              <div className="flex items-center justify-between">
                <span>Cookies performance</span>
                <label
                  htmlFor="performance-toggle"
                  className="inline-flex relative items-center cursor-pointer"
                >
                  <input
                    type="checkbox"
                    id="performance-toggle"
                    className="sr-only peer"
                    checked={performance}
                    onChange={() => setPerformance((p) => !p)}
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-sky-500 peer-focus:ring-4 peer-focus:ring-sky-300 transition"></div>
                  <div
                    className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"
                  ></div>
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    saveConsent({ analytics, functional: true, marketing, performance });
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-sky-500 text-white shadow font-semibold hover:bg-sky-600 transition"
                >
                  Sauvegarder
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrefs(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-100 transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
