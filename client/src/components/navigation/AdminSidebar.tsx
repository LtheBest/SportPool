import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const menuItems = [
    {
      id: "overview",
      name: "Vue d'ensemble",
      icon: "fas fa-chart-pie",
      description: "Statistiques générales"
    },
    {
      id: "organizations",
      name: "Organisations",
      icon: "fas fa-building",
      description: "Gérer les organisations"
    },
    {
      id: "users",
      name: "Gestion Utilisateurs",
      icon: "fas fa-users",
      description: "Supprimer des comptes"
    },
    {
      id: "features",
      name: "Fonctionnalités",
      icon: "fas fa-toggle-on",
      description: "Activer/désactiver features"
    },
    {
      id: "support",
      name: "Support Client",
      icon: "fas fa-headset",
      description: "Messages des utilisateurs"
    }
  ];

  return (
    <div className="w-full lg:w-80">
      <Card>
        <CardContent className="p-0">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-shield-alt text-red-600 text-xl"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Administration</h2>
                <p className="text-gray-600 text-sm">Panneau de contrôle</p>
              </div>
            </div>
          </div>

          <nav className="p-2">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "default" : "ghost"}
                className={`w-full justify-start mb-1 h-auto p-4 ${
                  activeSection === item.id 
                    ? "bg-red-50 text-red-700 hover:bg-red-100" 
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => onSectionChange(item.id)}
              >
                <div className="flex items-center space-x-3 w-full">
                  <i className={`${item.icon} text-lg`}></i>
                  <div className="text-left">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs opacity-70">{item.description}</p>
                  </div>
                </div>
              </Button>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200 bg-red-50">
            <div className="text-center">
              <i className="fas fa-user-shield text-red-600 text-2xl mb-2"></i>
              <p className="text-sm font-medium text-red-700">Mode Administrateur</p>
              <p className="text-xs text-red-600">Accès complet au système</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}