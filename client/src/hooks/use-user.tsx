import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export function useUser() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {
          return null;
        }
        throw new Error("Failed to fetch user");
      }
      return res.json();
    },
  });

  const { mutate: logout } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to logout");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      setLocation("/auth");
      toast({
        title: "Logged out successfully",
      });
    },
  });

  // Add isAdmin check based on user role and ensure it updates when user changes
  const isAdmin = user?.role === "super_admin" || user?.role === "sub_admin";
  const isSuperAdmin = user?.role === "super_admin";

  // Add mutation to upgrade user to pro plan
  const { mutate: upgradeUser } = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "activate" }),
      });
      if (!res.ok) {
        throw new Error("Failed to upgrade user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User upgraded successfully",
        description: "User has been upgraded to pro plan",
      });
      // Refresh users list
      queryClient.invalidateQueries(["/api/admin/users"]);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upgrade user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    user,
    isLoading,
    isAdmin,
    isSuperAdmin,
    logout,
    upgradeUser,
  };
}