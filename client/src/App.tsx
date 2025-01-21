import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Onboarding from "@/pages/onboarding";
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
    return <AuthPage />;
  }

  // Check for admin access if required
  if (requireAdmin && !student.role?.includes('admin')) {
    return <NotFound />;
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
            <Route path="/" component={() => <ProtectedRoute component={Home} />} />
            <Route 
              path="/learning/:id" 
              component={({ params }) => (
                <ProtectedRoute component={() => <LearningUnit params={params} />} />
              )}
            />
            <Route path="/onboarding" component={Onboarding} />
            <Route path="/auth" component={AuthPage} />
            <Route 
              path="/admin/dashboard" 
              component={() => (
                <ProtectedRoute component={AdminDashboard} requireAdmin={true} />
              )}
            />
            <Route component={NotFound} />
          </Switch>
        </div>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;