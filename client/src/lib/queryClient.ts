import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(`${res.status}: ${await res.text()}`);
        }

        return res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    }
  },
});

// Utility function for making API requests
export async function apiRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<Response> {
  const options: RequestInit = {
    method,
    credentials: "include",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(url, options);
  return response;
}

type ApiOptions = {
  on401?: "throwError" | "returnNull";
};

export function getQueryFn(options: ApiOptions = {}) {
  return async ({ queryKey }: { queryKey: any }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (!res.ok) {
      if (res.status === 401 && options.on401 === "returnNull") {
        return null;
      }

      throw new Error(`${res.status}: ${await res.text()}`);
    }

    return res.json();
  };
}
