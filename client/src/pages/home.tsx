import { useState } from "react";
import Navbar from "@/components/navigation/Navbar";
import LoginModal from "@/components/modals/LoginModal";
import RegistrationModal from "@/components/modals/RegistrationModal";
import DemoModal from "@/components/modals/DemoModal";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        onShowLogin={() => setShowLogin(true)}
        onShowRegistration={() => setShowRegistration(true)}
      />
      
      {/* Hero Section */}
      <section className="relative py-20 hero-gradient">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Organisez vos covoiturages sportifs en toute simplicité
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            La plateforme dédiée aux clubs, associations et entreprises sportives pour organiser efficacement leurs déplacements en covoiturage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={() => setShowRegistration(true)}
              className="bg-white text-primary px-8 py-3 hover:bg-gray-100"
              size="lg"
            >
              Commencer gratuitement
            </Button>
            <Button 
              onClick={() => setShowDemo(true)}
              variant="outline"
              className="border-2 border-white text-white px-8 py-3 hover:bg-white hover:text-primary"
              size="lg"
            >
              <i className="fas fa-play mr-2"></i>
              Voir la démo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin pour vos covoiturages
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Une solution complète pour gérer vos événements sportifs et organiser les déplacements de vos membres.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-calendar-alt text-primary text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Gestion d'événements</h3>
              <p className="text-gray-600">Créez et gérez facilement vos événements ponctuels ou récurrents avec tous les détails nécessaires.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-users text-secondary text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Invitations automatiques</h3>
              <p className="text-gray-600">Invitez vos membres par email avec des liens personnalisés et une inscription simplifiée.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-car-side text-accent text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Optimisation des trajets</h3>
              <p className="text-gray-600">Système intelligent de correspondance entre conducteurs et passagers selon les places disponibles.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Comment ça marche ?</h2>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
              <h3 className="font-semibold text-gray-900 mb-2">Créez votre compte</h3>
              <p className="text-gray-600">Inscrivez votre club, association ou entreprise en quelques clics.</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
              <h3 className="font-semibold text-gray-900 mb-2">Planifiez vos événements</h3>
              <p className="text-gray-600">Créez vos événements sportifs avec lieu de rendez-vous et destination.</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
              <h3 className="font-semibold text-gray-900 mb-2">Invitez vos membres</h3>
              <p className="text-gray-600">Envoyez des invitations par email avec inscription automatique.</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">4</div>
              <h3 className="font-semibold text-gray-900 mb-2">Organisez le covoiturage</h3>
              <p className="text-gray-600">Les membres choisissent leur rôle et les conducteurs indiquent leurs places disponibles.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
      <LoginModal 
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onShowRegistration={() => {
          setShowLogin(false);
          setShowRegistration(true);
        }}
      />
      
      <RegistrationModal 
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        onShowLogin={() => {
          setShowRegistration(false);
          setShowLogin(true);
        }}
      />
      
      <DemoModal 
        isOpen={showDemo}
        onClose={() => setShowDemo(false)}
      />
    </div>
  );
}
