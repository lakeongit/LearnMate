import { useQuery } from "@tanstack/react-query";
import type { Student } from "@db/schema";

export function useStudentProfile() {
  const { data: student, isLoading } = useQuery<Student>({
    queryKey: ["/api/students/me"],
    queryFn: async () => {
      const res = await fetch("/api/students/me");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  return { student, isLoading };
}
