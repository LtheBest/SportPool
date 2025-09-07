import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import NotificationCenter from "@/components/ui/notification-center";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-2">
                <i className="fas fa-car text-primary text-2xl"></i>
                <span className="text-xl font-bold text-gray-900">TEAM MOVE</span>
              </div>
            </div>
            
            {/* Desktop Navigation Links - Only when not authenticated */}
            {!isAuthenticated && (
              <div className="hidden md:flex items-center ml-8 space-x-6">
                <a href="#features" className="text-gray-600 hover:text-primary transition-colors font-medium">
                  Fonctionnalités
                </a>
                <a href="#how-it-works" className="text-gray-600 hover:text-primary transition-colors font-medium">
                  Comment ça marche
                </a>
                {/* <a href="#pricing" className="text-gray-600 hover:text-primary transition-colors font-medium">
                  Tarifs
                </a>
                <a href="#contact" className="text-gray-600 hover:text-primary transition-colors font-medium">
                  Contact
                </a> */}
              </div>
            )}
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && organization ? (
              <>
                <NotificationCenter />
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={organization.logoUrl} alt={organization.name} />
                    <AvatarFallback className="text-xs">
                      {organization.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-gray-900 max-w-32 truncate">{organization.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onLogout}
                  className="text-gray-400 hover:text-gray-600"
                  title="Se déconnecter"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline"
                  onClick={onShowLogin}
                  className="border-gray-300 text-gray-600 hover:text-primary hover:border-primary"
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

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-6 w-6 text-gray-600" />
                  <span className="sr-only">Ouvrir le menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96">
                <SheetHeader className="text-left">
                  <SheetTitle className="flex items-center space-x-2">
                    <i className="fas fa-car text-primary text-xl"></i>
                    <span className="text-lg font-bold text-gray-900">TEAM MOVE</span>
                  </SheetTitle>
                </SheetHeader>
                
                <div className="py-6">
                  {isAuthenticated && organization ? (
                    <div className="space-y-4">
                      {/* User Info */}
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={organization.logoUrl} alt={organization.name} />
                          <AvatarFallback>
                            {organization.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">{organization.name}</p>
                          <p className="text-sm text-gray-500">{organization.email}</p>
                        </div>
                      </div>
                      
                      {/* Navigation Links */}
                      <div className="space-y-2">
                        <a 
                          href="/dashboard" 
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={closeMobileMenu}
                        >
                          <i className="fas fa-tachometer-alt text-primary w-5"></i>
                          <span className="font-medium">Tableau de bord</span>
                        </a>
                        <a 
                          href="/dashboard#events" 
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={closeMobileMenu}
                        >
                          <i className="fas fa-calendar text-primary w-5"></i>
                          <span className="font-medium">Mes événements</span>
                        </a>
                        <a 
                          href="/dashboard#messages" 
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={closeMobileMenu}
                        >
                          <i className="fas fa-comments text-primary w-5"></i>
                          <span className="font-medium">Messages</span>
                        </a>
                        <a 
                          href="/dashboard#profile" 
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={closeMobileMenu}
                        >
                          <i className="fas fa-user text-primary w-5"></i>
                          <span className="font-medium">Profil</span>
                        </a>
                      </div>
                      
                      {/* Logout Button */}
                      <div className="pt-4 border-t border-gray-200">
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            onLogout?.();
                            closeMobileMenu();
                          }}
                          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <i className="fas fa-sign-out-alt mr-3"></i>
                          Se déconnecter
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Navigation Links for non-authenticated users */}
                      <div className="space-y-2">
                        <a 
                          href="#features" 
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={closeMobileMenu}
                        >
                          <i className="fas fa-star text-primary w-5"></i>
                          <span className="font-medium">Fonctionnalités</span>
                        </a>
                        <a 
                          href="#how-it-works" 
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={closeMobileMenu}
                        >
                          <i className="fas fa-question-circle text-primary w-5"></i>
                          <span className="font-medium">Comment ça marche</span>
                        </a>
                        {/* <a 
                          href="#pricing" 
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={closeMobileMenu}
                        >
                          <i className="fas fa-euro-sign text-primary w-5"></i>
                          <span className="font-medium">Tarifs</span>
                        </a>
                        <a 
                          href="#contact" 
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={closeMobileMenu}
                        >
                          <i className="fas fa-envelope text-primary w-5"></i>
                          <span className="font-medium">Contact</span>
                        </a> */}
                      </div>
                      
                      {/* Auth Buttons */}
                      <div className="pt-4 border-t border-gray-200 space-y-3">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            onShowLogin?.();
                            closeMobileMenu();
                          }}
                          className="w-full"
                        >
                          Se connecter
                        </Button>
                        <Button 
                          onClick={() => {
                            onShowRegistration?.();
                            closeMobileMenu();
                          }}
                          className="w-full bg-primary hover:bg-blue-700"
                        >
                          S'inscrire
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
