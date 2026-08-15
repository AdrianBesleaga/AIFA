import type { QueryClient } from "../query/query-client.js";

export interface FrontendDomainEvent {
  eventType: string;
  schemaVersion: number;
  tenantId: string;
  [property: string]: unknown;
}

export interface FrontendEventContext {
  queryClient: QueryClient;
}

export interface FrontendEventConsumer<Event extends FrontendDomainEvent = FrontendDomainEvent> {
  name: string;
  eventType: string;
  contract: string;
  accepts(value: FrontendDomainEvent): value is Event;
  handle(event: Event, context: FrontendEventContext): void | Promise<void>;
}

export class FrontendEventRegistry {
  readonly #consumers = new Map<string, FrontendEventConsumer[]>();

  register(consumer: FrontendEventConsumer): void {
    const existing = this.#consumers.get(consumer.eventType) ?? [];
    if (existing.some(({ name }) => name === consumer.name))
      throw new Error(`Duplicate frontend event consumer '${consumer.eventType}/${consumer.name}'`);
    this.#consumers.set(consumer.eventType, [...existing, consumer]);
  }

  async dispatch(event: FrontendDomainEvent, context: FrontendEventContext): Promise<void> {
    const consumers = this.#consumers.get(event.eventType) ?? [];
    const eventType = event.eventType;
    await Promise.all(
      consumers.map(async (consumer) => {
        if (!consumer.accepts(event))
          throw new Error(`Frontend event '${eventType}' failed consumer validation`);
        await consumer.handle(event, context);
      }),
    );
  }

  clear(): void {
    this.#consumers.clear();
  }
}

export const frontendEventRegistry = new FrontendEventRegistry();

export function parseFrontendDomainEvent(value: unknown): FrontendDomainEvent {
  if (!value || typeof value !== "object") throw new Error("Frontend event must be an object");
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.eventType !== "string") throw new Error("Frontend eventType is required");
  if (typeof candidate.schemaVersion !== "number")
    throw new Error("Frontend event schemaVersion is required");
  if (typeof candidate.tenantId !== "string") throw new Error("Frontend event tenantId is required");
  return candidate as FrontendDomainEvent;
}
