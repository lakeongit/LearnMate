import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PlayCircle,
  Calendar,
  Clock,
  ChevronRight,
  BookOpen,
  Timer,
  BrainCircuit,
} from "lucide-react";
import type { User } from "@db/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface StudyPlaylistProps {
  user: User;
  onSelectUnit?: (unitId: number) => void;
}

export function StudyPlaylist({ user, onSelectUnit }: StudyPlaylistProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/study-playlist", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/study-playlist/${user.id}`);
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

  if (!data?.playlist || !data?.progress) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">Unable to load study playlist</h2>
        <p className="text-muted-foreground">Please try again later</p>
      </div>
    );
  }

  const { playlist, progress } = data;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Your Study Playlist</h2>
        <p className="text-muted-foreground">
          Personalized learning path based on your progress and learning style
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                <span>Recommended Study Time:</span>
              </div>
              <span className="font-medium">
                {playlist.schedule.dailyStudyTime} minutes
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" />
                <span>Focus Areas:</span>
              </div>
              <div className="flex gap-2">
                {playlist.schedule.focusAreas.map((area: string) => (
                  <span
                    key={area}
                    className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {playlist.playlist.map((item: any) => (
          <Card
            key={item.unit.id}
            className="group hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{item.unit.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSelectUnit?.(item.unit.id)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.reason}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{item.suggestedDuration} mins</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex -space-x-2">
                      {item.priority >= 1 && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                      {item.priority >= 3 && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                      {item.priority >= 5 && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="ml-2">Priority {item.priority}/5</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>
                      {progress[item.unit.subject]?.completed || 0}%
                    </span>
                  </div>
                  <Progress
                    value={progress[item.unit.subject]?.completed || 0}
                    className="h-2"
                  />
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={() => onSelectUnit?.(item.unit.id)}
                >
                  <PlayCircle className="h-4 w-4" />
                  Start Learning
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}