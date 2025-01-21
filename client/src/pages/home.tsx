import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChatInterface } from "@/components/chat/chat-interface";
import { Header } from "@/components/layout/header";
import { RecommendationsPanel } from "@/components/learning/recommendations-panel";
import { LearningDashboard } from "@/components/learning/learning-dashboard";
import { AchievementsPanel } from "@/components/learning/achievements-panel";
import { StudyPlaylist } from "@/components/learning/study-playlist";
import { MicroLearningModules } from "@/components/learning/micro-learning-modules";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, MessageSquare, Sparkles, Trophy, ListMusic, GraduationCap } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { User } from "@db/schema";

interface AuthState {
  user: User | null;
}

export default function Home() {
  const { data: auth, isLoading } = useQuery<AuthState>({
    queryKey: ["/api/user"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!auth?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={auth.user} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-primary">
            Welcome back, {auth.user.name || auth.user.username}!
          </h2>
          <p className="text-muted-foreground">
            Ready to continue your learning journey?
          </p>
        </div>

        <Tabs defaultValue="learning" className="space-y-8">
          <TabsList>
            <TabsTrigger value="learning" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Learning
            </TabsTrigger>
            <TabsTrigger value="quick-study" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              Quick Study
            </TabsTrigger>
            <TabsTrigger value="playlist" className="gap-2">
              <ListMusic className="h-4 w-4" />
              Study Playlist
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Tutor
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Trophy className="h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="learning" className="mt-6">
            <LearningDashboard user={auth.user} />
          </TabsContent>

          <TabsContent value="quick-study" className="mt-6">
            <MicroLearningModules user={auth.user} />
          </TabsContent>

          <TabsContent value="playlist" className="mt-6">
            <StudyPlaylist user={auth.user} />
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <ChatInterface user={auth.user} />
          </TabsContent>

          <TabsContent value="achievements" className="mt-6">
            <AchievementsPanel user={auth.user} />
          </TabsContent>

          <TabsContent value="recommendations" className="mt-6">
            <RecommendationsPanel user={auth.user} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}