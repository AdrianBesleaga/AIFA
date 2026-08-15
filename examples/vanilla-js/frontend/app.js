const taskList = document.querySelector("#task-list");
const taskTemplate = document.querySelector("#task-template");
const taskForm = document.querySelector("#task-form");
const taskTitle = document.querySelector("#task-title");
const status = document.querySelector("#status");
const traceCard = document.querySelector("#trace-card");
const filterButtons = document.querySelectorAll(".filter");

let tasks = [];
let activeFilter = "all";

const traceCopy = {
  "list-tasks": "UI asks for task state. API runs listTasks. Runtime provides task.list.",
  "create-task": "UI sends a title. API runs createTask. Runtime provides id, clock, storage, and audit.",
  "complete-task": "UI toggles a task. API runs completeTask. Runtime loads, saves, timestamps, and audits.",
  "reopen-task": "UI toggles a done task. API runs reopenTask. Runtime loads, saves, and audits.",
  "delete-task": "UI deletes a task. API runs deleteTask. Runtime loads, deletes, and audits.",
};

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = taskTitle.value;

  if (!title.trim()) {
    setStatus("Title required");
    return;
  }

  await api("/api/tasks", {
    method: "POST",
    body: JSON.stringify({ title }),
  });

  taskTitle.value = "";
  setTrace("create-task");
  await loadTasks();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((candidate) => candidate.classList.toggle("active", candidate === button));
    render();
  });
});

async function loadTasks() {
  const result = await api("/api/tasks");
  tasks = result.value.tasks;
  setTrace("list-tasks");
  render();
}

function render() {
  taskList.replaceChildren();
  const visibleTasks = tasks.filter((task) => {
    if (activeFilter === "active") {
      return !task.completed;
    }

    if (activeFilter === "completed") {
      return task.completed;
    }

    return true;
  });

  if (visibleTasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "task-item";
    empty.textContent = "No tasks in this view.";
    taskList.append(empty);
    return;
  }

  for (const task of visibleTasks) {
    const item = taskTemplate.content.firstElementChild.cloneNode(true);
    item.classList.toggle("completed", task.completed);
    item.querySelector(".task-title").textContent = task.title;

    item.querySelector(".toggle").addEventListener("click", async () => {
      const action = task.completed ? "reopen" : "complete";
      await api(`/api/tasks/${task.id}/${action}`, { method: "POST" });
      setTrace(task.completed ? "reopen-task" : "complete-task");
      await loadTasks();
    });

    item.querySelector(".delete").addEventListener("click", async () => {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      setTrace("delete-task");
      await loadTasks();
    });

    taskList.append(item);
  }

  setStatus(`${tasks.length} task${tasks.length === 1 ? "" : "s"}`);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    setStatus(result.error?.message ?? "Request failed");
    throw new Error(result.error?.message ?? "Request failed");
  }

  return result;
}

function setTrace(featureName) {
  traceCard.querySelector("strong").textContent = featureName;
  traceCard.querySelector("p").textContent = traceCopy[featureName];
}

function setStatus(message) {
  status.textContent = message;
}

loadTasks().catch((error) => {
  setStatus(error.message);
});

