import { renderCalendar, formatShortDate, todayKey } from "./calendar";
import {
  createSpeechInput,
  isSpeechSupported,
  type SpeechStatus,
} from "./speech";
import {
  type Filter,
  type Task,
  activeCount,
  createTask,
  filterTasks,
  isOverdue,
  loadTasks,
  saveTasks,
  taskCountsByDate,
} from "./tasks";

const addForm = document.getElementById("add-form") as HTMLFormElement;
const taskInput = document.getElementById("task-input") as HTMLInputElement;
const taskDateInput = document.getElementById("task-date") as HTMLInputElement;
const micBtn = document.getElementById("btn-mic") as HTMLButtonElement;
const speechStatus = document.getElementById("speech-status") as HTMLParagraphElement;
const inputWrap = document.querySelector(".input-wrap") as HTMLDivElement;
const taskList = document.getElementById("task-list") as HTMLUListElement;
const emptyState = document.getElementById("empty-state") as HTMLDivElement;
const emptyTitle = document.getElementById("empty-title") as HTMLParagraphElement;
const emptyHint = document.getElementById("empty-hint") as HTMLParagraphElement;
const panelFooter = document.getElementById("panel-footer") as HTMLElement;
const taskCount = document.getElementById("task-count") as HTMLSpanElement;
const panelTitle = document.getElementById("tasks-heading") as HTMLHeadingElement;
const clearCompletedBtn = document.getElementById("clear-completed") as HTMLButtonElement;
const clearDateBtn = document.getElementById("clear-date-filter") as HTMLButtonElement;
const calendarRoot = document.getElementById("calendar-root") as HTMLElement;
const filterButtons = document.querySelectorAll<HTMLButtonElement>(".filter");

let tasks: Task[] = loadTasks();
let filter: Filter = "all";
let selectedDate: string | null = null;

const now = new Date();
let calendarYear = now.getFullYear();
let calendarMonth = now.getMonth();

function renderCalendarView(): void {
  renderCalendar(calendarRoot, {
    year: calendarYear,
    month: calendarMonth,
    selectedDate,
    taskCounts: taskCountsByDate(tasks),
    onSelectDate: (key) => {
      selectedDate = key;
      if (key) taskDateInput.value = key;
      renderAll();
    },
    onChangeMonth: (year, month) => {
      calendarYear = year;
      calendarMonth = month;
      renderCalendarView();
    },
  });
}

function renderTaskList(): void {
  const visible = filterTasks(tasks, filter, selectedDate);
  const remaining = activeCount(tasks);
  const hasCompleted = tasks.some((t) => t.completed);
  const today = todayKey();

  taskList.innerHTML = "";

  for (const task of visible) {
    taskList.appendChild(createTaskElement(task, today));
  }

  const showEmpty = visible.length === 0;
  emptyState.hidden = !showEmpty;
  taskList.hidden = showEmpty;
  panelFooter.hidden = tasks.length === 0;

  if (selectedDate) {
    panelTitle.textContent = formatShortDate(selectedDate);
    clearDateBtn.hidden = false;
  } else {
    panelTitle.textContent = "Your list";
    clearDateBtn.hidden = true;
  }

  if (showEmpty) {
    if (selectedDate) {
      emptyTitle.textContent = "No tasks this day";
      emptyHint.textContent = "Add one above or pick another date.";
    } else if (filter === "completed") {
      emptyTitle.textContent = "Nothing completed yet";
      emptyHint.textContent = "Finished tasks will show up here.";
    } else if (filter === "active") {
      emptyTitle.textContent = "All caught up";
      emptyHint.textContent = "No active tasks right now.";
    } else {
      emptyTitle.textContent = "Nothing here yet";
      emptyHint.textContent = "Add a task above to get started.";
    }
  }

  taskCount.textContent =
    remaining === 1 ? "1 task left" : `${remaining} tasks left`;

  clearCompletedBtn.hidden = !hasCompleted;
}

function renderAll(): void {
  renderCalendarView();
  renderTaskList();
}

