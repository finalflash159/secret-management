import { useState, useEffect, useCallback } from 'react';

interface Project {
  id: string;
  name: string;
}

interface UseProjectsOptions {
  autoFetch?: boolean;
}

export function useProjects(organizationSlug: string, options: UseProjectsOptions = {}) {
  const { autoFetch = true } = options;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!organizationSlug) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/organizations/${organizationSlug}`);
      if (res.ok) {
        const json = await res.json();
        const data = json?.data ?? json;
        setProjects(data?.projects || []);
      } else {
        setError('Failed to fetch projects');
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [organizationSlug]);

  useEffect(() => {
    if (autoFetch && organizationSlug) {
      fetchProjects();
    }
  }, [autoFetch, organizationSlug, fetchProjects]);

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
  };
}
