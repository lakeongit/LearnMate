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
  component: React.ComponentType;
  requireAdmin?: boolean;
}

function ProtectedRoute({ component: Component, requireAdmin }: ProtectedRouteProps) {
  const { student, isLoading } = useStudentProfile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!student) {
    window.location.href = "/auth";
    return null;
  }

  return (
    <ErrorBoundary>
      <Component />
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background">
          <Switch>
            {/* Default route is the dashboard */}
            <Route path="/" component={() => <ProtectedRoute component={Home} />} />

            {/* Learning unit route with params */}
            <Route 
              path="/learning/:id" 
              component={({ params }) => (
                <ProtectedRoute component={() => <LearningUnit id={params.id} />} />
              )}
            />

            {/* Auth page - unprotected */}
            <Route path="/auth" component={AuthPage} />

            {/* Admin dashboard - protected and requires admin */}
            <Route 
              path="/admin" 
              component={() => (
                <ProtectedRoute component={AdminDashboard} requireAdmin={true} />
              )}
            />

            {/* Catch all other routes with 404 */}
            <Route path="/:rest*" component={NotFound} />
          </Switch>
        </div>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;