function createTaskElement(task: Task, today: string): HTMLLIElement {
  const overdue = isOverdue(task, today);

  const li = document.createElement("li");
  li.className = [
    "task-item",
    task.completed ? "completed" : "",
    overdue ? "overdue" : "",
  ]
    .filter(Boolean)
    .join(" ");
  li.dataset.id = task.id;

  const checkbox = document.createElement("button");
  checkbox.type = "button";
  checkbox.className = "task-check";
  checkbox.setAttribute("aria-label", task.completed ? "Mark incomplete" : "Mark complete");
  checkbox.setAttribute("aria-pressed", String(task.completed));
  checkbox.innerHTML = task.completed
    ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7l3 3 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : "";

  const body = document.createElement("div");
  body.className = "task-body";

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;

  body.appendChild(text);

  if (task.dueDate) {
    const dateLabel = document.createElement("span");
    dateLabel.className = `task-due${overdue ? " overdue" : ""}`;
    dateLabel.textContent = formatShortDate(task.dueDate);
    body.appendChild(dateLabel);
  }

  const dateBtn = document.createElement("button");
  dateBtn.type = "button";
  dateBtn.className = "task-date-btn";
  dateBtn.setAttribute("aria-label", task.dueDate ? "Change due date" : "Set due date");
  dateBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M2 6.5h12M5 1.5v2M11 1.5v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  dateBtn.addEventListener("click", () => setTaskDueDate(task.id));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "task-delete";
  deleteBtn.setAttribute("aria-label", "Delete task");
  deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`;

  checkbox.addEventListener("click", () => toggleTask(task.id));
  deleteBtn.addEventListener("click", () => deleteTask(task.id));

  li.append(checkbox, body, dateBtn, deleteBtn);
  return li;
}

function persist(): void {
  saveTasks(tasks);
  renderAll();
}

function addTask(text: string, dueDate?: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  tasks = [createTask(trimmed, dueDate), ...tasks];
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

function setTaskDueDate(id: string): void {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const input = document.createElement("input");
  input.type = "date";
  input.className = "hidden-date-picker";
  input.value = task.dueDate ?? selectedDate ?? todayKey();
  document.body.appendChild(input);
  input.showPicker?.();
  input.addEventListener(
    "change",
    () => {
      const value = input.value || undefined;
      tasks = tasks.map((t) =>
        t.id === id ? { ...t, dueDate: value } : t
      );
      document.body.removeChild(input);
      persist();
    },
    { once: true }
  );
  input.addEventListener(
    "blur",
    () => {
      if (input.parentNode) document.body.removeChild(input);
    },
    { once: true }
  );
}

function setFilter(next: Filter): void {
  filter = next;
  filterButtons.forEach((btn) => {
    const isActive = btn.dataset.filter === next;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
  renderTaskList();
}

function setSpeechStatus(status: SpeechStatus): void {
  micBtn.setAttribute("aria-pressed", String(status === "listening"));
  micBtn.classList.toggle("listening", status === "listening");
  inputWrap.classList.toggle("listening", status === "listening");

  if (status === "listening") {
    speechStatus.hidden = false;
    speechStatus.textContent = "Listening… speak your task";
    taskInput.placeholder = "Listening…";
    return;
  }

  taskInput.placeholder = "What needs to be done?";

  if (status === "denied") {
    speechStatus.hidden = false;
    speechStatus.textContent = "Microphone access denied. Allow it in browser settings.";
    return;
  }

  if (status === "unsupported") {
    speechStatus.hidden = false;
    speechStatus.textContent = "Speech input is not supported in this browser.";
    micBtn.hidden = true;
    return;
  }

  speechStatus.hidden = true;
  speechStatus.textContent = "";
}

const speech = createSpeechInput({
  getBaseText: () => taskInput.value,
  onTranscript: (text, isFinal) => {
    taskInput.value = text.slice(0, taskInput.maxLength);
    if (isFinal) taskInput.focus();
  },
  onStatusChange: setSpeechStatus,
});

if (isSpeechSupported() && speech) {
  micBtn.hidden = false;
  micBtn.addEventListener("click", () => speech.toggle());
} else {
  setSpeechStatus("unsupported");
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  speech?.stop();
  const dueDate = taskDateInput.value || undefined;
  addTask(taskInput.value, dueDate);
  taskInput.value = "";
  taskInput.focus();
});

clearCompletedBtn.addEventListener("click", () => {
  tasks = tasks.filter((t) => !t.completed);
  persist();
});

clearDateBtn.addEventListener("click", () => {
  selectedDate = null;
  renderAll();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = btn.dataset.filter as Filter;
    if (next) setFilter(next);
  });
});

if (selectedDate) taskDateInput.value = selectedDate;

renderAll();
taskInput.focus();
