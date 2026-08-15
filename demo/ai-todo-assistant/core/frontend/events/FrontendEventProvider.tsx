import { useEffect, type ReactNode } from "react";
import { frontendEventRegistry, parseFrontendDomainEvent } from "./event-registry.js";
import { useQueryClient } from "../query/react-query.js";

export function FrontendEventProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const streamUrl = import.meta.env.VITE_EVENT_STREAM_URL;
    if (!streamUrl) return;
    const source = new EventSource(streamUrl, { withCredentials: true });
    source.onmessage = (message) => {
      try {
        const event = parseFrontendDomainEvent(JSON.parse(message.data) as unknown);
        void frontendEventRegistry.dispatch(event, { queryClient });
      } catch (cause) {
        console.error("Rejected frontend domain event", cause);
      }
    };
    return () => source.close();
  }, [queryClient]);
  return children;
}
