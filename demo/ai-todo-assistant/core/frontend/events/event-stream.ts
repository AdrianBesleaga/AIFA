import { apiUrl, getApiAuthHeaders } from "../api.js";

interface EventFrame {
  event: string;
  data: string;
  id?: string;
}

function parseFrame(value: string): EventFrame | undefined {
  let event = "message";
  let id: string | undefined;
  const data: string[] = [];
  for (const line of value.split("\n")) {
    if (line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator < 0 ? line : line.slice(0, separator);
    const content = separator < 0 ? "" : line.slice(separator + 1).replace(/^ /, "");
    if (field === "event") event = content;
    if (field === "id") id = content;
    if (field === "data") data.push(content);
  }
  return data.length || id ? { event, data: data.join("\n"), ...(id ? { id } : {}) } : undefined;
}

export async function subscribeToFrontendEvents(options: {
  signal: AbortSignal;
  lastEventId?: string;
  onCursor(value: string): void;
  onEvent(value: unknown): void | Promise<void>;
}): Promise<void> {
  const headers = getApiAuthHeaders();
  if (!Object.keys(headers).length) throw new Error("Event stream identity is unavailable");
  const configuredUrl = (import.meta.env.VITE_EVENT_STREAM_URL as string | undefined)?.trim();
  const response = await fetch(
    configuredUrl || apiUrl("/api/events"),
    {
      headers: {
        accept: "text/event-stream",
        ...headers,
        ...(options.lastEventId ? { "last-event-id": options.lastEventId } : {}),
      },
      signal: options.signal,
    },
  );
  if (!response.ok || !response.body)
    throw new Error(`Event stream returned HTTP ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (!options.signal.aborted) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replaceAll("\r\n", "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const frame = parseFrame(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      if (frame?.id) options.onCursor(frame.id);
      if (frame?.event === "domain-event" && frame.data)
        await options.onEvent(JSON.parse(frame.data) as unknown);
      boundary = buffer.indexOf("\n\n");
    }
    if (done) return;
  }
}
