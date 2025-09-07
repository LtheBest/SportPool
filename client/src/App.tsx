import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Invitation from "@/pages/invitation";
import ResetPassword from "@/pages/reset-password";
import EventPublic from "@/pages/event-public";
import NotFound from "@/pages/not-found";
import Cookies from "@/components/cookies/Cookies";
import Chatbot from "./components/chatbot/Chatbot";
import Footer from "./components/footer/Footer";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={isAuthenticated ? Dashboard : Home} />
      <Route path="/dashboard" component={isAuthenticated ? Dashboard : Home} />
      <Route path="/admin" component={isAuthenticated ? Admin : Home} />
      <Route path="/invitation/:token" component={Invitation} />
      <Route path="/events/:id" component={EventPublic} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <Chatbot />
        <Footer />
        <Cookies />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
