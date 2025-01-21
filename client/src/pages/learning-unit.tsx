import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BookOpen, Timer, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentProfile } from "@/hooks/use-student-profile";

interface LearningUnitProps {
  params: {
    id: string;
  };
}

export default function LearningUnit({ params }: LearningUnitProps) {
  const [location, setLocation] = useLocation();
  const { student, isLoading: isLoadingStudent } = useStudentProfile();
  
  useEffect(() => {
    if (!isLoadingStudent && !student) {
      setLocation("/onboarding");
    }
  }, [student, isLoadingStudent, setLocation]);

  const { data: unitData, isLoading } = useQuery({
    queryKey: [`/api/learning-content/${student?.id}/unit/${params.id}`],
    queryFn: async () => {
      const res = await fetch(`/api/learning-content/${student?.id}/unit/${params.id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!student,
  });

  if (isLoading || isLoadingStudent) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!unitData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Learning unit not found or you don't have access to it.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { unit, modules, progress } = unitData;
  const content = modules[0] ? JSON.parse(modules[0].content) : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="outline"
        className="mb-6"
        onClick={() => setLocation("/")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{unit.title}</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Timer className="h-4 w-4 mr-1" />
              <span>{unit.estimatedDuration} mins</span>
            </div>
            <div className="flex items-center">
              <BookOpen className="h-4 w-4 mr-1" />
              <span>Grade {unit.grade}</span>
            </div>
            <div className="flex items-center">
              <Award className="h-4 w-4 mr-1" />
              <span>Level {unit.difficulty}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{unit.description}</p>
          
          {content && (
            <div className="space-y-8">
              {/* Opening Section */}
              <section>
                <h3 className="text-lg font-semibold mb-4">Learning Objectives</h3>
                <div className="space-y-4">
                  {content.opening.text}
                  {content.opening.activities.map((activity: string, index: number) => (
                    <div key={index} className="pl-4 border-l-2 border-primary">
                      {activity}
                    </div>
                  ))}
                </div>
              </section>

              {/* Main Content */}
              <section>
                <h3 className="text-lg font-semibold mb-4">Main Content</h3>
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: content.mainContent.text }} />
                  
                  <h4 className="text-base font-medium mt-4">Examples:</h4>
                  <ul>
                    {content.mainContent.examples.map((example: string, index: number) => (
                      <li key={index}>{example}</li>
                    ))}
                  </ul>

                  <h4 className="text-base font-medium mt-4">Visual Aids:</h4>
                  <ul>
                    {content.mainContent.visuals.map((visual: string, index: number) => (
                      <li key={index}>{visual}</li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Interactive Elements */}
              <section>
                <h3 className="text-lg font-semibold mb-4">Interactive Activities</h3>
                <div className="space-y-4">
                  {content.interactiveElements.map((element: string, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        {element}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Assessment */}
              <section>
                <h3 className="text-lg font-semibold mb-4">Assessment</h3>
                <div className="space-y-4">
                  {content.assessment.questions.map((question: string, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <p className="font-medium mb-2">Question {index + 1}:</p>
                        <p>{question}</p>
                        <p className="mt-4 text-sm text-muted-foreground">
                          Answer: {content.assessment.answers[index]}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
