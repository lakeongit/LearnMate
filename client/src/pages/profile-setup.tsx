import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

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

export default function ProfileSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  const updateProfile = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your learning preferences have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    updateProfile.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl text-center text-primary">
            Welcome to EduChat AI
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                name="learningStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How do you learn best?</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your learning style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visual">Visual (images and diagrams)</SelectItem>
                          <SelectItem value="auditory">Auditory (listening and discussing)</SelectItem>
                          <SelectItem value="kinesthetic">Kinesthetic (hands-on practice)</SelectItem>
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
                    <FormLabel>What subjects interest you?</FormLabel>
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
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? "Saving..." : "Start Learning"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
