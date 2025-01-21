import { useEffect } from "react";
import { useLocation } from "wouter";
import { useStudentProfile } from "@/hooks/use-student-profile";
import { ChatInterface } from "@/components/chat/chat-interface";

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
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary">Welcome back, {student.name}!</h1>
          <p className="text-muted-foreground mt-2">Ready to continue learning?</p>
        </header>
        <ChatInterface student={student} />
      </main>
    </div>
  );
}
