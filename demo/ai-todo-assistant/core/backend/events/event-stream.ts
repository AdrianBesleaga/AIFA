import type { IncomingMessage, ServerResponse } from "node:http";
import type { Db } from "mongodb";
import { ErrorCode, PermissionScope } from "../../shared/architecture-enums.js";
import type { ActorResolver } from "../http/authorization-middleware.js";
import { logger } from "../telemetry/logger.js";

export interface StreamCursor {
  occurredAt: string;
  seenEventIds: string[];
}

export interface StreamEvent {
  occurredAt: string;
  eventId: string;
  eventType: string;
  tenantId: string;
  schemaVersion: number;
  [property: string]: unknown;
}

export interface EventStreamStore {
  readAfter(
    tenantId: string,
    cursor: StreamCursor,
    limit: number,
  ): Promise<StreamEvent[]>;
}

const eventBatchSize = 100;
const defaultPollIntervalMs = 1_000;
const maxCursorEventIds = 1_000;

export function createMongoEventStreamStore(database: Db): EventStreamStore {
  const events = database.collection<{ event: StreamEvent }>("outbox_events");
  return {
    async readAfter(tenantId, cursor, limit) {
      const documents = await events
        .find({
          "event.tenantId": tenantId,
          $or: [
            { "event.occurredAt": { $gt: cursor.occurredAt } },
            {
              "event.occurredAt": cursor.occurredAt,
              "event.eventId": { $nin: cursor.seenEventIds },
            },
          ],
        })
        .sort({ "event.occurredAt": 1, "event.eventId": 1 })
        .limit(limit)
        .toArray();
      return documents.map(({ event }) => event);
    },
  };
}

function encodeCursor(cursor: StreamCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value: string | undefined): StreamCursor | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as StreamCursor;
    if (
      typeof parsed.occurredAt === "string" &&
      !Number.isNaN(Date.parse(parsed.occurredAt)) &&
      Array.isArray(parsed.seenEventIds) &&
      parsed.seenEventIds.length <= maxCursorEventIds &&
      parsed.seenEventIds.every((item) => typeof item === "string")
    )
      return parsed;
  } catch {}
  return undefined;
}

function advanceCursor(cursor: StreamCursor, event: StreamEvent): StreamCursor {
  return event.occurredAt === cursor.occurredAt
    ? { ...cursor, seenEventIds: [...cursor.seenEventIds, event.eventId] }
    : { occurredAt: event.occurredAt, seenEventIds: [event.eventId] };
}

function writeSseEvent(
  response: ServerResponse,
  cursor: StreamCursor,
  event: string,
  data: unknown,
): void {
  response.write(
    `id: ${encodeCursor(cursor)}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

function writeJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(value));
}

export function createEventStreamHandler(options: {
  store: EventStreamStore;
  resolveActor: ActorResolver;
  corsOrigin?: string;
  pollIntervalMs?: number;
}) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    if (url.pathname !== "/api/events") return false;
    if (options.corsOrigin) {
      response.setHeader("access-control-allow-origin", options.corsOrigin);
      response.setHeader("access-control-allow-headers", "authorization, last-event-id");
      response.setHeader("access-control-allow-methods", "GET, OPTIONS");
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return true;
    }
    if (request.method !== "GET") {
      response.writeHead(405, { allow: "GET" }).end();
      return true;
    }
    const actor = await options.resolveActor(request.headers);
    if (!actor) {
      writeJson(response, 401, {
        ok: false,
        error: { code: ErrorCode.NotAuthorized, message: "An actor is required" },
      });
      return true;
    }
    if (!actor.scopes.includes(PermissionScope.EventRead)) {
      writeJson(response, 403, {
        ok: false,
        error: { code: ErrorCode.Forbidden, message: "The actor lacks EventRead" },
      });
      return true;
    }

    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    let cursor =
      decodeCursor(request.headers["last-event-id"]?.toString()) ??
      decodeCursor(url.searchParams.get("cursor") ?? undefined) ?? {
        occurredAt: new Date().toISOString(),
        seenEventIds: [],
      };
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wakeTimer: (() => void) | undefined;
    const close = () => {
      closed = true;
      if (timer) clearTimeout(timer);
      wakeTimer?.();
      timer = undefined;
      wakeTimer = undefined;
    };
    request.once("close", close);
    response.once("close", close);
    writeSseEvent(response, cursor, "ready", {});

    void (async () => {
      try {
        while (!closed) {
          const events = await options.store.readAfter(actor.tenantId, cursor, eventBatchSize);
          for (const event of events) {
            if (closed) return;
            cursor = advanceCursor(cursor, event);
            writeSseEvent(response, cursor, "domain-event", event);
          }
          await new Promise<void>((resolve) => {
            wakeTimer = resolve;
            timer = setTimeout(() => {
              timer = undefined;
              wakeTimer = undefined;
              resolve();
            }, options.pollIntervalMs ?? defaultPollIntervalMs);
          });
        }
      } catch (cause) {
        if (!closed)
          logger.error("event_stream_failed", {
            tenantId: actor.tenantId,
            error: cause instanceof Error ? cause.message : "Unknown error",
          });
        response.end();
      }
    })();
    return true;
  };
}
