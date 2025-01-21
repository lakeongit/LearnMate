import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trophy,
  Star,
  Crown,
  Medal,
  TrendingUp,
  Calendar,
  Target
} from "lucide-react";
import type { User } from "@db/schema";

interface AchievementsPanelProps {
  user: User;
}

export function AchievementsPanel({ user }: AchievementsPanelProps) {
  const { data: achievements, isLoading: isLoadingAchievements } = useQuery({
    queryKey: ["/api/achievements", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/achievements/${user.id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["/api/motivation", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/motivation/${user.id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "legendary":
        return "text-yellow-500";
      case "epic":
        return "text-purple-500";
      case "rare":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "legendary":
        return <Crown className="h-5 w-5" />;
      case "epic":
        return <Star className="h-5 w-5" />;
      case "rare":
        return <Medal className="h-5 w-5" />;
      default:
        return <Trophy className="h-5 w-5" />;
    }
  };

  if (isLoadingAchievements || isLoadingMetrics) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-muted rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const getMotivationMetric = (name: string) => {
    return metrics?.find((m: any) => m.metric === name)?.value || 0;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Your Achievements</h2>
        <p className="text-muted-foreground">
          Track your progress and earn badges
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Daily Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {getMotivationMetric("login_streak")} days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Learning Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {getMotivationMetric("total_learning_time")} mins
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Mastery Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {getMotivationMetric("avg_mastery")}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Achievement Gallery</CardTitle>
          <CardDescription>
            Collect badges by reaching learning milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {achievements?.map((achievement: any) => (
                <div
                  key={achievement.id}
                  className="flex items-start gap-4 p-4 rounded-lg border"
                >
                  <div
                    className={`p-2 rounded-full ${
                      achievement.earned
                        ? getRarityColor(achievement.rarity)
                        : "text-gray-300"
                    }`}
                  >
                    {getRarityIcon(achievement.rarity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold truncate">
                        {achievement.name}
                      </h4>
                      <span
                        className={`text-sm ${getRarityColor(
                          achievement.rarity
                        )}`}
                      >
                        {achievement.rarity}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {achievement.description}
                    </p>
                    {!achievement.earned && (
                      <div className="mt-2 space-y-1">
                        <div className="text-sm text-muted-foreground">
                          Progress: {achievement.progress || 0}%
                        </div>
                        <Progress
                          value={achievement.progress || 0}
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}