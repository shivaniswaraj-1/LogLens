import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../api/client';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

/**
 * Runs `fetcher` whenever any value in `deps` changes, tracking loading and
 * error state. Ignores results from stale/superseded calls (e.g. a filter
 * changed before the previous request finished).
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, isLoading: true });
  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(() => {
    const currentId = ++requestId.current;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    fetcherRef.current().then(
      (data) => {
        if (currentId === requestId.current) setState({ data, error: null, isLoading: false });
      },
      (err: unknown) => {
        if (currentId !== requestId.current) return;
        const message = err instanceof ApiClientError ? err.message : 'Something went wrong';
        setState({ data: null, error: message, isLoading: false });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return { ...state, reload: load };
}
