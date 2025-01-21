import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Clock,
  Award,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Student, LearningUnit } from "@db/schema";

interface LearningDashboardProps {
  student: Student;
}

export function LearningDashboard({ student }: LearningDashboardProps) {
  const { data: units, isLoading } = useQuery<(LearningUnit & { progress: any[] })[]>({
    queryKey: ["/api/learning-content", student.id],
    queryFn: async () => {
      const res = await fetch(`/api/learning-content/${student.id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const calculateProgress = (unit: LearningUnit & { progress: any[] }) => {
    if (!unit.progress.length) return 0;
    const completed = unit.progress.filter((p) => p.completed).length;
    return Math.round((completed / unit.progress.length) * 100);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Your Learning Journey</h2>
        <p className="text-muted-foreground">
          Continue your progress in these subjects
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {units?.map((unit) => (
          <Card key={unit.id} className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{unit.title}</span>
                <Button variant="ghost" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {unit.description}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{unit.estimatedDuration} mins</span>
                  </div>
                  <div className="flex items-center">
                    <Award className="h-4 w-4 mr-1" />
                    <span>Level {unit.difficulty}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{calculateProgress(unit)}%</span>
                  </div>
                  <Progress value={calculateProgress(unit)} className="h-2" />
                </div>

                <Button className="w-full gap-2">
                  {unit.progress.length ? (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      Continue Learning
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4" />
                      Start Learning
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
