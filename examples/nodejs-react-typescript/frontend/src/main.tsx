import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";

import { createTask, deleteTask, listTasks, setTaskCompleted } from "./api";
import { TaskRow } from "./components/TaskRow";
import "./contributions/registerContributions";
import { Slot } from "./slots/Slot";
import "./styles.css";

import type { AppSlotModel, Priority, Task } from "./types";

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [activeFeature, setActiveFeature] = useState("list-tasks");
  const [status, setStatus] = useState("Runtime ready");

  async function refreshTasks(featureName = "list-tasks"): Promise<void> {
    const result = await listTasks();
    setTasks(result.value.tasks);
    setActiveFeature(featureName);
    setStatus(`${result.value.tasks.length} task${result.value.tasks.length === 1 ? "" : "s"}`);
  }

  useEffect(() => {
    void refreshTasks().catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Request failed"));
  }, []);

  const visibleTasks = useMemo(() => {
    if (filter === "active") {
      return tasks.filter((task) => !task.completed);
    }

    if (filter === "completed") {
      return tasks.filter((task) => task.completed);
    }

    return tasks;
  }, [filter, tasks]);

  async function handleCreateTask(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!title.trim()) {
      setStatus("Title required");
      return;
    }

    await createTask({ title, priority });
    setTitle("");
    await refreshTasks("create-task");
  }

  async function handleTaskCompletion(task: Task, completed: boolean): Promise<void> {
    await setTaskCompleted(task.id, completed);
    await refreshTasks(completed ? "complete-task" : "reopen-task");
  }

  async function handleDeleteTask(task: Task): Promise<void> {
    await deleteTask(task.id);
    await refreshTasks("delete-task");
  }

  async function createExampleTask(): Promise<void> {
    await createTask({
      title: "Implement one atomic feature",
      priority: "high",
    });
    await refreshTasks("create-task");
  }

  const appModel: AppSlotModel = {
    tasks,
    visibleTasks,
    activeFeature,
    refreshTasks,
    createExampleTask,
  };

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="app-title">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">React + Node AIFA example</p>
            <h1 id="app-title">Atomic Task Board</h1>
          </div>
          <div className="header-actions">
            <Slot name="APP_HEADER_ACTIONS" model={appModel} />
            <div className="status-pill">{status}</div>
          </div>
        </header>

        <div className="summary-grid">
          <Slot name="TASK_SUMMARY_CARDS" model={appModel} />
        </div>

        <form className="task-form" onSubmit={(event) => void handleCreateTask(event)}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add an atomic task..."
            aria-label="Task title"
          />
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
            aria-label="Priority"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button type="submit">Create</button>
        </form>

        <div className="task-toolbar" aria-label="Task filters">
          {(["all", "active", "completed"] as const).map((option) => (
            <button
              className={`filter ${filter === option ? "active" : ""}`}
              key={option}
              type="button"
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <ul className="task-list" aria-label="Tasks">
          {visibleTasks.map((task) => (
            <TaskRow key={task.id} task={task} onComplete={handleTaskCompletion} onDelete={handleDeleteTask} />
          ))}
        </ul>

        {visibleTasks.length === 0 && (
          <div className="empty-state">
            <p>No tasks in this view.</p>
            <Slot name="EMPTY_STATE_ACTIONS" model={appModel} />
          </div>
        )}
      </section>

      <aside className="architecture-panel" aria-labelledby="architecture-title">
        <p className="eyebrow">AIFA trace</p>
        <h2 id="architecture-title">One UI action calls one atomic backend feature.</h2>
        <div className="trace-card">
          <span>Active feature</span>
          <strong>{activeFeature}</strong>
          <p>React triggers HTTP. The Node adapter runs one AIFA feature. Runtime provides capabilities.</p>
        </div>
        <div className="slot-card">
          <span>Frontend slot model</span>
          <code>{'<Slot name="TASK_ACTIONS" model={{ task, completeTask, deleteTask }} />'}</code>
        </div>
        <div className="flow">
          <div>Ticket Contract</div>
          <div>React Slot</div>
          <div>HTTP Adapter</div>
          <div>Atomic Feature</div>
          <div>Runtime Capabilities</div>
        </div>
      </aside>
    </main>
  );
}

const rootElement = document.querySelector("#root");

if (!rootElement) {
  throw new Error("React root element was not found");
}

createRoot(rootElement).render(<App />);
