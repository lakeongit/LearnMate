import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
  const [answers, setAnswers] = useState<string[]>([]);

  const handleAnswer = (value: string) => {
    const newAnswers = [...answers, value];
    if (currentQuestion < quizQuestions.length - 1) {
      setAnswers(newAnswers);
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate dominant learning style
      const styles = newAnswers.reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const dominantStyle = Object.entries(styles).reduce((a, b) => 
        (a[1] > b[1] ? a : b)
      )[0];

      onComplete(dominantStyle);
    }
  };

  const question = quizQuestions[currentQuestion];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-medium text-lg">
              Question {currentQuestion + 1} of {quizQuestions.length}
            </h3>
            <p className="text-muted-foreground">
              {question.question}
            </p>
          </div>

          <RadioGroup
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
              style={{
                width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
