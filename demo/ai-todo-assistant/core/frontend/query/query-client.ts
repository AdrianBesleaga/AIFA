export type QueryKeyPart = string | number | boolean | null;
export type QueryKey = readonly QueryKeyPart[];
export type QueryTag = string;

export type QueryStatus = "idle" | "pending" | "success" | "error";

export interface QuerySnapshot<Value> {
  status: QueryStatus;
  data: Value | undefined;
  error: Error | undefined;
  isFetching: boolean;
}

export interface QueryFunctionContext {
  signal: AbortSignal;
}

export interface QueryOptions<Value> {
  key: QueryKey;
  tags: readonly QueryTag[];
  queryFn(context: QueryFunctionContext): Promise<Value>;
}

interface QueryEntry<Value = unknown> {
  key: QueryKey;
  tags: Set<QueryTag>;
  queryFn(context: QueryFunctionContext): Promise<Value>;
  snapshot: QuerySnapshot<Value>;
  stale: boolean;
  generation: number;
  controller?: AbortController;
  promise?: Promise<void>;
  listeners: Set<() => void>;
}

const idleSnapshot: QuerySnapshot<never> = {
  status: "idle",
  data: undefined,
  error: undefined,
  isFetching: false,
};

export function hashQueryKey(key: QueryKey): string {
  return JSON.stringify(key);
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error("Query failed");
}

function isAbortError(cause: unknown): boolean {
  return cause instanceof Error && cause.name === "AbortError";
}

export class QueryClient {
  readonly #entries = new Map<string, QueryEntry>();

  configure<Value>(options: QueryOptions<Value>): string {
    const hash = hashQueryKey(options.key);
    const current = this.#entries.get(hash) as QueryEntry<Value> | undefined;
    if (current) {
      current.queryFn = options.queryFn;
      current.tags = new Set(options.tags);
      return hash;
    }
    this.#entries.set(hash, {
      key: options.key,
      tags: new Set(options.tags),
      queryFn: options.queryFn,
      snapshot: idleSnapshot,
      stale: true,
      generation: 0,
      listeners: new Set(),
    });
    return hash;
  }

  getSnapshot<Value>(hash: string): QuerySnapshot<Value> {
    return (this.#entries.get(hash)?.snapshot ?? idleSnapshot) as QuerySnapshot<Value>;
  }

  subscribe(hash: string, listener: () => void): () => void {
    const entry = this.#requireEntry(hash);
    entry.listeners.add(listener);
    if (entry.stale || entry.snapshot.status === "idle") void this.#execute(hash);
    return () => entry.listeners.delete(listener);
  }

  refetch(hash: string): Promise<void> {
    return this.#execute(hash, true);
  }

  async invalidateTags(tags: readonly QueryTag[]): Promise<void> {
    const targets = new Set(tags);
    const refetches: Promise<void>[] = [];
    for (const [hash, entry] of this.#entries) {
      if (![...entry.tags].some((tag) => targets.has(tag))) continue;
      entry.stale = true;
      if (entry.listeners.size > 0) refetches.push(this.#execute(hash));
    }
    await Promise.all(refetches);
  }

  clear(): void {
    for (const [hash, entry] of this.#entries) {
      entry.controller?.abort();
      entry.generation += 1;
      entry.stale = true;
      entry.promise = undefined;
      entry.snapshot = idleSnapshot;
      this.#notify(entry);
      if (entry.listeners.size > 0) void this.#execute(hash);
    }
  }

  #requireEntry(hash: string): QueryEntry {
    const entry = this.#entries.get(hash);
    if (!entry) throw new Error(`Query '${hash}' is not configured`);
    return entry;
  }

  #notify(entry: QueryEntry): void {
    entry.listeners.forEach((listener) => listener());
  }

  #execute(hash: string, force = false): Promise<void> {
    const entry = this.#requireEntry(hash);
    if (entry.promise && !force) return entry.promise;
    if (force) entry.controller?.abort();
    const generation = ++entry.generation;
    const controller = new AbortController();
    entry.controller = controller;
    entry.stale = false;
    entry.snapshot = {
      status: entry.snapshot.data === undefined ? "pending" : entry.snapshot.status,
      data: entry.snapshot.data,
      error: undefined,
      isFetching: true,
    };
    this.#notify(entry);
    const operation = entry
      .queryFn({ signal: controller.signal })
      .then((data) => {
        if (entry.generation !== generation) return;
        entry.snapshot = { status: "success", data, error: undefined, isFetching: false };
        this.#notify(entry);
      })
      .catch((cause: unknown) => {
        if (entry.generation !== generation || isAbortError(cause)) return;
        entry.snapshot = {
          status: "error",
          data: entry.snapshot.data,
          error: toError(cause),
          isFetching: false,
        };
        this.#notify(entry);
      })
      .finally(() => {
        if (entry.generation === generation) {
          entry.promise = undefined;
          entry.controller = undefined;
        }
      });
    entry.promise = operation;
    return operation;
  }
}

export const queryClient = new QueryClient();
