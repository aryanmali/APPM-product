import {
  type Filter,
  type Task,
  activeCount,
  createTask,
  filterTasks,
  loadTasks,
  saveTasks,
} from "./tasks";

const addForm = document.getElementById("add-form") as HTMLFormElement;
const taskInput = document.getElementById("task-input") as HTMLInputElement;
const taskList = document.getElementById("task-list") as HTMLUListElement;
const emptyState = document.getElementById("empty-state") as HTMLDivElement;
const panelFooter = document.getElementById("panel-footer") as HTMLElement;
const taskCount = document.getElementById("task-count") as HTMLSpanElement;
const clearCompletedBtn = document.getElementById("clear-completed") as HTMLButtonElement;
const filterButtons = document.querySelectorAll<HTMLButtonElement>(".filter");

let tasks: Task[] = loadTasks();
let filter: Filter = "all";

function render(): void {
  const visible = filterTasks(tasks, filter);
  const remaining = activeCount(tasks);
  const hasCompleted = tasks.some((t) => t.completed);

  taskList.innerHTML = "";

  for (const task of visible) {
    taskList.appendChild(createTaskElement(task));
  }

  const showEmpty = visible.length === 0;
  emptyState.hidden = !showEmpty;
  taskList.hidden = showEmpty;
  panelFooter.hidden = tasks.length === 0;

  taskCount.textContent =
    remaining === 1 ? "1 task left" : `${remaining} tasks left`;

  clearCompletedBtn.hidden = !hasCompleted;
}

function createTaskElement(task: Task): HTMLLIElement {
  const li = document.createElement("li");
  li.className = `task-item${task.completed ? " completed" : ""}`;
  li.dataset.id = task.id;

  const checkbox = document.createElement("button");
  checkbox.type = "button";
  checkbox.className = "task-check";
  checkbox.setAttribute("aria-label", task.completed ? "Mark incomplete" : "Mark complete");
  checkbox.setAttribute("aria-pressed", String(task.completed));
  checkbox.innerHTML = task.completed
    ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7l3 3 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : "";

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "task-delete";
  deleteBtn.setAttribute("aria-label", "Delete task");
  deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`;

  checkbox.addEventListener("click", () => toggleTask(task.id));
  deleteBtn.addEventListener("click", () => deleteTask(task.id));

  li.append(checkbox, text, deleteBtn);
  return li;
}

function persist(): void {
  saveTasks(tasks);
  render();
}

function addTask(text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  tasks = [createTask(trimmed), ...tasks];
  persist();
}

function toggleTask(id: string): void {
  tasks = tasks.map((t) =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  persist();
}

function deleteTask(id: string): void {
  tasks = tasks.filter((t) => t.id !== id);
  persist();
}

function setFilter(next: Filter): void {
  filter = next;
  filterButtons.forEach((btn) => {
    const isActive = btn.dataset.filter === next;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
  render();
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addTask(taskInput.value);
  taskInput.value = "";
  taskInput.focus();
});

clearCompletedBtn.addEventListener("click", () => {
  tasks = tasks.filter((t) => !t.completed);
  persist();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = btn.dataset.filter as Filter;
    if (next) setFilter(next);
  });
});

render();
taskInput.focus();
