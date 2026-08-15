import Delete from "@mui/icons-material/Delete";
import {
  Button,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { useState } from "react";
import type { TaskRowActionsModel } from "../../../../../core/frontend/app-model.js";
import type { FrontendEventConsumer } from "../../../../../core/frontend/events/event-registry.js";
import type { SlotContribution } from "../../../../../core/frontend/slots/slot-registry.js";
import { DomainEventType, SlotName } from "../../../../../core/shared/architecture-enums.js";
import { TaskCacheTag } from "../../../contracts/v1/task-cache.js";
import {
  acceptsTaskCollectionEvent,
  type TaskCollectionEventV1,
} from "../../../contracts/v1/task-events.js";
import { useDeleteTask } from "./use-delete-task.js";

function DeleteTaskAction(model: TaskRowActionsModel) {
  const { task } = model;
  const [open, setOpen] = useState(false);
  const deleteTask = useDeleteTask();
  return (
    <>
      {deleteTask.error && <Alert severity="error">{deleteTask.error.message}</Alert>}
      <IconButton
        size="small"
        color="error"
        aria-label={`delete ${task.title}`}
        disabled={deleteTask.isPending}
        onClick={() => setOpen(true)}
      >
        <Delete />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="delete-task-title">
        <DialogTitle id="delete-task-title">Delete task?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            “{task.title}” will be permanently removed. This action is audited.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setOpen(false);
              void deleteTask.mutate(task).catch(() => undefined);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export const contribution: SlotContribution<SlotName.TaskRowActions> = {
  slot: SlotName.TaskRowActions,
  name: "delete-task",
  order: 20,
  render: (model) => <DeleteTaskAction {...model} />,
};

export const eventConsumers: FrontendEventConsumer<TaskCollectionEventV1>[] = [
  {
    name: "invalidate-task-collection-after-delete",
    eventType: DomainEventType.TaskDeletedV1,
    contract: "task-management/contracts/events/v1/task-deleted.schema.json",
    accepts: (event): event is TaskCollectionEventV1 =>
      acceptsTaskCollectionEvent(event, DomainEventType.TaskDeletedV1),
    handle: (_event, { queryClient }) =>
      queryClient.invalidateTags([TaskCacheTag.Collection]),
  },
];
