import { Alert, Button, Menu, MenuItem, Stack } from "@mui/material";
import { useState } from "react";
import { TaskStatus } from "../../../domain/task.js";
import type { TaskRowActionsModel } from "../../../../../core/frontend/app-model.js";
import type { FrontendEventConsumer } from "../../../../../core/frontend/events/event-registry.js";
import type { SlotContribution } from "../../../../../core/frontend/slots/slot-registry.js";
import { DomainEventType, SlotName } from "../../../../../core/shared/architecture-enums.js";
import { TaskCacheTag } from "../../../contracts/v1/task-cache.js";
import {
  acceptsTaskCollectionEvent,
  type TaskCollectionEventV1,
} from "../../../contracts/v1/task-events.js";
import { useChangeTaskStatus } from "./use-change-task-status.js";
function StatusControl(model: TaskRowActionsModel) {
  const { task } = model;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const changeStatus = useChangeTaskStatus();
  const nextStatus = task.status === TaskStatus.Todo ? TaskStatus.InProgress : TaskStatus.Completed;
  return (
    <Stack direction="row" gap={0.75}>
      {changeStatus.error && <Alert severity="error">{changeStatus.error.message}</Alert>}
      {task.status !== TaskStatus.Completed && (
        <Button
          size="small"
          variant="outlined"
          disabled={changeStatus.isPending}
          onClick={() => void changeStatus.mutate({ task, status: nextStatus })}
        >
          {nextStatus === TaskStatus.InProgress ? "Start" : "Complete"}
        </Button>
      )}
      <Button
        size="small"
        color="inherit"
        disabled={changeStatus.isPending}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        Move
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {Object.values(TaskStatus).map((status) => (
          <MenuItem
            key={status}
            selected={status === task.status}
            onClick={() => {
              setAnchor(null);
              if (status !== task.status) void changeStatus.mutate({ task, status });
            }}
          >
            {status === TaskStatus.Todo
              ? "To do"
              : status === TaskStatus.InProgress
                ? "In progress"
                : "Done"}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );
}
export const contribution: SlotContribution<SlotName.TaskRowActions> = {
  slot: SlotName.TaskRowActions,
  name: "change-task-status",
  order: 10,
  render: (model) => <StatusControl {...model} />,
};

export const eventConsumers: FrontendEventConsumer<TaskCollectionEventV1>[] = [
  {
    name: "invalidate-task-collection-after-status-change",
    eventType: DomainEventType.TaskStatusChangedV1,
    contract: "task-management/contracts/events/v1/task-status-changed.schema.json",
    accepts: (event): event is TaskCollectionEventV1 =>
      acceptsTaskCollectionEvent(event, DomainEventType.TaskStatusChangedV1),
    handle: (_event, { queryClient }) =>
      queryClient.invalidateTags([TaskCacheTag.Collection]),
  },
];
