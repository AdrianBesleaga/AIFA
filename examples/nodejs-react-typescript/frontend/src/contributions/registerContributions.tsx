import { registerSlotContribution } from "../slots/slotRegistry";

registerSlotContribution({
  slot: "APP_HEADER_ACTIONS",
  name: "refresh-button",
  order: 10,
  render: ({ model }) => (
    <button
      className="icon-button"
      type="button"
      onClick={() => void model.refreshTasks("list-tasks")}
    >
      Refresh
    </button>
  ),
});

registerSlotContribution({
  slot: "TASK_SUMMARY_CARDS",
  name: "active-task-count",
  order: 10,
  render: ({ model }) => {
    const activeCount = model.tasks.filter((task) => !task.completed).length;

    return (
      <article className="summary-card">
        <span>Active</span>
        <strong>{activeCount}</strong>
      </article>
    );
  },
});

registerSlotContribution({
  slot: "TASK_SUMMARY_CARDS",
  name: "completed-task-count",
  order: 20,
  render: ({ model }) => {
    const completedCount = model.tasks.filter((task) => task.completed).length;

    return (
      <article className="summary-card">
        <span>Done</span>
        <strong>{completedCount}</strong>
      </article>
    );
  },
});

registerSlotContribution({
  slot: "TASK_SUMMARY_CARDS",
  name: "high-priority-count",
  order: 30,
  render: ({ model }) => {
    const highPriorityCount = model.tasks.filter(
      (task) => task.priority === "high" && !task.completed,
    ).length;

    return (
      <article className="summary-card warning">
        <span>High priority</span>
        <strong>{highPriorityCount}</strong>
      </article>
    );
  },
});

registerSlotContribution({
  slot: "TASK_ACTIONS",
  name: "completion-action",
  order: 10,
  render: ({ model }) =>
    model.task.completed ? (
      <button className="action-button" type="button" onClick={() => void model.reopenTask()}>
        Reopen
      </button>
    ) : (
      <button
        className="action-button primary"
        type="button"
        onClick={() => void model.completeTask()}
      >
        Complete
      </button>
    ),
});

registerSlotContribution({
  slot: "TASK_ACTIONS",
  name: "delete-action",
  order: 20,
  render: ({ model }) => (
    <button className="action-button danger" type="button" onClick={() => void model.deleteTask()}>
      Delete
    </button>
  ),
});

registerSlotContribution({
  slot: "EMPTY_STATE_ACTIONS",
  name: "create-example-task",
  order: 10,
  render: ({ model }) => (
    <button
      className="action-button primary"
      type="button"
      onClick={() => void model.createExampleTask()}
    >
      Create example task
    </button>
  ),
});
