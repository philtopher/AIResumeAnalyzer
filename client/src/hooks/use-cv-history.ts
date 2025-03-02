import { useQuery } from "@tanstack/react-query";
import type { CV } from "@db/schema";

export function useCVHistory() {
  const { data: cvs, isLoading, error } = useQuery<CV[]>({
    queryKey: ["/api/cv/history"],
    staleTime: 1000 * 60, // 1 minute
    retry: false,
  });

  return {
    cvs,
    isLoading,
    error,
  };
}