export interface OutboxEvent {
  _id: string | number;
  claimToken: string;
  eventId: string;
  eventType: string;
  tenantId: string;
  occurredAt: string;
  attempts: number;
  [key: string]: unknown;
}
export interface OutboxStore {
  claim(limit: number, workerId?: string): Promise<OutboxEvent[]>;
  markDelivered(id: unknown, claimToken: string): Promise<void>;
  markFailed(id: unknown, claimToken: string, message: string, attempts: number): Promise<void>;
}
export type EventHandler = (event: OutboxEvent) => Promise<void>;
export async function publishPendingEvents(
  store: OutboxStore,
  handler: EventHandler,
  limit = 50,
  workerId = crypto.randomUUID(),
): Promise<number> {
  const events = await store.claim(limit, workerId);
  for (const event of events) {
    try {
      await handler(event);
      await store.markDelivered(event._id, event.claimToken);
    } catch (cause) {
      await store.markFailed(
        event._id,
        event.claimToken,
        cause instanceof Error ? cause.message : "Unknown delivery error",
        event.attempts,
      );
    }
  }
  return events.length;
}
