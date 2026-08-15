import type { ClientSession, Db } from "mongodb";
import { randomUUID } from "node:crypto";
import type { FeatureResult } from "../../shared/aifa.js";
import type { FeatureName } from "../../shared/generated/feature-names.js";

interface IdempotencyRecord {
  tenantId: string;
  actorId: string;
  featureName: FeatureName;
  idempotencyKey: string;
  inputFingerprint: string;
  commandInput?: Record<string, unknown>;
  preparedCapabilities?: Record<string, unknown>;
  status: IdempotencyStatus;
  result?: FeatureResult<unknown>;
  executionId: string;
  claimedAt: string;
  leaseExpiresAt: string;
  createdAt: string;
}
export enum IdempotencyStatus {
  Pending = "Pending",
  Completed = "Completed",
}
export type IdempotencyClaim =
  | { kind: "claimed"; executionId: string; preparedCapabilities: Record<string, unknown> }
  | { kind: "completed"; result: FeatureResult<unknown> }
  | { kind: "in-progress" }
  | { kind: "key-reused" };
export function createMongoIdempotencyStore(database: Db, leaseMs = 300_000) {
  const records = database.collection<IdempotencyRecord>("idempotency_records");
  return {
    async claim(
      record: Omit<
        IdempotencyRecord,
        "status" | "claimedAt" | "leaseExpiresAt" | "createdAt" | "result" | "executionId"
      >,
    ): Promise<IdempotencyClaim> {
      const filter = {
        tenantId: record.tenantId,
        actorId: record.actorId,
        featureName: record.featureName,
        idempotencyKey: record.idempotencyKey,
      };
      try {
        const executionId = randomUUID();
        const claimedAt = new Date();
        await records.insertOne({
          ...record,
          status: IdempotencyStatus.Pending,
          executionId,
          claimedAt: claimedAt.toISOString(),
          leaseExpiresAt: new Date(claimedAt.getTime() + leaseMs).toISOString(),
          createdAt: claimedAt.toISOString(),
        });
        return { kind: "claimed", executionId, preparedCapabilities: {} };
      } catch (error: unknown) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== 11000) throw error;
        const existing = await records.findOne(filter);
        if (!existing || existing.inputFingerprint !== record.inputFingerprint)
          return { kind: "key-reused" };
        if (existing.status === IdempotencyStatus.Completed && existing.result)
          return { kind: "completed", result: existing.result };
        const executionId = randomUUID();
        const claimedAt = new Date();
        const recovered = await records.updateOne(
          {
            ...filter,
            status: IdempotencyStatus.Pending,
            leaseExpiresAt: { $lte: claimedAt.toISOString() },
          },
          {
            $set: {
              executionId,
              claimedAt: claimedAt.toISOString(),
              leaseExpiresAt: new Date(claimedAt.getTime() + leaseMs).toISOString(),
            },
          },
        );
        return recovered.modifiedCount === 1
          ? {
              kind: "claimed",
              executionId,
              preparedCapabilities: existing.preparedCapabilities ?? {},
            }
          : { kind: "in-progress" };
      }
    },
    async heartbeat(
      record: Pick<IdempotencyRecord, "tenantId" | "actorId" | "featureName" | "idempotencyKey">,
      executionId: string,
    ): Promise<void> {
      const heartbeat = await records.updateOne(
        { ...record, status: IdempotencyStatus.Pending, executionId },
        { $set: { leaseExpiresAt: new Date(Date.now() + leaseMs).toISOString() } },
      );
      if (heartbeat.modifiedCount !== 1)
        throw new Error("Idempotency heartbeat lost its execution fence");
    },
    async savePreparedCapability(
      record: Pick<IdempotencyRecord, "tenantId" | "actorId" | "featureName" | "idempotencyKey">,
      executionId: string,
      capabilityName: string,
      value: unknown,
    ): Promise<void> {
      const saved = await records.updateOne(
        { ...record, status: IdempotencyStatus.Pending, executionId },
        {
          $set: {
            [`preparedCapabilities.${capabilityName}`]: value,
            leaseExpiresAt: new Date(Date.now() + leaseMs).toISOString(),
          },
        },
      );
      if (saved.modifiedCount !== 1)
        throw new Error("Prepared command result lost its execution fence");
    },
    async complete(
      record: Pick<IdempotencyRecord, "tenantId" | "actorId" | "featureName" | "idempotencyKey">,
      executionId: string,
      result: FeatureResult<unknown>,
      session?: ClientSession,
    ) {
      const completion = await records.updateOne(
        { ...record, status: IdempotencyStatus.Pending, executionId },
        { $set: { status: IdempotencyStatus.Completed, result } },
        { session },
      );
      if (completion.modifiedCount !== 1)
        throw new Error("Idempotency completion lost its execution fence");
    },
    async ensureIndexes() {
      await records.createIndex(
        { tenantId: 1, actorId: 1, featureName: 1, idempotencyKey: 1 },
        { unique: true, name: "idempotency_command" },
      );
    },
  };
}
