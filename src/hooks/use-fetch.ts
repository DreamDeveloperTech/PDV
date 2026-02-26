/**
 * Custom hook for data fetching with loading and error states.
 * Provides a simple interface for API calls from client components.
 */
"use client";

import { useState, useEffect, useCallback } from "react";

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(url: string | null): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error?.message || "Erro ao carregar dados");
      }

      setData(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/** Helper for making API mutations (POST, PATCH, DELETE) */
export async function apiRequest<T>(
  url: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const response = await fetch(url, {
    method: options.method || "POST",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error?.message || "Erro na operação");
  }

  return json.data ?? json;
}
