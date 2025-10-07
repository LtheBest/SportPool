import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/navigation/Navbar";
import AdminSidebar from "@/components/navigation/AdminSidebar";
import AdminOverview from "@/components/admin/AdminOverview";
import OrganizationsManagement from "@/components/admin/OrganizationsManagement";
import AdminMessaging from "@/components/admin/AdminMessaging";
import FeatureManagement from "@/components/admin/FeatureManagement";
import UserManagement from "@/components/admin/UserManagement";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const [activeSection, setActiveSection] = useState("overview");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { organization, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();

  // Check if user is admin
  const { data: isAdmin, isLoading: isCheckingAdmin } = useQuery({
    queryKey: ["/api/me"],
    select: (data: any) => data?.role === 'admin',
    enabled: !!isAuthenticated,
  });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    } else if (!isCheckingAdmin && !isAdmin) {
      setLocation("/dashboard");
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les permissions d'administration.",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, isAdmin, isCheckingAdmin, setLocation, toast]);

  const handleLogout = async () => {
    try {
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
        return <AdminOverview />;
      case "organizations":
        return <OrganizationsManagement />;
      case "users":
        return <UserManagement />;
      case "features":
        return <FeatureManagement />;
      case "support":
        return <AdminMessaging />;
      default:
        return <AdminOverview />;
    }
  };

  // Show loading while checking admin status
  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        isAuthenticated
        organization={organization}
        onLogout={handleLogout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <AdminSidebar
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