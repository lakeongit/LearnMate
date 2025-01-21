import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, BookOpen, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Student, Recommendation } from "@db/schema";

interface RecommendationsPanelProps {
  student: Student;
}

export function RecommendationsPanel({ student }: RecommendationsPanelProps) {
  const { data: recommendations, isLoading } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations", student.id],
    queryFn: async () => {
      const res = await fetch(`/api/recommendations/${student.id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const getDifficultyStars = (difficulty: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < difficulty ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
          }`}
        />
      ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-semibold">Personalized Recommendations</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {recommendations?.map((rec, index) => (
          <Card key={index}>
            <CardHeader className="space-y-1">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{rec.subject}</CardTitle>
                <div className="flex">{getDifficultyStars(rec.difficulty)}</div>
              </div>
              <p className="text-sm font-medium text-primary">{rec.topic}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{rec.content}</p>
              <div className="text-sm text-muted-foreground italic">
                Why: {rec.reason}
              </div>
              <Button className="w-full" variant="outline">
                <BookOpen className="mr-2 h-4 w-4" />
                Start Learning
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
