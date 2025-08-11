import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: organization, isLoading, error } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  return {
    organization,
    isLoading,
    isAuthenticated: !!organization && !error,
  };
}
