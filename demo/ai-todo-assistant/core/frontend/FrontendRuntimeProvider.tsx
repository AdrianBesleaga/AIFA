import type { ReactNode } from "react";
import { FrontendEventProvider } from "./events/FrontendEventProvider.js";
import { queryClient } from "./query/query-client.js";
import { QueryClientProvider } from "./query/react-query.js";

export function FrontendRuntimeProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <FrontendEventProvider>{children}</FrontendEventProvider>
    </QueryClientProvider>
  );
}
