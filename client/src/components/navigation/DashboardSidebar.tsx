import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function DashboardSidebar({ activeSection, onSectionChange }: DashboardSidebarProps) {
  const sections = [
    { id: "overview", icon: "fas fa-chart-line", label: "Vue d'ensemble" },
    { id: "events", icon: "fas fa-calendar-alt", label: "Mes événements" },
    { id: "messages", icon: "fas fa-comments", label: "Messages", badge: 3 },
    { id: "support", icon: "fas fa-headset", label: "Support" },
    { id: "profile", icon: "fas fa-user", label: "Mon profil" },
  ];

  return (
    <div className="lg:w-64 flex-shrink-0">
      <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
        <nav className="space-y-2">
          {sections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start text-left",
                activeSection === section.id 
                  ? "bg-primary text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
              onClick={() => onSectionChange(section.id)}
            >
              <i className={`${section.icon} mr-2`}></i>
              {section.label}
              {section.badge && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {section.badge}
                </span>
              )}
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
}
