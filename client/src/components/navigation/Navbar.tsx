import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavbarProps {
  isAuthenticated?: boolean;
  organization?: any;
  onShowLogin?: () => void;
  onShowRegistration?: () => void;
  onLogout?: () => void;
}

export default function Navbar({ 
  isAuthenticated, 
  organization, 
  onShowLogin, 
  onShowRegistration, 
  onLogout 
}: NavbarProps) {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-2">
                <i className="fas fa-car text-primary text-2xl"></i>
                <span className="text-xl font-bold text-gray-900">CovoitSport</span>
              </div>
            </div>
            {!isAuthenticated && (
              <div className="hidden md:flex items-center space-x-6">
                <a href="#features" className="text-gray-600 hover:text-primary transition-colors">
                  Fonctionnalités
                </a>
                <a href="#how-it-works" className="text-gray-600 hover:text-primary transition-colors">
                  Comment ça marche
                </a>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated && organization ? (
              <>
                <div className="flex items-center space-x-2">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={organization.logoUrl} alt={organization.name} />
                    <AvatarFallback>
                      {organization.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-gray-900">{organization.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onLogout}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost"
                  onClick={onShowLogin}
                  className="text-gray-600 hover:text-primary"
                >
                  Se connecter
                </Button>
                <Button 
                  onClick={onShowRegistration}
                  className="bg-primary text-white hover:bg-blue-700"
                >
                  S'inscrire
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
