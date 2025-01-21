import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain,
  MessageCircle,
  Clock,
  Zap,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";

const tutorialSteps = [
  {
    title: "Welcome to Your AI Tutor",
    description: "Get personalized help with your studies anytime you need it.",
    icon: Brain,
    tips: [
      "Ask questions about any subject",
      "Get step-by-step explanations",
      "Practice with interactive exercises",
    ],
  },
  {
    title: "Natural Conversations",
    description: "Chat naturally with your AI tutor just like talking to a teacher.",
    icon: MessageCircle,
    tips: [
      "Ask follow-up questions",
      "Request simpler explanations",
      "Share your confusion points",
    ],
  },
  {
    title: "Study Session Timer",
    description: "Make the most of your study time with focused sessions.",
    icon: Clock,
    tips: [
      "10-minute focused sessions",
      "Take breaks when needed",
      "Track your study patterns",
    ],
  },
  {
    title: "Smart Learning",
    description: "Your tutor adapts to your learning style and pace.",
    icon: Zap,
    tips: [
      "Personalized explanations",
      "Difficulty adjusts to you",
      "Review suggestions based on progress",
    ],
  },
];

interface AiTutorExplainerProps {
  onDismiss: () => void;
}

export function AiTutorExplainer({ onDismiss }: AiTutorExplainerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = tutorialSteps[currentStep];

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(current => current + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(current => current - 1);
    }
  };

  const Icon = step.icon;

  return (
    <Card className="relative max-w-md mx-auto">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>{step.title}</CardTitle>
        <CardDescription>{step.description}</CardDescription>
      </CardHeader>

      <CardContent>
        <ul className="space-y-3 mb-6">
          {step.tips.map((tip, index) => (
            <li key={index} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-sm">{tip}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          {currentStep < tutorialSteps.length - 1 ? (
            <Button onClick={nextStep}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={onDismiss}>
              Get Started
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        <div className="flex justify-center mt-4">
          {tutorialSteps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 w-1.5 rounded-full mx-1 ${
                index === currentStep ? "bg-primary" : "bg-primary/20"
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
