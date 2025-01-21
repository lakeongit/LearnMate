import { useQuery } from "@tanstack/react-query";
import type { Progress } from "@db/schema";

export function useStudentProgress(studentId: number) {
  const { data: progress, isLoading } = useQuery<Progress>({
    queryKey: ["/api/progress", studentId],
    queryFn: async () => {
      const res = await fetch(`/api/progress/${studentId}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  return { progress, isLoading };
}
