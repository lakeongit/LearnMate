import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { LearningStyleQuiz } from "./learning-style-quiz";

const subjects = [
  { id: "math", label: "Mathematics" },
  { id: "science", label: "Science" },
  { id: "english", label: "English" },
  { id: "history", label: "History" },
  { id: "geography", label: "Geography" },
] as const;

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  grade: z.number().min(1).max(12),
  learningStyle: z.enum(["visual", "auditory", "kinesthetic"]),
  subjects: z.array(z.string()).min(1, "Please select at least one subject"),
});

interface ProfileFormProps {
  onComplete: () => void;
}

export function ProfileForm({ onComplete }: ProfileFormProps) {
  const { toast } = useToast();
  const [showQuiz, setShowQuiz] = useState(true);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      grade: 1,
      learningStyle: "visual",
      subjects: [],
    },
    mode: "onChange"
  });

  const createProfile = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log("Submitting profile data:", data);
      
      const response = await fetch("/api/students/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Profile creation failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(errorText);
      }

      const result = await response.json();
      console.log("Profile creation successful:", result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Profile created!",
        description: "Let's start learning together.",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Error creating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createProfile.mutate(data);
  };

  const handleQuizComplete = (learningStyle: "visual" | "auditory" | "kinesthetic") => {
    try {
      form.setValue("learningStyle", learningStyle);
      setShowQuiz(false);
      toast({
        title: "Learning Style Determined!",
        description: `You seem to be a ${learningStyle} learner. Let's customize your profile further.`,
      });
    } catch (error) {
      console.error("Error setting learning style:", error);
      toast({
        title: "Error",
        description: "There was an error saving your learning style. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (showQuiz) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-2xl font-semibold text-primary">
            Let's Find Your Learning Style
          </h2>
          <p className="text-muted-foreground">
            Answer these questions to help us personalize your learning experience.
          </p>
        </div>
        <LearningStyleQuiz onComplete={handleQuizComplete} />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grade Level</FormLabel>
              <FormControl>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        Grade {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subjects"
          render={() => (
            <FormItem>
              <FormLabel>Subjects</FormLabel>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {subjects.map((subject) => (
                  <FormField
                    key={subject.id}
                    control={form.control}
                    name="subjects"
                    render={({ field }) => (
                      <FormItem
                        key={subject.id}
                        className="flex items-center space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(subject.id)}
                            onCheckedChange={(checked) => {
                              const updatedSubjects = checked
                                ? [...field.value, subject.id]
                                : field.value?.filter((value) => value !== subject.id);
                              field.onChange(updatedSubjects);
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          {subject.label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={createProfile.isPending}
        >
          Create Profile
        </Button>
      </form>
    </Form>
  );
}