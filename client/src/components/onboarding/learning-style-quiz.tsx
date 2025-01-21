import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const quizQuestions = [
  {
    id: 1,
    question: "When learning something new, I prefer to:",
    options: [
      { value: "visual", label: "See diagrams, charts, or demonstrations" },
      { value: "auditory", label: "Listen to explanations and discuss ideas" },
      { value: "kinesthetic", label: "Try it out hands-on and learn by doing" },
    ],
  },
  {
    id: 2,
    question: "When trying to remember information, I mostly:",
    options: [
      { value: "visual", label: "Picture what I'm trying to remember" },
      { value: "auditory", label: "Repeat it out loud or in my head" },
      { value: "kinesthetic", label: "Write it down or act it out" },
    ],
  },
  {
    id: 3,
    question: "When solving problems, I prefer to:",
    options: [
      { value: "visual", label: "Draw diagrams or visualize solutions" },
      { value: "auditory", label: "Talk through possible solutions" },
      { value: "kinesthetic", label: "Try different approaches physically" },
    ],
  },
  {
    id: 4,
    question: "I learn best when:",
    options: [
      { value: "visual", label: "I can see examples and visual aids" },
      { value: "auditory", label: "I can listen and discuss the topic" },
      { value: "kinesthetic", label: "I can practice and experiment" },
    ],
  },
  {
    id: 5,
    question: "When reading, I:",
    options: [
      { value: "visual", label: "Prefer texts with many diagrams and images" },
      { value: "auditory", label: "Read aloud or hear the words in my mind" },
      { value: "kinesthetic", label: "Use a finger to follow along as I read" },
    ],
  },
];

interface LearningStyleQuizProps {
  onComplete: (learningStyle: string) => void;
}

export function LearningStyleQuiz({ onComplete }: LearningStyleQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const { toast } = useToast();

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [quizQuestions[currentQuestion].id]: value,
    }));
  };

  const handleNext = () => {
    if (!answers[quizQuestions[currentQuestion].id]) {
      toast({
        title: "Please select an answer",
        description: "Choose an option before proceeding to the next question.",
        variant: "destructive",
      });
      return;
    }

    if (currentQuestion === quizQuestions.length - 1) {
      // Calculate dominant learning style
      const styles = Object.values(answers).reduce(
        (acc, curr) => {
          acc[curr] = (acc[curr] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const dominantStyle = Object.entries(styles).reduce((a, b) =>
        a[1] > b[1] ? a : b
      )[0];

      onComplete(dominantStyle);
    } else {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const question = quizQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h3 className="font-medium text-lg">
                Question {currentQuestion + 1} of {quizQuestions.length}
              </h3>
              <p className="text-muted-foreground">{question.question}</p>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => onComplete('visual')}
              className="text-muted-foreground"
            >
              Skip Quiz
            </Button>
          </div>

          <RadioGroup
            value={answers[question.id] || ""}
            onValueChange={handleAnswer}
            className="space-y-4"
          >
            {question.options.map((option) => (
              <div key={option.value} className="flex items-center space-x-3">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>

          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentQuestion === 0}
              className="w-full"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!answers[question.id]}
              className="w-full"
            >
              {currentQuestion === quizQuestions.length - 1 ? (
                "Complete"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}