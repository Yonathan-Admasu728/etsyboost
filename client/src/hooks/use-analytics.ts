import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useAnalytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/analytics/stats"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const logToolUsage = useMutation({
    mutationFn: async (toolType: string) => {
      await apiRequest("POST", "/api/analytics/tool-usage", { toolType });
    },
  });

  return {
    stats,
    isLoading,
    logToolUsage: logToolUsage.mutate,
  };
}
