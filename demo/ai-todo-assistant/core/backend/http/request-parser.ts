import type { IncomingMessage } from "node:http";

export async function parseRequestInput(
  request: IncomingMessage,
  url: URL,
  maximumBytes = 1_048_576,
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > maximumBytes) throw new Error("Request body is too large");
    chunks.push(buffer);
  }
  if (!chunks.length) return Object.fromEntries(url.searchParams);
  if (!request.headers["content-type"]?.toString().toLowerCase().startsWith("application/json"))
    throw new Error("Request content type must be application/json");
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Request body must be a JSON object");
  return parsed as Record<string, unknown>;
}
