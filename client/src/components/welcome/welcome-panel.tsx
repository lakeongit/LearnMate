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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, GraduationCap, UserCircle2 } from "lucide-react";

const subjects = [
  "Mathematics",
  "Science",
  "English",
  "History",
  "Geography",
] as const;

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  grade: z.number().min(1).max(12),
  learningStyle: z.enum(["visual", "auditory", "reading", "kinesthetic"]),
  subjects: z.array(z.string()).min(1, "Select at least one subject"),
});

type FormValues = z.infer<typeof formSchema>;

interface WelcomePanelProps {
  onComplete: () => void;
}

export function WelcomePanel({ onComplete }: WelcomePanelProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subjects: [],
    },
  });

  const createProfile = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await fetch("/api/students/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to EduChat AI!",
        description: "Your profile has been created successfully.",
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

  const onSubmit = (data: FormValues) => {
    createProfile.mutate(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Welcome to EduChat AI
        </CardTitle>
        <CardDescription>
          Let's personalize your learning experience in just a few steps
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What's your name?</FormLabel>
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
                      <FormLabel>What grade are you in?</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your grade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              Grade {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => setStep(2)}
                >
                  Continue
                  <GraduationCap className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="learningStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How do you learn best?</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your learning style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="visual">
                            Visual (images and diagrams)
                          </SelectItem>
                          <SelectItem value="auditory">
                            Auditory (listening and discussing)
                          </SelectItem>
                          <SelectItem value="reading">
                            Reading/Writing
                          </SelectItem>
                          <SelectItem value="kinesthetic">
                            Kinesthetic (hands-on practice)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subjects"
                  render={() => (
                    <FormItem>
                      <FormLabel>What subjects interest you?</FormLabel>
                      <div className="grid grid-cols-2 gap-4">
                        {subjects.map((subject) => (
                          <FormField
                            key={subject}
                            control={form.control}
                            name="subjects"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(subject)}
                                    onCheckedChange={(checked) => {
                                      const value = field.value || [];
                                      return checked
                                        ? field.onChange([...value, subject])
                                        : field.onChange(
                                            value.filter((v) => v !== subject)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {subject}
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

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createProfile.isPending}
                  >
                    Start Learning
                    <UserCircle2 className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
