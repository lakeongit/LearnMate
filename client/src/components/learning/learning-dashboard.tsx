import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Clock,
  Award,
  ChevronRight,
  PlayCircle,
  Target,
  Brain,
  BarChart,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Student, LearningUnit } from "@db/schema";
import { useStudentProfile } from "@/hooks/use-student-profile";

interface LearningDashboardProps {
  student?: Student;
}

export function LearningDashboard({ student: propStudent }: LearningDashboardProps = {}) {
  const { student: hookStudent } = useStudentProfile();
  const student = propStudent || hookStudent;

  const { data: insights, isLoading: isLoadingInsights } = useQuery({
    queryKey: ["/api/progress", student?.id],
    queryFn: async () => {
      const res = await fetch(`/api/progress/${student?.id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!student,
  });

  const { data: units = [], isLoading: isLoadingUnits } = useQuery<(LearningUnit & { progress: any[] })[]>({
    queryKey: [`/api/learning-content/${student?.id}`],
    queryFn: async () => {
      const res = await fetch(`/api/learning-content/${student?.id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!student,
  });

  if (isLoadingInsights || isLoadingUnits) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!units || units.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No learning units available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const calculateProgress = (unit: LearningUnit & { progress: any[] }) => {
    if (!unit.progress?.length) return 0;
    const completed = unit.progress.filter((p) => p.completed).length;
    return Math.round((completed / unit.progress.length) * 100);
  };

  const averageMastery = insights?.mastery || 0;
  const recentSessions = insights?.sessions || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Your Learning Journey</h2>
        <p className="text-muted-foreground">
          Track your progress and master new skills
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Mastery</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageMastery}%</div>
            <Progress value={averageMastery} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentSessions.reduce((sum, session) => sum + session.sessionDuration, 0)} mins
            </div>
            <p className="text-xs text-muted-foreground">Total learning time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Streak</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentSessions.length} days</div>
            <p className="text-xs text-muted-foreground">Keep it up!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brain Power</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(averageMastery * recentSessions.length / 100)} XP
            </div>
            <p className="text-xs text-muted-foreground">Learning points earned</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {units.map((unit) => (
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
                <p className="text-sm text-muted-foreground line-clamp-2">{unit.description}</p>
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
                  {unit.progress?.length ? (
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSessions.slice(0, 5).map((session, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium">{session.subject}</p>
                  <p className="text-sm text-muted-foreground">{session.topic}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{session.mastery}% mastery</p>
                  <p className="text-xs text-muted-foreground">{session.sessionDuration} mins</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}