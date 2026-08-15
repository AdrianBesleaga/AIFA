function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]),
  );
}

export function commandFingerprint(input: unknown): string {
  const fingerprint = JSON.stringify(canonicalize(input));
  if (fingerprint === undefined)
    throw new Error("Command input must be JSON-serializable");
  return fingerprint;
}

export class CommandIdStore {
  readonly #ids = new Map<string, string>();

  get(input: unknown): string {
    const fingerprint = commandFingerprint(input);
    const existing = this.#ids.get(fingerprint);
    if (existing) return existing;
    const created = crypto.randomUUID();
    this.#ids.set(fingerprint, created);
    return created;
  }

  settle(input: unknown): void {
    this.#ids.delete(commandFingerprint(input));
  }
}
