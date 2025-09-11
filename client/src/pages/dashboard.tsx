import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/navigation/Navbar";
import DashboardSidebar from "@/components/navigation/DashboardSidebar";
import Overview from "@/components/dashboard/Overview";
import Events from "@/components/dashboard/Events";
import Messages from "@/components/dashboard/Messages";
import Profile from "@/components/dashboard/Profile";
import AdminMessaging from "@/components/admin/AdminMessaging";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCommonShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { organization, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();

  // Enable keyboard shortcuts
  useCommonShortcuts();

  // 🔹 Redirection automatique si non connecté
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleLogout = async () => {
    try {
      // Use AuthService.logout() which properly handles token cleanup
      await logout();

      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la déconnexion.",
        variant: "destructive",
      });
    }
  };


  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <Overview />;
      case "events":
        return <Events />;
      case "messages":
        return <Messages />;
      case "support":
        return <AdminMessaging />;
      case "profile":
        return <Profile />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        isAuthenticated
        organization={organization}
        onLogout={handleLogout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <DashboardSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
        
        {/* Keyboard shortcuts hint */}
        <div className="fixed bottom-4 right-4 z-40">
          <button 
            className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
            onClick={() => {
              const event = new KeyboardEvent('keydown', {
                key: '?',
                shiftKey: true
              });
              document.dispatchEvent(event);
            }}
            title="Afficher les raccourcis clavier (Shift + ?)"
          >
            <i className="fas fa-keyboard text-lg"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
