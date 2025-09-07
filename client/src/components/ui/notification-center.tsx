import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  // Mock notifications - in a real app, this would come from an API
  const mockNotifications: Notification[] = [
    {
      id: "1",
      type: "success",
      title: "Nouveau participant",
      message: "Marie Dubois s'est inscrite à votre événement 'Match de Tennis'",
      read: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      actionUrl: "/dashboard?section=events"
    },
    {
      id: "2",
      type: "info",
      title: "Rappel événement",
      message: "N'oubliez pas d'envoyer les rappels pour l'événement de demain",
      read: false,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      actionUrl: "/dashboard?section=events"
    },
    {
      id: "3",
      type: "warning",
      title: "Places disponibles",
      message: "Il ne reste plus que 2 places pour votre événement 'Course à pied'",
      read: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      actionUrl: "/dashboard?section=events"
    }
  ];

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return "fas fa-check-circle text-green-500";
      case "warning":
        return "fas fa-exclamation-triangle text-yellow-500";
      case "error":
        return "fas fa-exclamation-circle text-red-500";
      default:
        return "fas fa-info-circle text-blue-500";
    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return "Il y a moins d'une heure";
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Il y a ${diffInDays}j`;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className="fas fa-bell text-lg"></i>
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-500"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 max-w-sm z-50">
          <Card className="shadow-lg">
            <CardContent className="p-0">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <i className="fas fa-times"></i>
                  </Button>
                </div>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {unreadCount} nouvelle{unreadCount !== 1 ? 's' : ''} notification{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {mockNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <i className="fas fa-bell-slash text-gray-400 text-3xl mb-3"></i>
                    <p className="text-gray-600">Aucune notification</p>
                  </div>
                ) : (
                  mockNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? "bg-blue-50" : ""
                      }`}
                      onClick={() => {
                        if (notification.actionUrl) {
                          window.location.href = notification.actionUrl;
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          <i className={getNotificationIcon(notification.type)}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {mockNotifications.length > 0 && (
                <div className="p-3 bg-gray-50 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    Voir toutes les notifications
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overlay to close notifications when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}