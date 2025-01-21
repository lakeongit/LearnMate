import { useEffect } from "react";
import { useLocation } from "wouter";
import { useStudentProfile } from "@/hooks/use-student-profile";
import { ChatInterface } from "@/components/chat/chat-interface";
import { Header } from "@/components/layout/header";

export default function Home() {
  const [, setLocation] = useLocation();
  const { student, isLoading } = useStudentProfile();

  useEffect(() => {
    if (!isLoading && !student) {
      setLocation("/onboarding");
    }
  }, [student, isLoading, setLocation]);

  if (isLoading || !student) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header student={student} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-primary">
            Welcome back, {student.name}!
          </h2>
          <p className="text-muted-foreground">
            Ready for another 10-minute learning session?
          </p>
        </div>
        <ChatInterface student={student} />
      </main>
    </div>
  );
}