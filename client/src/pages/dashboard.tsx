import { useState } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/navigation/Navbar";
import DashboardSidebar from "@/components/navigation/DashboardSidebar";
import Overview from "@/components/dashboard/Overview";
import Events from "@/components/dashboard/Events";
import Messages from "@/components/dashboard/Messages";
import Profile from "@/components/dashboard/Profile";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [, setLocation] = useLocation();
  const { organization } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      setLocation("/");
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès.",
      });
    } catch (error) {
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
      </div>
    </div>
  );
}
