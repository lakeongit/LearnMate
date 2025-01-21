import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useStudentProgress } from "@/hooks/use-student-progress";
import type { Student } from "@db/schema";

interface HeaderProps {
  student: Student;
}

export function Header({ student }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { progress } = useStudentProgress(student.id);

  const handleSignOut = async () => {
    const response = await fetch("/api/students/logout", {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      setLocation("/onboarding");
    }
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">EduChat AI</h1>
        </div>

        <div className="flex-1 mx-8 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span>Learning Progress</span>
              <span>{progress?.mastery ?? 0}%</span>
            </div>
            <Progress value={progress?.mastery ?? 0} className="h-2" />
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </header>
  );
}
