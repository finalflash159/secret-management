import { useState, useEffect, useCallback } from 'react';

interface Secret {
  id: string;
  key: string;
  value?: string;
  version: number;
  envId: string;
  folderId: string;
  projectId: string;
  expiresAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UseSecretsOptions {
  autoFetch?: boolean;
  page?: number;
  limit?: number;
}

export function useSecrets(projectId: string, envId: string, options: UseSecretsOptions = {}) {
  const { autoFetch = true, page = 1, limit = 50 } = options;

  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchSecrets = useCallback(async (pageNum: number = page) => {
    if (!projectId || !envId) {
      setSecrets([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/secrets?envId=${envId}&page=${pageNum}&limit=${limit}`
      );
      if (res.ok) {
        const json = await res.json();
        const data = json?.data ?? json;
        setSecrets(data?.data || []);
        setPagination(data?.pagination || null);
      } else {
        setError('Failed to fetch secrets');
      }
    } catch (err) {
      console.error('Failed to fetch secrets:', err);
      setError('Failed to fetch secrets');
    } finally {
      setLoading(false);
    }
  }, [projectId, envId, limit, page]);

  useEffect(() => {
    if (autoFetch && projectId && envId) {
      fetchSecrets(page);
    }
  }, [autoFetch, projectId, envId, page, fetchSecrets]);

  const createSecret = useCallback(async (key: string, value: string, folderId?: string) => {
    const res = await fetch(`/api/projects/${projectId}/secrets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, envId, folderId }),
    });
    if (res.ok) {
      fetchSecrets();
    }
    return res;
  }, [projectId, envId, fetchSecrets]);

  const updateSecret = useCallback(async (secretId: string, key: string, value: string) => {
    const res = await fetch(`/api/secrets/${secretId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) {
      fetchSecrets();
    }
    return res;
  }, [fetchSecrets]);

  const deleteSecret = useCallback(async (secretId: string) => {
    const res = await fetch(`/api/secrets/${secretId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      fetchSecrets();
    }
    return res;
  }, [fetchSecrets]);

  return {
    secrets,
    loading,
    error,
    pagination,
    refetch: fetchSecrets,
    createSecret,
    updateSecret,
    deleteSecret,
  };
}
