import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import LearningUnit from "@/pages/learning-unit";
import ProfileSetup from "@/pages/profile-setup";
import ChatPage from "@/pages/chat";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { User } from "@db/schema";

interface AuthState {
  user: User | null;
}

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  componentProps?: Record<string, any>;
}

function ProtectedRoute({ component: Component, componentProps }: ProtectedRouteProps) {
  const [location, setLocation] = useLocation();
  const { data: auth, isLoading } = useQuery<AuthState>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error("Authentication required");
      }
      return res.json();
    },
    retry: false,
    staleTime: 0
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!auth?.user) {
    if (location !== "/auth") {
      setLocation("/auth");
    }
    return null;
  }

  const isProfileComplete = auth.user.name && 
                          auth.user.grade && 
                          auth.user.learningStyle && 
                          auth.user.subjects;

  if (!isProfileComplete && location !== "/profile-setup") {
    window.location.replace("/profile-setup");
    return null;
  }

  if (isProfileComplete && location === "/profile-setup") {
    window.location.replace("/");
    return null;
  }

  return (
    <ErrorBoundary>
      <Component {...componentProps} />
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <Switch>
            <Route path="/auth" component={AuthPage} />

            <Route 
              path="/profile-setup" 
              component={() => (
                <ProtectedRoute component={ProfileSetup} />
              )} 
            />

            <Route 
              path="/" 
              component={() => (
                <ProtectedRoute component={Home} />
              )} 
            />

            <Route 
              path="/chat"
              component={() => (
                <ProtectedRoute component={ChatPage} />
              )}
            />

            <Route 
              path="/learning/:id"
              component={({ params }) => (
                <ProtectedRoute 
                  component={LearningUnit} 
                  componentProps={{ params }}
                />
              )}
            />

            <Route component={NotFound} />
          </Switch>
        </div>
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;