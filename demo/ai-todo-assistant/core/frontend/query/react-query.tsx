import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  QueryClient,
  hashQueryKey,
  type QueryOptions,
  type QuerySnapshot,
} from "./query-client.js";

const QueryClientContext = createContext<QueryClient | null>(null);

export function QueryClientProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
}

export function useQueryClient(): QueryClient {
  const client = useContext(QueryClientContext);
  if (!client) throw new Error("QueryClientProvider is not registered");
  return client;
}

export interface UseQueryResult<Value> extends QuerySnapshot<Value> {
  refetch(): Promise<void>;
}

export function useQuery<Value>(options: QueryOptions<Value>): UseQueryResult<Value> {
  const client = useQueryClient();
  const keyHash = hashQueryKey(options.key);
  const tagHash = JSON.stringify(options.tags);
  const hash = useMemo(
    () => client.configure(options),
    // queryFn is deliberately refreshed below without resubscribing to the cache entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, keyHash, tagHash],
  );
  client.configure(options);
  const subscribe = useCallback((listener: () => void) => client.subscribe(hash, listener), [client, hash]);
  const getSnapshot = useCallback(() => client.getSnapshot<Value>(hash), [client, hash]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...snapshot,
    refetch: () => client.refetch(hash),
  };
}

export interface MutationOptions<Input, Value> {
  mutationFn(input: Input): Promise<Value>;
  onSuccess?(value: Value, input: Input): void | Promise<void>;
}

export interface UseMutationResult<Input, Value> {
  mutate(input: Input): Promise<Value>;
  isPending: boolean;
  error: Error | undefined;
  reset(): void;
}

export function useMutation<Input, Value>(
  options: MutationOptions<Input, Value>,
): UseMutationResult<Input, Value> {
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<Error>();
  const mutate = useCallback(
    async (input: Input) => {
      setPendingCount((current) => current + 1);
      setError(undefined);
      try {
        const value = await options.mutationFn(input);
        await options.onSuccess?.(value, input);
        return value;
      } catch (cause) {
        const next = cause instanceof Error ? cause : new Error("Request failed");
        setError(next);
        throw next;
      } finally {
        setPendingCount((current) => Math.max(0, current - 1));
      }
    },
    [options],
  );
  return { mutate, isPending: pendingCount > 0, error, reset: () => setError(undefined) };
}
