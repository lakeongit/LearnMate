import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import type { Student, Quiz, QuizQuestion, QuizAttempt } from "@db/schema";

interface QuizPanelProps {
  student: Student;
  subject: string;
  topic: string;
  onComplete?: () => void;
}

import { memo } from "react";

export const QuizPanel = memo(function QuizPanel({ 
  student, 
  subject, 
  topic, 
  onComplete 
}: QuizPanelProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: quiz, isLoading: isLoadingQuiz } = useQuery<{
    quiz: Quiz;
    questions: QuizQuestion[];
    attemptId: number;
  }>({
    queryKey: ["/api/quizzes", student.id, subject, topic],
    queryFn: async () => {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, subject, topic }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !attemptId,
  });

  const submitQuiz = useMutation({
    mutationFn: async () => {
      if (!attemptId) throw new Error("No active quiz attempt");
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: parseInt(questionId),
        answer,
        timeSpent: 0, // TODO: Implement timer
      }));

      const res = await fetch(`/api/quizzes/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersArray }),
        credentials: "include",
      });

      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setShowResults(true);
      toast({
        title: "Quiz Completed!",
        description: `You scored ${data.attempt.score}%`,
      });
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error) => {
      toast({
        title: "Error submitting quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoadingQuiz) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-8 bg-muted rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quiz) return null;

  const question = quiz.questions[currentQuestion];
  const progress = Math.round(
    ((currentQuestion + 1) / quiz.questions.length) * 100
  );

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      submitQuiz.mutate();
    }
  };

  if (showResults) {
    return (
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quiz Results</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Score</span>
                  <span className="font-semibold">{submitQuiz.data?.attempt.score}%</span>
                </div>
                <Progress value={submitQuiz.data?.attempt.score} className="h-2" />
                <div className="pt-4 space-y-2">
                  {submitQuiz.data?.attempt.answers.map((answer: any, index: number) => (
                    <div
                      key={answer.questionId}
                      className="flex items-start gap-2 text-sm"
                    >
                      {answer.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                      )}
                      <div>
                        <p>{quiz.questions[index].question}</p>
                        {!answer.isCorrect && (
                          <p className="text-muted-foreground mt-1">
                            Correct answer: {quiz.questions[index].correctAnswer}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
          <div className="flex items-center gap-2 text-sm font-normal">
            <Clock className="h-4 w-4" />
            <span>Difficulty {question.difficultyLevel}/5</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Progress value={progress} className="h-2" />

          <div className="space-y-4">
            <p className="text-lg font-medium">{question.question}</p>

            <RadioGroup
              value={answers[question.id]}
              onValueChange={handleAnswer}
              className="space-y-3"
            >
              {question.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button
            onClick={handleNext}
            disabled={!answers[question.id]}
            className="w-full"
          >
            {currentQuestion < quiz.questions.length - 1 ? (
              <>
                Next Question
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Submit Quiz
                <Award className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
