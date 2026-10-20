import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../api/axios';

// fetcher must return the data. `reload()` refetches without the loading spinner.
export default function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      setData(await fetcher());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { run(false); }, [run]);
  const reload = useCallback(() => run(true), [run]);

  return { data, loading, error, reload };
}