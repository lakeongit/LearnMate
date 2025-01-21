import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Timer,
  BookOpen,
  PlayCircle,
  Filter,
  GraduationCap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Student, LearningUnit } from "@db/schema";
import { useState } from "react";

interface MicroLearningModulesProps {
  student: Student;
  onSelectUnit?: (unitId: number) => void;
}

const subjects = [
  "Mathematics",
  "Science",
  "English",
  "History",
  "Geography",
] as const;

const gradeRanges = [
  { label: "Elementary (K-5)", min: 0, max: 5 },
  { label: "Middle School (6-8)", min: 6, max: 8 },
  { label: "High School (9-12)", min: 9, max: 12 },
];

export function MicroLearningModules({ student, onSelectUnit }: MicroLearningModulesProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedGradeRange, setSelectedGradeRange] = useState<typeof gradeRanges[number] | null>(
    gradeRanges.find(range => student.grade >= range.min && student.grade <= range.max) || null
  );

  const { data: modules, isLoading } = useQuery<LearningUnit[]>({
    queryKey: [
      "/api/learning-modules",
      student.id,
      selectedSubject,
      selectedGradeRange?.min,
      selectedGradeRange?.max,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        studentId: student.id.toString(),
        ...(selectedSubject && { subject: selectedSubject }),
        ...(selectedGradeRange && {
          gradeMin: selectedGradeRange.min.toString(),
          gradeMax: selectedGradeRange.max.toString(),
        }),
      });

      const res = await fetch(`/api/learning-modules?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  if (isLoading) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Quick Study Modules</h2>
          <p className="text-muted-foreground">
            Choose a topic to start learning today
          </p>
        </div>

        <div className="flex gap-4">
          <Select
            value={selectedSubject || ""}
            onValueChange={(value) => setSelectedSubject(value || null)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedGradeRange?.label || ""}
            onValueChange={(value) => {
              setSelectedGradeRange(
                gradeRanges.find((range) => range.label === value) || null
              );
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select grade range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {gradeRanges.map((range) => (
                <SelectItem key={range.label} value={range.label}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {modules?.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No modules found</h3>
          <p className="text-muted-foreground">
            Try adjusting your filters or check back later for new content
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules?.map((module) => (
            <Card
              key={module.id}
              className="group hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{module.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onSelectUnit?.(module.id)}
                  >
                    <PlayCircle className="h-5 w-5" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {module.description}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <Timer className="h-4 w-4 mr-1" />
                      <span>{module.estimatedDuration} mins</span>
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      <span>Grade {module.grade}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => onSelectUnit?.(module.id)}
                  >
                    Start Learning
                    <PlayCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
