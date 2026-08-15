import { useEffect, type ReactNode } from "react";
import { frontendEventRegistry, parseFrontendDomainEvent } from "./event-registry.js";
import { useQueryClient } from "../query/react-query.js";
import { subscribeToFrontendEvents } from "./event-stream.js";

function waitForReconnect(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, 1_000);
    signal.addEventListener("abort", finish, { once: true });
  });
}

export function FrontendEventProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const controller = new AbortController();
    let lastEventId: string | undefined;
    void (async () => {
      while (!controller.signal.aborted) {
        try {
          await subscribeToFrontendEvents({
            signal: controller.signal,
            lastEventId,
            onCursor: (value) => (lastEventId = value),
            onEvent: async (value) => {
              const event = parseFrontendDomainEvent(value);
              await frontendEventRegistry.dispatch(event, { queryClient });
            },
          });
        } catch (cause) {
          if (controller.signal.aborted) return;
          if (!(cause instanceof Error && cause.message === "Event stream identity is unavailable"))
            console.error("Event stream disconnected", cause);
        }
        await waitForReconnect(controller.signal);
      }
    })();
    return () => controller.abort();
  }, [queryClient]);
  return children;
}
