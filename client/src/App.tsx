import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import LearningUnit from "@/pages/learning-unit";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import type { User } from "@db/schema";
import ProfileSetup from "@/pages/profile-setup";

interface AuthState {
  user: User | null;
}

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  componentProps?: Record<string, any>;
}

function ProtectedRoute({ 
  component: Component,
  componentProps 
}: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
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
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!auth?.user) {
    setLocation("/auth");
    return null;
  }

  // Check if user profile is complete
  const isProfileComplete = auth.user.name && auth.user.grade && auth.user.learningStyle;
  if (!isProfileComplete && window.location.pathname !== "/profile-setup") {
    setLocation("/profile-setup");
    return null;
  }

  return (
    <ErrorBoundary>
      <Component {...componentProps} user={auth.user} />
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <Switch>
            {/* Auth page - unprotected */}
            <Route path="/auth" component={AuthPage} />

            {/* Profile setup - protected */}
            <Route 
              path="/profile-setup" 
              component={() => (
                <ProtectedRoute component={ProfileSetup} />
              )} 
            />

            {/* Home dashboard - requires auth */}
            <Route 
              path="/" 
              component={() => (
                <ProtectedRoute component={Home} />
              )} 
            />

            {/* Learning unit - protected */}
            <Route 
              path="/learning/:id"
              component={({ params }) => (
                <ProtectedRoute 
                  component={LearningUnit} 
                  componentProps={{ id: params.id }}
                />
              )}
            />

            {/* 404 fallback */}
            <Route component={NotFound} />
          </Switch>
        </div>
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;