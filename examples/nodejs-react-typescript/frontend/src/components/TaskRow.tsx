import { Slot } from "../slots/Slot";

import type { Task } from "../types";

interface TaskRowProperties {
  task: Task;
  onComplete: (task: Task, completed: boolean) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
}

export function TaskRow({ task, onComplete, onDelete }: TaskRowProperties) {
  return (
    <li className={`task-item ${task.completed ? "completed" : ""}`}>
      <button
        className="toggle"
        type="button"
        aria-label={task.completed ? "Reopen task" : "Complete task"}
        onClick={() => onComplete(task, !task.completed)}
      />
      <div className="task-main">
        <span className="task-title">{task.title}</span>
        <span className={`priority priority-${task.priority}`}>{task.priority}</span>
      </div>
      <div className="task-actions">
        <Slot
          name="TASK_ACTIONS"
          model={{
            task,
            completeTask: () => onComplete(task, true),
            reopenTask: () => onComplete(task, false),
            deleteTask: () => onDelete(task),
          }}
        />
      </div>
    </li>
  );
}
