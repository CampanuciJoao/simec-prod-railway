import { useState, useCallback } from 'react';

export function useAsyncAction() {
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (action) => {
    setLoading(true);
    try {
      return await action();
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    run,
  };
}