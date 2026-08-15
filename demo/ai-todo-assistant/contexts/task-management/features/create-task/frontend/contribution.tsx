import Add from "@mui/icons-material/Add";
import { Alert, Box, Button, MenuItem, Select, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { TaskCategory, TaskPriority } from "../../../domain/task.js";
import type { FrontendEventConsumer } from "../../../../../core/frontend/events/event-registry.js";
import type { SlotContribution } from "../../../../../core/frontend/slots/slot-registry.js";
import { DomainEventType, SlotName } from "../../../../../core/shared/architecture-enums.js";
import { TaskCacheTag } from "../../../contracts/v1/task-cache.js";
import {
  acceptsTaskCollectionEvent,
  type TaskCollectionEventV1,
} from "../../../contracts/v1/task-events.js";
import { useCreateTask } from "./use-create-task.js";

function CreateTaskForm() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(TaskCategory.Work);
  const [priority, setPriority] = useState(TaskPriority.Medium);
  const createTask = useCreateTask();
  return (
    <Stack gap={1}>
      {createTask.error && <Alert severity="error">{createTask.error.message}</Alert>}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(180px, 1fr) 118px 126px auto" },
          gap: 1,
          alignItems: "center",
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Type a task and press add…"
          inputProps={{ "aria-label": "Task title" }}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          sx={{ "& .MuiInputBase-root": { height: 38 }, "& input": { py: 0.9, fontSize: 14 } }}
        />
        <Select
          inputProps={{ "aria-label": "Task category" }}
          size="small"
          value={category}
          onChange={(event) => setCategory(event.target.value as TaskCategory)}
          sx={{ height: 38, fontSize: 14 }}
        >
          {Object.values(TaskCategory).map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
        <Select
          inputProps={{ "aria-label": "Task priority" }}
          size="small"
          value={priority}
          onChange={(event) => setPriority(event.target.value as TaskPriority)}
          sx={{ height: 38, fontSize: 14 }}
        >
          {Object.values(TaskPriority).map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          disabled={!title.trim() || createTask.isPending}
          onClick={() =>
            void createTask
              .mutate({ title, category, priority })
              .then(() => setTitle(""))
              .catch(() => undefined)
          }
          sx={{ height: 38, minWidth: 104, whiteSpace: "nowrap", px: 1.5 }}
        >
          Add task
        </Button>
      </Box>
    </Stack>
  );
}
export const contribution: SlotContribution<SlotName.TaskComposer> = {
  slot: SlotName.TaskComposer,
  name: "create-task-form",
  render: () => <CreateTaskForm />,
};

export const eventConsumers: FrontendEventConsumer<TaskCollectionEventV1>[] = [
  {
    name: "invalidate-task-collection-after-create",
    eventType: DomainEventType.TaskCreatedV1,
    contract: "task-management/contracts/events/v1/task-created.schema.json",
    accepts: (event): event is TaskCollectionEventV1 =>
      acceptsTaskCollectionEvent(event, DomainEventType.TaskCreatedV1),
    handle: (_event, { queryClient }) =>
      queryClient.invalidateTags([TaskCacheTag.Collection]),
  },
];
