import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import LearningUnit from "@/pages/learning-unit";
import AdminDashboard from "@/pages/admin/dashboard";
import Onboarding from "@/pages/onboarding";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import type { User, Student } from "@db/schema";

interface AuthState {
  user: User | null;
  student: Student | null;
}

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  requireAdmin?: boolean;
  requireProfile?: boolean;
  componentProps?: Record<string, any>;
}

function ProtectedRoute({ 
  component: Component, 
  requireAdmin = false, 
  requireProfile = true,
  componentProps 
}: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { data: auth, isLoading } = useQuery<AuthState>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", {
        credentials: "include"
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

  // Handle authentication check
  if (!auth?.user) {
    setLocation("/auth");
    return null;
  }

  // Check for admin role if required
  if (requireAdmin && auth.user.role !== 'admin') {
    setLocation("/");
    return null;
  }

  // Handle profile requirement
  if (requireProfile && !auth.student) {
    setLocation("/onboarding");
    return null;
  }

  return (
    <ErrorBoundary>
      <Component {...componentProps} user={auth.user} student={auth.student} />
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

            {/* Onboarding - protected but doesn't require profile */}
            <Route 
              path="/onboarding" 
              component={() => (
                <ProtectedRoute 
                  component={Onboarding}
                  requireProfile={false}
                />
              )} 
            />

            {/* Home dashboard - requires complete profile */}
            <Route 
              path="/" 
              component={() => (
                <ProtectedRoute 
                  component={Home}
                  requireProfile={true}
                />
              )} 
            />

            {/* Learning unit - requires complete profile */}
            <Route 
              path="/learning/:id"
              component={({ params }) => (
                <ProtectedRoute 
                  component={LearningUnit} 
                  componentProps={{ id: params.id }}
                  requireProfile={true}
                />
              )}
            />

            {/* Admin dashboard - protected with admin role check */}
            <Route 
              path="/admin"
              component={() => (
                <ProtectedRoute 
                  component={AdminDashboard}
                  requireAdmin={true}
                  requireProfile={false}
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