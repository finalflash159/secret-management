import { useState, useEffect, useCallback } from 'react';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface UseOrganizationOptions {
  autoFetch?: boolean;
}

export function useOrganization(slug: string, options: UseOrganizationOptions = {}) {
  const { autoFetch = true } = options;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    if (!slug) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/organizations/${slug}`);
      if (res.ok) {
        const json = await res.json();
        const data = json?.data ?? json;
        setOrganization(data);
      } else {
        setError('Failed to fetch organization');
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err);
      setError('Failed to fetch organization');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (autoFetch && slug) {
      fetchOrganization();
    }
  }, [autoFetch, slug, fetchOrganization]);

  return {
    organization,
    loading,
    error,
    refetch: fetchOrganization,
  };
}
