import { DomainEventType } from "../../../../core/shared/architecture-enums.js";

export interface TaskCollectionEventV1 {
  eventId: string;
  eventType:
    | DomainEventType.TaskCreatedV1
    | DomainEventType.TaskStatusChangedV1
    | DomainEventType.TaskDeletedV1;
  schemaVersion: 1;
  tenantId: string;
  actorId: string;
  correlationId: string;
  causationId: string;
  idempotencyKey: string;
  taskId: string;
  occurredAt: string;
  [property: string]: unknown;
}

const requiredStrings = [
  "eventId",
  "tenantId",
  "actorId",
  "correlationId",
  "causationId",
  "idempotencyKey",
  "taskId",
  "occurredAt",
] as const;

export function acceptsTaskCollectionEvent(
  value: { eventType: string; schemaVersion: number; tenantId: string; [property: string]: unknown },
  eventType: TaskCollectionEventV1["eventType"],
): value is TaskCollectionEventV1 {
  const commonEnvelopeIsValid =
    value.eventType === eventType &&
    value.schemaVersion === 1 &&
    requiredStrings.every((property) => typeof value[property] === "string") &&
    !Number.isNaN(Date.parse(value.occurredAt as string));
  if (!commonEnvelopeIsValid) return false;
  if (eventType !== DomainEventType.TaskStatusChangedV1) return true;
  const statuses = new Set(["Todo", "InProgress", "Completed"]);
  return (
    typeof value.previousStatus === "string" &&
    statuses.has(value.previousStatus) &&
    typeof value.status === "string" &&
    statuses.has(value.status) &&
    Number.isSafeInteger(value.version) &&
    (value.version as number) > 0
  );
}
