import { useQuery } from "@tanstack/react-query";
import type { Subscription } from "@db/schema";

export function useSubscription() {
  const { data: subscription, isLoading, error } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
    staleTime: 1000 * 60, // 1 minute
  });

  return {
    subscription,
    isLoading,
    error,
  };
}
