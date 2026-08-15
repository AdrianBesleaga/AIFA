import { useState } from "react";
import { Alert, Button, Stack } from "@mui/material";
import { commandApi } from "../../../../../core/frontend/api.js";
import { useCommandMutation, useQueryClient } from "../../../../../core/frontend/query/react-query.js";
import type { FrontendEventConsumer } from "../../../../../core/frontend/events/event-registry.js";
import type { SlotContribution } from "../../../../../core/frontend/slots/slot-registry.js";
import type {
  TaskPlanSuggestionV1,
  TaskViewV1,
} from "../../../../../core/shared/generated/contracts.js";
import { DomainEventType, SlotName } from "../../../../../core/shared/architecture-enums.js";
import { TaskCacheTag } from "../../../contracts/v1/task-cache.js";
import {
  acceptsTaskCollectionEvent,
  type TaskCollectionEventV1,
} from "../../../contracts/v1/task-events.js";

function AcceptSuggestion({ suggestion }: { suggestion: TaskPlanSuggestionV1 }) {
  const [accepted, setAccepted] = useState(false);
  const queryClient = useQueryClient();
  const command = useCommandMutation<TaskPlanSuggestionV1, TaskViewV1>({
    commandFn: async (input, commandId) =>
      (
        await commandApi<{ task: TaskViewV1 }>(
          "/api/task-plan-suggestions/accept",
          commandId,
          input,
        )
      ).task,
    onSuccess: async () => {
      setAccepted(true);
      await queryClient.invalidateTags([TaskCacheTag.Collection]);
    },
  });
  return (
    <Stack gap={0.5} alignItems="flex-end">
      {command.error && <Alert severity="error">{command.error.message}</Alert>}
      <Button
        size="small"
        variant="contained"
        disabled={accepted || command.isPending}
        onClick={() => void command.mutate(suggestion).catch(() => undefined)}
        sx={{ bgcolor: "white", color: "#171923" }}
      >
        {accepted ? "Added" : command.isPending ? "Adding…" : "Add task"}
      </Button>
    </Stack>
  );
}

export const contribution: SlotContribution<SlotName.TaskSuggestionActions> = {
  slot: SlotName.TaskSuggestionActions,
  name: "accept-task-suggestion",
  order: 10,
  render: ({ suggestion }) => <AcceptSuggestion suggestion={suggestion} />,
};

export const eventConsumers: FrontendEventConsumer<TaskCollectionEventV1>[] = [
  {
    name: "invalidate-task-collection-after-suggestion-acceptance",
    eventType: DomainEventType.TaskCreatedV1,
    contract: "task-management/contracts/events/v1/task-created.schema.json",
    accepts: (event): event is TaskCollectionEventV1 =>
      acceptsTaskCollectionEvent(event, DomainEventType.TaskCreatedV1),
    handle: (_event, { queryClient }) => queryClient.invalidateTags([TaskCacheTag.Collection]),
  },
];
