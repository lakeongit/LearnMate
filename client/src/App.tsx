import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import LearningUnit from "@/pages/learning-unit";
import AdminDashboard from "@/pages/admin/dashboard";
import { useStudentProfile } from "@/hooks/use-student-profile";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  requireAdmin?: boolean;
  componentProps?: Record<string, any>;
}

function ProtectedRoute({ component: Component, requireAdmin, componentProps }: ProtectedRouteProps) {
  const { student, isLoading } = useStudentProfile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    window.location.href = "/auth";
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
            {/* Auth page - unprotected */}
            <Route path="/auth" component={AuthPage} />

            {/* Default route is the dashboard */}
            <Route path="/" component={() => <ProtectedRoute component={Home} />} />

            {/* Learning unit route */}
            <Route 
              path="/learning/:id"
              component={({ params }) => (
                <ProtectedRoute 
                  component={LearningUnit} 
                  componentProps={{ id: params.id }}
                />
              )}
            />

            {/* Admin dashboard */}
            <Route 
              path="/admin"
              component={() => (
                <ProtectedRoute 
                  component={AdminDashboard}
                  requireAdmin={true}
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