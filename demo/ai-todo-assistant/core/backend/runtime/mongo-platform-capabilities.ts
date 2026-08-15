import { randomUUID } from "node:crypto";
import type { ClientSession, Db } from "mongodb";
import type { Actor, PlatformCapabilities, RequestMetadata } from "../../shared/aifa.js";
import { OutboxStatus } from "../../shared/architecture-enums.js";

export function createMongoPlatformCapabilities(
  database: Db,
  actor: Actor,
  metadata: RequestMetadata,
  session?: ClientSession,
  validateEvent?: (value: unknown) => { path: string; message: string }[],
): PlatformCapabilities {
  const audit = database.collection("audit_events");
  const outbox = database.collection("outbox_events");
  return {
    async IdCreate() {
      return randomUUID();
    },
    async ClockNow() {
      return new Date().toISOString();
    },
    async DomainEventEmit({ eventType, data }) {
      if (!metadata.idempotencyKey)
        throw new Error(`Mutation event '${eventType}' requires command metadata`);
      const event = {
        eventId: randomUUID(),
        eventType,
        schemaVersion: 1,
        tenantId: actor.tenantId,
        actorId: actor.userId,
        correlationId: metadata.correlationId,
        causationId: metadata.causationId,
        idempotencyKey: metadata.idempotencyKey,
        ...data,
        occurredAt: new Date().toISOString(),
      };
      const errors = validateEvent?.(event) ?? [];
      if (errors.length)
        throw new Error(`Domain event '${eventType}' violated its contract: ${JSON.stringify(errors)}`);
      await audit.insertOne({ ...event }, { session });
      await outbox.insertOne(
        {
          event,
          delivery: {
            status: OutboxStatus.Pending,
            attempts: 0,
            availableAt: event.occurredAt,
          },
        },
        { session },
      );
    },
  };
}

export async function ensurePlatformIndexes(database: Db): Promise<void> {
  await Promise.all([
    database
      .collection("audit_events")
      .createIndex({ tenantId: 1, occurredAt: -1 }, { name: "tenant_audit_time" }),
    database.collection("outbox_events").createIndex(
      { "delivery.status": 1, "delivery.availableAt": 1, "event.occurredAt": 1 },
      { name: "outbox_delivery" },
    ),
  ]);
}
