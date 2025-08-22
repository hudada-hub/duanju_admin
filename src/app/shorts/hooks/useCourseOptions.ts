import { useState, useEffect } from 'react';
import { request } from '@/utils/request';

interface Category {
  id: number;
  name: string;
}

interface Direction {
  id: number;
  name: string;
}

export function useCourseOptions() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const [categoriesRes, directionsRes] = await Promise.all([
        request('/duanju/categories', { method: 'GET' }),
        request('/duanju/directions', { method: 'GET' }),
      ]);

      setCategories(categoriesRes.data as Category[]);
      setDirections(directionsRes.data as Direction[]);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  return {
    categories,
    directions,
    loading,
    error,
  };
} 