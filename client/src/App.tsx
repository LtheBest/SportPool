import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { StatsProvider } from "@/contexts/StatsContext";
import { MessagingProvider } from "@/contexts/MessagingContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Invitation from "@/pages/invitation";
import ResetPassword from "@/pages/reset-password";
import EventPublic from "@/pages/event-public";
import NotFound from "@/pages/not-found";
import ReplyMessage from "@/pages/reply-message";
import SubscriptionPlansPage from "@/pages/subscription-plans";
import PaymentSuccess from "@/pages/payment-success";
import PaymentCancel from "@/pages/payment-cancel";
import Cookies from "@/components/cookies/Cookies";
import Chatbot from "./components/chatbot/Chatbot";
import Footer from "./components/footer/Footer";
import { MixedContentWarning } from "@/components/warnings/MixedContentWarning";

function Router() {
  const { isAuthenticated, isLoading, organization } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={isAuthenticated ? 
        (organization?.role === 'admin' ? Admin : Dashboard) 
        : Home} />
      <Route path="/dashboard" component={isAuthenticated ? Dashboard : Home} />
      <Route path="/admin" component={isAuthenticated ? Admin : Home} />
      <Route path="/subscription" component={isAuthenticated ? SubscriptionPlansPage : Home} />
      <Route path="/subscription/plans" component={isAuthenticated ? SubscriptionPlansPage : Home} />
      <Route path="/subscription/:mode" component={isAuthenticated ? SubscriptionPlansPage : Home} />
      <Route path="/invitation/:token" component={Invitation} />
      <Route path="/events/:id" component={EventPublic} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/reply-message" component={ReplyMessage} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/cancel" component={PaymentCancel} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <NotificationProvider>
            <StatsProvider>
              <MessagingProvider>
                <MixedContentWarning />
                <Toaster />
                <Router />
                <Chatbot />
                <Footer />
                <Cookies />
              </MessagingProvider>
            </StatsProvider>
          </NotificationProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
