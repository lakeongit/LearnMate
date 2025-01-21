import { useLocation } from "wouter";
import { ProfileForm } from "@/components/onboarding/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";

export default function Onboarding() {
  const [, setLocation] = useLocation();

  const onComplete = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl text-center text-primary">
            Welcome to EduChat AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm onComplete={onComplete} queryClient={queryClient} />
        </CardContent>
      </Card>
    </div>
  );
}