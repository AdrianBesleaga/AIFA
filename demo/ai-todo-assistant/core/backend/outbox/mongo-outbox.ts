import { randomUUID } from "node:crypto";
import { ObjectId, type Db } from "mongodb";
import { OutboxStatus } from "../../shared/architecture-enums.js";
import type { OutboxEvent, OutboxStore } from "./outbox-publisher.js";

interface MongoOutboxDocument {
  _id: ObjectId;
  event: {
    eventId: string;
    eventType: string;
    tenantId: string;
    occurredAt: string;
    [key: string]: unknown;
  };
  delivery: {
    status: OutboxStatus;
    attempts: number;
    availableAt: string;
    claimToken?: string;
    workerId?: string;
    leaseExpiresAt?: string;
    deliveredAt?: string;
    lastError?: string;
  };
}

export function createMongoOutboxStore(
  database: Db,
  leaseMs = 60_000,
  maximumAttempts = 8,
): OutboxStore {
  const events = database.collection<MongoOutboxDocument>("outbox_events");
  return {
    async claim(limit, workerId = randomUUID()) {
      const claimed: OutboxEvent[] = [];
      for (let index = 0; index < limit; index++) {
        const now = new Date();
        const claimToken = randomUUID();
        const document = await events.findOneAndUpdate(
          {
            "delivery.attempts": { $lt: maximumAttempts },
            "delivery.availableAt": { $lte: now.toISOString() },
            $or: [
              { "delivery.status": { $in: [OutboxStatus.Pending, OutboxStatus.Failed] } },
              {
                "delivery.status": OutboxStatus.Processing,
                "delivery.leaseExpiresAt": { $lte: now.toISOString() },
              },
            ],
          },
          {
            $set: {
              "delivery.status": OutboxStatus.Processing,
              "delivery.claimToken": claimToken,
              "delivery.workerId": workerId,
              "delivery.leaseExpiresAt": new Date(now.getTime() + leaseMs).toISOString(),
            },
            $inc: { "delivery.attempts": 1 },
          },
          { sort: { "event.occurredAt": 1 }, returnDocument: "after" },
        );
        if (!document) break;
        claimed.push({
          ...document.event,
          _id: document._id.toHexString(),
          claimToken,
          attempts: document.delivery.attempts,
        });
      }
      return claimed;
    },
    async markDelivered(id, claimToken) {
      await events.updateOne(
        {
          _id: typeof id === "string" ? new ObjectId(id) : undefined,
          "delivery.status": OutboxStatus.Processing,
          "delivery.claimToken": claimToken,
        },
        {
          $set: {
            "delivery.status": OutboxStatus.Delivered,
            "delivery.deliveredAt": new Date().toISOString(),
          },
          $unset: {
            "delivery.lastError": "",
            "delivery.leaseExpiresAt": "",
            "delivery.claimToken": "",
          },
        },
      );
    },
    async markFailed(id, claimToken, message, attempts) {
      const dead = attempts >= maximumAttempts;
      const backoffMs = Math.min(300_000, 1_000 * 2 ** Math.max(0, attempts - 1));
      await events.updateOne(
        {
          _id: typeof id === "string" ? new ObjectId(id) : undefined,
          "delivery.status": OutboxStatus.Processing,
          "delivery.claimToken": claimToken,
        },
        {
          $set: {
            "delivery.status": dead ? OutboxStatus.DeadLetter : OutboxStatus.Failed,
            "delivery.lastError": message.slice(0, 2_000),
            "delivery.availableAt": new Date(Date.now() + backoffMs).toISOString(),
          },
          $unset: { "delivery.leaseExpiresAt": "", "delivery.claimToken": "" },
        },
      );
    },
  };
}
