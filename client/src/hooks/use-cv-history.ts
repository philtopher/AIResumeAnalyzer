import { useQuery } from "@tanstack/react-query";
import type { CV } from "@db/schema";
import { useTranslation } from "react-i18next";

export function useCVHistory() {
  const { i18n } = useTranslation();

  const { data: cvs, isLoading, error } = useQuery<CV[]>({
    queryKey: ["/api/cv/history", i18n.language], // Add language to query key to refetch when language changes
    staleTime: 1000 * 60, // 1 minute
    retry: false,
  });

  return {
    cvs,
    isLoading,
    error,
  };
}