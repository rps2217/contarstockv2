import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

export function useDataQuery<T>(querier: () => Promise<T> | T, deps: any[] = []): T | undefined {
  return useLiveQuery(querier, deps);
}

export function useDataQueryWithDefault<T>(querier: () => Promise<T> | T, defaultVal: T, deps: any[] = []): T {
  const result = useLiveQuery(querier, deps);
  return result === undefined ? defaultVal : result;
}
