export interface LogFields {
  correlationId?: string;
  feature?: string;
  durationMs?: number;
  status?: number;
  error?: string;
  [key: string]: unknown;
}
function write(level: "info" | "error", message: string, fields: LogFields = {}): void {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...fields });
  (level === "error" ? console.error : console.log)(entry);
}
export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};
