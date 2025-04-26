import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Subscription } from "@db/schema";

type ApiResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

export function useSubscription() {
  const queryClient = useQueryClient();
  
  const { data: subscription, isLoading, error } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
    staleTime: 1000 * 60, // 1 minute
  });

  // Mutation to downgrade subscription to a different plan
  const downgradeSubscription = useMutation<ApiResponse, Error, 'basic' | 'standard'>({
    mutationFn: async (planType: 'basic' | 'standard') => {
      const response = await fetch('/api/stripe/downgrade-subscription', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planType }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to downgrade subscription');
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate subscription data
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      // Also invalidate user data since it has subscription info
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  // Mutation to cancel subscription completely
  const cancelSubscription = useMutation<ApiResponse, Error>({
    mutationFn: async () => {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate subscription data
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      // Also invalidate user data since it has subscription info
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  return {
    subscription,
    isLoading,
    error,
    downgradeSubscription: downgradeSubscription.mutateAsync,
    cancelSubscription: cancelSubscription.mutateAsync,
    isDowngrading: downgradeSubscription.isPending,
    isCancelling: cancelSubscription.isPending,
    downgradeError: downgradeSubscription.error,
    cancelError: cancelSubscription.error,
  };
}
